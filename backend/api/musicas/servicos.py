"""
Camada de Serviços para o Domínio de Músicas e Acervo Musical.
Gerencia uploads físicos, extração de metadados, conversão do YouTube para MP3 320kbps e associações N:N.
"""
import uuid
import io
from typing import List, Optional
from sqlalchemy import select, func, or_, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status, UploadFile
from backend.modelos.musica import Musica, MusicaEvento
from backend.modelos.evento import Evento
from backend.modelos.organizacao import Organizacao
from backend.api.musicas.schemas import (
    MusicaCriacaoLink,
    MusicaDownloadYouTube,
    MusicaAtualizacao,
    MusicaResposta,
    EventoAssociadoInfo
)
from backend.nucleo.formatadores import formatar_titulo_inteligente, sanitizar_nome_arquivo
from backend.nucleo.armazenamento import ServicoArmazenamentoTenant
from backend.api.musicas.conversor import converter_youtube_para_mp3_async

try:
    import mutagen
except ImportError:
    mutagen = None


class ServicoMusica:
    """Regras de negócio para gerenciamento de Músicas no Acervo."""

    @staticmethod
    def _formatar_resposta(musica: Musica) -> MusicaResposta:
        """Formata o modelo ORM para o Schema de Resposta."""
        eventos_info = []
        if hasattr(musica, "eventos_associados") and musica.eventos_associados:
            for assoc in musica.eventos_associados:
                if assoc.evento:
                    eventos_info.append(
                        EventoAssociadoInfo(
                            evento_id=assoc.evento.id,
                            evento_nome=assoc.evento.nome
                        )
                    )

        return MusicaResposta(
            id=musica.id,
            organizacao_id=musica.organizacao_id,
            titulo=musica.titulo,
            autor_artista=musica.autor_artista,
            tipo_midia=musica.tipo_midia,
            caminho_arquivo=musica.caminho_arquivo,
            link_externo=musica.link_externo,
            duracao_segundos=musica.duracao_segundos,
            tamanho_bytes=musica.tamanho_bytes,
            tipo_mime=musica.tipo_mime,
            metadados=musica.metadados or {},
            ativo=musica.ativo,
            eventos=eventos_info,
            criado_em=musica.criado_em,
            atualizado_em=musica.atualizado_em
        )

    @staticmethod
    async def listar(
        db: AsyncSession,
        organizacao_id: Optional[uuid.UUID] = None,
        evento_id: Optional[uuid.UUID] = None,
        tipo_midia: Optional[str] = None,
        termo_busca: Optional[str] = None,
        apenas_ativas: bool = True
    ) -> List[MusicaResposta]:
        """Lista músicas com filtros combinados."""
        stmt = (
            select(Musica)
            .options(
                selectinload(Musica.eventos_associados).selectinload(MusicaEvento.evento)
            )
        )

        filtros = []
        if apenas_ativas:
            filtros.append(Musica.ativo == True)
        if organizacao_id is not None:
            filtros.append(or_(Musica.organizacao_id == organizacao_id, Musica.organizacao_id.is_(None)))
        if tipo_midia is not None:
            filtros.append(Musica.tipo_midia == tipo_midia.upper())
        if termo_busca:
            termo = f"%{termo_busca}%"
            filtros.append(
                or_(
                    Musica.titulo.ilike(termo),
                    Musica.autor_artista.ilike(termo)
                )
            )
        if evento_id is not None:
            stmt = stmt.join(MusicaEvento, Musica.id == MusicaEvento.musica_id).where(MusicaEvento.evento_id == evento_id)

        if filtros:
            stmt = stmt.where(*filtros)

        stmt = stmt.order_by(Musica.titulo)
        resultado = await db.execute(stmt)
        musicas = resultado.scalars().unique().all()

        return [ServicoMusica._formatar_resposta(m) for m in musicas]

    @staticmethod
    async def obter_por_id(db: AsyncSession, musica_id: uuid.UUID) -> MusicaResposta:
        """Busca uma música específica pelo ID com seus eventos associados."""
        stmt = (
            select(Musica)
            .where(Musica.id == musica_id)
            .options(
                selectinload(Musica.eventos_associados).selectinload(MusicaEvento.evento)
            )
        )
        res = await db.execute(stmt)
        musica = res.scalar_one_or_none()

        if not musica:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Música com ID '{musica_id}' não encontrada."
            )

        return ServicoMusica._formatar_resposta(musica)

    @staticmethod
    async def criar_com_upload(
        db: AsyncSession,
        organizacao_id: uuid.UUID,
        arquivo: UploadFile,
        titulo: Optional[str] = None,
        autor_artista: Optional[str] = None,
        evento_ids: Optional[List[uuid.UUID]] = None
    ) -> MusicaResposta:
        """Processa o upload do arquivo de áudio físico, salva em disco e cataloga."""
        stmt_org = select(Organizacao).where(Organizacao.id == organizacao_id)
        res_org = await db.execute(stmt_org)
        org = res_org.scalar_one_or_none()
        if not org:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organização não encontrada.")

        extensoes_permitidas = [".mp3", ".wav", ".ogg", ".aac", ".flac", ".m4a"]
        extensao = f".{arquivo.filename.split('.')[-1].lower()}" if "." in arquivo.filename else ""
        if extensao not in extensoes_permitidas:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Formato '{extensao}' não suportado. Envie arquivos de áudio (.mp3, .wav, .ogg)."
            )

        conteudo_bytes = await arquivo.read()
        tamanho = len(conteudo_bytes)
        if tamanho == 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="O arquivo enviado está vazio.")

        # 0. Verifica duplicidade global via hash SHA-256
        import hashlib
        hash_arquivo = hashlib.sha256(conteudo_bytes).hexdigest()
        
        stmt_existente = select(Musica).where(Musica.hash_arquivo == hash_arquivo)
        res_existente = await db.execute(stmt_existente)
        musica_existente = res_existente.scalar_one_or_none()
        
        if musica_existente:
            # Se já existe, apenas associa aos eventos solicitados, sem salvar o arquivo novamente
            if evento_ids:
                for ev_id in evento_ids:
                    # Verifica se já está associado
                    stmt_assoc = select(MusicaEvento).where(
                        MusicaEvento.musica_id == musica_existente.id, 
                        MusicaEvento.evento_id == ev_id
                    )
                    if not (await db.execute(stmt_assoc)).scalar_one_or_none():
                        db.add(MusicaEvento(musica_id=musica_existente.id, evento_id=ev_id))
                await db.commit()
            return await ServicoMusica.obter_por_id(db, musica_existente.id)

        # 1. Determina título e autor
        nome_sem_ext = arquivo.filename.rsplit(".", 1)[0]
        titulo_final = formatar_titulo_inteligente(titulo or nome_sem_ext)
        autor_final = formatar_titulo_inteligente(autor_artista) if autor_artista else None

        # 2. Salva arquivo no File System do Tenant
        nome_base = f"{uuid.uuid4().hex[:8]}_{sanitizar_nome_arquivo(nome_sem_ext)}{extensao}"
        caminho_relativo = ServicoArmazenamentoTenant.salvar_arquivo_musica(
            slug_tenant=org.slug_armazenamento,
            nome_arquivo=nome_base,
            conteudo_bytes=conteudo_bytes
        )

        # 3. Tenta extrair duração com mutagen
        duracao = None
        if mutagen:
            try:
                audio_info = mutagen.File(io.BytesIO(conteudo_bytes))
                if audio_info and audio_info.info and hasattr(audio_info.info, "length"):
                    duracao = int(audio_info.info.length)
            except Exception:
                pass

        nova_musica = Musica(
            organizacao_id=None, # Músicas físicas agora são globais por design
            titulo=titulo_final,
            autor_artista=autor_final,
            tipo_midia="ARQUIVO_LOCAL",
            caminho_arquivo=caminho_relativo,
            hash_arquivo=hash_arquivo,
            duracao_segundos=duracao,
            tamanho_bytes=tamanho,
            tipo_mime=arquivo.content_type,
            ativo=True
        )
        db.add(nova_musica)
        await db.flush()

        # 4. Associa aos eventos fornecidos
        if evento_ids:
            for ev_id in evento_ids:
                db.add(MusicaEvento(musica_id=nova_musica.id, evento_id=ev_id))

        await db.commit()
        return await ServicoMusica.obter_por_id(db, nova_musica.id)

    @staticmethod
    async def baixar_e_converter_youtube(
        db: AsyncSession,
        dados: MusicaDownloadYouTube
    ) -> MusicaResposta:
        """
        Baixa o áudio de um vídeo do YouTube, converte para MP3 em 320 kbps,
        salva no storage global e registra no acervo. Evita conversões duplicadas.
        """
        stmt_org = select(Organizacao).where(Organizacao.id == dados.organizacao_id)
        res_org = await db.execute(stmt_org)
        org = res_org.scalar_one_or_none()
        if not org:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Loja não encontrada.")

        # 0. Verifica se já convertemos essa música antes
        stmt_existente = select(Musica).where(Musica.link_externo == dados.link_youtube, Musica.caminho_arquivo.isnot(None))
        res_existente = await db.execute(stmt_existente)
        musica_existente = res_existente.scalar_one_or_none()

        if musica_existente:
            # Reutiliza o arquivo global já convertido
            if dados.evento_ids:
                for ev_id in dados.evento_ids:
                    stmt_assoc = select(MusicaEvento).where(
                        MusicaEvento.musica_id == musica_existente.id, 
                        MusicaEvento.evento_id == ev_id
                    )
                    if not (await db.execute(stmt_assoc)).scalar_one_or_none():
                        db.add(MusicaEvento(musica_id=musica_existente.id, evento_id=ev_id))
                await db.commit()
            return await ServicoMusica.obter_por_id(db, musica_existente.id)

        pasta_absoluta = ServicoArmazenamentoTenant.obter_diretorio_musicas(org.slug_armazenamento)

        try:
            res_conversao = await converter_youtube_para_mp3_async(
                url=dados.link_youtube,
                pasta_destino=str(pasta_absoluta),
                titulo_sugerido=dados.titulo,
                bitrate_kbps=dados.bitrate_kbps or 320
            )
        except Exception as err:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Erro ao baixar e converter áudio do YouTube: {str(err)}"
            )

        titulo_final = formatar_titulo_inteligente(dados.titulo or res_conversao["titulo_original"])
        autor_final = formatar_titulo_inteligente(dados.autor_artista or res_conversao["autor_original"])

        caminho_relativo = f"/storage/instancias/public/{org.slug_armazenamento}/musicas/{res_conversao['nome_arquivo']}"

        # Lemos o arquivo para obter o hash
        import hashlib
        import aiofiles
        import os
        hash_arquivo = None
        caminho_completo = os.path.join(pasta_absoluta, res_conversao['nome_arquivo'])
        if os.path.exists(caminho_completo):
            async with aiofiles.open(caminho_completo, 'rb') as f:
                conteudo_bytes = await f.read()
                hash_arquivo = hashlib.sha256(conteudo_bytes).hexdigest()

        nova_musica = Musica(
            organizacao_id=None, # Arquivos agora são globais
            titulo=titulo_final,
            autor_artista=autor_final,
            tipo_midia="ARQUIVO_LOCAL",
            caminho_arquivo=caminho_relativo,
            link_externo=dados.link_youtube,
            hash_arquivo=hash_arquivo,
            duracao_segundos=res_conversao.get("duracao_segundos"),
            tamanho_bytes=res_conversao.get("tamanho_bytes"),
            tipo_mime="audio/mpeg",
            metadados={
                "origem": "YOUTUBE_CONVERTIDO",
                "bitrate_kbps": res_conversao.get("bitrate_kbps", 320),
                "url_original": dados.link_youtube
            },
            ativo=True
        )
        db.add(nova_musica)
        await db.flush()

        if dados.evento_ids:
            for ev_id in dados.evento_ids:
                db.add(MusicaEvento(musica_id=nova_musica.id, evento_id=ev_id))

        await db.commit()
        return await ServicoMusica.obter_por_id(db, nova_musica.id)

    @staticmethod
    async def criar_com_link(db: AsyncSession, dados: MusicaCriacaoLink) -> MusicaResposta:
        """Cadastra uma música via link externo de streaming (YouTube) globalmente."""
        stmt_org = select(Organizacao).where(Organizacao.id == dados.organizacao_id)
        res_org = await db.execute(stmt_org)
        if not res_org.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organização não encontrada.")

        if not dados.link_externo:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="O link externo é obrigatório.")

        # Verifica se o link já está cadastrado globalmente (como link, não como arquivo baixado)
        stmt_existente = select(Musica).where(Musica.link_externo == dados.link_externo, Musica.caminho_arquivo.is_(None))
        res_existente = await db.execute(stmt_existente)
        musica_existente = res_existente.scalar_one_or_none()

        if musica_existente:
            if dados.evento_ids:
                for ev_id in dados.evento_ids:
                    stmt_assoc = select(MusicaEvento).where(
                        MusicaEvento.musica_id == musica_existente.id, 
                        MusicaEvento.evento_id == ev_id
                    )
                    if not (await db.execute(stmt_assoc)).scalar_one_or_none():
                        db.add(MusicaEvento(musica_id=musica_existente.id, evento_id=ev_id))
                await db.commit()
            return await ServicoMusica.obter_por_id(db, musica_existente.id)

        tipo = dados.tipo_midia.upper() if dados.tipo_midia else "YOUTUBE"
        titulo_final = formatar_titulo_inteligente(dados.titulo)
        autor_final = formatar_titulo_inteligente(dados.autor_artista) if dados.autor_artista else None

        nova_musica = Musica(
            organizacao_id=None, # Links também são globais
            titulo=titulo_final,
            autor_artista=autor_final,
            tipo_midia=tipo,
            link_externo=dados.link_externo,
            duracao_segundos=dados.duracao_segundos,
            metadados=dados.metadados or {},
            ativo=True
        )
        db.add(nova_musica)
        await db.flush()

        if dados.evento_ids:
            for ev_id in dados.evento_ids:
                db.add(MusicaEvento(musica_id=nova_musica.id, evento_id=ev_id))

        await db.commit()
        return await ServicoMusica.obter_por_id(db, nova_musica.id)

    @staticmethod
    async def atualizar(db: AsyncSession, musica_id: uuid.UUID, dados: MusicaAtualizacao) -> MusicaResposta:
        """Atualiza os metadados de uma música e sua associação com eventos."""
        stmt = select(Musica).where(Musica.id == musica_id)
        res = await db.execute(stmt)
        musica = res.scalar_one_or_none()
        if not musica:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Música não encontrada.")

        if dados.titulo is not None:
            musica.titulo = formatar_titulo_inteligente(dados.titulo)
        if dados.autor_artista is not None:
            musica.autor_artista = formatar_titulo_inteligente(dados.autor_artista)
        if dados.link_externo is not None:
            musica.link_externo = dados.link_externo
        if dados.duracao_segundos is not None:
            musica.duracao_segundos = dados.duracao_segundos
        if dados.metadados is not None:
            musica.metadados = {**musica.metadados, **dados.metadados}
        if dados.ativo is not None:
            musica.ativo = dados.ativo

        # Atualiza lista de eventos associados se enviada
        if dados.evento_ids is not None:
            await db.execute(delete(MusicaEvento).where(MusicaEvento.musica_id == musica_id))
            for ev_id in dados.evento_ids:
                db.add(MusicaEvento(musica_id=musica_id, evento_id=ev_id))

        await db.commit()
        return await ServicoMusica.obter_por_id(db, musica_id)

    @staticmethod
    async def deletar(db: AsyncSession, musica_id: uuid.UUID, organizacao_id: uuid.UUID) -> dict:
        """Desvincula a música de todos os eventos associados a essa organização."""
        stmt = select(Musica).where(Musica.id == musica_id)
        res = await db.execute(stmt)
        musica = res.scalar_one_or_none()
        if not musica:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Música não encontrada.")

        from backend.modelos.evento import Evento
        from backend.modelos.musica import MusicaEvento
        import os
        from backend.nucleo.configuracoes import configuracoes

        # Deleta as associações (por garantia, apesar do cascade)
        await db.execute(delete(MusicaEvento).where(MusicaEvento.musica_id == musica_id))
        
        # Deleta do banco de dados
        await db.execute(delete(Musica).where(Musica.id == musica_id))
        await db.commit()
        
        # Deleta o arquivo físico se existir
        if musica.caminho_arquivo:
            caminho_completo = os.path.join(configuracoes.DIRETORIO_INSTANCIAS_PRIVATE, musica.caminho_arquivo.lstrip('/'))
            if os.path.exists(caminho_completo):
                try:
                    os.remove(caminho_completo)
                except Exception:
                    pass
                    
        return {"sucesso": True, "mensagem": "Música e arquivo excluídos com sucesso do acervo global."}

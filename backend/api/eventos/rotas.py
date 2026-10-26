"""
Controlador de Rotas RESTful para Eventos Ritualísticos (Playlists).
"""
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger
from backend.nucleo.auth_esigma import UsuarioEsigma, obter_usuario_esigma
from backend.nucleo.banco import obter_banco_de_dados
from backend.nucleo.dependencias import verificar_assinatura_ativa
from backend.modelos.evento import Evento
from backend.modelos.musica import Musica, MusicaEventoSugerido
from backend.api.eventos.schemas import EventoCriacao, EventoAtualizacao, EventoResposta
from backend.api.eventos.servicos import ServicoEvento

roteador_eventos = APIRouter(
    prefix="/eventos",
    tags=["Eventos Ritualísticos (Playlists)"],
    dependencies=[Depends(verificar_assinatura_ativa)],
)


@roteador_eventos.get(
    "",
    response_model=List[EventoResposta],
    summary="Listar Eventos Ritualísticos",
    description="Retorna eventos disponíveis para a loja informada, filtrando pelo Rito da Organização para evitar duplicidade."
)
async def listar_eventos(
    organizacao_id: Optional[uuid.UUID] = Query(None, description="UUID da loja para filtrar eventos"),
    incluir_globais: bool = Query(True, description="Se deve incluir os eventos padrão do sistema"),
    apenas_ativos: bool = Query(True, description="Se deve filtrar apenas eventos ativos"),
    usuario: UsuarioEsigma = Depends(obter_usuario_esigma),
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    org_efetiva = organizacao_id
    if not org_efetiva and usuario.organizacao_id:
        try:
            org_efetiva = uuid.UUID(str(usuario.organizacao_id))
        except ValueError:
            org_efetiva = None

    return await ServicoEvento.listar(
        db=db,
        organizacao_id=org_efetiva,
        incluir_globais=incluir_globais,
        apenas_ativos=apenas_ativos
    )


@roteador_eventos.get(
    "/{evento_id}",
    response_model=EventoResposta,
    summary="Obter Detalhes do Evento",
    description="Retorna os dados de um evento ritualístico específico e a contagem de músicas."
)
async def obter_evento(
    evento_id: uuid.UUID,
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    return await ServicoEvento.obter_por_id(db=db, evento_id=evento_id)


@roteador_eventos.post(
    "",
    response_model=EventoResposta,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastrar Novo Evento Ritualístico",
    description="Cria um novo momento ritualístico / playlist customizada para a Loja."
)
async def criar_evento(
    dados: EventoCriacao,
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    return await ServicoEvento.criar(db=db, dados=dados)


@roteador_eventos.put(
    "/{evento_id}",
    response_model=EventoResposta,
    summary="Atualizar Evento Ritualístico",
    description="Atualiza nome, descrição ou configurações de compartilhamento de um evento."
)
async def atualizar_evento(
    evento_id: uuid.UUID,
    dados: EventoAtualizacao,
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    return await ServicoEvento.atualizar(db=db, evento_id=evento_id, dados=dados)


@roteador_eventos.delete(
    "/{evento_id}",
    summary="Excluir Evento Ritualístico",
    description="Exclui um evento customizado da loja. Eventos padrão do sistema não podem ser deletados."
)
async def deletar_evento(
    evento_id: uuid.UUID,
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    return await ServicoEvento.deletar(db=db, evento_id=evento_id)


@roteador_eventos.post(
    "/{evento_id}/musicas/{musica_id}",
    summary="Vincular Música do Acervo ao Momento Ritualístico",
    description="Associa uma música já salva no acervo a este momento litúrgico, replicando para equivalentes canônicos.",
    responses={
        200: {"description": "Música vinculada com sucesso."},
        404: {"description": "Evento ou Música não encontrados."},
    }
)
async def vincular_musica_ao_evento(
    evento_id: uuid.UUID,
    musica_id: uuid.UUID,
    usuario: UsuarioEsigma = Depends(obter_usuario_esigma),
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    ev = await db.get(Evento, evento_id)
    if not ev:
        raise HTTPException(status_code=404, detail="Momento ritualístico não encontrado.")

    musica = await db.get(Musica, musica_id)
    if not musica or not musica.ativo:
        raise HTTPException(status_code=404, detail="Música não encontrada no acervo.")

    if ev.canonico_id:
        res_eq = await db.execute(select(Evento.id).where(Evento.canonico_id == ev.canonico_id))
        ids_alvo = set(res_eq.scalars().all()) | {ev.id}
    else:
        ids_alvo = {ev.id}

    res_exist = await db.execute(
        select(MusicaEventoSugerido.evento_id).where(
            MusicaEventoSugerido.musica_id == musica_id,
            MusicaEventoSugerido.evento_id.in_(ids_alvo)
        )
    )
    existentes = set(res_exist.scalars().all())

    novos = ids_alvo - existentes
    for n_id in novos:
        db.add(MusicaEventoSugerido(musica_id=musica.id, evento_id=n_id))

    await db.commit()
    logger.info(
        f"Música '{musica.titulo}' ({musica.id}) associada ao momento '{ev.nome}' ({ev.id}) por {usuario.email}"
    )
    return {
        "status": "ok",
        "musica_id": str(musica.id),
        "evento_id": str(evento_id),
        "vinculos_adicionados": len(novos),
        "titulo": musica.titulo
    }


@roteador_eventos.delete(
    "/{evento_id}/musicas/{musica_id}",
    summary="Desvincular Música do Momento Ritualístico",
    description="Remove a associação da música deste momento ritualístico.",
    responses={
        200: {"description": "Música desvinculada com sucesso."},
        404: {"description": "Evento não encontrado."},
    }
)
async def desvincular_musica_do_evento(
    evento_id: uuid.UUID,
    musica_id: uuid.UUID,
    usuario: UsuarioEsigma = Depends(obter_usuario_esigma),
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    ev = await db.get(Evento, evento_id)
    if not ev:
        raise HTTPException(status_code=404, detail="Momento ritualístico não encontrado.")

    if ev.canonico_id:
        res_eq = await db.execute(select(Evento.id).where(Evento.canonico_id == ev.canonico_id))
        ids_alvo = set(res_eq.scalars().all()) | {ev.id}
    else:
        ids_alvo = {ev.id}

    await db.execute(
        delete(MusicaEventoSugerido).where(
            MusicaEventoSugerido.musica_id == musica_id,
            MusicaEventoSugerido.evento_id.in_(ids_alvo)
        )
    )
    await db.commit()
    logger.info(
        f"Música {musica_id} desvinculada do momento '{ev.nome}' ({ev.id}) por {usuario.email}"
    )
    return {
        "status": "ok",
        "musica_id": str(musica_id),
        "evento_id": str(evento_id)
    }

"""
Serviços para Gestão de Músicas, Acervo Global e Sugestões Inteligentes.
"""
import uuid
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from fastapi import HTTPException

from backend.modelos.musica import Musica, MusicaEventoSugerido, MusicaEvento
from backend.api.musicas.schemas import MusicaUpload, MusicaAtualizacao


async def registrar_upload_musica(
    db: AsyncSession, dados: MusicaUpload, arquivo_url: str
) -> Musica:
    """
    Registra uma nova música no acervo global, associando obrigatoriamente os
    eventos sugeridos para o algoritmo de Auto-Fill.
    """
    if not dados.eventos_sugeridos_ids:
        raise HTTPException(status_code=400, detail="É obrigatório sugerir pelo menos um evento ritualístico.")

    nova_musica = Musica(
        titulo=dados.titulo,
        autor_artista=dados.autor_artista,
        upload_por_loja_id=dados.upload_por_loja_id,
        arquivo_url=arquivo_url,
        metadados=dados.metadados,
        status_uso="ATIVA"
    )
    db.add(nova_musica)
    await db.flush()

    # Registra o checklist de sugestões
    for ev_id in dados.eventos_sugeridos_ids:
        db.add(MusicaEventoSugerido(
            musica_id=nova_musica.id,
            evento_id=ev_id
        ))

    await db.commit()
    await db.refresh(nova_musica)
    return nova_musica


async def buscar_musicas_sugeridas_para_evento(
    db: AsyncSession, evento_id: uuid.UUID, limit: int = 10
) -> List[Musica]:
    """
    O 'Coração' do Auto-Fill: Busca no acervo global as músicas ativas 
    que foram recomendadas (sugeridas) para este momento ritualístico.
    """
    stmt = (
        select(Musica)
        .join(MusicaEventoSugerido)
        .where(
            MusicaEventoSugerido.evento_id == evento_id,
            Musica.status_uso == "ATIVA",
            Musica.sinalizada_erro == False
        )
        .limit(limit)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def adicionar_musica_a_playlist(
    db: AsyncSession, 
    sessao_loja_evento_id: uuid.UUID, 
    musica_id: uuid.UUID, 
    ordem: int = 1
) -> MusicaEvento:
    """Adiciona uma música escolhida na playlist do evento customizado da loja."""
    # Aqui poderia ter uma verificação de tenant
    nova_playlist = MusicaEvento(
        sessao_loja_evento_id=sessao_loja_evento_id,
        musica_id=musica_id,
        ordem_musica=ordem
    )
    db.add(nova_playlist)
    await db.commit()
    await db.refresh(nova_playlist)
    return nova_playlist


async def listar_arquivos_orfaos(db: AsyncSession) -> List[Musica]:
    """
    Lista músicas no acervo marcadas como ORFA 
    (para o Dashboard do Superadmin analisar/excluir).
    """
    result = await db.execute(
        select(Musica).where(Musica.status_uso == "ORFA")
    )
    return list(result.scalars().all())

"""
Controlador de Rotas RESTful para o Player do Mestre de Harmonia.
"""
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from backend.nucleo.banco import obter_banco_de_dados
from backend.api.player.schemas import SessaoPlayerExecucao, MusicaSorteadaInfo
from backend.api.player.servicos import ServicoPlayer

roteador_player = APIRouter(prefix="/player", tags=["Player do Mestre de Harmonia"])


@roteador_player.get(
    "/sessao/{sessao_id}",
    response_model=SessaoPlayerExecucao,
    summary="Carregar Fila de Execução da Sessão",
    description="Entrega a esteira ritualística completa com sorteio aleatório de uma música para cada momento litúrgico."
)
async def carregar_sessao_player(
    sessao_id: uuid.UUID,
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    return await ServicoPlayer.carregar_sessao_para_player(db=db, sessao_id=sessao_id)


@roteador_player.get(
    "/sortear-musica/{evento_id}",
    response_model=Optional[MusicaSorteadaInfo],
    summary="Re-sortear Música para um Evento",
    description="Sorteia dinamicamente uma nova música elegível para o momento litúrgico sem alterar o resto da sessão."
)
async def sortear_musica(
    evento_id: uuid.UUID,
    organizacao_id: uuid.UUID = Query(..., description="UUID da Loja"),
    musica_atual_id: Optional[uuid.UUID] = Query(None, description="UUID da música atual para evitar repetição"),
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    return await ServicoPlayer.sortear_musica_avulsa(
        db=db,
        evento_id=evento_id,
        organizacao_id=organizacao_id,
        musica_id_atual=musica_atual_id
    )

@roteador_player.patch(
    "/momento/{evento_id}/musica/{musica_id}/preferencia",
    summary="Alternar Selo de Preferência",
    description="Marca ou desmarca uma música como preferida para um momento litúrgico específico."
)
async def alternar_preferencia_musica(
    evento_id: uuid.UUID,
    musica_id: uuid.UUID,
    preferida: bool = Query(..., description="True para favoritar, False para desfavoritar"),
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    from sqlalchemy import update
    from backend.modelos.musica import MusicaEvento
    
    stmt = (
        update(MusicaEvento)
        .where(MusicaEvento.evento_id == evento_id, MusicaEvento.musica_id == musica_id)
        .values(preferida=preferida)
    )
    await db.execute(stmt)
    await db.commit()
    return {"status": "ok", "preferida": preferida}

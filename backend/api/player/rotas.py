"""
Controlador de Rotas RESTful para o Player do Mestre de Harmonia.
"""
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from backend.nucleo.banco import obter_banco_de_dados
from backend.nucleo.auth_esigma import UsuarioEsigma, obter_usuario_esigma
from backend.api.player.schemas import SessaoPlayerExecucao, MusicaSorteadaInfo, PreferenciaResposta
from backend.api.player.servicos import ServicoPlayer

from backend.nucleo.dependencias import verificar_assinatura_ativa

roteador_player = APIRouter(
    prefix="/player",
    tags=["Player do Mestre de Harmonia"],
    dependencies=[Depends(verificar_assinatura_ativa)]
)


@roteador_player.get(
    "/sessao/{sessao_id}",
    response_model=SessaoPlayerExecucao,
    summary="Carregar Fila de Execução da Sessão",
    description=(
        "Entrega a esteira ritualística completa. Para cada momento litúrgico sorteia uma música: "
        "se houver uma ou mais preferidas da Loja, o sorteio ocorre somente entre elas; "
        "caso contrário, entre todas as candidatas elegíveis."
    ),
    responses={
        401: {"description": "Token Bearer ausente ou inválido."},
        403: {"description": "Módulo Harmonia inativo para a Loja."},
        404: {"description": "Sessão não encontrada."},
    },
)
async def carregar_sessao_player(
    sessao_id: uuid.UUID,
    estilo: Optional[str] = Query(None, description="Estilo musical litúrgico da sessão (ex: UNIVERSAL, VIOLAO, CLASSICA)"),
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    return await ServicoPlayer.carregar_sessao_para_player(db=db, sessao_id=sessao_id, estilo=estilo)


@roteador_player.get(
    "/sortear-musica/{evento_id}",
    response_model=Optional[MusicaSorteadaInfo],
    summary="Re-sortear Música para um Evento",
    description=(
        "Sorteia dinamicamente uma nova música elegível para o momento litúrgico sem alterar o resto da sessão. "
        "Informe `sessao_id` para que as preferidas da Loja tenham prioridade. "
        "Para usuários que não são SuperAdmin, a Loja é sempre a do token (o parâmetro `organizacao_id` é ignorado)."
    ),
    responses={
        401: {"description": "Token Bearer ausente ou inválido."},
        422: {"description": "Parâmetros inválidos."},
    },
)
async def sortear_musica(
    evento_id: uuid.UUID,
    organizacao_id: uuid.UUID = Query(..., description="UUID da Loja (ignorado para não-SuperAdmin)"),
    musica_atual_id: Optional[uuid.UUID] = Query(None, description="UUID da música atual para evitar repetição"),
    sessao_id: Optional[uuid.UUID] = Query(None, description="UUID da sessão (habilita a prioridade das preferidas)"),
    estilo: Optional[str] = Query(None, description="Estilo musical filtrado"),
    usuario: UsuarioEsigma = Depends(obter_usuario_esigma),
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    # Identidade nunca vem do cliente: não-SuperAdmin só enxerga a própria Loja
    loja_efetiva = organizacao_id
    if not usuario.is_super_admin and usuario.organizacao_id:
        loja_efetiva = uuid.UUID(str(usuario.organizacao_id))

    return await ServicoPlayer.sortear_musica_avulsa(
        db=db,
        evento_id=evento_id,
        organizacao_id=loja_efetiva,
        musica_id_atual=musica_atual_id,
        sessao_id=sessao_id,
        estilo=estilo,
    )


@roteador_player.patch(
    "/sessao/{sessao_id}/momento/{evento_id}/musica/{musica_id}/preferencia",
    response_model=PreferenciaResposta,
    summary="Alternar Selo de Preferência da Música no Momento",
    description=(
        "Marca (`preferida=true`) ou desmarca (`preferida=false`) uma música como preferida de um momento "
        "litúrgico da sessão da Loja. Várias músicas podem ser preferidas no mesmo momento; "
        "o sorteio escolhe somente entre elas. Operação idempotente."
    ),
    responses={
        401: {"description": "Token Bearer ausente ou inválido."},
        403: {"description": "A sessão pertence a outra Loja."},
        404: {"description": "Sessão, momento ou música não encontrados."},
        422: {"description": "Parâmetro `preferida` ausente ou inválido."},
    },
)
async def alternar_preferencia_musica(
    sessao_id: uuid.UUID,
    evento_id: uuid.UUID,
    musica_id: uuid.UUID,
    preferida: bool = Query(..., description="True para favoritar, False para desfavoritar"),
    usuario: UsuarioEsigma = Depends(obter_usuario_esigma),
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    return await ServicoPlayer.alternar_preferencia(
        db=db,
        sessao_id=sessao_id,
        evento_id=evento_id,
        musica_id=musica_id,
        preferida=preferida,
        usuario=usuario,
    )


@roteador_player.patch(
    "/sessao/{sessao_id}/momento/{evento_id}/surdina",
    summary="Definir Perfil de Surdina do Momento Ritualístico",
    description=(
        "Define permanentemente se este momento litúrgico específico da sessão da Loja deve ser executado em Surdina "
        "(volume limitado pelo percentual de surdina configurado, ideal para interlúdios, oratórias e passagens). "
        "Qualquer música tocada neste momento respeitará o perfil de surdina."
    ),
    responses={
        401: {"description": "Token Bearer ausente ou inválido."},
        403: {"description": "A sessão pertence a outra Loja."},
        404: {"description": "Sessão ou momento não encontrados."},
    },
)
async def alternar_momento_surdina(
    sessao_id: uuid.UUID,
    evento_id: uuid.UUID,
    em_surdina: bool = Query(..., description="True para executar em Surdina, False para execução normal"),
    usuario: UsuarioEsigma = Depends(obter_usuario_esigma),
    db: AsyncSession = Depends(obter_banco_de_dados),
):
    loja_id = uuid.UUID(str(usuario.organizacao_id)) if usuario.organizacao_id else uuid.UUID(int=0)
    return await ServicoPlayer.definir_surdina_momento(
        db=db,
        sessao_id=sessao_id,
        evento_id=evento_id,
        em_surdina=em_surdina,
        organizacao_id=loja_id,
        is_super_admin=usuario.is_super_admin,
    )


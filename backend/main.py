# EM CONFORMIDADE COM AS REGRAS DE OURO DO E-SIGMA
"""
Ponto de Entrada Principal da Aplicação Harmonia (FastAPI).
Configura middlewares de CORS, rotas modulares, servidor de arquivos estáticos
e introspecção de identidade validada junto ao e-Sigma IdP.
"""
import sys
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

# Garante que a raiz do projeto esteja no sys.path para resolução consistente dos módulos
DIRETORIO_RAIZ = str(Path(__file__).resolve().parent.parent)
if DIRETORIO_RAIZ not in sys.path:
    sys.path.insert(0, DIRETORIO_RAIZ)

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from loguru import logger
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.api.admin.rotas import roteador_admin
from backend.api.eventos.rotas import roteador_eventos
from backend.api.musicas.rotas import roteador_musicas
from backend.api.player.rotas import roteador_player
from backend.api.sessoes.rotas import roteador_sessoes
from backend.modelos.organizacao import Organizacao
from backend.nucleo.auth_esigma import UsuarioEsigma, obter_usuario_esigma
from backend.nucleo.banco import SessaoAssincronaLocal, obter_banco_de_dados
from backend.nucleo.configuracoes import configuracoes
from backend.nucleo.dependencias import verificar_assinatura_ativa, exigir_super_admin
from backend.nucleo.sincronizacao_tenant import (
    obter_ou_sincronizar_organizacao,
    sincronizar_organizacoes_base,
)

@asynccontextmanager
async def ciclo_vida_aplicacao(_app: FastAPI):
    """
    Executa a sincronização e autocorreção (self-healing) da Loja 2181 e tenants base
    no banco `harmoniadb` ao iniciar o servidor FastAPI.
    """
    async with SessaoAssincronaLocal() as db:
        await sincronizar_organizacoes_base(db)
    yield


# Inicialização da Aplicação FastAPI com documentação rica
aplicacao = FastAPI(
    title=configuracoes.NOME_APLICACAO,
    version=configuracoes.VERSAO,
    lifespan=ciclo_vida_aplicacao,
    description="""
# Harmonia - Gerenciador de Acervo Musical para Lojas Maçônicas 🎵🏛️

O **Harmonia** é um sistema completo e Multi-Tenant projetado para auxiliar o **Mestre de Harmonia** 
na catalogação de eventos ritualísticos, montagem de esteiras sequenciais de sessões e execução 
automatizada com sorteio randômico de músicas.

### Funcionalidades Principais:
* **Autenticação Centralizada (SSO e-Sigma)**: Validação de token e assinatura SaaS junto ao IdP central.
* **Eventos Ritualísticos (Playlists)**: Catálogo de momentos litúrgicos com equivalência canônica entre Ritos.
* **Sessões e Sequenciamento**: Montagem visual da esteira ritualística ordenada de cada grau e rito.
* **Músicas e Streaming**: Upload seguro de áudio (MP3, WAV, OGG) e integração com links de streaming.
* **Player Ritualístico**: Execução contínua, sorteio inteligente de músicas e transição fluida entre momentos.
    """,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Configuração de CORS para permitir acesso do Frontend React / PWA
aplicacao.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Monta o diretório de arquivos estáticos públicos (/storage)
configuracoes.DIRETORIO_INSTANCIAS_PUBLIC.mkdir(parents=True, exist_ok=True)
aplicacao.mount(
    "/storage/instancias/public",
    StaticFiles(directory=str(configuracoes.DIRETORIO_INSTANCIAS_PUBLIC)),
    name="storage",
)

# Registro dos Roteadores Modulares (Prefixo /api/v1)
PREFIXO_API = "/api/v1"
aplicacao.include_router(roteador_eventos, prefix=PREFIXO_API)
aplicacao.include_router(roteador_sessoes, prefix=PREFIXO_API)
aplicacao.include_router(roteador_musicas, prefix=PREFIXO_API)
aplicacao.include_router(roteador_player, prefix=PREFIXO_API)
aplicacao.include_router(roteador_admin, prefix=PREFIXO_API)


@aplicacao.get(
    "/",
    tags=["Status"],
    summary="Verificar Status do Sistema",
    description="Endpoint raiz para verificação de saúde e versão da API do Harmonia.",
)
async def status_sistema():
    """Endpoint raiz para verificação de saúde e versão da API."""
    return {
        "sistema": configuracoes.NOME_APLICACAO,
        "versao": configuracoes.VERSAO,
        "status": "online",
        "documentacao": "/docs",
    }


@aplicacao.get(
    "/api/v1/auth/me",
    tags=["Autenticação SSO (e-Sigma)"],
    summary="Obter Perfil do Usuário Autenticado",
    description=(
        "Retorna os dados consolidados do usuário autenticado após validação do token Bearer "
        "junto ao endpoint `GET /api/v1/auth/validate` do e-Sigma IdP, enriquecido com os dados "
        "da Loja (Organização) no banco do Harmonia."
    ),
    responses={
        200: {"description": "Perfil do usuário autenticado retornado com sucesso."},
        401: {"description": "Token ausente, inválido ou expirado."},
    },
)
async def obter_perfil_usuario_atual(
    usuario: UsuarioEsigma = Depends(obter_usuario_esigma),
    db: AsyncSession = Depends(obter_banco_de_dados),
):
    """
    Mapeia a identidade validada pelo e-Sigma para o contrato esperado pelo Frontend do Harmonia,
    consultando e sincronizando os metadados da Loja local quando houver `organizacao_id`.
    """
    organizacao_nome = None
    slug_armazenamento = None
    rito_padrao = None
    rito_id = None

    if usuario.organizacao_id:
        try:
            org_uuid = uuid.UUID(str(usuario.organizacao_id))
            org = await obter_ou_sincronizar_organizacao(db, org_uuid)
            if org:
                organizacao_nome = org.nome
                slug_armazenamento = org.slug_armazenamento
                rito_id = str(org.rito_id) if org.rito_id else None
                if org.rito:
                    rito_padrao = org.rito.nome
        except (ValueError, Exception) as erro:
            logger.warning(f"Não foi possível carregar detalhes locais da organização {usuario.organizacao_id}: {erro}")


    tipo_perfil = "ADMIN" if usuario.is_super_admin else "MESTRE_HARMONIA"
    permissoes = ["super_admin", "admin", "mestre_harmonia"] if usuario.is_super_admin else ["mestre_harmonia"]
    nome_exibicao = (
        usuario.nome
        or ("Super Administrador Sigma" if usuario.is_super_admin else (usuario.email or "Ir. Mestre de Harmonia"))
    )

    return {
        "id": usuario.user_id or "desconhecido",
        "nome": nome_exibicao,
        "email": usuario.email or "",
        "tipo": tipo_perfil,
        "role": usuario.role,
        "organizacao_id": usuario.organizacao_id,
        "organizacao_nome": organizacao_nome or (f"Loja {usuario.organizacao_id}" if usuario.organizacao_id else None),
        "slug_armazenamento": slug_armazenamento,
        "status_assinatura": "ATIVA" if usuario.harmonia_ativo else "INATIVA",
        "permissoes": permissoes,
        "modulos_ativos": usuario.modulos_ativos,
        "dados_especificos": {
            "cim": usuario.cim,
            "cpf": usuario.cpf,
            "rito_id": rito_id,
            "rito_padrao": rito_padrao,
        },
    }


class AtualizarOrganizacaoLocalSchema(BaseModel):
    """Schema para atualização local de Rito e metadados de uma Loja no Harmonia."""
    nome: str | None = None
    rito_id: uuid.UUID | None = None
    ativo: bool | None = None


@aplicacao.get(
    "/api/v1/organizacoes",
    tags=["Organizações (Tenants)"],
    summary="Listar Organizações Locais do Harmonia",
    description="Lista as Lojas registradas no banco local do Harmonia com seus respectivos Ritos.",
)
async def listar_organizacoes_locais(
    apenas_ativas: bool = Query(True, description="Filtrar apenas organizações ativas"),
    db: AsyncSession = Depends(obter_banco_de_dados),
    _usuario: UsuarioEsigma = Depends(verificar_assinatura_ativa),
):
    """Retorna a lista de organizações locais com `rito_id` e `rito_padrao`."""
    await sincronizar_organizacoes_base(db)
    stmt = select(Organizacao).options(selectinload(Organizacao.rito)).order_by(Organizacao.nome)
    if apenas_ativas:
        stmt = stmt.where(Organizacao.ativo == True)
    res = await db.execute(stmt)
    orgs = res.scalars().all()
    return [
        {
            "id": str(o.id),
            "nome": o.nome,
            "sigla": o.sigla,
            "tipo": o.tipo,
            "slug_armazenamento": o.slug_armazenamento,
            "rito_id": str(o.rito_id) if o.rito_id else None,
            "rito_padrao": o.rito.nome if o.rito else "Rito Brasileiro",
            "status_assinatura": "ATIVA" if o.ativo else "INATIVA",
            "ativo": o.ativo,
        }
        for o in orgs
    ]


@aplicacao.get(
    "/api/v1/organizacoes/{loja_id}",
    tags=["Organizações (Tenants)"],
    summary="Obter Detalhes de uma Organização Local",
    description="Retorna os metadados e o Rito vinculado a uma Loja específica no Harmonia.",
)
async def obter_organizacao_local(
    loja_id: uuid.UUID,
    db: AsyncSession = Depends(obter_banco_de_dados),
    _usuario: UsuarioEsigma = Depends(verificar_assinatura_ativa),
):
    """Busca uma organização local pelo UUID."""
    org = await obter_ou_sincronizar_organizacao(db, loja_id)
    if not org:
        raise HTTPException(status_code=404, detail="Loja não encontrada no Harmonia.")
    return {
        "id": str(org.id),
        "nome": org.nome,
        "sigla": org.sigla,
        "tipo": org.tipo,
        "slug_armazenamento": org.slug_armazenamento,
        "rito_id": str(org.rito_id) if org.rito_id else None,
        "rito_padrao": org.rito.nome if org.rito else "Rito Brasileiro",
        "status_assinatura": "ATIVA" if org.ativo else "INATIVA",
        "ativo": org.ativo,
        "dados_especificos": {},
    }


@aplicacao.put(
    "/api/v1/organizacoes/{loja_id}",
    tags=["Organizações (Tenants)"],
    summary="Atualizar Rito e Dados da Organização Local",
    description="Permite ao SuperAdmin atualizar o Rito padrão e o status de uma Loja no Harmonia.",
)
async def atualizar_organizacao_local(
    loja_id: uuid.UUID,
    dados: AtualizarOrganizacaoLocalSchema,
    db: AsyncSession = Depends(obter_banco_de_dados),
    _admin: UsuarioEsigma = Depends(exigir_super_admin),
):
    """Atualiza o Rito padrão ou nome de uma Loja no banco do Harmonia."""
    org = await obter_ou_sincronizar_organizacao(db, loja_id)
    if not org:
        raise HTTPException(status_code=404, detail="Loja não encontrada no Harmonia.")
    if dados.nome is not None:
        org.nome = dados.nome
    if dados.rito_id is not None:
        org.rito_id = dados.rito_id
    if dados.ativo is not None:
        org.ativo = dados.ativo
    await db.commit()
    org_atualizada = await obter_ou_sincronizar_organizacao(db, loja_id)
    return {
        "id": str(org_atualizada.id),
        "nome": org_atualizada.nome,
        "rito_id": str(org_atualizada.rito_id) if org_atualizada.rito_id else None,
        "rito_padrao": org_atualizada.rito.nome if org_atualizada.rito else "Rito Brasileiro",
        "ativo": org_atualizada.ativo,
    }


def iniciar_servidor():
    """Função para iniciar o servidor Uvicorn diretamente."""
    import uvicorn

    uvicorn.run(
        "backend.main:aplicacao",
        host=configuracoes.HOST_API,
        port=configuracoes.PORTA_API,
        reload=True,
    )


if __name__ == "__main__":
    iniciar_servidor()

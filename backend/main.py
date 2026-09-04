"""
Ponto de Entrada Principal da Aplicação Harmonia (FastAPI).
Configura middlewares de CORS, rotas modulares e servidor de arquivos estáticos.
"""
import sys
from pathlib import Path

# Garante que a raiz do projeto esteja no sys.path para resolução consistente dos módulos
DIRETORIO_RAIZ = str(Path(__file__).resolve().parent.parent)
if DIRETORIO_RAIZ not in sys.path:
    sys.path.insert(0, DIRETORIO_RAIZ)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.nucleo.configuracoes import configuracoes
from backend.api.eventos.rotas import roteador_eventos
from backend.api.sessoes.rotas import roteador_sessoes
from backend.api.musicas.rotas import roteador_musicas
from backend.api.player.rotas import roteador_player
from backend.api.admin.rotas import roteador_admin

# Inicialização da Aplicação FastAPI com documentação rica
aplicacao = FastAPI(
    title=configuracoes.NOME_APLICACAO,
    version=configuracoes.VERSAO,
    description="""
# Harmonia - Gerenciador de Acervo Musical para Lojas Maçônicas 🎵🏛️

O **Harmonia** é um sistema completo e Multi-Tenant projetado para auxiliar o **Mestre de Harmonia** 
na catalogação de eventos ritualísticos, montagem de esteiras sequenciais de sessões e execução 
automatizada com sorteio randômico de músicas.

### Funcionalidades Principais:
* **Organizações (Tenants)**: Gestão isolada de Lojas e Obediências com provisionamento de File System.
* **Eventos Ritualísticos (Playlists)**: Catálogo de momentos litúrgicos com suporte a eventos padrão e compartilhados.
* **Sessões e Sequenciamento**: Montagem visual da esteira ritualística ordenada de cada grau e rito.
* **Músicas e Streaming**: Upload seguro de áudio (MP3, WAV, OGG) e integração com links de streaming (YouTube, Spotify).
* **Player Ritualístico**: Execução contínua, sorteio inteligente de músicas e transição fluida entre momentos.
    """,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Configuração de CORS para permitir acesso do Frontend React
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
    name="storage"
)

# Registro dos Roteadores Modulares (Prefixo /api/v1)
PREFIXO_API = "/api/v1"
aplicacao.include_router(roteador_eventos, prefix=PREFIXO_API)
aplicacao.include_router(roteador_sessoes, prefix=PREFIXO_API)
aplicacao.include_router(roteador_musicas, prefix=PREFIXO_API)
aplicacao.include_router(roteador_player, prefix=PREFIXO_API)
aplicacao.include_router(roteador_admin, prefix=PREFIXO_API)


@aplicacao.get("/", tags=["Status"])
async def status_sistema():
    """Endpoint raiz para verificação de saúde e versão da API."""
    return {
        "sistema": configuracoes.NOME_APLICACAO,
        "versao": configuracoes.VERSAO,
        "status": "online",
        "documentacao": "/docs"
    }


from fastapi import Depends
from backend.nucleo.dependencias import obter_usuario_logado

@aplicacao.get("/api/v1/auth/me", tags=["Mock Auth Identity"])
async def mock_auth_me(usuario: dict = Depends(obter_usuario_logado)):
    # Mapear o payload do JWT do e-Sigma para a estrutura que o Frontend do Harmonia espera
    return {
        "id": usuario.get("user_id", "unknown"),
        "nome": "Irmão (SSO)",
        "email": usuario.get("sub", ""),
        "tipo": usuario.get("role", "member"),
        "organizacao_id": usuario.get("loja_id"),
        "organizacao_nome": f"Loja {usuario.get('loja_id')}",
        "slug_armazenamento": None,
        "permissoes": [],
        "dados_especificos": {}
    }


def iniciar_servidor():
    """Função para iniciar o servidor Uvicorn diretamente."""
    import uvicorn
    uvicorn.run(
        "backend.main:aplicacao",
        host=configuracoes.HOST_API,
        port=configuracoes.PORTA_API,
        reload=True
    )


if __name__ == "__main__":
    iniciar_servidor()

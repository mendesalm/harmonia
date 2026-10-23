# EM CONFORMIDADE COM AS REGRAS DE OURO DO E-SIGMA
"""
Módulo de Configurações do Sistema Harmonia.
Centraliza as variáveis de ambiente e caminhos de arquivos, sem credenciais hardcoded.
"""
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Configuracoes(BaseSettings):
    """
    Configurações da aplicação carregadas exclusivamente a partir de variáveis de ambiente (.env).
    Em conformidade com AGENTS.md, nenhuma senha, token ou string de conexão sensível possui fallback hardcoded.
    """

    NOME_APLICACAO: str = "Harmonia - Gerenciador de Acervo Musical"
    VERSAO: str = "2.0.0"
    AMBIENTE: str = "desenvolvimento"

    # Banco de Dados (lidos obrigatoriamente de variáveis de ambiente / .env)
    DATABASE_URL: str = ""
    DATABASE_URL_SYNC: str = ""

    # Integração com o Provedor Central de Identidade (e-Sigma IdP)
    ESIGMA_API_BASE_URL: str = "https://e-sigma.app/api/v1"
    ESIGMA_VALIDATE_TIMEOUT_SEGUNDOS: float = 5.0
    ESIGMA_VALIDATE_CACHE_TTL_SEGUNDOS: float = 30.0

    # Segurança e Bypasses (desativados por padrão conforme AGENTS.md)
    HARMONIA_PERMITIR_BYPASS_DEV: bool = False
    CHAVE_SECRETA_JWT: str = ""
    ALGORITMO_JWT: str = "HS256"
    EXPIRACAO_TOKEN_MINUTOS: int = 60 * 24 * 7  # 7 dias

    # Servidor
    HOST_API: str = "0.0.0.0"
    PORTA_API: int = 8000

    # Diretórios de Armazenamento
    DIRETORIO_BASE: Path = Path(__file__).resolve().parent.parent
    DIRETORIO_RAIZ: Path = DIRETORIO_BASE.parent  # Raiz do repositório
    DIRETORIO_ARMAZENAMENTO: Path = DIRETORIO_BASE / "armazenamento"
    DIRETORIO_INSTANCIAS_PUBLIC: Path = DIRETORIO_BASE / "armazenamento" / "instancias" / "public"
    DIRETORIO_INSTANCIAS_PRIVATE: Path = DIRETORIO_BASE / "armazenamento" / "instancias" / "private"

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parent.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )


configuracoes = Configuracoes()

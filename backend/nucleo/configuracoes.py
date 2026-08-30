"""
Módulo de Configurações do Sistema Harmonia.
Centraliza as variáveis de ambiente e caminhos de arquivos.
"""
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Configuracoes(BaseSettings):
    """Configurações da aplicação carregadas a partir de variáveis de ambiente."""
    
    NOME_APLICACAO: str = "Harmonia - Gerenciador de Acervo Musical"
    VERSAO: str = "2.0.0"
    AMBIENTE: str = "desenvolvimento"
    
    # Banco de Dados
    DATABASE_URL: str = "postgresql+asyncpg://harmonia:BsysT23754RthfFg@69.62.89.211:5432/harmoniadb"
    DATABASE_URL_SYNC: str = "postgresql+psycopg2://harmonia:BsysT23754RthfFg@69.62.89.211:5432/harmoniadb"
    
    # Segurança
    CHAVE_SECRETA_JWT: str = "HarmoniaMestre2026ChaveSegura"
    ALGORITMO_JWT: str = "HS256"
    EXPIRACAO_TOKEN_MINUTOS: int = 60 * 24 * 7  # 7 dias
    
    # Servidor
    HOST_API: str = "0.0.0.0"
    PORTA_API: int = 8000
    
    # Diretórios de Armazenamento
    DIRETORIO_BASE: Path = Path(__file__).resolve().parent.parent
    DIRETORIO_ARMAZENAMENTO: Path = DIRETORIO_BASE / "armazenamento"
    DIRETORIO_INSTANCIAS_PUBLIC: Path = DIRETORIO_BASE / "armazenamento" / "instancias" / "public"
    DIRETORIO_INSTANCIAS_PRIVATE: Path = DIRETORIO_BASE / "armazenamento" / "instancias" / "private"
    
    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parent.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )


configuracoes = Configuracoes()

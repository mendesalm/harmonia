"""
Módulo de Conexão com o Banco de Dados PostgreSQL (SQLAlchemy Async).
Configura a engine assíncrona, sessões e a classe base declarativa.
"""
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from backend.nucleo.configuracoes import configuracoes

# Cria a engine assíncrona para o PostgreSQL
motor_assincrono = create_async_engine(
    configuracoes.DATABASE_URL,
    echo=False,
    future=True,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

# Fábrica de sessões assíncronas
SessaoAssincronaLocal = async_sessionmaker(
    bind=motor_assincrono,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False
)


class Base(DeclarativeBase):
    """Classe base declarativa para todos os modelos ORM do Harmonia."""
    pass


async def obter_banco_de_dados() -> AsyncGenerator[AsyncSession, None]:
    """
    Injetor de Dependência FastAPI para fornecer a sessão assíncrona do banco de dados.
    Garante fechamento e rollback automático em caso de exceção.
    """
    async with SessaoAssincronaLocal() as sessao:
        try:
            yield sessao
        finally:
            await sessao.close()

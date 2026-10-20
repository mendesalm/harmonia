import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

from backend.nucleo.configuracoes import configuracoes

async def run():
    engine = create_async_engine(configuracoes.DATABASE_URL)
    async with engine.begin() as conn:
        await conn.execute(text('ALTER TABLE musica_eventos ADD COLUMN IF NOT EXISTS preferida BOOLEAN DEFAULT FALSE NOT NULL'))
        print('Coluna adicionada com sucesso!')

asyncio.run(run())

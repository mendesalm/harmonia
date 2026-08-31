import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def run():
    engine = create_async_engine('postgresql+asyncpg://harmonia:BsysT23754RthfFg@69.62.89.211:5432/harmoniadb')
    async with engine.begin() as conn:
        await conn.execute(text('ALTER TABLE musica_eventos ADD COLUMN IF NOT EXISTS preferida BOOLEAN DEFAULT FALSE NOT NULL'))
        print('Coluna adicionada com sucesso!')

asyncio.run(run())

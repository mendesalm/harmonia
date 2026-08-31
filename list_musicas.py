import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import pprint

async def run():
    engine = create_async_engine('postgresql+asyncpg://harmonia:BsysT23754RthfFg@69.62.89.211:5432/harmoniadb')
    async with engine.begin() as conn:
        res = await conn.execute(text("SELECT id, titulo, caminho_arquivo, criado_em FROM musicas ORDER BY criado_em DESC LIMIT 10"))
        rows = res.fetchall()
        for r in rows:
            print(r)

asyncio.run(run())

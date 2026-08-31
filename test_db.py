import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def run():
    engine = create_async_engine('postgresql+asyncpg://harmonia:BsysT23754RthfFg@69.62.89.211:5432/harmoniadb')
    async with engine.begin() as conn:
        res = await conn.execute(text("SELECT preferida FROM musica_eventos LIMIT 1"))
        print(res.fetchall())

asyncio.run(run())

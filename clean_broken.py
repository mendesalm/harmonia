import asyncio
import os
from pathlib import Path
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def run():
    # 1. Deletar do banco de dados a música de teste
    engine = create_async_engine('postgresql+asyncpg://harmonia:BsysT23754RthfFg@69.62.89.211:5432/harmoniadb')
    async with engine.begin() as conn:
        await conn.execute(text("DELETE FROM musica_eventos WHERE musica_id = '03c38ad7-2301-45ba-9bab-3f7e397893d1'"))
        await conn.execute(text("DELETE FROM musicas WHERE id = '03c38ad7-2301-45ba-9bab-3f7e397893d1'"))
        print("Música de teste 'Me at the zoo' removida do banco.")

    # 2. Deletar arquivos órfãos do disco
    pasta = Path("backend/armazenamento/instancias/public/GOB_Loja2181/musicas")
    manter = "748f74_Hino_de_Abertura.mp3"

    for arq in pasta.iterdir():
        if arq.is_file() and arq.name != manter:
            try:
                arq.unlink()
                print(f"Arquivo deletado: {arq.name}")
            except Exception as e:
                print(f"Erro ao deletar {arq.name}: {e}")

asyncio.run(run())

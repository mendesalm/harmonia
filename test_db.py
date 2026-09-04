import asyncio
import sys
sys.path.append(".")
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from backend.nucleo.banco import motor_assincrono as engine, SessaoAssincronaLocal as SessionLocal
from backend.modelos.evento import Evento
from backend.modelos.musica import MusicaEvento

async def test():
    async with SessionLocal() as db:
        stmt = select(
            Evento,
            func.count(MusicaEvento.id).label("total_musicas")
        ).outerjoin(MusicaEvento, Evento.id == MusicaEvento.evento_id).options(selectinload(Evento.canonico))
        stmt = stmt.group_by(Evento.id).order_by(Evento.nome)
        try:
            resultado = await db.execute(stmt)
            linhas = resultado.all()
            print("Sucesso! Linhas:", len(linhas))
        except Exception as e:
            print("Erro:", e)

asyncio.run(test())

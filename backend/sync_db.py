import asyncio
import sys
from pathlib import Path

# Garante que o diretório raiz esteja no path para as importações funcionarem
DIRETORIO_RAIZ = str(Path(__file__).resolve().parent.parent)
if DIRETORIO_RAIZ not in sys.path:
    sys.path.insert(0, DIRETORIO_RAIZ)

from backend.nucleo.banco import motor_assincrono, Base
import backend.modelos # Importa todos os modelos para garantir que estão registrados na Base

async def criar_tabelas():
    async with motor_assincrono.begin() as conn:
        print("Sincronizando tabelas com o banco de dados...")
        await conn.run_sync(Base.metadata.create_all)
        print("Tabelas criadas com sucesso (as existentes foram mantidas).")

if __name__ == "__main__":
    asyncio.run(criar_tabelas())

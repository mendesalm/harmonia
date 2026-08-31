import asyncio
from backend.api.musicas.conversor import converter_youtube_para_mp3_async

async def run():
    try:
        resultado = await converter_youtube_para_mp3_async(
            url="https://www.youtube.com/watch?v=jNQXAC9IVRw",
            pasta_destino="./tmp",
            titulo_sugerido="teste"
        )
        print("Sucesso:", resultado)
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(run())

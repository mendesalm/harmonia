import asyncio
import uuid
import json
import urllib.request
import urllib.error

async def run():
    req = urllib.request.Request("http://localhost:8000/api/v1/organizacoes", method="GET")
    try:
        resp = urllib.request.urlopen(req)
        orgs = json.loads(resp.read().decode())
        org_id = orgs[0]['id']
    except Exception as e:
        print("Erro org:", e)
        return

    data = {
        "organizacao_id": org_id,
        "link_youtube": "https://www.youtube.com/watch?v=ZKADV8RV_m4&list=RDZKADV8RV_m4&start_radio=1",
        "titulo": "Teste Radio Mix",
        "evento_ids": []
    }
    
    req = urllib.request.Request(
        "http://localhost:8000/api/v1/musicas/converter-youtube", 
        data=json.dumps(data).encode(), 
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    
    try:
        print("Iniciando requisicao POST...")
        resp = urllib.request.urlopen(req, timeout=120)
        print("Success:", resp.read().decode())
    except urllib.error.HTTPError as e:
        print("HTTP Error:", e.code, e.read().decode())
    except Exception as e:
        print("Error:", e)

asyncio.run(run())

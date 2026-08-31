import asyncio
import uuid
import json
import urllib.request
import urllib.error

async def run():
    org_id = "f67cb2a0-4fc7-4566-a3cd-d362d2d0bbfd" # using the first one or we need one.
    
    # Actually I don't know an org_id, let me just fetch orgs
    req = urllib.request.Request("http://localhost:8000/api/v1/organizacoes", method="GET")
    try:
        resp = urllib.request.urlopen(req)
        orgs = json.loads(resp.read().decode())
        org_id = orgs[0]['id']
    except Exception as e:
        print(e)
        return

    data = {
        "organizacao_id": org_id,
        "link_youtube": "https://www.youtube.com/watch?v=jNQXAC9IVRw",
        "titulo": "Me at the zoo",
        "evento_ids": []
    }
    
    req = urllib.request.Request(
        "http://localhost:8000/api/v1/musicas/converter-youtube", 
        data=json.dumps(data).encode(), 
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    
    try:
        resp = urllib.request.urlopen(req)
        print("Success:", resp.read().decode())
    except urllib.error.HTTPError as e:
        print("Error:", e.code, e.read().decode())

asyncio.run(run())

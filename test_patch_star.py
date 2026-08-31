import asyncio
import uuid
import json
import urllib.request
import urllib.error

async def run():
    # Pegar uma sessão
    req = urllib.request.Request("http://localhost:8000/api/v1/sessoes", method="GET")
    resp = urllib.request.urlopen(req)
    sessoes = json.loads(resp.read().decode())
    sessao_id = sessoes[0]['id']

    # Pegar os detalhes da sessão
    req = urllib.request.Request(f"http://localhost:8000/api/v1/player/sessao/{sessao_id}", method="GET")
    resp = urllib.request.urlopen(req)
    player_data = json.loads(resp.read().decode())
    
    # Pegar o primeiro evento com músicas cadastradas
    evento_id = None
    musica_id = None
    
    for momento in player_data['esteira_ritualistica']:
        if len(momento['candidatas']) > 0:
            evento_id = momento['evento_id']
            musica_id = momento['candidatas'][0]['id']
            preferida_atual = momento['candidatas'][0].get('preferida', False)
            break
            
    if not evento_id:
        print("Sem musicas na esteira.")
        return
        
    print(f"Testando patch de {preferida_atual} para {not preferida_atual} na musica {musica_id} (evento {evento_id})")
    
    # Chamar PATCH
    url = f"http://localhost:8000/api/v1/player/momento/{evento_id}/musica/{musica_id}/preferencia?preferida={'true' if not preferida_atual else 'false'}"
    req = urllib.request.Request(url, method="PATCH")
    try:
        resp = urllib.request.urlopen(req)
        print("Success:", resp.read().decode())
    except Exception as e:
        print("Erro:", e.read().decode() if hasattr(e, 'read') else e)

asyncio.run(run())

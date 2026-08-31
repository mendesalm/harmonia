import urllib.request, json
req = urllib.request.Request('http://localhost:8000/api/v1/sessoes', method='GET')
sessoes = json.loads(urllib.request.urlopen(req).read().decode())
sessao_id = sessoes[0]['id']
req = urllib.request.Request(f'http://localhost:8000/api/v1/player/sessao/{sessao_id}', method='GET')
player_data = json.loads(urllib.request.urlopen(req).read().decode())
for m in player_data['esteira_ritualistica']:
    if m['candidatas']:
        for c in m['candidatas']:
            print(f"Evento: {m['evento_nome']} -> Musica: {c['titulo']} -> Preferida: {c['preferida']}")

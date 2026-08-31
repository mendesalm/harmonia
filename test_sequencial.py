import urllib.request, json
req = urllib.request.Request('http://localhost:8000/api/v1/sessoes', method='GET')
sessao_id = json.loads(urllib.request.urlopen(req).read().decode())[0]['id']
req = urllib.request.Request(f'http://localhost:8000/api/v1/player/sessao/{sessao_id}', method='GET')
data = json.loads(urllib.request.urlopen(req).read().decode())
candidatas = data['esteira_ritualistica'][0]['candidatas']
print('Antes:')
for c in candidatas: print(f"{c['titulo']} -> {c['preferida']}")

m_id = candidatas[0]['id']
ev_id = data['esteira_ritualistica'][0]['evento_id']
url = f'http://localhost:8000/api/v1/player/momento/{ev_id}/musica/{m_id}/preferencia?preferida=true'
resp = urllib.request.urlopen(urllib.request.Request(url, method='PATCH'))
print("Resp:", resp.read().decode())

req = urllib.request.Request(f'http://localhost:8000/api/v1/player/sessao/{sessao_id}', method='GET')
data = json.loads(urllib.request.urlopen(req).read().decode())
candidatas = data['esteira_ritualistica'][0]['candidatas']
print('Depois:')
for c in candidatas: print(f"{c['titulo']} -> {c['preferida']}")

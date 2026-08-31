import urllib.request
import urllib.error
try:
    urllib.request.urlopen('http://localhost:8000/api/v1/player/sessao/70345270-8050-4309-a0fd-1e32d5598e57')
except urllib.error.HTTPError as e:
    print(e.read().decode())

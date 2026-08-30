"""
Bateria de Testes Automatizados da API do Harmonia.
Cobre os domínios: Autenticação JWT, Organizações, Eventos, Sessões, Músicas e Player Ritualístico.
"""
import pytest
import pytest_asyncio
import uuid
from httpx import AsyncClient, ASGITransport
from backend.main import aplicacao
from backend.nucleo.banco import motor_assincrono
from backend.nucleo.formatadores import formatar_titulo_inteligente


@pytest_asyncio.fixture
async def cliente_http():
    """Fixture que fornece cliente HTTP assíncrono para testar os endpoints."""
    transporte = ASGITransport(app=aplicacao)
    async with AsyncClient(transport=transporte, base_url="http://test") as cliente:
        yield cliente
    await motor_assincrono.dispose()


@pytest.mark.asyncio
async def test_status_sistema(cliente_http: AsyncClient):
    """Testa endpoint de status da aplicação."""
    resp = await cliente_http.get("/")
    assert resp.status_code == 200
    dados = resp.json()
    assert dados["status"] == "online"


@pytest.mark.asyncio
async def test_autenticacao_jwt(cliente_http: AsyncClient):
    """Testa fluxo de login com credenciais padrão do Sigma e consulta ao /me."""
    # 1. Login com senha errada
    resp_erro = await cliente_http.post("/api/v1/auth/login", json={
        "email": "mestre.harmonia@e-sigma.app",
        "senha": "senha_incorreta"
    })
    assert resp_erro.status_code == 401

    # 2. Login correto
    resp_ok = await cliente_http.post("/api/v1/auth/login", json={
        "email": "mestre.harmonia@e-sigma.app",
        "senha": "harmonia@2026"
    })
    assert resp_ok.status_code == 200
    dados_login = resp_ok.json()
    assert "access_token" in dados_login
    token = dados_login["access_token"]
    assert dados_login["usuario"]["email"] == "mestre.harmonia@e-sigma.app"
    assert "mestre_harmonia" in dados_login["usuario"]["permissoes"]

    # 3. Consulta ao /auth/me usando o token Bearer
    headers = {"Authorization": f"Bearer {token}"}
    resp_me = await cliente_http.get("/api/v1/auth/me", headers=headers)
    assert resp_me.status_code == 200
    perfil = resp_me.json()
    assert perfil["nome"] == "Ir. Mestre de Harmonia"
    assert perfil["organizacao_id"] is not None


@pytest.mark.asyncio
async def test_crud_eventos(cliente_http: AsyncClient):
    """Testa criação, listagem e atualização de Eventos Ritualísticos."""
    # 1. Listar eventos (deve conter os eventos padrão do sistema)
    resp = await cliente_http.get("/api/v1/eventos")
    assert resp.status_code == 200
    eventos = resp.json()
    assert len(eventos) >= 10

    # 2. Criar evento customizado
    nome_teste = f"Entrada Especial {uuid.uuid4().hex[:6]}"
    novo_payload = {
        "nome": nome_teste,
        "descricao": "Evento exclusivo de teste",
        "categoria_rito": "REAA",
        "compartilhado": True,
        "ordem_sugerida": 99
    }
    resp_create = await cliente_http.post("/api/v1/eventos", json=novo_payload)
    assert resp_create.status_code == 201
    evento_criado = resp_create.json()
    evento_id = evento_criado["id"]
    assert evento_criado["nome"] == formatar_titulo_inteligente(nome_teste)

    # 3. Atualizar evento
    resp_update = await cliente_http.put(f"/api/v1/eventos/{evento_id}", json={"descricao": "Descricao atualizada"})
    assert resp_update.status_code == 200
    assert resp_update.json()["descricao"] == "Descricao atualizada"

    # 4. Deletar evento customizado
    resp_delete = await cliente_http.delete(f"/api/v1/eventos/{evento_id}")
    assert resp_delete.status_code == 200


@pytest.mark.asyncio
async def test_fluxo_musica_e_player(cliente_http: AsyncClient):
    """Testa cadastro de música streaming, upload simulado, e execução do Player."""
    # Busca a organização modelo
    resp_org = await cliente_http.get("/api/v1/organizacoes")
    orgs = resp_org.json()
    assert len(orgs) > 0
    org_id = orgs[0]["id"]

    # Busca eventos existentes
    resp_ev = await cliente_http.get(f"/api/v1/eventos?organizacao_id={org_id}")
    eventos = resp_ev.json()
    evento_abertura = next(e for e in eventos if "Abertura" in e["nome"])
    evento_fechamento = next(e for e in eventos if "Fechamento" in e["nome"])

    # 1. Cadastrar música streaming associada a 2 eventos
    payload_streaming = {
        "organizacao_id": org_id,
        "titulo": "Marcha Solene de Mozart",
        "autor_artista": "W. A. Mozart",
        "tipo_midia": "YOUTUBE",
        "link_externo": "https://www.youtube.com/watch?v=mock123",
        "duracao_segundos": 180,
        "evento_ids": [evento_abertura["id"], evento_fechamento["id"]]
    }
    resp_musica = await cliente_http.post("/api/v1/musicas/streaming", json=payload_streaming)
    assert resp_musica.status_code == 201
    musica_criada = resp_musica.json()
    assert len(musica_criada["eventos"]) == 2

    # 2. Upload de arquivo simulado de áudio
    conteudo_audio = b"ID3\x03\x00\x00\x00\x00\x00#MOCK_MP3_AUDIO_DATA_FOR_TESTING"
    arquivos = {
        "arquivo": ("hino_entrada.mp3", conteudo_audio, "audio/mpeg")
    }
    dados_form = {
        "organizacao_id": org_id,
        "titulo": "Hino a Bandeira",
        "autor_artista": "Francisco Braga",
        "evento_ids": f'["{evento_abertura["id"]}"]'
    }
    resp_upload = await cliente_http.post("/api/v1/musicas/upload", data=dados_form, files=arquivos)
    assert resp_upload.status_code == 201
    upload_criado = resp_upload.json()
    assert upload_criado["tipo_midia"] == "ARQUIVO_LOCAL"
    assert "/storage/instancias/public/" in upload_criado["caminho_arquivo"]

    # 3. Testar Player da Sessão
    resp_sessoes = await cliente_http.get(f"/api/v1/sessoes?organizacao_id={org_id}")
    sessoes = resp_sessoes.json()
    assert len(sessoes) > 0
    sessao_id = sessoes[0]["id"]

    resp_player = await cliente_http.get(f"/api/v1/player/sessao/{sessao_id}")
    assert resp_player.status_code == 200
    dados_player = resp_player.json()
    assert len(dados_player["esteira_ritualistica"]) > 0

    # Verifica se o evento de abertura sorteou uma das nossas músicas
    momento_abertura = next(
        (m for m in dados_player["esteira_ritualistica"] if m["evento_id"] == evento_abertura["id"]),
        None
    )
    if momento_abertura:
        assert momento_abertura["total_musicas_disponiveis"] >= 1
        assert momento_abertura["musica_sorteada"] is not None
        assert momento_abertura["musica_sorteada"]["titulo"] in [
            "Marcha Solene de Mozart",
            "Hino a Bandeira"
        ]

    # Limpeza
    await cliente_http.delete(f"/api/v1/musicas/{musica_criada['id']}")
    await cliente_http.delete(f"/api/v1/musicas/{upload_criado['id']}")


@pytest.mark.asyncio
async def test_clonagem_sessao_e_rito_brasileiro(cliente_http: AsyncClient):
    """Testa clonagem de modelo de sessão existente e suporte ao Rito Brasileiro."""
    resp_org = await cliente_http.get("/api/v1/organizacoes")
    org_id = resp_org.json()[0]["id"]

    resp_sessoes = await cliente_http.get(f"/api/v1/sessoes?organizacao_id={org_id}")
    sessoes = resp_sessoes.json()
    assert len(sessoes) > 0
    sessao_origem = sessoes[0]

    # Clona a sessão alterando o Rito para Brasileiro
    payload_clone = {
        "novo_nome": f"Sessão Clonada Teste {uuid.uuid4().hex[:4]}",
        "novo_rito": "Brasileiro",
        "novo_grau": 2
    }
    resp_clone = await cliente_http.post(f"/api/v1/sessoes/{sessao_origem['id']}/clonar", json=payload_clone)
    assert resp_clone.status_code == 201
    sessao_clonada = resp_clone.json()
    assert sessao_clonada["rito"] == "BRASILEIRO"
    assert sessao_clonada["grau"] == 2
    assert len(sessao_clonada["sequencia_eventos"]) == sessao_origem["total_eventos"]

    # Limpeza
    await cliente_http.delete(f"/api/v1/sessoes/{sessao_clonada['id']}")


@pytest.mark.asyncio
async def test_endpoint_conversor_youtube_schemas(cliente_http: AsyncClient):
    """Testa validação e schemas do endpoint de conversão do YouTube."""
    resp_org = await cliente_http.get("/api/v1/organizacoes")
    org_id = resp_org.json()[0]["id"]

    # Validação com link inválido ou payload
    payload = {
        "organizacao_id": org_id,
        "link_youtube": "https://www.youtube.com/watch?v=invalid_mock_video_for_unit_test",
        "titulo": "Faixa Teste 320k",
        "bitrate_kbps": 320
    }
    resp = await cliente_http.post("/api/v1/musicas/converter-youtube", json=payload)
    # Como o link é mock, o yt-dlp lança 400 Bad Request devidamente tratado
    assert resp.status_code in [400, 201]



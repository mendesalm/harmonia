"""
Testes do Player: classificação canônica de mídia, regra de sorteio com várias
preferidas e rota de alternância de preferência (autenticação, tenant e idempotência).
"""
import random
import uuid
from unittest.mock import MagicMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from backend.api.musicas.midia import classificar_midia
from backend.api.player.schemas import MusicaSorteadaInfo
from backend.api.player.servicos import sortear_entre_candidatas
from backend.main import aplicacao
from backend.nucleo.auth_esigma import limpar_cache_validacao
from backend.nucleo.banco import motor_assincrono
from backend.nucleo.configuracoes import configuracoes

LOJA_2181_UUID = "795b19d5-e14c-4c2e-b047-ee99e6e39a9c"
OUTRA_LOJA_UUID = "11111111-2222-3333-4444-555555555555"


# ---------------------------------------------------------------------------
# classificar_midia (função pura)
# ---------------------------------------------------------------------------
@pytest.mark.parametrize(
    "url",
    [
        "https://www.youtube.com/watch?v=MoDEnItkc6I",
        "https://youtu.be/MoDEnItkc6I",
        "https://m.youtube.com/watch?v=abc",
        "https://music.youtube.com/watch?v=abc",
    ],
)
def test_classificar_midia_youtube(url):
    midia = classificar_midia(url, {"tipo_midia": "STREAMING"})  # valor legado é ignorado
    assert midia["tipo_midia"] == "YOUTUBE"
    assert midia["link_externo"] == url
    assert midia["caminho_arquivo"] is None


def test_classificar_midia_spotify():
    midia = classificar_midia("https://open.spotify.com/track/abc", {})
    assert midia["tipo_midia"] == "SPOTIFY"


def test_classificar_midia_arquivo_local_e_url_direta():
    local = classificar_midia("/storage/instancias/public/musicas/a.mp3", {})
    assert local["tipo_midia"] == "ARQUIVO_LOCAL"
    assert local["caminho_arquivo"] == "/storage/instancias/public/musicas/a.mp3"
    assert local["link_externo"] is None

    direta = classificar_midia("https://cdn.exemplo.com/a.mp3", {})
    assert direta["tipo_midia"] == "ARQUIVO_LOCAL"
    assert direta["caminho_arquivo"] == "https://cdn.exemplo.com/a.mp3"


def test_classificar_midia_dominio_falso_nao_vira_youtube():
    """Host que apenas CONTÉM 'youtube.com' no caminho não pode ser tratado como YouTube."""
    midia = classificar_midia("https://evil.com/youtube.com/x.mp3", {})
    assert midia["tipo_midia"] == "ARQUIVO_LOCAL"


def test_classificar_midia_usa_link_externo_dos_metadados():
    midia = classificar_midia("", {"link_externo": "https://youtu.be/abc"})
    assert midia["tipo_midia"] == "YOUTUBE"


# ---------------------------------------------------------------------------
# sortear_entre_candidatas (função pura)
# ---------------------------------------------------------------------------
def _musica(preferida: bool = False) -> MusicaSorteadaInfo:
    return MusicaSorteadaInfo(
        id=uuid.uuid4(),
        titulo="Faixa",
        autor_artista=None,
        tipo_midia="ARQUIVO_LOCAL",
        caminho_arquivo="/x.mp3",
        link_externo=None,
        duracao_segundos=60,
        preferida=preferida,
    )


def test_sorteio_lista_vazia_retorna_none():
    assert sortear_entre_candidatas([]) is None


def test_sorteio_so_entre_preferidas_quando_existem():
    random.seed(1)
    pref_a, pref_b = _musica(True), _musica(True)
    comuns = [_musica() for _ in range(5)]
    candidatas = comuns + [pref_a, pref_b]
    escolhidas = {sortear_entre_candidatas(candidatas).id for _ in range(200)}
    assert escolhidas <= {pref_a.id, pref_b.id}
    # Com várias preferidas, ambas devem aparecer (sorteio real entre elas)
    assert escolhidas == {pref_a.id, pref_b.id}


def test_sorteio_aleatorio_entre_todas_sem_preferidas():
    random.seed(2)
    candidatas = [_musica() for _ in range(4)]
    escolhidas = {sortear_entre_candidatas(candidatas).id for _ in range(300)}
    assert escolhidas == {m.id for m in candidatas}


def test_resorteio_evita_repetir_atual_quando_ha_alternativa():
    pref_a, pref_b = _musica(True), _musica(True)
    for _ in range(100):
        assert sortear_entre_candidatas([pref_a, pref_b], excluir_id=pref_a.id).id == pref_b.id


def test_resorteio_com_uma_unica_preferida_mantem_a_preferida():
    unica = _musica(True)
    outras = [_musica(), _musica()]
    for _ in range(50):
        assert sortear_entre_candidatas(outras + [unica], excluir_id=unica.id).id == unica.id


# ---------------------------------------------------------------------------
# Rota PATCH de preferência (integração com harmoniadb)
# ---------------------------------------------------------------------------
@pytest_asyncio.fixture
async def cliente_http(monkeypatch):
    limpar_cache_validacao()
    monkeypatch.setattr(configuracoes, "ESIGMA_API_BASE_URL", "http://esigma.teste/api/v1")
    transporte = ASGITransport(app=aplicacao)
    async with AsyncClient(transport=transporte, base_url="http://test") as cliente:
        yield cliente
    await motor_assincrono.dispose()
    limpar_cache_validacao()


def _mock_validacao(organizacao_id: str, role: str = "member", email: str = "loja2181@harmonia.e-sigma.app"):
    resp = MagicMock()
    resp.status_code = 200
    resp.json.return_value = {
        "valido": True,
        "usuario": {
            "email": email,
            "nome": "Teste",
            "user_id": "7aec23bf-9328-49b9-b78f-ddb007a74da3",
            "role": role,
            "organizacao_id": organizacao_id,
            "cim": None,
            "cpf": None,
        },
        "modulos_ativos": ["harmonia"],
    }
    return resp


@pytest.mark.asyncio
async def test_preferencia_exige_autenticacao(cliente_http: AsyncClient):
    url = (
        f"/api/v1/player/sessao/{uuid.uuid4()}/momento/{uuid.uuid4()}"
        f"/musica/{uuid.uuid4()}/preferencia?preferida=true"
    )
    resp = await cliente_http.patch(url)
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_preferencia_parametro_obrigatorio_422(cliente_http: AsyncClient):
    with patch("backend.nucleo.auth_esigma.requests.get", return_value=_mock_validacao(LOJA_2181_UUID)):
        url = (
            f"/api/v1/player/sessao/{uuid.uuid4()}/momento/{uuid.uuid4()}"
            f"/musica/{uuid.uuid4()}/preferencia"
        )
        resp = await cliente_http.patch(url, headers={"Authorization": "Bearer t"})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_preferencia_sessao_inexistente_404(cliente_http: AsyncClient):
    with patch("backend.nucleo.auth_esigma.requests.get", return_value=_mock_validacao(LOJA_2181_UUID)):
        url = (
            f"/api/v1/player/sessao/{uuid.uuid4()}/momento/{uuid.uuid4()}"
            f"/musica/{uuid.uuid4()}/preferencia?preferida=true"
        )
        resp = await cliente_http.patch(url, headers={"Authorization": "Bearer t"})
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_preferencia_de_outra_loja_403(cliente_http: AsyncClient):
    """Usuário de outra Loja não pode alterar preferências da sessão da Loja 2181."""
    with patch("backend.nucleo.auth_esigma.requests.get", return_value=_mock_validacao(LOJA_2181_UUID)):
        headers = {"Authorization": "Bearer t"}
        resp_sessoes = await cliente_http.get(f"/api/v1/sessoes/loja/{LOJA_2181_UUID}", headers=headers)
        assert resp_sessoes.status_code == 200
        sessao = resp_sessoes.json()[0]
        evento_id = sessao["eventos_customizados"][0]["evento_id"]

    with patch("backend.nucleo.auth_esigma.requests.get", return_value=_mock_validacao(OUTRA_LOJA_UUID, email="outra@loja.com")):
        url = (
            f"/api/v1/player/sessao/{sessao['id']}/momento/{evento_id}"
            f"/musica/{uuid.uuid4()}/preferencia?preferida=true"
        )
        resp = await cliente_http.patch(url, headers={"Authorization": "Bearer outra"})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_preferencia_ciclo_marcar_e_desmarcar_reflete_no_player(cliente_http: AsyncClient):
    """Marca uma música como preferida, confere no payload do Player e restaura o estado original."""
    with patch("backend.nucleo.auth_esigma.requests.get", return_value=_mock_validacao(LOJA_2181_UUID)):
        headers = {"Authorization": "Bearer t"}
        sessoes = (await cliente_http.get(f"/api/v1/sessoes/loja/{LOJA_2181_UUID}", headers=headers)).json()
        sessao_id = sessoes[0]["id"]
        esteira = (await cliente_http.get(f"/api/v1/player/sessao/{sessao_id}", headers=headers)).json()[
            "esteira_ritualistica"
        ]
        momento = next((m for m in esteira if m["candidatas"]), None)
        if momento is None:
            pytest.skip("Nenhum momento com músicas candidatas no banco de testes.")

        alvo = next((c for c in momento["candidatas"] if not c["preferida"]), None)
        if alvo is None:
            pytest.skip("Todas as candidatas do momento já são preferidas.")

        base = f"/api/v1/player/sessao/{sessao_id}/momento/{momento['evento_id']}/musica/{alvo['id']}/preferencia"
        try:
            r1 = await cliente_http.patch(f"{base}?preferida=true", headers=headers)
            assert r1.status_code == 200 and r1.json()["preferida"] is True
            # Idempotente: repetir não duplica
            r2 = await cliente_http.patch(f"{base}?preferida=true", headers=headers)
            assert r2.status_code == 200

            esteira2 = (await cliente_http.get(f"/api/v1/player/sessao/{sessao_id}", headers=headers)).json()[
                "esteira_ritualistica"
            ]
            mom2 = next(m for m in esteira2 if m["evento_id"] == momento["evento_id"])
            assert next(c for c in mom2["candidatas"] if c["id"] == alvo["id"])["preferida"] is True
            # Com preferida marcada, a música sorteada precisa ser uma preferida
            assert mom2["musica_sorteada"]["preferida"] is True
        finally:
            r3 = await cliente_http.patch(f"{base}?preferida=false", headers=headers)
            assert r3.status_code == 200

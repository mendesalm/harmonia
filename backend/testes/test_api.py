"""
Bateria de Testes Automatizados de Integração da API do Harmonia.
Cobre os fluxos de Autenticação SSO (/auth/me), Loja 2181 (UUID sincronizado com e-Sigma),
Eventos Ritualísticos, Sessões e Montagem da Esteira do Player Ritualístico.
"""
from unittest.mock import MagicMock, patch
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from backend.main import aplicacao
from backend.nucleo.auth_esigma import limpar_cache_validacao
from backend.nucleo.banco import motor_assincrono
from backend.nucleo.configuracoes import configuracoes

LOJA_2181_UUID = "795b19d5-e14c-4c2e-b047-ee99e6e39a9c"


@pytest_asyncio.fixture
async def cliente_http(monkeypatch):
    """Fixture que fornece cliente HTTP assíncrono para testar os endpoints."""
    limpar_cache_validacao()
    monkeypatch.setattr(configuracoes, "ESIGMA_API_BASE_URL", "http://esigma.teste/api/v1")
    transporte = ASGITransport(app=aplicacao)
    async with AsyncClient(transport=transporte, base_url="http://test") as cliente:
        yield cliente
    await motor_assincrono.dispose()
    limpar_cache_validacao()


def _mock_validacao_esigma(
    email: str = "loja2181@harmonia.e-sigma.app",
    nome: str = "Estação Harmonia - ARLS 2181",
    user_id: str = "7aec23bf-9328-49b9-b78f-ddb007a74da3",
    role: str = "member",
    organizacao_id: str = LOJA_2181_UUID,
    cim: str | None = None,
    modulos_ativos: list[str] | None = None,
):
    """Cria mock de resposta de validação do e-Sigma IdP."""
    resp = MagicMock()
    resp.status_code = 200
    resp.json.return_value = {
        "valido": True,
        "usuario": {
            "email": email,
            "nome": nome,
            "user_id": user_id,
            "role": role,
            "organizacao_id": organizacao_id,
            "cim": cim,
            "cpf": None,
        },
        "modulos_ativos": modulos_ativos if modulos_ativos is not None else ["corevm", "harmonia"],
    }
    return resp


@pytest.mark.asyncio
async def test_status_sistema(cliente_http: AsyncClient):
    """Testa endpoint de status da aplicação."""
    resp = await cliente_http.get("/")
    assert resp.status_code == 200
    dados = resp.json()
    assert dados["status"] == "online"


@pytest.mark.asyncio
async def test_perfil_estacao_loja_2181_e_usuario_cim_272875(cliente_http: AsyncClient):
    """
    Testa consulta a /api/v1/auth/me tanto para a conta de estação
    loja2181@harmonia.e-sigma.app quanto para o obreiro de CIM 272875,
    confirmando a sincronização do UUID da Loja 2181 no harmoniadb.
    """
    with patch("backend.nucleo.auth_esigma.requests.get", return_value=_mock_validacao_esigma()):
        resp_estacao = await cliente_http.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer token-estacao-2181"},
        )
        assert resp_estacao.status_code == 200
        perfil_estacao = resp_estacao.json()
        assert perfil_estacao["email"] == "loja2181@harmonia.e-sigma.app"
        assert perfil_estacao["organizacao_id"] == LOJA_2181_UUID
        assert perfil_estacao["slug_armazenamento"] == "GOB_Loja2181"
        assert perfil_estacao["status_assinatura"] == "ATIVA"
        assert perfil_estacao["dados_especificos"]["rito_padrao"] == "Rito Brasileiro"
        assert perfil_estacao["dados_especificos"]["rito_id"] is not None

    mock_cim = _mock_validacao_esigma(
        email="mendesalm@gmail.com",
        nome="André Luiz Mendes",
        user_id="50edfb90-0275-4f3d-8a17-0a04607e0252",
        role="super_admin",
        organizacao_id=LOJA_2181_UUID,
        cim="272875",
    )
    with patch("backend.nucleo.auth_esigma.requests.get", return_value=mock_cim):
        resp_cim = await cliente_http.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer token-cim-272875"},
        )
        assert resp_cim.status_code == 200
        perfil_cim = resp_cim.json()
        assert perfil_cim["nome"] == "André Luiz Mendes"
        assert perfil_cim["organizacao_id"] == LOJA_2181_UUID
        assert perfil_cim["dados_especificos"]["cim"] == "272875"
        assert perfil_cim["dados_especificos"]["rito_padrao"] == "Rito Brasileiro"
        assert "super_admin" in perfil_cim["permissoes"]
        assert "mestre_harmonia" in perfil_cim["permissoes"]

        resp_orgs = await cliente_http.get(
            "/api/v1/organizacoes?apenas_ativas=false",
            headers={"Authorization": "Bearer token-cim-272875"},
        )
        assert resp_orgs.status_code == 200
        orgs = resp_orgs.json()
        loja_2181 = next((o for o in orgs if o["id"] == LOJA_2181_UUID), None)
        assert loja_2181 is not None
        assert loja_2181["rito_padrao"] == "Rito Brasileiro"
        assert loja_2181["rito_id"] is not None


@pytest.mark.asyncio
async def test_listagem_eventos_sessoes_e_player_loja_2181(cliente_http: AsyncClient):
    """Testa listagem de eventos, sessões da Loja 2181 e montagem da esteira do Player."""
    with patch("backend.nucleo.auth_esigma.requests.get", return_value=_mock_validacao_esigma()):
        headers = {"Authorization": "Bearer token-loja-2181"}

        resp_ev = await cliente_http.get("/api/v1/eventos", headers=headers)
        assert resp_ev.status_code == 200
        eventos = resp_ev.json()
        assert len(eventos) >= 10
        nomes_eventos = [ev["nome"] for ev in eventos]
        assert len(nomes_eventos) == len(set(nomes_eventos)), "Não deve haver momentos duplicados na listagem"

        resp_sessoes = await cliente_http.get(
            f"/api/v1/sessoes/loja/{LOJA_2181_UUID}",
            headers=headers,
        )
        assert resp_sessoes.status_code == 200
        sessoes = resp_sessoes.json()
        assert len(sessoes) >= 1
        sessao_id = sessoes[0]["id"]

        resp_player = await cliente_http.get(
            f"/api/v1/player/sessao/{sessao_id}",
            headers=headers,
        )
        assert resp_player.status_code == 200
        dados_player = resp_player.json()
        assert dados_player["sessao_id"] == sessao_id
        esteira = dados_player["esteira_ritualistica"]
        assert len(esteira) >= 22
        nomes_esteira = [m["evento_nome"] for m in esteira]
        assert any("Irmãos" in n for n in nomes_esteira), "Deve conter Ingresso no Templo - Irmãos na esteira"
        assert any("Cortejo" in n for n in nomes_esteira), "Deve conter Cortejo na esteira do Rito Brasileiro"

        # Testa atualização completa da sessão da Loja
        eventos_atuais = sessoes[0]["eventos_customizados"]
        resp_update = await cliente_http.put(
            f"/api/v1/sessoes/loja/{LOJA_2181_UUID}/{sessao_id}/completa",
            headers=headers,
            json={
                "nome_personalizado": sessoes[0]["nome_personalizado"] or "Sessão Ordinária",
                "eventos_customizados": [
                    {
                        "evento_id": ev["evento_id"],
                        "ordem_execucao": idx + 1,
                        "suprimido": ev["suprimido"],
                        "observacao_mestre_harmonia": ev.get("observacao_mestre_harmonia"),
                    }
                    for idx, ev in enumerate(eventos_atuais)
                ],
            },
        )
        assert resp_update.status_code == 200
        assert len(resp_update.json()["eventos_customizados"]) == len(eventos_atuais)

        # Testa vinculação e desvinculação de música do acervo ao evento ritualístico
        resp_musicas = await cliente_http.get("/api/v1/musicas", headers=headers)
        assert resp_musicas.status_code == 200
        musicas = resp_musicas.json()
        if musicas and eventos_atuais:
            ev_id = eventos_atuais[0]["evento_id"]
            mus_id = musicas[0]["id"]
            resp_vinc = await cliente_http.post(
                f"/api/v1/eventos/{ev_id}/musicas/{mus_id}",
                headers=headers
            )
            assert resp_vinc.status_code == 200
            assert resp_vinc.json()["status"] == "ok"

            # Desvinculação
            resp_desv = await cliente_http.delete(
                f"/api/v1/eventos/{ev_id}/musicas/{mus_id}",
                headers=headers
            )
            assert resp_desv.status_code == 200
            assert resp_desv.json()["status"] == "ok"

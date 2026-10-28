# EM CONFORMIDADE COM AS REGRAS DE OURO DO E-SIGMA
"""
Bateria de Testes Automatizados de Segurança, Autenticação SSO (e-Sigma) e RBAC do Harmonia (Fase 1).
Valida a conformidade estrita com o AGENTS.md:
- Nenhuma credencial hardcoded como default na classe Configuracoes;
- Validação de token contra GET /api/v1/auth/validate do e-Sigma IdP;
- Cache de validação por hash SHA-256;
- Bloqueio de assinatura inativa (403);
- Isolamento RBAC das rotas administrativas globais (/api/v1/admin/*).
"""
import inspect
from unittest.mock import MagicMock, patch
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from backend.main import aplicacao
from backend.nucleo.auth_esigma import limpar_cache_validacao
from backend.nucleo.banco import motor_assincrono
from backend.nucleo.configuracoes import Configuracoes


@pytest_asyncio.fixture(autouse=True)
async def limpar_cache_e_conexoes():
    """Limpa o cache de validação de tokens antes e após cada teste."""
    limpar_cache_validacao()
    yield
    limpar_cache_validacao()
    await motor_assincrono.dispose()


@pytest_asyncio.fixture
async def cliente_http():
    """Fornece cliente HTTP assíncrono para testar a aplicação FastAPI."""
    transporte = ASGITransport(app=aplicacao)
    async with AsyncClient(transport=transporte, base_url="http://test") as cliente:
        yield cliente


def _mock_resposta_esigma(
    status_code: int = 200,
    email: str = "mestre@loja2181.org.br",
    user_id: str = "11111111-2222-3333-4444-555555555555",
    role: str = "member",
    organizacao_id: str | None = None,
    modulos_ativos: list[str] | None = None,
):
    """Cria um objeto Mock simulando a resposta de GET /api/v1/auth/validate do e-Sigma."""
    mock_resp = MagicMock()
    mock_resp.status_code = status_code
    if status_code == 200:
        mock_resp.json.return_value = {
            "valido": True,
            "usuario": {
                "email": email,
                "user_id": user_id,
                "role": role,
                "organizacao_id": organizacao_id,
                "cim": "123456",
                "cpf": "12345678901",
            },
            "modulos_ativos": modulos_ativos if modulos_ativos is not None else ["corevm", "harmonia"],
        }
    else:
        mock_resp.text = "Não autorizado"
    return mock_resp


def test_sem_credenciais_hardcoded_no_codigo_de_configuracoes():
    """Garante que Configuracoes não possua senhas ou segredos hardcoded no código-fonte."""
    assert Configuracoes.model_fields["DATABASE_URL"].default == ""
    assert Configuracoes.model_fields["DATABASE_URL_SYNC"].default == ""
    assert Configuracoes.model_fields["CHAVE_SECRETA_JWT"].default == ""
    assert Configuracoes.model_fields["HARMONIA_PERMITIR_BYPASS_DEV"].default is False


@pytest.mark.asyncio
async def test_rotas_protegidas_rejeitam_requisicao_sem_token(cliente_http: AsyncClient):
    """Garante que rotas protegidas retornem 401 quando nenhum token Bearer é enviado."""
    rotas = [
        "/api/v1/auth/me",
        "/api/v1/eventos",
        "/api/v1/musicas",
        "/api/v1/admin/estatisticas",
        "/api/v1/admin/ritos",
    ]
    for rota in rotas:
        resp = await cliente_http.get(rota)
        assert resp.status_code == 401, f"A rota {rota} deveria exigir autenticação (retornou {resp.status_code})"


@pytest.mark.asyncio
async def test_token_invalido_rejeitado_pelo_esigma(cliente_http: AsyncClient):
    """Garante que um token recusado pelo e-Sigma (/auth/validate -> 401) retorne 401 no Harmonia."""
    with patch("backend.nucleo.auth_esigma.requests.get") as mock_get:
        mock_get.return_value = _mock_resposta_esigma(status_code=401)
        resp = await cliente_http.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer token_falso_ou_expirado"},
        )
        assert resp.status_code == 401
        mock_get.assert_called_once()


@pytest.mark.asyncio
async def test_bloqueio_quando_assinatura_harmonia_inativa(cliente_http: AsyncClient):
    """
    Garante que uma Loja autenticada no e-Sigma, mas SEM o módulo 'harmonia'
    na lista `modulos_ativos`, receba 403 Forbidden ao tentar acessar recursos do Harmonia.
    """
    with patch("backend.nucleo.auth_esigma.requests.get") as mock_get:
        mock_get.return_value = _mock_resposta_esigma(
            status_code=200,
            role="member",
            modulos_ativos=["corevm"],  # Harmonia ausente
        )
        headers = {"Authorization": "Bearer token_sem_assinatura_harmonia"}

        # /auth/me deve funcionar e informar status_assinatura == INATIVA
        resp_me = await cliente_http.get("/api/v1/auth/me", headers=headers)
        assert resp_me.status_code == 200
        assert resp_me.json()["status_assinatura"] == "INATIVA"
        assert resp_me.json()["tipo"] == "MESTRE_HARMONIA"

        # /eventos e /musicas devem bloquear com 403 Forbidden
        resp_eventos = await cliente_http.get("/api/v1/eventos", headers=headers)
        assert resp_eventos.status_code == 403

        resp_musicas = await cliente_http.get("/api/v1/musicas", headers=headers)
        assert resp_musicas.status_code == 403


@pytest.mark.asyncio
async def test_mestre_harmonia_com_assinatura_ativa_e_cache_de_validacao(cliente_http: AsyncClient):
    """
    Garante que o Mestre de Harmonia com módulo 'harmonia' ativo consiga consultar
    seu perfil e que o cache em memória evite chamadas repetidas ao e-Sigma para o mesmo token.
    """
    with patch("backend.nucleo.auth_esigma.requests.get") as mock_get:
        mock_get.return_value = _mock_resposta_esigma(
            status_code=200,
            email="harmonia@loja2181.org.br",
            role="member",
            modulos_ativos=["corevm", "harmonia"],
        )
        headers = {"Authorization": "Bearer token_valido_mestre"}

        resp1 = await cliente_http.get("/api/v1/auth/me", headers=headers)
        assert resp1.status_code == 200
        dados = resp1.json()
        assert dados["email"] == "harmonia@loja2181.org.br"
        assert dados["tipo"] == "MESTRE_HARMONIA"
        assert dados["status_assinatura"] == "ATIVA"

        # Segunda chamada com o mesmo token deve usar o cache em memória (sem nova chamada HTTP ao e-Sigma)
        resp2 = await cliente_http.get("/api/v1/auth/me", headers=headers)
        assert resp2.status_code == 200
        assert mock_get.call_count == 1


@pytest.mark.asyncio
async def test_rbac_rotas_admin_bloqueiam_membro_comum_e_liberam_super_admin(cliente_http: AsyncClient):
    """
    Garante que um usuário comum (mesmo com assinatura ativa do Harmonia) receba 403
    nas rotas `/api/v1/admin/*`, enquanto `super_admin` recebe 200 e perfil `ADMIN`.
    """
    with patch("backend.nucleo.auth_esigma.requests.get") as mock_get:
        # 1. Membro comum tentando acessar /admin/estatisticas -> 403 Forbidden
        mock_get.return_value = _mock_resposta_esigma(
            status_code=200,
            role="member",
            modulos_ativos=["corevm", "harmonia"],
        )
        resp_negado = await cliente_http.get(
            "/api/v1/admin/estatisticas",
            headers={"Authorization": "Bearer token_membro_comum"},
        )
        assert resp_negado.status_code == 403

        # 2. SuperAdmin acessando /auth/me -> tipo == ADMIN
        mock_get.return_value = _mock_resposta_esigma(
            status_code=200,
            email="sistema@e-sigma.app",
            role="super_admin",
            modulos_ativos=["corevm"],
        )
        resp_admin_me = await cliente_http.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer token_super_admin"},
        )
        assert resp_admin_me.status_code == 200
        dados_admin = resp_admin_me.json()
        assert dados_admin["tipo"] == "ADMIN"
        assert dados_admin["role"] == "super_admin"
        assert "super_admin" in dados_admin["permissoes"]


def test_reconhecimento_superadmin_por_email_sistema_esigma():
    """Garante que a conta do ecossistema 'sistema@e-sigma.app' seja incondicionalmente SuperAdmin."""
    from backend.nucleo.auth_esigma import UsuarioEsigma

    usuario_sistema = UsuarioEsigma(
        email="sistema@e-sigma.app",
        user_id="2f14b4a1-dcd7-4579-87b5-86aa73f7e412",
        role="super_admin",
        organizacao_id=None,
    )
    assert usuario_sistema.is_super_admin is True
    assert usuario_sistema.harmonia_ativo is True


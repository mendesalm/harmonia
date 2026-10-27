"""
Testes Automatizados para o Mecanismo de Classificação de Músicas por Estilo e Subclassificação,
Regra de Inclusão no Player e Atribuição de Múltiplos Momentos pelo SuperAdmin.
"""
import uuid
import pytest
from backend.nucleo.constantes import EstiloMusica, SubclassificacaoMusica, normalizar_estilo, normalizar_subclassificacao
from backend.api.player.schemas import MusicaSorteadaInfo
from backend.api.player.servicos import sortear_entre_candidatas


def test_normalizacao_estilos_e_subclassificacoes():
    """Valida a sanitização de strings para os enums de estilo e subclassificação."""
    assert normalizar_estilo("violao") == EstiloMusica.VIOLAO.value
    assert normalizar_estilo("CLASSICA") == EstiloMusica.CLASSICA.value
    assert normalizar_estilo("inexistente") == EstiloMusica.UNIVERSAL.value
    assert normalizar_estilo("") == EstiloMusica.UNIVERSAL.value

    assert normalizar_subclassificacao("ambiente") == SubclassificacaoMusica.AMBIENTE.value
    assert normalizar_subclassificacao("GERAL") == SubclassificacaoMusica.GERAL.value
    assert normalizar_subclassificacao("outra") == SubclassificacaoMusica.GERAL.value
    assert normalizar_subclassificacao("") == SubclassificacaoMusica.GERAL.value


def test_sorteio_prioriza_faixas_ambiente_em_momento_surdina():
    """
    Quando o momento ritualístico for classificado em surdina,
    o sorteio deve priorizar faixas com subclassificação AMBIENTE.
    """
    musica_geral = MusicaSorteadaInfo(
        id=uuid.uuid4(),
        titulo="Marcha Solene de Abertura",
        autor_artista="Banda Marcial",
        tipo_midia="LOCAL_ARQUIVO",
        caminho_arquivo="/audio1.mp3",
        link_externo=None,
        duracao_segundos=180,
        preferida=False,
        surdina=False,
        estilo="UNIVERSAL",
        subclassificacao="GERAL",
    )
    musica_ambiente = MusicaSorteadaInfo(
        id=uuid.uuid4(),
        titulo="Romance de Amor - Violão Noturno",
        autor_artista="Narciso Yepes",
        tipo_midia="LOCAL_ARQUIVO",
        caminho_arquivo="/audio2.mp3",
        link_externo=None,
        duracao_segundos=195,
        preferida=False,
        surdina=True,
        estilo="VIOLAO",
        subclassificacao="AMBIENTE",
    )

    candidatas = [musica_geral, musica_ambiente]

    # Em momento de surdina, deve escolher a faixa Ambiente
    for _ in range(10):
        escolhida = sortear_entre_candidatas(candidatas, momento_em_surdina=True)
        assert escolhida is not None
        assert escolhida.id == musica_ambiente.id
        assert escolhida.subclassificacao == "AMBIENTE"

    # Em momento normal (sem surdina), ambas são elegíveis
    sorteadas = set()
    for _ in range(30):
        escolhida = sortear_entre_candidatas(candidatas, momento_em_surdina=False)
        assert escolhida is not None
        sorteadas.add(escolhida.id)
    # Com 30 repetições, ambas devem ter sido sorteadas
    assert len(sorteadas) == 2


def test_sorteio_fallback_quando_nao_ha_faixas_ambiente():
    """
    Se o momento for em surdina mas não houver faixas com subclassificação AMBIENTE,
    o sistema deve fazer fallback gracioso para as faixas GERAL sem travar.
    """
    musica_geral = MusicaSorteadaInfo(
        id=uuid.uuid4(),
        titulo="Tema Fraterno",
        autor_artista="Orquestra",
        tipo_midia="LOCAL_ARQUIVO",
        caminho_arquivo="/audio.mp3",
        link_externo=None,
        duracao_segundos=150,
        preferida=False,
        surdina=False,
        estilo="UNIVERSAL",
        subclassificacao="GERAL",
    )
    escolhida = sortear_entre_candidatas([musica_geral], momento_em_surdina=True)
    assert escolhida is not None
    assert escolhida.id == musica_geral.id

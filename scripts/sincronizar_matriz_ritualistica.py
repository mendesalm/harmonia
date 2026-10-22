"""
Script de Migração e Harmonização das Regras de Negócio do Harmonia:
1. Garante os 10 Tipos de Sessão Canônicos oficiais.
2. Registra os 42 Momentos Canônicos Ritualísticos e mapeia suas ordens por Tipo de Sessão.
3. Cria/atualiza os TipoSessao para os Ritos existentes (Rito Brasileiro, REAA) associando os eventos nas sequências especificadas.
"""
import asyncio
import uuid
import sys
from pathlib import Path

# Adiciona a raiz do projeto ao sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload

from backend.nucleo.banco import SessaoAssincronaLocal
from backend.modelos.canonico import TipoSessaoCanonico, MomentoCanonico
from backend.modelos.rito import Rito
from backend.modelos.evento import Evento
from backend.modelos.sessao import TipoSessao, TipoSessaoEvento

# 1. Os 10 Tipos de Sessão Oficiais
TIPOS_SESSAO_OFICIAIS = [
    ("Sessão Magna de Iniciação", "Iniciação"),
    ("Sessão Magna de Elevação", "Elevação"),
    ("Sessão Magna de Exaltação", "Exaltação"),
    ("Sessão Magna de Instalação", "Instalação"),
    ("Sessão Magna de Posse", "Posse"),
    ("Sessão Magna Geral", "Geral"),
    ("Sessão Ordinária Grau Aprendiz", "Aprendiz"),
    ("Sessão Ordinária Grau Companheiro", "Companheiro"),
    ("Sessão Ordinária Grau Mestre", "Mestre"),
    ("Sessão Filosófica", "Filosófica"),
]

# 2. Definição dos 42 Momentos e suas Regras de Aplicação
# Tupla: (Nome, Regra, Observacao_Padrao)
MOMENTOS_DEFINICAO = [
    ("Entrada do Cortejo", "TODAS", None),
    ("Verificações Iniciais", "TODAS", None),
    ("Cerimônia das Luzes", "TODAS", None),
    ("Transmissão da Palavra Sagrada", "TODAS", None),
    ("Abertura do Livro da Lei", "TODAS", None),
    ("Formação da Comissão Autoridades", "TODAS", None),
    ("Entrada das Autoridades", "TODAS", None),
    ("Entrada do Grão Mestre", "TODAS", None),
    ("Interlúdio para a Entrada do Pavilhão Nacional", "MAGNAS", "Música em Surdina (fundo instrumental suave). Pular momento se necessário."),
    ("Entrada do Pavilhão Nacional", "MAGNAS", None),
    ("Interlúdio para a entrada do Candidato", "INICIACAO", "Música em Surdina (fundo instrumental suave). Pular momento se necessário."),
    ("Entrada do Candidato", "INICIACAO", None),
    ("Interlúdio da Primeira Prédica", "INICIACAO", "Música em Surdina (fundo instrumental suave). Pular momento se necessário."),
    ("O Salto", "INICIACAO", None),
    ("Interlúdio da Oração", "INICIACAO", "Música em Surdina (fundo instrumental suave). Pular momento se necessário."),
    ("Interlúdio da Segunda Prédica", "INICIACAO", "Música em Surdina (fundo instrumental suave). Pular momento se necessário."),
    ("Interlúdio dos Deveres Essenciais", "INICIACAO", "Música em Surdina (fundo instrumental suave). Pular momento se necessário."),
    ("Caminho à Taça Sagrada", "INICIACAO", None),
    ("Descida da Taça Sagrada", "INICIACAO", None),
    ("Interlúdio da Terceira Prédica", "INICIACAO", "Música em Surdina (fundo instrumental suave). Pular momento se necessário."),
    ("Primeira Viagem", "INICIACAO", None),
    ("Segunda Viagem", "INICIACAO", None),
    ("Purificação pela Água", "INICIACAO", None),
    ("Purificação pelo Fogo", "INICIACAO", None),
    ("Interlúdio do Compromisso", "INIC_ELEV_EXALT", "Música em Surdina (fundo instrumental suave). Pular momento se necessário."),
    ("Interlúdio do Intervalo de Recomposição", "INICIACAO", "Música em Surdina (fundo instrumental suave). Pular momento se necessário."),
    ("Interlúdio para o Solene Juramento", "INIC_ELEV_EXALT", "Música em Surdina (fundo instrumental suave). Pular momento se necessário."),
    ("A Luz", "INICIACAO", None),
    ("Interlúdio para a Consagração", "INIC_ELEV_EXALT", "Música em Surdina (fundo instrumental suave). Pular momento se necessário."),
    ("Interlúdio para a Investidura", "INIC_ELEV_EXALT", "Música em Surdina (fundo instrumental suave). Pular momento se necessário."),
    ("Interlúdio para a Primeira Instrução", "INIC_ELEV_EXALT", "Música em Surdina (fundo instrumental suave). Pular momento se necessário."),
    ("Assinatura do Livro de Presenças", "INIC_ELEV_EXALT", None),
    ("Distribuição das Flores", "INICIACAO", None),
    ("Interlúdio para as Palavras do Orador", "MAGNAS", "Música em Surdina (fundo instrumental suave). Pular momento se necessário."),
    ("Tronco de Beneficência", "TODAS", None),
    ("Interlúdio para Saudação ao Pavilhão Nacional", "MAGNAS", "Música em Surdina (fundo instrumental suave). Pular momento se necessário."),
    ("Saída do Pavilhão Nacional", "MAGNAS", None),
    ("Saída das Autoridades", "TODAS", None),
    ("Retorno da Palavra", "TODAS", None),
    ("Fechamento do Livro da Lei", "TODAS", None),
    ("Amortização das Luzes", "TODAS", None),
    ("Saída do Cortejo", "TODAS", None),
]

def momento_pertence_ao_tipo(regra: str, tipo_nome: str) -> bool:
    """Verifica se um momento litúrgico deve constar na esteira de determinado tipo de sessão."""
    eh_magna = "Magna" in tipo_nome
    eh_iniciacao = "Iniciação" in tipo_nome
    eh_elevacao = "Elevação" in tipo_nome
    eh_exaltacao = "Exaltação" in tipo_nome

    if regra == "TODAS":
        return True
    if regra == "MAGNAS":
        return eh_magna
    if regra == "INICIACAO":
        return eh_iniciacao
    if regra == "INIC_ELEV_EXALT":
        return eh_iniciacao or eh_elevacao or eh_exaltacao
    return False


async def sincronizar_matriz_ritualistica():
    async with SessaoAssincronaLocal() as db:
        print("1. Garantindo Tipos de Sessão Canônicos...")
        mapa_tipos_can = {}
        for nome_completo, apelido in TIPOS_SESSAO_OFICIAIS:
            stmt = select(TipoSessaoCanonico).where(TipoSessaoCanonico.nome == nome_completo)
            res = await db.execute(stmt)
            obj = res.scalar_one_or_none()
            if not obj:
                obj = TipoSessaoCanonico(nome=nome_completo, descricao=f"Sessão {apelido}")
                db.add(obj)
                await db.flush()
            mapa_tipos_can[nome_completo] = obj

        print("2. Garantindo Momentos Canônicos...")
        mapa_momentos_can = {}
        for idx, (nome, regra, obs) in enumerate(MOMENTOS_DEFINICAO, start=1):
            stmt = select(MomentoCanonico).where(MomentoCanonico.nome == nome)
            res = await db.execute(stmt)
            obj = res.scalar_one_or_none()
            if not obj:
                obj = MomentoCanonico(
                    nome=nome,
                    descricao=f"Momento ritualístico canônico: {nome}",
                    orientacao=obs,
                    ordem_sugerida=idx
                )
                db.add(obj)
                await db.flush()
            else:
                if obs and not obj.orientacao:
                    obj.orientacao = obs
            mapa_momentos_can[nome] = obj

        # Buscar todos os ritos cadastrados
        res_ritos = await db.execute(select(Rito))
        ritos = res_ritos.scalars().all()

        print(f"3. Sincronizando Eventos dos Ritos ({len(ritos)} ritos encontrados)...")
        for rito in ritos:
            print(f"   -> Rito: {rito.nome}")
            # Garante que cada momento canônico tenha um Evento no Rito
            mapa_eventos_rito = {}
            for nome, regra, obs in MOMENTOS_DEFINICAO:
                m_can = mapa_momentos_can[nome]
                stmt_ev = select(Evento).where(Evento.rito_id == rito.id, Evento.canonico_id == m_can.id)
                res_ev = await db.execute(stmt_ev)
                ev = res_ev.scalar_one_or_none()
                if not ev:
                    # Busca por nome caso já existisse sem canonico_id
                    stmt_nome = select(Evento).where(Evento.rito_id == rito.id, Evento.nome == nome)
                    res_nome = await db.execute(stmt_nome)
                    ev = res_nome.scalar_one_or_none()
                    if ev:
                        ev.canonico_id = m_can.id
                        if obs and not ev.observacao_padrao_mestre_harmonia:
                            ev.observacao_padrao_mestre_harmonia = obs
                    else:
                        ev = Evento(
                            nome=nome,
                            rito_id=rito.id,
                            canonico_id=m_can.id,
                            descricao=m_can.descricao,
                            observacao_padrao_mestre_harmonia=obs
                        )
                        db.add(ev)
                        await db.flush()
                else:
                    if obs and not ev.observacao_padrao_mestre_harmonia:
                        ev.observacao_padrao_mestre_harmonia = obs
                mapa_eventos_rito[nome] = ev

            # Garante os 10 TipoSessao para este Rito
            for nome_sessao, apelido in TIPOS_SESSAO_OFICIAIS:
                t_can = mapa_tipos_can[nome_sessao]
                stmt_ts = select(TipoSessao).where(TipoSessao.rito_id == rito.id, TipoSessao.nome == nome_sessao)
                res_ts = await db.execute(stmt_ts)
                t_sessao = res_ts.scalar_one_or_none()
                if not t_sessao:
                    t_sessao = TipoSessao(
                        nome=nome_sessao,
                        rito_id=rito.id,
                        canonico_id=t_can.id
                    )
                    db.add(t_sessao)
                    await db.flush()
                else:
                    t_sessao.canonico_id = t_can.id

                # Popula os TipoSessaoEvento na sequência exata de cada tipo
                momentos_do_tipo = [
                    (nome, regra, obs)
                    for (nome, regra, obs) in MOMENTOS_DEFINICAO
                    if momento_pertence_ao_tipo(regra, nome_sessao)
                ]

                # Remove eventos existentes deste template para reconstruir na sequência exata
                await db.execute(
                    delete(TipoSessaoEvento).where(TipoSessaoEvento.tipo_sessao_id == t_sessao.id)
                )

                for pos, (nome_momento, _, _) in enumerate(momentos_do_tipo, start=1):
                    ev_rito = mapa_eventos_rito[nome_momento]
                    db.add(TipoSessaoEvento(
                        tipo_sessao_id=t_sessao.id,
                        evento_id=ev_rito.id,
                        ordem_sequencia=pos,
                        momento_silencio=False
                    ))

                print(f"      - {nome_sessao}: {len(momentos_do_tipo)} momentos configurados.")

        await db.commit()
        print("Sincronização da Matriz Ritualística concluída com sucesso!")

if __name__ == "__main__":
    asyncio.run(sincronizar_matriz_ritualistica())

"""
Script de Inicialização e População Inicial (Seed) do Banco de Dados Harmonia.
Cria as tabelas no PostgreSQL e insere os ritos, eventos globais, templates de sessão e loja modelo.
"""
import asyncio
import sys
import uuid
from pathlib import Path

DIRETORIO_RAIZ = str(Path(__file__).resolve().parent.parent)
if DIRETORIO_RAIZ not in sys.path:
    sys.path.insert(0, DIRETORIO_RAIZ)

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from backend.nucleo.banco import motor_assincrono, Base, SessaoAssincronaLocal
from backend.nucleo.armazenamento import ServicoArmazenamentoTenant
from backend.nucleo.formatadores import formatar_titulo_inteligente
from backend.modelos import Organizacao, Evento, Musica, MusicaEvento
from backend.modelos.rito import Rito
from backend.modelos.sessao import TipoSessao, TipoSessaoEvento, SessaoLoja, SessaoLojaEvento
from backend.modelos.pessoa import Pessoa
from backend.nucleo.seguranca import gerar_hash_senha

# Eventos do Rito Brasileiro (conforme especificado pelo usuário)
EVENTOS_BRASILEIRO = [
    # Ordinária
    "Ingresso no Templo - Irmãos", "Ingresso no Templo - Cortejo", "Verificações Iniciais",
    "Cerimônia das Luzes", "Transmissão da Palavra Sagrada", "Abertura do Livro da Lei",
    "Leitura e Aprovação da Ata", "Expediente", "Saco de Propostas e Informação",
    "Ordem do Dia", "Entrada de Visitantes - Autoridades", "Escrutínio Secreto",
    "Tempo de Instrução", "Tronco de Beneficência", "Palavra a Bem Geral da Ordem e do Quadro em Particular",
    "Retirada das Autoridades", "Verificações Finais", "Retorno da Palavra",
    "Fechamento do Livro da Lei", "Amortização das Luzes", "Conclusão do Trabalhos", "Retirada dos Irmãos",
    # Iniciação adicionais
    "Entrada do Pavilhão Nacional", "Preparo do Candidato", "Ingresso do Candidato no Templo",
    "Taça Sagrada", "Primeira Viagem", "Segunda Viagem", "Terceira Viagem",
    "Compromisso de Adesão", "Decisão Final da Loja", "Retorno do Candidato",
    "Solene Juramento", "A Luz", "Consagração", "Investidura", "Assinatura do Livro de Presenças", "Distribuição de Flores"
]

async def inicializar_banco():
    print("Iniciando criacao de tabelas no PostgreSQL...")
    async with motor_assincrono.begin() as conn:
        print("Limpando banco de dados anterior (Drop Schema CASCADE)...")
        await conn.execute(text("DROP SCHEMA public CASCADE"))
        await conn.execute(text("CREATE SCHEMA public"))
        await conn.execute(text("GRANT ALL ON SCHEMA public TO public"))
        print("Criando novas tabelas...")
        await conn.run_sync(Base.metadata.create_all)
    print("Tabelas verificadas com sucesso!")

    async with SessaoAssincronaLocal() as db:
        # 1. Ritos
        print("Criando Ritos...")
        ritos_dados = ["REAA", "Rito Brasileiro"]
        ritos_obj = {}
        for nome_rito in ritos_dados:
            res = await db.execute(select(Rito).where(Rito.nome == nome_rito))
            r = res.scalar_one_or_none()
            if not r:
                r = Rito(nome=nome_rito, descricao=f"Rito {nome_rito}")
                db.add(r)
                await db.flush()
                print(f" [+] Rito criado: {nome_rito}")
            ritos_obj[nome_rito] = r

        # 2. Eventos Globais
        print("Criando Eventos Globais...")
        eventos_obj = {}
        for ev_nome in EVENTOS_BRASILEIRO:
            res = await db.execute(select(Evento).where(Evento.nome == ev_nome))
            ev = res.scalar_one_or_none()
            if not ev:
                ev = Evento(nome=ev_nome, observacao_padrao_mestre_harmonia="Aguardar comando do Venerável Mestre.")
                db.add(ev)
                await db.flush()
            eventos_obj[ev_nome] = ev

        # 3. Tipos de Sessão (Templates)
        print("Criando Templates de Sessao...")
        rito_br = ritos_obj["Rito Brasileiro"]
        
        # Ordinaria Rito BR
        res = await db.execute(select(TipoSessao).where(TipoSessao.nome == "Sessão Ordinária", TipoSessao.rito_id == rito_br.id))
        ts_ord = res.scalar_one_or_none()
        if not ts_ord:
            ts_ord = TipoSessao(nome="Sessão Ordinária", rito_id=rito_br.id)
            db.add(ts_ord)
            await db.flush()
            # Adiciona eventos (apenas os ordinários)
            ordem = 1
            for ev_nome in EVENTOS_BRASILEIRO[:22]: # Os 22 primeiros
                db.add(TipoSessaoEvento(tipo_sessao_id=ts_ord.id, evento_id=eventos_obj[ev_nome].id, ordem_sequencia=ordem))
                ordem += 1

        # 4. Loja Modelo
        print("Verificando Loja Modelo...")
        res_org = await db.execute(select(Organizacao).where(Organizacao.slug_armazenamento == "GOB_Loja2181"))
        loja_modelo = res_org.scalar_one_or_none()
        if not loja_modelo:
            loja_modelo = Organizacao(
                nome="A.R.L.S. João Pedro Junqueira nº 2181",
                slug_armazenamento="GOB_Loja2181",
                rito_id=rito_br.id, # Vinculado ao Rito BR
                dados_especificos={"numero": "2181"}
            )
            db.add(loja_modelo)
            await db.flush()
            print(f" [+] Loja Modelo Criada")

        ServicoArmazenamentoTenant.provisionar_estrutura_tenant(loja_modelo.slug_armazenamento)

        # 5. Instanciando a Sessão para a Loja
        print("Instanciando Sessao na Loja...")
        res_sl = await db.execute(select(SessaoLoja).where(SessaoLoja.loja_id == loja_modelo.id, SessaoLoja.tipo_sessao_id == ts_ord.id))
        sl = res_sl.scalar_one_or_none()
        if not sl:
            sl = SessaoLoja(loja_id=loja_modelo.id, tipo_sessao_id=ts_ord.id, nome_personalizado="Minha Sessão Ordinária BR")
            db.add(sl)
            await db.flush()
            
            # Copia os eventos do template
            res_tse = await db.execute(select(TipoSessaoEvento).where(TipoSessaoEvento.tipo_sessao_id == ts_ord.id))
            for tse in res_tse.scalars():
                sle = SessaoLojaEvento(
                    sessao_loja_id=sl.id,
                    evento_id=tse.evento_id,
                    ordem_execucao=tse.ordem_sequencia,
                    observacao_mestre_harmonia=tse.evento.observacao_padrao_mestre_harmonia
                )
                db.add(sle)

        # 6. Usuários
        print("Verificando usuarios...")
        stmt_u = select(Pessoa).where(Pessoa.email == "mestre.harmonia@e-sigma.app")
        u_existente = (await db.execute(stmt_u)).scalar_one_or_none()
        if not u_existente:
            novo_u = Pessoa(
                nome="Mestre de Harmonia", email="mestre.harmonia@e-sigma.app",
                senha_hash=gerar_hash_senha("harmonia@2026"), tipo="MESTRE_HARMONIA",
                organizacao_id=loja_modelo.id, dados_civis={"permissoes_sistema": ["mestre_harmonia"]},
                dados_especificos={}, status_acesso=True
            )
            db.add(novo_u)
            print(f" [+] Usuario Mestre de Harmonia Criado")

        await db.commit()
        print("Inicializacao concluida com sucesso!")

if __name__ == "__main__":
    asyncio.run(inicializar_banco())

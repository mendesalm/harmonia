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
from backend.modelos import Organizacao, Evento, Pessoa
from backend.modelos.rito import Rito
from backend.modelos.sessao import TipoSessao, TipoSessaoEvento, SessaoLoja, SessaoLojaEvento
from backend.modelos.canonico import TipoSessaoCanonico, MomentoCanonico
from backend.nucleo.seguranca import gerar_hash_senha

SESSOES_CANONICAS = [
    "Sessão Ordinária no Grau de Aprendiz",
    "Sessão Ordinária no Grau de Companheiro",
    "Sessão Ordinária no Grau de Mestre",
    "Sessão Magna",
    "Sessão Magna de Iniciação",
    "Sessão Magna de Elevação",
    "Sessão Magna de Exaltação"
]

MOMENTOS_ORDINARIA = {
    "Ingresso no Templo - Irmãos": 10, "Ingresso no Templo - Cortejo": 20, "Verificações Iniciais": 30,
    "Cerimônia das Luzes": 40, "Transmissão da Palavra Sagrada": 50, "Abertura do Livro da Lei": 60,
    "Leitura e Aprovação da Ata": 70, "Expediente": 80, "Saco de Propostas e Informação": 90,
    "Ordem do Dia": 100, "Entrada de Visitantes - Autoridades": 110, "Escrutínio Secreto": 120,
    "Tempo de Instrução": 300, "Tronco de Beneficência": 310, "Palavra a Bem Geral da Ordem e do Quadro em Particular": 320,
    "Retirada das Autoridades": 330, "Verificações Finais": 340, "Retorno da Palavra": 350,
    "Fechamento do Livro da Lei": 360, "Amortização das Luzes": 370, "Conclusão do Trabalhos": 380, "Retirada dos Irmãos": 390
}

MOMENTOS_INICIACAO = {
    "Entrada do Pavilhão Nacional": 130, "Preparo do Candidato": 140, "Ingresso do Candidato no Templo": 150,
    "Taça Sagrada": 160, "Primeira Viagem Iniciação": 170, "Segunda Viagem Iniciação": 180, "Terceira Viagem Iniciação": 190,
    "Compromisso de Adesão": 200, "Decisão Final da Loja": 210, "Retorno do Candidato": 220,
    "Solene Juramento": 230, "A Luz": 240, "Consagração": 250, "Investidura": 260, "Assinatura do Livro de Presenças": 270, "Distribuição de Flores": 280
}

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
        
        # 1. Sessões Canônicas
        print("Criando Sessões Canônicas...")
        sessoes_can_obj = {}
        for nome in SESSOES_CANONICAS:
            scan = TipoSessaoCanonico(nome=nome)
            db.add(scan)
            sessoes_can_obj[nome] = scan
        await db.flush()

        # 2. Momentos Canônicos
        print("Criando Momentos Canônicos...")
        momentos_can_obj = {}
        todos_momentos = {**MOMENTOS_ORDINARIA, **MOMENTOS_INICIACAO}
        for nome, ordem_sug in todos_momentos.items():
            mcan = MomentoCanonico(nome=nome, ordem_sugerida=ordem_sug)
            db.add(mcan)
            momentos_can_obj[nome] = mcan
        await db.flush()

        # 3. Ritos (Brasileiro e REAA espelhado)
        print("Criando Ritos e Eventos/Templates (Espelhamento)...")
        ritos_nomes = ["Rito Brasileiro", "REAA"]
        ritos_obj = {}
        
        for nome_rito in ritos_nomes:
            rito = Rito(nome=nome_rito, descricao=f"Rito {nome_rito}")
            db.add(rito)
            await db.flush()
            ritos_obj[nome_rito] = rito
            
            # 3.1 Eventos do Rito (Apontando para os Canônicos)
            eventos_rito_obj = {}
            for nome_can, mcan in momentos_can_obj.items():
                ev = Evento(
                    nome=nome_can, 
                    rito_id=rito.id,
                    canonico_id=mcan.id,
                    observacao_padrao_mestre_harmonia="Aguardar comando do Venerável Mestre."
                )
                db.add(ev)
                eventos_rito_obj[nome_can] = ev
            await db.flush()
            
            # 3.2 Template: Sessão Ordinária
            ts_ord = TipoSessao(nome="Sessão Ordinária", rito_id=rito.id, canonico_id=sessoes_can_obj["Sessão Ordinária no Grau de Aprendiz"].id)
            db.add(ts_ord)
            await db.flush()
            
            ordem = 1
            for nome_can in MOMENTOS_ORDINARIA.keys():
                db.add(TipoSessaoEvento(tipo_sessao_id=ts_ord.id, evento_id=eventos_rito_obj[nome_can].id, ordem_sequencia=ordem))
                ordem += 1
                
            # 3.3 Template: Sessão Magna de Iniciação
            ts_ini = TipoSessao(nome="Sessão Magna de Iniciação", rito_id=rito.id, canonico_id=sessoes_can_obj["Sessão Magna de Iniciação"].id)
            db.add(ts_ini)
            await db.flush()
            
            ordem = 1
            nomes_ord = list(MOMENTOS_ORDINARIA.keys())
            # Inserir eventos antes da Ordem do Dia (1 a 9)
            for nome_can in nomes_ord[:9]:
                db.add(TipoSessaoEvento(tipo_sessao_id=ts_ini.id, evento_id=eventos_rito_obj[nome_can].id, ordem_sequencia=ordem))
                ordem += 1
                
            # Inserir eventos de Iniciação (substituindo Ordem do Dia)
            for nome_can in MOMENTOS_INICIACAO.keys():
                db.add(TipoSessaoEvento(tipo_sessao_id=ts_ini.id, evento_id=eventos_rito_obj[nome_can].id, ordem_sequencia=ordem))
                ordem += 1
                
            # Inserir resto dos eventos (11 a 22)
            for nome_can in nomes_ord[10:]:
                db.add(TipoSessaoEvento(tipo_sessao_id=ts_ini.id, evento_id=eventos_rito_obj[nome_can].id, ordem_sequencia=ordem))
                ordem += 1


        # 4. Lojas Modelo
        print("Criando Lojas Modelo...")
        rito_br = ritos_obj["Rito Brasileiro"]
        loja_modelo = Organizacao(
            nome="A.R.L.S. João Pedro Junqueira nº 2181",
            slug_armazenamento="GOB_Loja2181",
            rito_id=rito_br.id,
            dados_especificos={"numero": "2181"}
        )
        db.add(loja_modelo)
        await db.flush()
        ServicoArmazenamentoTenant.provisionar_estrutura_tenant(loja_modelo.slug_armazenamento)
        
        # Obter ts_ord do Rito Brasileiro recem criado para a Loja
        res_ts_ord = await db.execute(select(TipoSessao).where(TipoSessao.rito_id == rito_br.id, TipoSessao.nome == "Sessão Ordinária"))
        ts_ord_br = res_ts_ord.scalar_one()

        # Instanciando Sessao Ordinaria na Loja
        sl = SessaoLoja(loja_id=loja_modelo.id, tipo_sessao_id=ts_ord_br.id, nome_personalizado="Minha Sessão Ordinária")
        db.add(sl)
        await db.flush()
        
        res_tse = await db.execute(select(TipoSessaoEvento).where(TipoSessaoEvento.tipo_sessao_id == ts_ord_br.id))
        for tse in res_tse.scalars():
            sle = SessaoLojaEvento(
                sessao_loja_id=sl.id,
                evento_id=tse.evento_id,
                ordem_execucao=tse.ordem_sequencia,
                # Removido observacao_mestre_harmonia porque causava erro de lazy load no seed, pode ficar null padrao
            )
            db.add(sle)

        # 5. Usuários
        print("Verificando usuarios...")
        novo_u1 = Pessoa(
            nome="Demo Loja 2181", email="loja2181@harmonia.sigma.app",
            senha_hash=gerar_hash_senha("harmonia@2026"), tipo="MESTRE_HARMONIA",
            organizacao_id=loja_modelo.id, dados_civis={"permissoes_sistema": ["mestre_harmonia"]},
            dados_especificos={}, status_acesso=True
        )
        db.add(novo_u1)

        novo_u2 = Pessoa(
            nome="SuperAdmin Sigma", email="sistema@e-sigma.app",
            senha_hash=gerar_hash_senha("harmonia@2026"), tipo="ADMIN",
            organizacao_id=None, dados_civis={"permissoes_sistema": ["admin"]},
            dados_especificos={}, status_acesso=True
        )
        db.add(novo_u2)

        await db.commit()
        print("Inicializacao concluida com sucesso!")

if __name__ == "__main__":
    asyncio.run(inicializar_banco())

"""
Script de Inicialização e População Inicial (Seed) do Banco de Dados Harmonia.
Cria as tabelas no PostgreSQL e insere os eventos ritualísticos padrão e loja modelo.
"""
import asyncio
import sys
import uuid
from pathlib import Path

DIRETORIO_RAIZ = str(Path(__file__).resolve().parent.parent)
if DIRETORIO_RAIZ not in sys.path:
    sys.path.insert(0, DIRETORIO_RAIZ)

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.nucleo.banco import motor_assincrono, Base, SessaoAssincronaLocal
from backend.nucleo.armazenamento import ServicoArmazenamentoTenant
from backend.nucleo.formatadores import formatar_titulo_inteligente
from backend.modelos import Organizacao, Evento, Sessao, SessaoEvento, Musica, MusicaEvento

# Lista de Eventos Ritualísticos Padrão Maçônicos
EVENTOS_PADRAO = [
    {
        "nome": "Entrada do Cortejo",
        "descricao": "Música solene para o ingresso das Luzes e Oficiais no Templo.",
        "categoria_rito": "Geral",
        "ordem_sugerida": 1
    },
    {
        "nome": "Cerimônia das Luzes",
        "descricao": "Harmonia para o acendimento das Luzes no Altar e colunas.",
        "categoria_rito": "Geral",
        "ordem_sugerida": 2
    },
    {
        "nome": "Abertura do Livro da Lei",
        "descricao": "Música reverente durante a abertura do Livro Sagrado e posicionamento do Esquadro e Compasso.",
        "categoria_rito": "Geral",
        "ordem_sugerida": 3
    },
    {
        "nome": "Entrada do Pavilhão Nacional",
        "descricao": "Hino à Bandeira ou marcha solene para recepção da Bandeira Nacional.",
        "categoria_rito": "Geral",
        "ordem_sugerida": 4
    },
    {
        "nome": "Entrada de Autoridades",
        "descricao": "Marcha para recepção de Grão-Mestres, Delegados e Autoridades Maçônicas.",
        "categoria_rito": "Geral",
        "ordem_sugerida": 5
    },
    {
        "nome": "Tronco de Beneficência",
        "descricao": "Harmonia suave para o giro do Tronco de Solidariedade.",
        "categoria_rito": "Geral",
        "ordem_sugerida": 6
    },
    {
        "nome": "Saída do Pavilhão Nacional",
        "descricao": "Música patriótica ou hino para saudação e retirada da Bandeira.",
        "categoria_rito": "Geral",
        "ordem_sugerida": 7
    },
    {
        "nome": "Fechamento do Livro da Lei",
        "descricao": "Música reverente para o encerramento dos trabalhos litúrgicos.",
        "categoria_rito": "Geral",
        "ordem_sugerida": 8
    },
    {
        "nome": "Amortização das Luzes",
        "descricao": "Harmonia solene para o apagamento das luzes.",
        "categoria_rito": "Geral",
        "ordem_sugerida": 9
    },
    {
        "nome": "Cadeia de União",
        "descricao": "Música reflexiva e fraternal para a formação da Cadeia de União.",
        "categoria_rito": "Geral",
        "ordem_sugerida": 10
    },
    {
        "nome": "Encerramento e Saída do Templo",
        "descricao": "Música triunfal ou fraterna para a saída dos irmãos.",
        "categoria_rito": "Geral",
        "ordem_sugerida": 11
    }
]


async def inicializar_banco():
    """Cria todas as tabelas e popula os dados padrão."""
    print("Iniciando criacao de tabelas no PostgreSQL...")
    from sqlalchemy import text
    async with motor_assincrono.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Migração idempotente para colunas novas
        await conn.execute(text("ALTER TABLE organizacoes ADD COLUMN IF NOT EXISTS status_assinatura VARCHAR(50) DEFAULT 'ATIVO';"))
        await conn.execute(text("ALTER TABLE organizacoes ADD COLUMN IF NOT EXISTS plano_assinatura VARCHAR(50) DEFAULT 'MENSAL_HARMONIA';"))
    print("Tabelas e colunas verificadas com sucesso!")

    async with SessaoAssincronaLocal() as db:
        # 1. Popula Eventos Padrão do Sistema
        print("Verificando eventos ritualisticos padrao...")
        eventos_criados = {}
        for ev_data in EVENTOS_PADRAO:
            nome_formatado = formatar_titulo_inteligente(ev_data["nome"])
            stmt = select(Evento).where(Evento.nome == nome_formatado, Evento.padrao_sistema == True)
            resultado = await db.execute(stmt)
            evento_existente = resultado.scalar_one_or_none()

            if not evento_existente:
                novo_evento = Evento(
                    nome=nome_formatado,
                    descricao=ev_data["descricao"],
                    categoria_rito=ev_data["categoria_rito"],
                    padrao_sistema=True,
                    compartilhado=True,
                    ordem_sugerida=ev_data["ordem_sugerida"],
                    organizacao_id=None
                )
                db.add(novo_evento)
                await db.flush()
                eventos_criados[nome_formatado] = novo_evento
                print(f"  [+] Evento Padrao Criado: {nome_formatado}")
            else:
                eventos_criados[nome_formatado] = evento_existente

        # 2. Popula Loja Modelo de Teste
        print("Verificando Loja Modelo (Tenant)...")
        stmt_org = select(Organizacao).where(Organizacao.slug_armazenamento == "GOB_Loja2181")
        res_org = await db.execute(stmt_org)
        loja_modelo = res_org.scalar_one_or_none()

        if not loja_modelo:
            loja_modelo = Organizacao(
                nome="A.R.L.S. João Pedro Junqueira nº 2181",
                sigla="JPJ-2181",
                tipo="LOJA",
                slug_armazenamento="GOB_Loja2181",
                rito_padrao="REAA",
                dados_especificos={
                    "numero": "2181",
                    "oriente": "Goiânia",
                    "uf": "GO",
                    "obediencia": "GOB",
                    "subobediencia": "GOB-GO",
                    "webmaster": "gob.loja2181@e-sigma.app"
                },
                ativo=True
            )
            db.add(loja_modelo)
            await db.flush()
            print(f"  [+] Loja Modelo Criada: {loja_modelo.nome} (Slug: {loja_modelo.slug_armazenamento})")

        # Provisiona a pasta em disco para a Loja Modelo
        ServicoArmazenamentoTenant.provisionar_estrutura_tenant(loja_modelo.slug_armazenamento)
        print(f"  [+] Estrutura de pastas provisionada para {loja_modelo.slug_armazenamento}")

        # 3. Popula Sessões Padrão para a Loja Modelo
        print("Verificando Sessoes Padrao para a Loja Modelo...")
        sessoes_iniciais = [
            {
                "nome": "Sessão Ordinária no Grau de Aprendiz",
                "rito": "REAA",
                "grau": 1,
                "eventos": [
                    "Entrada do Cortejo",
                    "Cerimônia das Luzes",
                    "Abertura do Livro da Lei",
                    "Tronco de Beneficência",
                    "Cadeia de União",
                    "Fechamento do Livro da Lei",
                    "Amortização das Luzes",
                    "Encerramento e Saída do Templo"
                ]
            },
            {
                "nome": "Sessão Magna de Iniciação",
                "rito": "REAA",
                "grau": 1,
                "eventos": [
                    "Entrada do Cortejo",
                    "Cerimônia das Luzes",
                    "Abertura do Livro da Lei",
                    "Entrada de Autoridades",
                    "Tronco de Beneficência",
                    "Cadeia de União",
                    "Fechamento do Livro da Lei",
                    "Amortização das Luzes",
                    "Encerramento e Saída do Templo"
                ]
            },
            {
                "nome": "Sessão Ordinária de Aprendiz - Rito Brasileiro",
                "rito": "Brasileiro",
                "grau": 1,
                "eventos": [
                    "Entrada do Cortejo",
                    "Cerimônia das Luzes",
                    "Abertura do Livro da Lei",
                    "Entrada do Pavilhão Nacional",
                    "Tronco de Beneficência",
                    "Cadeia de União",
                    "Saída do Pavilhão Nacional",
                    "Fechamento do Livro da Lei",
                    "Amortização das Luzes",
                    "Encerramento e Saída do Templo"
                ]
            },
            {
                "nome": "Sessão Magna de Iniciação - Rito Brasileiro",
                "rito": "Brasileiro",
                "grau": 1,
                "eventos": [
                    "Entrada do Cortejo",
                    "Cerimônia das Luzes",
                    "Abertura do Livro da Lei",
                    "Entrada do Pavilhão Nacional",
                    "Entrada de Autoridades",
                    "Tronco de Beneficência",
                    "Cadeia de União",
                    "Saída do Pavilhão Nacional",
                    "Fechamento do Livro da Lei",
                    "Amortização das Luzes",
                    "Encerramento e Saída do Templo"
                ]
            }
        ]

        for sessao_info in sessoes_iniciais:
            nome_sessao = formatar_titulo_inteligente(sessao_info["nome"])
            stmt_s = select(Sessao).where(
                Sessao.nome == nome_sessao,
                Sessao.organizacao_id == loja_modelo.id
            )
            res_s = await db.execute(stmt_s)
            sessao_existente = res_s.scalar_one_or_none()

            if not sessao_existente:
                nova_sessao = Sessao(
                    organizacao_id=loja_modelo.id,
                    nome=nome_sessao,
                    rito=sessao_info["rito"],
                    grau=sessao_info["grau"],
                    descricao=f"Modelo padrão de {nome_sessao} para o Rito {sessao_info['rito']}."
                )
                db.add(nova_sessao)
                await db.flush()

                # Adiciona a esteira sequencial de eventos
                ordem = 1
                for nome_ev in sessao_info["eventos"]:
                    ev_obj = eventos_criados.get(nome_ev)
                    if ev_obj:
                        db.add(SessaoEvento(
                            sessao_id=nova_sessao.id,
                            evento_id=ev_obj.id,
                            ordem=ordem,
                            obrigatorio=True
                        ))
                        ordem += 1
                print(f"  [+] Sessao Criada: {nome_sessao} com {ordem-1} eventos sequenciados.")

        # 4. Popula Usuários / Mestres de Harmonia Padrão
        print("Verificando usuarios padrao...")
        from backend.modelos.pessoa import Pessoa
        from backend.nucleo.seguranca import gerar_hash_senha

        usuarios_seed = [
            {
                "nome": "Loja João Pedro Junqueira nº 2181",
                "email": "loja2181@harmonia.sigma.app",
                "senha": "harmonia@2026",
                "tipo": "MESTRE_HARMONIA",
                "organizacao_id": loja_modelo.id,
                "dados_civis": {"permissoes_sistema": ["mestre_harmonia", "membro"]},
                "dados_especificos": {"cargo": "Mestre de Harmonia", "senha_inicial_definida": True}
            },
            {
                "nome": "Ir. Mestre de Harmonia",
                "email": "mestre.harmonia@e-sigma.app",
                "senha": "harmonia@2026",
                "tipo": "MESTRE_HARMONIA",
                "organizacao_id": loja_modelo.id,
                "dados_civis": {"permissoes_sistema": ["mestre_harmonia", "membro"]},
                "dados_especificos": {"cargo": "Mestre de Harmonia", "grau": 3, "cim": "218101"}
            },
            {
                "nome": "Super Administrador Sigma",
                "email": "sistema@e-sigma.app",
                "senha": "harmonia@2026",
                "tipo": "SUPER_ADMIN",
                "organizacao_id": loja_modelo.id,
                "dados_civis": {"permissoes_sistema": ["super_admin", "webmaster", "mestre_harmonia", "membro"]},
                "dados_especificos": {"cargo": "SuperAdmin", "grau": 33}
            }
        ]

        for u_data in usuarios_seed:
            stmt_u = select(Pessoa).where(Pessoa.email == u_data["email"])
            res_u = await db.execute(stmt_u)
            usuario_existente = res_u.scalar_one_or_none()

            if not usuario_existente:
                novo_u = Pessoa(
                    nome=u_data["nome"],
                    email=u_data["email"],
                    senha_hash=gerar_hash_senha(u_data["senha"]),
                    tipo=u_data["tipo"],
                    organizacao_id=u_data["organizacao_id"],
                    dados_civis=u_data["dados_civis"],
                    dados_especificos=u_data["dados_especificos"],
                    status_acesso=True
                )
                db.add(novo_u)
                print(f"  [+] Usuario Criado: {u_data['email']} ({u_data['nome']})")
            else:
                # Atualiza senha e permissões se necessário
                usuario_existente.senha_hash = gerar_hash_senha(u_data["senha"])
                usuario_existente.status_acesso = True
                usuario_existente.dados_civis = u_data["dados_civis"]

        await db.commit()
        print("Inicializacao concluida com sucesso!")


if __name__ == "__main__":
    asyncio.run(inicializar_banco())

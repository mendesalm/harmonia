"""
Camada de Serviços para o Domínio de Organizações (Lojas e Obediências).
Concentra regras de negócio, validações de duplicidade, provisionamento de arquivos e criação de login padrão SaaS.
"""
import uuid
import re
from typing import List, Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from backend.modelos.organizacao import Organizacao
from backend.modelos.pessoa import Pessoa
from backend.api.organizacoes.schemas import OrganizacaoCriacao, OrganizacaoAtualizacao
from backend.nucleo.formatadores import formatar_titulo_inteligente, gerar_slug_limpo
from backend.nucleo.armazenamento import ServicoArmazenamentoTenant
from backend.nucleo.seguranca import gerar_hash_senha


class ServicoOrganizacao:
    """Regras de negócio e operações de banco para Organizações."""

    @staticmethod
    async def listar(db: AsyncSession, apenas_ativas: bool = True) -> List[Organizacao]:
        """Lista todas as organizações cadastradas."""
        stmt = select(Organizacao)
        if apenas_ativas:
            stmt = stmt.where(Organizacao.ativo == True)
        stmt = stmt.order_by(Organizacao.nome)
        resultado = await db.execute(stmt)
        return list(resultado.scalars().all())

    @staticmethod
    async def obter_por_id(db: AsyncSession, org_id: uuid.UUID) -> Organizacao:
        """Busca uma organização por ID ou dispara 404."""
        stmt = select(Organizacao).where(Organizacao.id == org_id)
        resultado = await db.execute(stmt)
        org = resultado.scalar_one_or_none()
        if not org:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Organização com ID '{org_id}' não foi encontrada."
            )
        return org

    @staticmethod
    async def criar(db: AsyncSession, dados: OrganizacaoCriacao) -> Organizacao:
        """
        Cria uma nova organização garantindo unicidade, provisionando o armazenamento em disco
        e criando automaticamente o login padrão da Loja (ex: loja2181@harmonia.sigma.app).
        """
        nome_formatado = formatar_titulo_inteligente(dados.nome)

        # 1. Bloqueio de Duplicidade (Case-Insensitive)
        stmt_check = select(Organizacao).where(func.lower(Organizacao.nome) == nome_formatado.lower())
        res_check = await db.execute(stmt_check)
        if res_check.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Já existe uma organização cadastrada com o nome '{nome_formatado}'."
            )

        # 2. Geração de Slug Padronizado
        numero_bruto = str(dados.dados_especificos.get("numero", ""))
        numero_limpo = re.sub(r'[^0-9]', '', numero_bruto) or "SN"
        obediencia = dados.dados_especificos.get("obediencia", "INDEP")

        if dados.slug_armazenamento:
            slug = gerar_slug_limpo(dados.slug_armazenamento)
        else:
            if dados.tipo.upper() == "LOJA" and numero_limpo != "SN":
                slug = f"{gerar_slug_limpo(obediencia)}_Loja{numero_limpo}"
            elif dados.sigla:
                slug = gerar_slug_limpo(dados.sigla)
            else:
                slug = gerar_slug_limpo(nome_formatado)

        # Verifica colisão de slug
        stmt_slug = select(Organizacao).where(Organizacao.slug_armazenamento == slug)
        res_slug = await db.execute(stmt_slug)
        if res_slug.scalar_one_or_none():
            slug = f"{slug}_{uuid.uuid4().hex[:6]}"

        # 3. Geração do e-mail de login padrão SaaS
        if dados.tipo.upper() == "LOJA" and numero_limpo != "SN":
            email_padrao = f"loja{numero_limpo}@harmonia.sigma.app"
        else:
            email_padrao = f"{slug.lower().replace('_', '.')}@harmonia.sigma.app"

        dados_especificos = {
            **dados.dados_especificos,
            "email_padrao": email_padrao,
            "storage_slug": slug
        }

        nova_org = Organizacao(
            nome=nome_formatado,
            sigla=dados.sigla.upper() if dados.sigla else None,
            tipo=dados.tipo.upper(),
            slug_armazenamento=slug,
            rito_padrao=dados.rito_padrao.upper(),
            status_assinatura="ATIVO",
            plano_assinatura="MENSAL_HARMONIA",
            dados_especificos=dados_especificos,
            ativo=True
        )

        db.add(nova_org)
        await db.flush()

        # 4. Provisionamento de Pastas Multi-Tenant
        ServicoArmazenamentoTenant.provisionar_estrutura_tenant(nova_org.slug_armazenamento)

        # 5. Criação do Usuário Padrão da Loja (Pessoa) com senha inicial
        senha_inicial = f"harmonia@{numero_limpo}" if numero_limpo != "SN" else "harmonia@2026"
        stmt_user_check = select(Pessoa).where(Pessoa.email == email_padrao)
        res_user_check = await db.execute(stmt_user_check)
        if not res_user_check.scalar_one_or_none():
            novo_usuario = Pessoa(
                nome=f"Mestre de Harmonia - {nova_org.sigla or nova_org.nome}",
                email=email_padrao,
                senha_hash=gerar_hash_senha(senha_inicial),
                tipo="MESTRE_HARMONIA",
                organizacao_id=nova_org.id,
                dados_civis={"permissoes_sistema": ["mestre_harmonia", "membro"]},
                dados_especificos={"cargo": "Mestre de Harmonia", "senha_inicial_definida": True},
                status_acesso=True
            )
            db.add(novo_usuario)

        await db.commit()
        await db.refresh(nova_org)
        return nova_org

    @staticmethod
    async def atualizar(db: AsyncSession, org_id: uuid.UUID, dados: OrganizacaoAtualizacao) -> Organizacao:
        """Atualiza os dados de uma organização existente."""
        org = await ServicoOrganizacao.obter_por_id(db, org_id)

        if dados.nome is not None:
            nome_formatado = formatar_titulo_inteligente(dados.nome)
            stmt_check = select(Organizacao).where(
                func.lower(Organizacao.nome) == nome_formatado.lower(),
                Organizacao.id != org_id
            )
            res_check = await db.execute(stmt_check)
            if res_check.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Já existe outra organização com o nome '{nome_formatado}'."
                )
            org.nome = nome_formatado

        if dados.sigla is not None:
            org.sigla = dados.sigla.upper() if dados.sigla else None
        if dados.tipo is not None:
            org.tipo = dados.tipo.upper()
        if dados.rito_padrao is not None:
            org.rito_padrao = dados.rito_padrao.upper()
        if dados.dados_especificos is not None:
            org.dados_especificos = {**org.dados_especificos, **dados.dados_especificos}
        if dados.ativo is not None:
            org.ativo = dados.ativo

        await db.commit()
        await db.refresh(org)
        return org

    @staticmethod
    async def deletar(db: AsyncSession, org_id: uuid.UUID) -> dict:
        """Desativa ou exclui uma organização."""
        org = await ServicoOrganizacao.obter_por_id(db, org_id)
        await db.delete(org)
        await db.commit()
        return {"mensagem": f"Organização '{org.nome}' removida com sucesso."}

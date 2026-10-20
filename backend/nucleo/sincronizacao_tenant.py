# EM CONFORMIDADE COM AS REGRAS DE OURO DO E-SIGMA
"""
Serviço de Sincronização e Autocorreção (Self-Healing) de Tenants (Organizações) no Harmonia.
Garante que Lojas provisionadas no e-Sigma (como a ARLS João Pedro Junqueira nº 2181)
estejam sincronizadas com o UUID oficial, Rito correto (Rito Brasileiro) e Sessão Ordinária
instanciada no banco de dados `harmoniadb`, migrando registros legados se necessário.
"""
import uuid
from typing import Optional

from loguru import logger
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.modelos.musica import Musica
from backend.modelos.organizacao import Organizacao
from backend.modelos.rito import Rito
from backend.modelos.sessao import (
    SessaoLoja,
    SessaoLojaEvento,
    TipoSessao,
    TipoSessaoEvento,
)
from backend.nucleo.armazenamento import ServicoArmazenamentoTenant

LOJA_2181_UUID = uuid.UUID("795b19d5-e14c-4c2e-b047-ee99e6e39a9c")
LOJA_2181_SLUG = "GOB_Loja2181"
LOJA_2181_NOME = "ARLS João Pedro Junqueira nº 2181"
RITO_BRASILEIRO_NOME = "Rito Brasileiro"


async def sincronizar_organizacoes_base(db: AsyncSession) -> Optional[Organizacao]:
    """
    Garante que a Loja 2181 possua o UUID oficial sincronizado com o e-Sigma IdP,
    esteja vinculada ao Rito Brasileiro e tenha sua Sessão Ordinária instanciada.
    Caso exista uma organização legada com UUID aleatório anterior para `GOB_Loja2181`,
    migra automaticamente suas sessões, músicas e usuários para o UUID oficial.
    """
    try:
        # 1. Localiza ou cria o Rito Brasileiro
        res_rito = await db.execute(
            select(Rito).where(Rito.nome == RITO_BRASILEIRO_NOME)
        )
        rito_br = res_rito.scalar_one_or_none()
        if not rito_br:
            rito_br = Rito(
                nome=RITO_BRASILEIRO_NOME,
                descricao="Rito Brasileiro de Maçons Antigos, Livres e Aceitos",
            )
            db.add(rito_br)
            await db.flush()

        # 2. Verifica se já existe a organização com o UUID oficial da Loja 2181
        res_oficial = await db.execute(
            select(Organizacao)
            .options(selectinload(Organizacao.rito))
            .where(Organizacao.id == LOJA_2181_UUID)
        )
        org_oficial = res_oficial.scalar_one_or_none()

        # 3. Procura eventual registro legado da Loja 2181 com UUID diferente
        res_legadas = await db.execute(
            select(Organizacao).where(
                Organizacao.id != LOJA_2181_UUID,
                (Organizacao.slug_armazenamento == LOJA_2181_SLUG)
                | (Organizacao.nome.ilike("%2181%")),
            )
        )
        orgs_legadas = list(res_legadas.scalars().all())

        alterou = False

        if orgs_legadas:
            for org_legada in orgs_legadas:
                logger.info(
                    f"Migrando organização legada da Loja 2181 ({org_legada.id}) "
                    f"para o UUID oficial do e-Sigma ({LOJA_2181_UUID})."
                )
                if org_legada.slug_armazenamento == LOJA_2181_SLUG:
                    org_legada.slug_armazenamento = f"legado_{org_legada.id.hex[:8]}"
                    await db.flush()

            if not org_oficial:
                primeira_legada = orgs_legadas[0]
                org_oficial = Organizacao(
                    id=LOJA_2181_UUID,
                    nome=primeira_legada.nome or LOJA_2181_NOME,
                    sigla=primeira_legada.sigla or "JPJ-2181",
                    tipo=primeira_legada.tipo or "LOJA",
                    slug_armazenamento=LOJA_2181_SLUG,
                    rito_id=rito_br.id,
                    ativo=True,
                )
                db.add(org_oficial)
                await db.flush()

            for org_legada in orgs_legadas:
                await db.execute(
                    update(SessaoLoja)
                    .where(SessaoLoja.loja_id == org_legada.id)
                    .values(loja_id=LOJA_2181_UUID)
                )
                await db.execute(
                    update(Musica)
                    .where(Musica.organizacao_id == org_legada.id)
                    .values(organizacao_id=LOJA_2181_UUID)
                )
                await db.delete(org_legada)

            alterou = True

        if not org_oficial:
            logger.info(
                f"Provisionando registro local da Loja 2181 ({LOJA_2181_UUID}) com Rito Brasileiro."
            )
            org_oficial = Organizacao(
                id=LOJA_2181_UUID,
                nome=LOJA_2181_NOME,
                sigla="JPJ-2181",
                tipo="LOJA",
                slug_armazenamento=LOJA_2181_SLUG,
                rito_id=rito_br.id,
                ativo=True,
            )
            db.add(org_oficial)
            await db.flush()
            ServicoArmazenamentoTenant.provisionar_estrutura_tenant(LOJA_2181_SLUG)
            alterou = True

        # 4. Garante que o rito da Loja 2181 seja o Rito Brasileiro
        if org_oficial.rito_id != rito_br.id:
            logger.info(
                f"Atualizando rito_id da Loja 2181 ({LOJA_2181_UUID}) para Rito Brasileiro ({rito_br.id})."
            )
            org_oficial.rito_id = rito_br.id
            alterou = True

        # 5. Garante que a Loja 2181 possua ao menos uma SessaoLoja instanciada
        res_sessoes = await db.execute(
            select(SessaoLoja).where(SessaoLoja.loja_id == LOJA_2181_UUID)
        )
        sessoes_existentes = list(res_sessoes.scalars().all())
        if not sessoes_existentes:
            res_ts = await db.execute(
                select(TipoSessao).where(
                    TipoSessao.rito_id == rito_br.id,
                    TipoSessao.nome == "Sessão Ordinária",
                )
            )
            ts_ord = res_ts.scalar_one_or_none()
            if ts_ord:
                nova_sl = SessaoLoja(
                    loja_id=LOJA_2181_UUID,
                    tipo_sessao_id=ts_ord.id,
                    nome_personalizado="Minha Sessão Ordinária",
                )
                db.add(nova_sl)
                await db.flush()

                res_tse = await db.execute(
                    select(TipoSessaoEvento)
                    .where(TipoSessaoEvento.tipo_sessao_id == ts_ord.id)
                    .order_by(TipoSessaoEvento.ordem_sequencia)
                )
                for tse in res_tse.scalars():
                    db.add(
                        SessaoLojaEvento(
                            sessao_loja_id=nova_sl.id,
                            evento_id=tse.evento_id,
                            ordem_execucao=tse.ordem_sequencia,
                        )
                    )
                alterou = True

        if alterou:
            await db.commit()

        res_final = await db.execute(
            select(Organizacao)
            .options(selectinload(Organizacao.rito))
            .where(Organizacao.id == LOJA_2181_UUID)
        )
        return res_final.scalar_one_or_none()
    except Exception as erro:
        logger.warning(f"Aviso ao sincronizar organização base da Loja 2181: {erro}")
        await db.rollback()
        return None


async def obter_ou_sincronizar_organizacao(
    db: AsyncSession, org_uuid: uuid.UUID
) -> Optional[Organizacao]:
    """
    Busca a Organização pelo UUID com seu Rito carregado.
    Se for a Loja 2181 e ainda não estiver sincronizada ou estiver sem Rito Brasileiro,
    executa a autocorreção transparente antes de retornar.
    """
    stmt = (
        select(Organizacao)
        .options(selectinload(Organizacao.rito))
        .where(Organizacao.id == org_uuid)
    )
    res = await db.execute(stmt)
    org = res.scalar_one_or_none()

    if org_uuid == LOJA_2181_UUID:
        precisa_sincronizar = (
            org is None
            or org.rito_id is None
            or (org.rito is not None and org.rito.nome != RITO_BRASILEIRO_NOME)
        )
        if precisa_sincronizar:
            org = await sincronizar_organizacoes_base(db)

    return org

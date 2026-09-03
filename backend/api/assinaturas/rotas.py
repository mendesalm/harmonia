from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from backend.nucleo.banco import obter_banco_de_dados
from backend.modelos.organizacao import Organizacao
from backend.api.auth.dependencias import obter_usuario_autenticado
from backend.api.assinaturas.schemas import AssinaturaStatus, CheckoutRequest
from backend.api.assinaturas.asaas import ServicoAsaas
import logging

logger = logging.getLogger(__name__)
roteador_assinaturas = APIRouter(prefix="/assinaturas", tags=["Assinaturas"])

async def verificar_permissao_financeira(usuario = Depends(obter_usuario_autenticado)):
    # O payload JWT (dict) guarda o cargo no campo 'role' (super_admin, mestre_harmonia)
    # ou 'tipo'. Na API auth geramos com 'role' e 'sub'.
    papel = usuario.get("role", "").upper()
    
    # Se quiser permitir que outras pessoas da loja acessem o financeiro:
    if papel not in ["SUPER_ADMIN", "MESTRE_HARMONIA", "VENERAVEL", "TESOUREIRO"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seu cargo atual não permite acesso à área financeira."
        )
    return usuario

@roteador_assinaturas.get("/minha-loja", response_model=AssinaturaStatus)
async def obter_status_assinatura(
    usuario = Depends(verificar_permissao_financeira),
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    from sqlalchemy import select
    
    # A loja id costuma estar no token se o usuário for membro de uma.
    # No auth login a gente colocou `org_id`?
    org_id = usuario.get("org_id")
    if not org_id:
        raise HTTPException(status_code=400, detail="Usuário não pertence a nenhuma loja.")
        
    stmt = select(Organizacao).where(Organizacao.id == org_id)
    res = await db.execute(stmt)
    org = res.scalar_one_or_none()
    
    if not org:
        raise HTTPException(status_code=404, detail="Loja não encontrada")
        
    asaas_customer = org.dados_especificos.get("asaas_customer_id")
    asaas_sub = org.dados_especificos.get("asaas_subscription_id")
    
    invoice_url = None
    if asaas_sub:
        # Se tivéssemos o banco histórico, pegaríamos a última fatura, mas podemos salvar a invoice_url nos dados_especificos também
        invoice_url = org.dados_especificos.get("asaas_invoice_url")
    
    return AssinaturaStatus(
        status=org.status_assinatura,
        plano=org.plano_assinatura,
        validade=org.validade_assinatura,
        customer_id=asaas_customer,
        subscription_id=asaas_sub,
        invoice_url=invoice_url
    )

@roteador_assinaturas.post("/checkout")
async def gerar_checkout(
    req: CheckoutRequest,
    usuario = Depends(verificar_permissao_financeira),
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    from sqlalchemy import select
    org_id = usuario.get("org_id")
    
    stmt = select(Organizacao).where(Organizacao.id == org_id)
    res = await db.execute(stmt)
    org = res.scalar_one_or_none()
    
    if not org:
        raise HTTPException(status_code=404, detail="Loja não encontrada")
        
    # Verificar Customer no Asaas
    asaas_customer = org.dados_especificos.get("asaas_customer_id")
    if not asaas_customer:
        # Criar Customer no Asaas
        # Idealmente o email vem do usuário ou dos dados_especificos da loja
        email = org.dados_especificos.get("email_contato", "veneravel@harmonia.app")
        cnpj = org.dados_especificos.get("cnpj")
        
        try:
            customer_data = await ServicoAsaas.criar_cliente(nome=org.nome, email=email, cpf_cnpj=cnpj)
            asaas_customer = customer_data["id"]
            
            # Atualiza no DB
            org.dados_especificos = {**org.dados_especificos, "asaas_customer_id": asaas_customer}
            await db.commit()
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Erro ao criar cliente no gateway: {str(e)}")
            
    # Criar Assinatura
    valor = 300.0 if req.ciclo == "ANUAL" else 30.0
    ciclo_asaas = "YEARLY" if req.ciclo == "ANUAL" else "MONTHLY"
    
    try:
        sub_data = await ServicoAsaas.criar_assinatura(
            customer_id=asaas_customer,
            valor=valor,
            ciclo=ciclo_asaas,
            descricao=f"Harmonia - Plano {req.ciclo}"
        )
        
        org.dados_especificos = {**org.dados_especificos, "asaas_subscription_id": sub_data["id"]}
        org.plano_assinatura = f"{req.ciclo}_HARMONIA"
        await db.commit()
        
        return {"message": "Assinatura gerada", "subscription": sub_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao criar assinatura no gateway: {str(e)}")


@roteador_assinaturas.post("/webhook/asaas")
async def asaas_webhook(request: Request, db: AsyncSession = Depends(obter_banco_de_dados)):
    # Em produção, validar o header "asaas-access-token"
    payload = await request.json()
    
    evento = payload.get("event")
    pagamento = payload.get("payment", {})
    customer_id = pagamento.get("customer")
    subscription_id = pagamento.get("subscription")
    
    if not customer_id:
        return {"status": "ignorado"}
        
    from sqlalchemy import select
    # Encontrar loja pelo asaas_customer_id
    # No postgresql jsonb: select * from organizacoes where dados_especificos->>'asaas_customer_id' = '...'
    # Como asaas_customer_id está no JSONB, usamos o operador op
    stmt = select(Organizacao).where(Organizacao.dados_especificos["asaas_customer_id"].astext == customer_id)
    res = await db.execute(stmt)
    org = res.scalar_one_or_none()
    
    if not org:
        logger.warning(f"Webhook recebido para customer {customer_id} mas loja não encontrada.")
        return {"status": "loja_nao_encontrada"}
        
    from datetime import datetime, timedelta
    
    if evento == "PAYMENT_RECEIVED" or evento == "PAYMENT_CONFIRMED":
        org.status_assinatura = "ATIVA"
        # O pagamento do asaas geralmente tem nextDueDate na subscription, mas no payment podemos estimar 
        # ou buscar a assinatura na API. Vamos simplificar adicionando +30 ou +365 dias
        # ou pegando do dueDate do pagamento.
        
        # Salvando URL da fatura atual (para exibir no painel) se houver nova fatura gerada para depois
        if pagamento.get("invoiceUrl"):
            org.dados_especificos = {**org.dados_especificos, "asaas_invoice_url": pagamento.get("invoiceUrl")}
            
        # Adicionar tempo à validade
        if org.plano_assinatura == "ANUAL_HARMONIA":
            org.validade_assinatura = datetime.utcnow() + timedelta(days=365)
        else:
            org.validade_assinatura = datetime.utcnow() + timedelta(days=30)
            
        await db.commit()
        logger.info(f"Pagamento recebido para loja {org.nome}. Assinatura ativada.")
        
    elif evento == "PAYMENT_OVERDUE":
        # Bloquear após o vencimento
        # Permite 3 dias de carência
        due_date_str = pagamento.get("dueDate")
        if due_date_str:
            due_date = datetime.strptime(due_date_str, "%Y-%m-%d")
            carencia = due_date + timedelta(days=3)
            if datetime.utcnow() > carencia:
                org.status_assinatura = "BLOQUEADO"
                await db.commit()
                logger.info(f"Loja {org.nome} bloqueada por inadimplência.")
                
    return {"status": "ok"}

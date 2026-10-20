import React, { createContext, useContext, useState, useEffect } from 'react';
import { Organizacao } from '../tipos';
import clienteHttp from '../api/cliente_http';
import { useAuth } from './ContextoAutenticacao';

interface ContextoTenantTipo {
  lojaAtiva: Organizacao | null;
  lojas: Organizacao[];
  carregando: boolean;
  selecionarLoja: (loja: Organizacao) => void;
  recarregarLojas: () => Promise<void>;
}

const ContextoTenant = createContext<ContextoTenantTipo>({} as ContextoTenantTipo);

/**
 * Provedor de contexto Multi-Tenant (Lojas Maçônicas).
 * Sincroniza automaticamente a Loja ativa a partir do perfil autenticado (`/auth/me`)
 * e consulta a lista completa de organizações apenas quando necessário.
 */
export const ProvedorTenant: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { usuario } = useAuth();
  const [lojas, setLojas] = useState<Organizacao[]>([]);
  const [lojaAtiva, setLojaAtiva] = useState<Organizacao | null>(null);
  const [carregando, setCarregando] = useState(true);

  const normalizarOrganizacao = (
    org: any,
    referenciaLocal?: Organizacao | null
  ): Organizacao => {
    const ehMesmaLoja = Boolean(referenciaLocal && org?.id === referenciaLocal.id);
    const ritoExtraido =
      org?.rito_padrao ||
      org?.rito?.nome ||
      org?.dados_especificos?.rito_padrao ||
      org?.dados_especificos?.rito ||
      (ehMesmaLoja ? referenciaLocal?.rito_padrao : undefined) ||
      'Rito Brasileiro';

    return {
      ...org,
      id: org.id,
      nome: org.nome || (ehMesmaLoja ? referenciaLocal?.nome : 'Loja Maçônica'),
      slug_armazenamento:
        org.slug_armazenamento ||
        (ehMesmaLoja ? referenciaLocal?.slug_armazenamento : undefined) ||
        `loja_${org?.dados_especificos?.numero || String(org.id).slice(0, 8)}`,
      rito_id:
        org.rito_id ||
        org?.dados_especificos?.rito_id ||
        (ehMesmaLoja ? referenciaLocal?.rito_id : undefined),
      rito_padrao: ritoExtraido,
      status_assinatura:
        org.status_assinatura ||
        (ehMesmaLoja ? referenciaLocal?.status_assinatura : 'ATIVA') ||
        'ATIVA',
      ativo: org.ativo ?? true,
    };
  };

  const construirLojaDoUsuario = (): Organizacao | null => {
    if (!usuario?.organizacao_id) return null;
    return {
      id: usuario.organizacao_id,
      nome: usuario.organizacao_nome || 'Loja Maçônica',
      slug_armazenamento: usuario.slug_armazenamento || 'loja',
      rito_id: usuario.dados_especificos?.rito_id || undefined,
      rito_padrao:
        usuario.dados_especificos?.rito_padrao ||
        (usuario.dados_especificos as any)?.rito ||
        'Rito Brasileiro',
      status_assinatura: (usuario as any).status_assinatura || 'ATIVA',
      ativo: true,
    };
  };

  const carregarLojas = async () => {
    const tokenSalvo = localStorage.getItem('@harmonia:token');
    if (!tokenSalvo) {
      setCarregando(false);
      return;
    }

    // 1. Se o usuário já possui organização vinculada no perfil (/auth/me), usa imediatamente
    const lojaUsuario = construirLojaDoUsuario();
    if (lojaUsuario) {
      setLojaAtiva(lojaUsuario);
      setLojas([lojaUsuario]);
      localStorage.setItem('@harmonia:loja_id', lojaUsuario.id);
    }

    // 2. Se for SuperAdmin, tenta buscar lista global de organizações
    const ehSuperAdmin =
      usuario?.tipo === 'ADMIN' ||
      usuario?.permissoes?.includes('super_admin') ||
      (usuario as any)?.role === 'super_admin';

    if (!ehSuperAdmin && lojaUsuario) {
      setCarregando(false);
      return;
    }

    try {
      setCarregando(true);
      const respLocal = await clienteHttp
        .get<Organizacao[]>('/organizacoes?apenas_ativas=false')
        .catch(() => ({ data: [] as Organizacao[] }));

      let listaNormalizada: Organizacao[] = Array.isArray(respLocal.data)
        ? respLocal.data.map((org) => normalizarOrganizacao(org, lojaUsuario))
        : [];

      if (listaNormalizada.length === 0) {
        const baseUrlIdp = import.meta.env.VITE_URL_IDENTIDADE || 'https://e-sigma.app';
        const respIdp = await clienteHttp.get<Organizacao[]>(`${baseUrlIdp}/api/v1/organizacoes`);
        if (Array.isArray(respIdp.data)) {
          listaNormalizada = respIdp.data.map((org) => normalizarOrganizacao(org, lojaUsuario));
        }
      }

      if (listaNormalizada.length > 0) {
        setLojas(listaNormalizada);
        const salvaId = usuario?.organizacao_id || localStorage.getItem('@harmonia:loja_id');
        const encontrada = listaNormalizada.find((l) => l.id === salvaId);
        const lojaPadrao = encontrada
          ? normalizarOrganizacao(encontrada, lojaUsuario)
          : lojaUsuario || listaNormalizada[0];
        setLojaAtiva(lojaPadrao);
        localStorage.setItem('@harmonia:loja_id', lojaPadrao.id);
      }
    } catch (err) {
      if (!lojaUsuario) {
        console.warn('Não foi possível listar todas as organizações; mantendo contexto local.');
      }
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarLojas();
  }, [usuario?.id, usuario?.organizacao_id]);

  const selecionarLoja = (loja: Organizacao) => {
    setLojaAtiva(loja);
    localStorage.setItem('@harmonia:loja_id', loja.id);
  };

  return (
    <ContextoTenant.Provider
      value={{
        lojaAtiva,
        lojas,
        carregando,
        selecionarLoja,
        recarregarLojas: carregarLojas,
      }}
    >
      {children}
    </ContextoTenant.Provider>
  );
};

export const useTenant = () => useContext(ContextoTenant);

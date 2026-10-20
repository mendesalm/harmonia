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

  const construirLojaDoUsuario = (): Organizacao | null => {
    if (!usuario?.organizacao_id) return null;
    return {
      id: usuario.organizacao_id,
      nome: usuario.organizacao_nome || 'Loja Maçônica',
      slug_armazenamento: usuario.slug_armazenamento || 'loja',
      rito_id: usuario.dados_especificos?.rito_id || undefined,
      rito_padrao: usuario.dados_especificos?.rito_padrao || 'Rito Escocês Antigo e Aceito',
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
      const baseUrlIdp = import.meta.env.VITE_URL_IDENTIDADE || 'https://e-sigma.app';
      const resp = await clienteHttp.get<Organizacao[]>(`${baseUrlIdp}/api/v1/organizacoes`);
      if (Array.isArray(resp.data) && resp.data.length > 0) {
        setLojas(resp.data);
        const salvaId = localStorage.getItem('@harmonia:loja_id') || usuario?.organizacao_id;
        const encontrada = resp.data.find((l) => l.id === salvaId);
        const lojaPadrao = encontrada || lojaUsuario || resp.data[0];
        setLojaAtiva(lojaPadrao);
        localStorage.setItem('@harmonia:loja_id', lojaPadrao.id);
      }
    } catch (err) {
      if (!lojaUsuario) {
        console.warn('Não foi possível listar todas as organizações no IdP; mantendo contexto local.');
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

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Organizacao } from '../tipos';
import clienteHttp from '../api/cliente_http';

interface ContextoTenantTipo {
  lojaAtiva: Organizacao | null;
  lojas: Organizacao[];
  carregando: boolean;
  selecionarLoja: (loja: Organizacao) => void;
  recarregarLojas: () => Promise<void>;
}

const ContextoTenant = createContext<ContextoTenantTipo>({} as ContextoTenantTipo);

export const ProvedorTenant: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lojas, setLojas] = useState<Organizacao[]>([]);
  const [lojaAtiva, setLojaAtiva] = useState<Organizacao | null>(null);
  const [carregando, setCarregando] = useState(true);

  const carregarLojas = async () => {
    try {
      setCarregando(true);
      const resp = await clienteHttp.get<Organizacao[]>('/organizacoes');
      setLojas(resp.data);

      if (resp.data.length > 0) {
        // Tenta recuperar loja salva no localStorage ou pega a primeira
        const salvaId = localStorage.getItem('@harmonia:loja_id');
        const encontrada = resp.data.find((l) => l.id === salvaId);
        const lojaPadrao = encontrada || resp.data[0];
        setLojaAtiva(lojaPadrao);
        localStorage.setItem('@harmonia:loja_id', lojaPadrao.id);
      }
    } catch (err) {
      console.error('Erro ao carregar organizações/lojas:', err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarLojas();
  }, []);

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

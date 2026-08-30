import React, { createContext, useContext, useState, useEffect } from 'react';
import clienteHttp from '../api/cliente_http';

export interface UsuarioAutenticado {
  id: string;
  nome: string;
  email: string;
  tipo: string;
  organizacao_id: string | null;
  organizacao_nome: string | null;
  slug_armazenamento: string | null;
  permissoes: string[];
  dados_especificos: Record<string, any>;
}

interface ContextoAutenticacaoTipo {
  usuario: UsuarioAutenticado | null;
  token: string | null;
  autenticado: boolean;
  carregando: boolean;
  login: (token: string, usuario: UsuarioAutenticado) => void;
  logout: () => void;
}

const ContextoAutenticacao = createContext<ContextoAutenticacaoTipo>({} as ContextoAutenticacaoTipo);

export const ProvedorAutenticacao: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<UsuarioAutenticado | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('@harmonia:token'));
  const [carregando, setCarregando] = useState(true);

  // Configura interceptor Axios para injetar o token Bearer
  useEffect(() => {
    const interceptor = clienteHttp.interceptors.request.use((config) => {
      const tokenSalvo = localStorage.getItem('@harmonia:token');
      if (tokenSalvo) {
        config.headers.Authorization = `Bearer ${tokenSalvo}`;
      }
      return config;
    });

    const validarSessao = async () => {
      const tokenSalvo = localStorage.getItem('@harmonia:token');
      if (!tokenSalvo) {
        setCarregando(false);
        return;
      }

      try {
        const resp = await clienteHttp.get<UsuarioAutenticado>('/auth/me');
        setUsuario(resp.data);
        setToken(tokenSalvo);
      } catch (err) {
        console.warn('Sessão expirada ou inválida. Realize login novamente.');
        localStorage.removeItem('@harmonia:token');
        setToken(null);
        setUsuario(null);
      } finally {
        setCarregando(false);
      }
    };

    validarSessao();

    return () => {
      clienteHttp.interceptors.request.eject(interceptor);
    };
  }, []);

  const login = (novoToken: string, novoUsuario: UsuarioAutenticado) => {
    localStorage.setItem('@harmonia:token', novoToken);
    if (novoUsuario.organizacao_id) {
      localStorage.setItem('@harmonia:loja_id', novoUsuario.organizacao_id);
    }
    setToken(novoToken);
    setUsuario(novoUsuario);
  };

  const logout = () => {
    localStorage.removeItem('@harmonia:token');
    setToken(null);
    setUsuario(null);
    window.location.href = '/login';
  };

  return (
    <ContextoAutenticacao.Provider
      value={{
        usuario,
        token,
        autenticado: !!token && !!usuario,
        carregando,
        login,
        logout,
      }}
    >
      {children}
    </ContextoAutenticacao.Provider>
  );
};

export const useAuth = () => useContext(ContextoAutenticacao);

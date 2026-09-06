import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, Mail, ArrowRight } from 'lucide-react';
import clienteHttp from '../../compartilhado/api/cliente_http';
import { useAuth } from '../../compartilhado/contextos/ContextoAutenticacao';
import { useTenant } from '../../compartilhado/contextos/ContextoTenant';
import { GoogleLogin } from '@react-oauth/google';
import HeroBackground from '../../compartilhado/componentes/HeroBackground';
import harmoniaLogo from '../../assets/harmonia.svg';

export const PaginaLogin: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { recarregarLojas } = useTenant();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const destino = (location.state as any)?.from?.pathname || '/';

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse.credential) return;
    setErro(null);
    setCarregando(true);
    try {
      const baseUrlIdp = import.meta.env.VITE_URL_IDENTIDADE || 'https://e-sigma.app';
      const respIdp = await fetch(`${baseUrlIdp}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          credential: credentialResponse.credential,
          modulo_origem: "harmonia" 
        })
      });

      if (!respIdp.ok) {
        throw new Error('Falha na autenticação Google no e-Sigma');
      }

      const { access_token } = await respIdp.json();
      localStorage.setItem('@harmonia:token', access_token);
      
      const respMe = await clienteHttp.get('/auth/me', {
        headers: { Authorization: `Bearer ${access_token}` }
      });

      login(access_token, respMe.data);
      await recarregarLojas();
      navigate(destino, { replace: true });
    } catch (err: any) {
      setErro('Falha no login com Google. Verifique se o e-mail está cadastrado.');
    } finally {
      setCarregando(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    try {
      // 1. Enviar credenciais para a API do e-Sigma informando modulo_origem
      const baseUrlIdp = import.meta.env.VITE_URL_IDENTIDADE || 'https://e-sigma.app';
      const respIdp = await fetch(`${baseUrlIdp}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: email.trim(), 
          password: senha,
          modulo_origem: "harmonia" 
        })
      });

      if (!respIdp.ok) {
        throw new Error('Falha na autenticação no e-Sigma');
      }

      const { access_token } = await respIdp.json();
      localStorage.setItem('@harmonia:token', access_token);
      
      // 2. Com o token em mãos, busca os detalhes do usuário no backend do Harmonia
      const respMe = await clienteHttp.get('/auth/me', {
        headers: { Authorization: `Bearer ${access_token}` }
      });

      login(access_token, respMe.data);
      await recarregarLojas();
      navigate(destino, { replace: true });
    } catch (err: any) {
      setErro(err.response?.data?.detail || 'Falha na autenticação. Verifique seu e-mail e senha.');
    } finally {
      setCarregando(false);
    }
  };

  const preencherCredencialRapida = (tipo: 'LOJA2181' | 'ADMIN') => {
    if (tipo === 'LOJA2181') {
      setEmail('loja2181@harmonia.sigma.app');
      setSenha('harmonia@2026');
    } else {
      setEmail('sistema@e-sigma.app');
      setSenha('harmonia@2026');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0B0F19] relative overflow-hidden selection:bg-macaonico-cianoSigma selection:text-black z-0">
      
      {/* Background Animado */}
      <HeroBackground />

      <div className="w-full max-w-md relative z-10 animate-fade-in-up">
        
        {/* Cartão de Login - Estilo e-Sigma Glassmorphism */}
        <div className="bg-[#131b29]/40 backdrop-blur-xl rounded-3xl p-8 sm:p-10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/10">
          
          {/* Logo e Título */}
          <div className="flex flex-col items-center text-center mb-8">
            <div id="hero-logo" className="mb-4">
              <img 
                src={harmoniaLogo} 
                alt="Harmonia Logo" 
                className="w-24 h-24 drop-shadow-[0_0_15px_rgba(56,189,248,0.5)]" 
              />
            </div>

            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-sky-600 tracking-wider font-sans flex items-center gap-2 drop-shadow-[0_0_10px_rgba(56,189,248,0.3)]">
              HARMONIA
            </h1>
            <p className="text-sm text-slate-400 mt-2 font-sans">
              Acesso Restrito
            </p>
          </div>

          {/* Alerta de Erro */}
          {erro && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-200 text-center animate-shake">
              {erro}
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <div className="relative">
                <input
                  type="email"
                  id="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder=" "
                  className="peer w-full bg-transparent border border-white/20 rounded-xl pl-12 pr-4 pt-5 pb-2 text-sm text-white focus:border-sky-400 outline-none transition-all focus:bg-white/5"
                />
                <label 
                  htmlFor="email"
                  className="absolute left-12 top-1.5 text-[10px] text-slate-400 transition-all pointer-events-none peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:text-sky-400"
                >
                  CIM ou E-mail da Loja
                </label>
                <Mail className="w-5 h-5 text-slate-400 absolute left-4 top-3.5 peer-focus:text-sky-400 transition-colors" />
              </div>
            </div>

            <div>
              <div className="relative">
                <input
                  type="password"
                  id="senha"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder=" "
                  className="peer w-full bg-transparent border border-white/20 rounded-xl pl-12 pr-4 pt-5 pb-2 text-sm text-white focus:border-sky-400 outline-none transition-all focus:bg-white/5"
                />
                <label 
                  htmlFor="senha"
                  className="absolute left-12 top-1.5 text-[10px] text-slate-400 transition-all pointer-events-none peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:text-sky-400"
                >
                  Senha
                </label>
                <Lock className="w-5 h-5 text-slate-400 absolute left-4 top-3.5 peer-focus:text-sky-400 transition-colors" />
              </div>
            </div>

            <div className="flex justify-end mb-2">
              <a href="#" className="text-xs text-sky-400 hover:underline">Esqueci a senha</a>
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="w-full flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 text-white font-bold py-3.5 px-4 rounded-xl text-sm shadow-[0_4px_14px_rgba(56,189,248,0.39)] hover:shadow-[0_6px_20px_rgba(56,189,248,0.23)] transition-all cursor-pointer disabled:opacity-50 mt-4"
            >
              {carregando ? (
                <span>Autenticando...</span>
              ) : (
                <span>Entrar</span>
              )}
            </button>
          </form>

          <div className="flex items-center my-6">
            <div className="flex-1 h-px bg-white/10"></div>
            <span className="px-4 text-xs text-slate-500">ou</span>
            <div className="flex-1 h-px bg-white/10"></div>
          </div>

          <div className="flex justify-center mb-6">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setErro('Ocorreu um erro ao tentar fazer login com o Google')}
              theme="filled_black"
              text="continue_with"
              width="100%"
            />
          </div>

          <div className="text-center">
            <p className="text-xs text-slate-400">
              Não tem uma conta? <a href="#" className="text-sky-400 font-semibold hover:underline">Solicitar cadastro</a>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

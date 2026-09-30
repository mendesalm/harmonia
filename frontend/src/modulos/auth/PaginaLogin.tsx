import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import clienteHttp from '../../compartilhado/api/cliente_http';
import { useAuth } from '../../compartilhado/contextos/ContextoAutenticacao';
import { useTenant } from '../../compartilhado/contextos/ContextoTenant';
import { GoogleLogin } from '@react-oauth/google';
import HeroBackground from '../../compartilhado/componentes/HeroBackground';
import LogoAnimadaHarmonia from '../../compartilhado/componentes/LogoAnimadaHarmonia';

export const PaginaLogin: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { recarregarLojas } = useTenant();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [lembrarMe, setLembrarMe] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const destino = (location.state as any)?.from?.pathname || '/';

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse.credential) return;
    setErro(null);
    setCarregando(true);
    try {
      const baseUrlIdp = import.meta.env.VITE_URL_IDENTIDADE || 'https://e-sigma.app';
      const respIdp = await fetch(`${baseUrlIdp}/api/v1/auth/google`, {
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
      const baseUrlIdp = import.meta.env.VITE_URL_IDENTIDADE || 'https://e-sigma.app';
      const respIdp = await fetch(`${baseUrlIdp}/api/v1/auth/login`, {
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-sigma-bg relative overflow-hidden z-0">
      
      {/* Background Animado de Partículas idêntico ao e-Sigma */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <HeroBackground />
      </div>

      <div className="w-full max-w-md relative z-10 my-auto py-6">
        
        {/* Cartão de Login - Glassmorphism Soberano Deep Blue Glass */}
        <div className="card-deep-blue-glass p-8 sm:p-10 flex flex-col items-center">
          
          {/* Logo e Título Padronizados como Clone Visual do e-Sigma */}
          <div className="flex flex-col items-center text-center mb-6">
            <div id="hero-logo" className="mb-2 flex justify-center">
              <LogoAnimadaHarmonia width={100} height={100} showText={false} animated={true} />
            </div>

            <h1 className="text-3xl font-bold tracking-wider font-sans text-transparent bg-clip-text bg-gradient-to-r from-[#FDE68A] via-[#DDB96B] to-[#B8862D] drop-shadow-[0_0_10px_rgba(221,185,107,0.35)]">
              Acesso Restrito
            </h1>
            <p className="text-sm text-slate-400 mt-1 font-sans">
              Insira suas credenciais para continuar
            </p>
          </div>

          {/* Alerta de Erro */}
          {erro && (
            <div className="w-full mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-200 text-center">
              {erro}
            </div>
          )}

          {/* Formulário Principal */}
          <form onSubmit={handleLogin} className="w-full space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                E-mail ou CIM
              </label>
              <input
                type="text"
                id="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Insira seu e-mail ou CIM"
                className="w-full bg-sigma-surface/60 border border-white/15 focus:border-[#DDB96B] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all shadow-inner focus:ring-1 focus:ring-[#DDB96B]/50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  id="senha"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Insira sua senha"
                  className="w-full bg-sigma-surface/60 border border-white/15 focus:border-[#DDB96B] rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-slate-500 outline-none transition-all shadow-inner focus:ring-1 focus:ring-[#DDB96B]/50"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  aria-label="Alternar visibilidade da senha"
                >
                  {mostrarSenha ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            {/* Linha Lembrar-me e Esqueci a Senha */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 hover:text-slate-300">
                <input
                  type="checkbox"
                  checked={lembrarMe}
                  onChange={(e) => setLembrarMe(e.target.checked)}
                  className="rounded border-slate-700 text-[#DDB96B] focus:ring-[#DDB96B] bg-sigma-surface"
                />
                <span>Lembrar-me</span>
              </label>
              <a href="#" className="text-xs text-[#DDB96B] hover:underline">
                Esqueci a senha
              </a>
            </div>

            {/* Botão de Submissão no estilo Pill Oficial */}
            <button
              type="submit"
              disabled={carregando}
              className="btn-masonic-pill btn-pill-blue w-full py-3.5 px-4 text-base font-semibold mt-4 cursor-pointer disabled:opacity-50"
            >
              {carregando ? 'Autenticando...' : 'Entrar'}
            </button>

            {/* Divisor "ou" */}
            <div className="flex items-center my-5 w-full">
              <div className="flex-1 h-px bg-white/10"></div>
              <span className="px-3 text-xs text-slate-400">ou</span>
              <div className="flex-1 h-px bg-white/10"></div>
            </div>

            {/* Google Login Restilizado */}
            <div className="flex justify-center mb-4 w-full h-[46px] rounded-full overflow-hidden border border-white/10 hover:border-white/30 transition-all opacity-90 hover:opacity-100">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setErro('Ocorreu um erro ao tentar fazer login com o Google')}
                theme="filled_black"
                shape="pill"
                text="continue_with"
                width="380"
              />
            </div>

            {/* Links Auxiliares no Rodapé */}
            <div className="text-center pt-2">
              <p className="text-xs text-slate-400">
                Não tem uma conta?{' '}
                <a href="https://e-sigma.app/register" className="text-[#DDB96B] font-semibold hover:underline">
                  Solicitar cadastro
                </a>
              </p>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
};

export default PaginaLogin;

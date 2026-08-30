import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Volume2, Lock, Mail, ArrowRight, ShieldCheck, Sparkles, Building, KeyRound } from 'lucide-react';
import clienteHttp from '../../compartilhado/api/cliente_http';
import { useAuth } from '../../compartilhado/contextos/ContextoAutenticacao';
import { useTenant } from '../../compartilhado/contextos/ContextoTenant';

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    try {
      const resp = await clienteHttp.post('/auth/login', {
        email: email.trim(),
        senha: senha,
      });

      const { access_token, usuario } = resp.data;
      login(access_token, usuario);
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-primaria-900 relative overflow-hidden selection:bg-macaonico-cianoSigma selection:text-black">
      
      {/* Elementos de Fundo */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-macaonico-cianoSigma/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-macaonico-dourado/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        
        {/* Cartão de Login */}
        <div className="vidro-destaque rounded-3xl p-8 shadow-2xl border border-white/15">
          
          {/* Logo e Título */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-macaonico-cianoSigma via-primaria-600 to-macaonico-dourado flex items-center justify-center shadow-xl shadow-cyan-500/25 mb-4 scale-105">
              <Volume2 className="w-9 h-9 text-black" />
            </div>

            <h1 className="text-3xl font-black text-white tracking-wider fonte-ritual flex items-center gap-2">
              HARMONIA
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-sans">
              Acesso por Assinatura de Loja • Ecossistema Sigma
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
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>E-mail da Loja Assinante</span>
                <span className="text-[10px] text-macaonico-cianoSigma/80 font-mono">loja(nº)@harmonia.sigma.app</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="loja2181@harmonia.sigma.app"
                  className="w-full bg-primaria-800 border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-macaonico-cianoSigma outline-none placeholder:text-slate-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Senha de Acesso
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-primaria-800 border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-macaonico-cianoSigma outline-none placeholder:text-slate-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-macaonico-cianoSigma to-primaria-500 hover:from-cyan-400 hover:to-primaria-400 text-black font-bold py-3 px-4 rounded-xl text-sm shadow-lg shadow-cyan-500/25 transition-all cursor-pointer disabled:opacity-50 mt-6"
            >
              {carregando ? (
                <span>Autenticando...</span>
              ) : (
                <>
                  <span>Entrar no Harmonia</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Atalhos Rápidos para Demonstração */}
          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Acesso Rápido de Demonstração
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => preencherCredencialRapida('LOJA2181')}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-macaonico-cianoSigma border border-macaonico-cianoSigma/20 transition-all text-center"
              >
                🏛️ Loja nº 2181
              </button>
              <button
                type="button"
                onClick={() => preencherCredencialRapida('ADMIN')}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-[11px] font-medium text-slate-300 border border-white/5 transition-all text-center"
              >
                🛡️ SuperAdmin Sigma
              </button>
            </div>
          </div>

        </div>

        {/* Rodapé */}
        <p className="text-center text-xs text-slate-500 mt-6">
          Harmonia v2.0 • Sistema de Assinatura Mensal por Loja Maçônica
        </p>

      </div>
    </div>
  );
};

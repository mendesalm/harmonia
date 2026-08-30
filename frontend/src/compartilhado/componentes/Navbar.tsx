import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { PlayCircle, ListMusic, Calendar, Music, Building2, BookOpen, Volume2, LogOut, User, KeyRound, ShieldCheck, X, Check } from 'lucide-react';
import { useTenant } from '../contextos/ContextoTenant';
import { useAuth } from '../contextos/ContextoAutenticacao';
import clienteHttp from '../api/cliente_http';

export const Navbar: React.FC = () => {
  const { lojaAtiva, lojas, selecionarLoja } = useTenant();
  const { usuario, logout, autenticado } = useAuth();

  // Modal Alterar Senha
  const [modalSenhaAberto, setModalSenhaAberto] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [msgSucesso, setMsgSucesso] = useState<string | null>(null);
  const [msgErro, setMsgErro] = useState<string | null>(null);

  const links = [
    { to: '/', label: 'Player do Mestre', icon: PlayCircle },
    { to: '/sessoes', label: 'Sessões & Esteiras', icon: Calendar },
    { to: '/eventos', label: 'Eventos Ritualísticos', icon: ListMusic },
    { to: '/musicas', label: 'Acervo de Músicas', icon: Music },
  ];

  if (!autenticado) return null;

  const handleAlterarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsgErro(null);
    setMsgSucesso(null);

    if (novaSenha !== confirmarSenha) {
      setMsgErro('A nova senha e a confirmação não coincidem.');
      return;
    }

    try {
      setSalvandoSenha(true);
      await clienteHttp.post('/auth/alterar-senha', {
        senha_atual: senhaAtual,
        nova_senha: novaSenha,
      });

      setMsgSucesso('Senha alterada com sucesso!');
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
      setTimeout(() => {
        setModalSenhaAberto(false);
        setMsgSucesso(null);
      }, 1500);
    } catch (err: any) {
      setMsgErro(err.response?.data?.detail || 'Erro ao alterar a senha.');
    } finally {
      setSalvandoSenha(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 vidro-escuro border-b border-white/10 px-4 lg:px-8 py-3 transition-all">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Marca / Logo */}
          <div className="flex items-center justify-between">
            <NavLink to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-macaonico-cianoSigma via-primaria-600 to-macaonico-dourado flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
                <Volume2 className="w-6 h-6 text-black" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-wider text-white fonte-ritual flex items-center gap-2">
                  HARMONIA <span className="text-xs px-2 py-0.5 rounded-full bg-macaonico-cianoSigma/20 text-macaonico-cianoSigma font-sans font-semibold border border-macaonico-cianoSigma/30">v2.0</span>
                </span>
                <p className="text-xs text-slate-400 font-sans">Mestre de Harmonia Maçônico</p>
              </div>
            </NavLink>

            {/* Seletor Mobile de Loja */}
            <div className="md:hidden flex items-center gap-2">
              <button
                onClick={() => setModalSenhaAberto(true)}
                title="Alterar Senha"
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <KeyRound className="w-4 h-4 text-macaonico-cianoSigma" />
              </button>
              <button
                onClick={logout}
                title="Sair do Sistema"
                className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/10"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navegação Principal */}
          <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-macaonico-cianoSigma text-black font-semibold shadow-md shadow-cyan-500/25'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Seletor Desktop de Tenant, Usuário e Logout */}
          <div className="hidden md:flex items-center gap-3">
            
            {/* Loja Ativa */}
            <div className="flex items-center gap-2 bg-primaria-800/80 border border-white/10 rounded-xl px-3 py-1.5">
              <Building2 className="w-4 h-4 text-macaonico-dourado" />
              <select
                value={lojaAtiva?.id || ''}
                onChange={(e) => {
                  const encontrada = lojas.find((l) => l.id === e.target.value);
                  if (encontrada) selecionarLoja(encontrada);
                }}
                aria-label="Selecionar Loja Maçônica Ativa"
                className="bg-transparent text-xs text-white outline-none cursor-pointer pr-2 font-medium"
              >
                {lojas.map((l) => (
                  <option key={l.id} value={l.id} className="bg-primaria-800 text-white">
                    {l.nome} ({l.sigla || l.slug_armazenamento})
                  </option>
                ))}
              </select>
            </div>

            {/* Usuário Logado & Botão Alterar Senha */}
            {usuario && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
                <div className="w-6 h-6 rounded-full bg-macaonico-cianoSigma/20 border border-macaonico-cianoSigma/40 flex items-center justify-center text-[10px] font-bold text-macaonico-cianoSigma">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-white leading-none">{usuario.nome}</p>
                  <p className="text-[10px] text-slate-400 leading-none mt-0.5">
                    {usuario.email}
                  </p>
                </div>
                <button
                  onClick={() => setModalSenhaAberto(true)}
                  title="Alterar Senha de Acesso"
                  className="p-1 rounded-lg text-slate-400 hover:text-macaonico-cianoSigma hover:bg-white/10 ml-1 transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Swagger Link */}
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noreferrer"
              title="Swagger API REST"
              className="p-2 rounded-xl text-slate-400 hover:text-macaonico-cianoSigma hover:bg-white/5 border border-white/10 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
            </a>

            {/* Botão Logout */}
            <button
              onClick={logout}
              title="Sair / Desconectar"
              className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-white/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      {/* Modal Alterar Senha */}
      {modalSenhaAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="vidro-destaque rounded-3xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <h3 className="text-lg font-bold text-white fonte-ritual flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-macaonico-cianoSigma" />
                Alterar Senha de Acesso
              </h3>
              <button
                onClick={() => setModalSenhaAberto(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {msgSucesso && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-200 text-center">
                {msgSucesso}
              </div>
            )}

            {msgErro && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-200 text-center">
                {msgErro}
              </div>
            )}

            <form onSubmit={handleAlterarSenha} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Senha Atual
                </label>
                <input
                  type="password"
                  required
                  value={senhaAtual}
                  onChange={(e) => setSenhaAtual(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-primaria-800 border border-white/15 rounded-xl px-3.5 py-2 text-sm text-white focus:border-macaonico-cianoSigma outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nova Senha (Mínimo 6 caracteres)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-primaria-800 border border-white/15 rounded-xl px-3.5 py-2 text-sm text-white focus:border-macaonico-cianoSigma outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Confirmar Nova Senha
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-primaria-800 border border-white/15 rounded-xl px-3.5 py-2 text-sm text-white focus:border-macaonico-cianoSigma outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalSenhaAberto(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoSenha}
                  className="bg-macaonico-cianoSigma hover:bg-cyan-400 text-black font-bold px-5 py-2 rounded-xl text-xs transition-all disabled:opacity-50"
                >
                  {salvandoSenha ? 'Alterando...' : 'Salvar Nova Senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

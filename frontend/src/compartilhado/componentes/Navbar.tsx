import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { PlayCircle, ListMusic, Calendar, Music, Building2, Volume2, LogOut, User, KeyRound, X, Check } from 'lucide-react';
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
    { to: '/', label: 'Player 3D', icon: PlayCircle },
    { to: '/sessoes', label: 'Sessões', icon: Calendar },
    { to: '/eventos', label: 'Eventos', icon: ListMusic },
    { to: '/musicas', label: 'Acervo', icon: Music },
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
      <header className="sticky top-0 z-50 bg-[#060e1d]/95 backdrop-blur-md border-b border-white/10 px-3 sm:px-6 py-1.5 h-12 sm:h-13 shrink-0 flex items-center justify-between transition-all">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Marca / Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <NavLink to="/" className="flex items-center gap-2 group">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-[#00E5FF] to-cyan-700 flex items-center justify-center shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform">
                <Volume2 className="w-4 h-4 text-black" />
              </div>
              <div className="hidden min-[380px]:block">
                <span className="text-xs sm:text-sm font-bold tracking-wider text-white fonte-ritual flex items-center gap-1.5">
                  HARMONIA <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#00E5FF]/20 text-[#00E5FF] font-sans font-semibold border border-cyan-500/30">3D</span>
                </span>
              </div>
            </NavLink>
          </div>

          {/* Navegação Principal Compacta */}
          <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-[#00E5FF] text-black font-bold shadow-md shadow-cyan-500/25'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden min-[500px]:inline">{link.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Seletor Desktop de Tenant, Usuário e Logout */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            
            {/* Loja Ativa */}
            <div className="hidden sm:flex items-center gap-1.5 bg-[#091526] border border-white/10 rounded-xl px-2.5 py-1 text-xs">
              <Building2 className="w-3.5 h-3.5 text-cyan-400" />
              <select
                value={lojaAtiva?.id || ''}
                onChange={(e) => {
                  const encontrada = lojas.find((l) => l.id === e.target.value);
                  if (encontrada) selecionarLoja(encontrada);
                }}
                aria-label="Selecionar Loja Maçônica Ativa"
                className="bg-transparent text-[11px] text-white outline-none cursor-pointer pr-1 font-medium max-w-[120px] md:max-w-[180px] truncate"
              >
                {lojas.map((l) => (
                  <option key={l.id} value={l.id} className="bg-[#091526] text-white">
                    {l.sigla || l.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Botão Alterar Senha */}
            <button
              onClick={() => setModalSenhaAberto(true)}
              title="Alterar Senha de Acesso"
              className="p-1.5 rounded-lg text-slate-400 hover:text-[#00E5FF] hover:bg-white/5 transition-colors cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
            </button>

            {/* Logout */}
            <button
              onClick={logout}
              title="Encerrar Sessão"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </header>

      {/* Modal de Alteração de Senha */}
      {modalSenhaAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-[#091526] border border-cyan-500/30 rounded-2xl p-5 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#00E5FF]" />
                <h3 className="font-mono text-sm font-bold uppercase">Alterar Senha</h3>
              </div>
              <button onClick={() => setModalSenhaAberto(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAlterarSenha} className="flex flex-col gap-3 font-mono text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Senha Atual</label>
                <input
                  type="password"
                  required
                  value={senhaAtual}
                  onChange={(e) => setSenhaAtual(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-[#00E5FF]"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Nova Senha</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-[#00E5FF]"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Confirmar Nova Senha</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-[#00E5FF]"
                />
              </div>

              {msgErro && <p className="text-red-400 text-[11px]">{msgErro}</p>}
              {msgSucesso && <p className="text-emerald-400 text-[11px]">{msgSucesso}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalSenhaAberto(false)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 text-slate-300 hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoSenha}
                  className="px-4 py-1.5 rounded-xl bg-[#00E5FF] text-black font-bold hover:bg-cyan-400 disabled:opacity-50"
                >
                  {salvandoSenha ? 'Salvando...' : 'Salvar Nova Senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

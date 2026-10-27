import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlayCircle,
  Music,
  Compass,
  Sparkles,
  Guitar,
  Film,
  Disc3,
  Loader2,
  Check,
  ChevronRight,
  ShieldCheck,
  Volume1,
  Layers,
  ArrowRight,
} from 'lucide-react';
import clienteHttp from '../../compartilhado/api/cliente_http';
import { useTenant } from '../../compartilhado/contextos/ContextoTenant';
import { feedbackTatil } from '../../compartilhado/utilitarios/dispositivoNativo';

interface SessaoLojaItem {
  id: string;
  nome_personalizado?: string | null;
  tipo_sessao?: {
    id: string;
    nome: string;
    rito?: { nome: string };
  };
  eventos_customizados?: {
    id: string;
    suprimido?: boolean;
    em_surdina?: boolean;
    evento?: { nome: string };
  }[];
}

interface EstiloConfig {
  codigo: string;
  nome: string;
  descricao: string;
  icone: React.ReactNode;
  corBorda: string;
  corBg: string;
}

const ESTILOS_LITURGICOS: EstiloConfig[] = [
  {
    codigo: 'UNIVERSAL',
    nome: 'Universal / Completo',
    descricao: 'Executa todas as faixas e gêneros do acervo cadastrados pela Oficina e pelo Rito.',
    icone: <Sparkles className="w-6 h-6 text-macaonico-dourado" />,
    corBorda: 'border-macaonico-dourado/40',
    corBg: 'from-[#0e1a2f] to-[#070e1c]',
  },
  {
    codigo: 'VIOLAO',
    nome: 'Violão Acústico',
    descricao: 'Cordas dedilhadas e temas acústicos serenos para uma atmosfera intimista e concentrada.',
    icone: <Disc3 className="w-6 h-6 text-amber-400" />,
    corBorda: 'border-amber-500/40',
    corBg: 'from-[#1c150a] to-[#0a0d16]',
  },
  {
    codigo: 'CLASSICA',
    nome: 'Clássica & Orquestral',
    descricao: 'Peças eruditas solenes, barrocas e clássicas de grande elevação espiritual e ritualística.',
    icone: <Music className="w-6 h-6 text-blue-400" />,
    corBorda: 'border-blue-500/40',
    corBg: 'from-[#0a1628] to-[#070e1c]',
  },
  {
    codigo: 'SOUNDTRACKS',
    nome: 'Soundtracks & Cinema',
    descricao: 'Temas instrumentais contemporâneos, orquestrações modernas e atmosferas imersivas.',
    icone: <Film className="w-6 h-6 text-purple-400" />,
    corBorda: 'border-purple-500/40',
    corBg: 'from-[#180a26] to-[#070e1c]',
  },
  {
    codigo: 'POPULAR',
    nome: 'Instrumental Popular',
    descricao: 'Arranjos instrumentais serenos de canções consagradas e temas folclóricos/cívicos.',
    icone: <Compass className="w-6 h-6 text-emerald-400" />,
    corBorda: 'border-emerald-500/40',
    corBg: 'from-[#0a2016] to-[#070e1c]',
  },
];

export const PaginaPrepararSessao: React.FC = () => {
  const navigate = useNavigate();
  const { lojaAtiva } = useTenant();

  const [sessoes, setSessoes] = useState<SessaoLojaItem[]>([]);
  const [sessaoSelecionadaId, setSessaoSelecionadaId] = useState<string>('');
  const [estiloSelecionado, setEstiloSelecionado] = useState<string>('UNIVERSAL');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const buscarSessoes = async () => {
      if (!lojaAtiva) return;
      try {
        setCarregando(true);
        const resp = await clienteHttp.get<SessaoLojaItem[]>(`/sessoes/loja/${lojaAtiva.id}`);
        const lista = resp.data || [];
        setSessoes(lista);
        if (lista.length > 0) {
          setSessaoSelecionadaId(lista[0].id);
        }
      } catch (err) {
        console.error('Erro ao buscar sessões da loja:', err);
      } finally {
        setCarregando(false);
      }
    };
    buscarSessoes();
  }, [lojaAtiva]);

  const sessaoAtual = sessoes.find(s => s.id === sessaoSelecionadaId);
  const totalMomentos = sessaoAtual?.eventos_customizados?.filter(e => !e.suprimido).length || 0;
  const totalSurdina = sessaoAtual?.eventos_customizados?.filter(e => !e.suprimido && e.em_surdina).length || 0;

  const handleIniciarHarmonia = () => {
    if (!sessaoSelecionadaId) return;
    feedbackTatil.acaoForte();
    navigate(`/player?sessao=${sessaoSelecionadaId}&estilo=${estiloSelecionado}`);
  };

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 md:p-8 bg-[#040812] text-slate-100 flex flex-col items-center">
      <div className="w-full max-w-4xl flex flex-col gap-8 pb-12">

        {/* Cabeçalho Litúrgico */}
        <header className="text-center space-y-2 pt-2 sm:pt-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#0a1428] border border-macaonico-dourado/30 text-xs font-cinzel text-macaonico-dourado shadow-sm">
            <Compass className="w-3.5 h-3.5 text-macaonico-dourado" />
            <span>Harmonia Litúrgica • Preparação da Sessão</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-cinzel text-white drop-shadow-md">
            Preparar Trabalhos no Templo
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            Selecione o roteiro ritualístico da Oficina e defina o estilo musical dos trabalhos. O acervo será composto automaticamente.
          </p>
        </header>

        {carregando ? (
          <div className="py-20 flex flex-col items-center justify-center text-macaonico-dourado">
            <Loader2 className="w-8 h-8 animate-spin mb-3" />
            <p className="font-cinzel text-sm">Carregando roteiros da Loja...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">

            {/* Passo 1: Seleção da Sessão */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold font-cinzel text-macaonico-dourado tracking-wider uppercase">
                <span className="w-5 h-5 rounded-full bg-macaonico-dourado text-black flex items-center justify-center text-[11px] font-sans font-extrabold">1</span>
                <span>Selecione a Sessão da Oficina</span>
              </div>

              {sessoes.length === 0 ? (
                <div className="p-6 rounded-2xl bg-[#070e1c] border border-slate-800 text-center space-y-3">
                  <p className="text-sm text-slate-400">Nenhuma sessão encontrada para a sua Loja.</p>
                  <button
                    onClick={() => navigate('/sessoes')}
                    className="px-4 py-2 rounded-xl bg-macaonico-dourado text-black font-bold text-xs"
                  >
                    Importar Sessão do Rito
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {sessoes.map((s) => {
                    const ativa = s.id === sessaoSelecionadaId;
                    const nomeSessao = s.nome_personalizado || s.tipo_sessao?.nome || 'Sessão Ritualística';
                    const ritoNome = s.tipo_sessao?.rito?.nome || 'Rito Brasileiro';
                    const momentosQtd = s.eventos_customizados?.filter(e => !e.suprimido).length || 0;

                    return (
                      <div
                        key={s.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          feedbackTatil.clique();
                          setSessaoSelecionadaId(s.id);
                        }}
                        className={`p-4 rounded-2xl border transition-all text-left cursor-pointer relative overflow-hidden flex flex-col justify-between gap-3 ${
                          ativa
                            ? 'bg-[#0E1A2F] border-macaonico-dourado shadow-[0_4px_20px_rgba(221,185,107,0.18)]'
                            : 'bg-[#070e1c] border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-macaonico-dourado/80">
                              {ritoNome}
                            </span>
                            <h3 className="font-bold text-sm text-slate-100 line-clamp-2 mt-0.5 font-cinzel">
                              {nomeSessao}
                            </h3>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${
                              ativa
                                ? 'bg-macaonico-dourado border-yellow-300 text-black'
                                : 'border-slate-700 bg-black/40 text-transparent'
                            }`}
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-white/5">
                          <span>{momentosQtd} momentos litúrgicos</span>
                          <span className="text-slate-500">Ordem padrão</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Passo 2: Escolha do Estilo Litúrgico */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold font-cinzel text-macaonico-dourado tracking-wider uppercase">
                <span className="w-5 h-5 rounded-full bg-macaonico-dourado text-black flex items-center justify-center text-[11px] font-sans font-extrabold">2</span>
                <span>Escolha o Estilo Sonoro da Sessão</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {ESTILOS_LITURGICOS.map((est) => {
                  const selecionado = est.codigo === estiloSelecionado;

                  return (
                    <div
                      key={est.codigo}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        feedbackTatil.clique();
                        setEstiloSelecionado(est.codigo);
                      }}
                      className={`p-4 rounded-2xl border transition-all text-left cursor-pointer flex flex-col justify-between gap-2 relative bg-gradient-to-b ${est.corBg} ${
                        selecionado
                          ? `${est.corBorda} ring-1 ring-macaonico-dourado/50 shadow-[0_4px_24px_rgba(0,0,0,0.6)]`
                          : 'border-slate-800/80 hover:border-slate-700 opacity-80 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                          {est.icone}
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                            selecionado
                              ? 'bg-macaonico-dourado border-yellow-300 text-black'
                              : 'border-slate-700 text-transparent'
                          }`}
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      </div>

                      <div>
                        <h4 className="font-bold text-sm text-slate-100 font-cinzel">{est.nome}</h4>
                        <p className="text-[11px] text-slate-300/80 mt-1 leading-relaxed">{est.descricao}</p>
                      </div>

                      <div className="text-[10px] font-mono text-macaonico-dourado/70 pt-2 border-t border-white/5">
                        {est.codigo === 'UNIVERSAL' ? '• Todas as faixas do acervo' : '• Faixas dedicadas + Universal'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Painel de Resumo do Clima Litúrgico */}
            {sessaoAtual && (
              <div className="p-4 sm:p-5 rounded-2xl bg-[#070e1c] border border-macaonico-dourado/30 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-[#0e1a2f] border border-macaonico-dourado/40 flex items-center justify-center shrink-0">
                    <PlayCircle className="w-6 h-6 text-macaonico-dourado" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-mono uppercase text-macaonico-dourado tracking-wider">
                      Resumo da Esteira Ritualística
                    </p>
                    <h3 className="text-sm sm:text-base font-bold text-white truncate font-cinzel">
                      {sessaoAtual.nome_personalizado || sessaoAtual.tipo_sessao?.nome}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {totalMomentos} momentos litúrgicos • Estilo: <span className="text-slate-200 font-medium">{estiloSelecionado}</span>
                      {totalSurdina > 0 && (
                        <span className="text-amber-300 ml-1.5">• {totalSurdina} em Surdina (priorizam faixas Ambiente)</span>
                      )}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleIniciarHarmonia}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-yellow-500 via-macaonico-dourado to-yellow-600 text-black font-extrabold font-cinzel text-sm sm:text-base hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2 shadow-[0_6px_24px_rgba(221,185,107,0.35)] shrink-0"
                >
                  <span>Iniciar Harmonia no Templo</span>
                  <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
};

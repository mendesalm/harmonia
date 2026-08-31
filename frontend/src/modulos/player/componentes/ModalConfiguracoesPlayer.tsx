import React from 'react';
import { X, Layers, UploadCloud, Sliders, Volume2, ShieldCheck, Sparkles } from 'lucide-react';
import { Sessao } from '../../../compartilhado/tipos';

interface Props {
  aberto: boolean;
  onFechar: () => void;
  sessoes: Sessao[];
  sessaoSelecionadaId: string;
  onSelecionarSessao: (sessaoId: string) => void;
  onAbrirUpload: () => void;
}

export const ModalConfiguracoesPlayer: React.FC<Props> = ({
  aberto,
  onFechar,
  sessoes,
  sessaoSelecionadaId,
  onSelecionarSessao,
  onAbrirUpload,
}) => {
  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#060e1d] border border-cyan-500/40 rounded-3xl p-5 shadow-[0_0_50px_rgba(0,229,255,0.25)] text-slate-100 flex flex-col gap-4">
        
        {/* Header do Modal */}
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-[#00E5FF]" />
            <div>
              <h2 className="text-sm font-black font-mono uppercase tracking-wider text-white">
                Painel do Mestre // Configurações
              </h2>
              <span className="text-[10px] font-mono text-cyan-400">Harmonia 3D Audio Engine</span>
            </div>
          </div>

          <button
            onClick={onFechar}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. SELEÇÃO DE SESSÃO RITUALÍSTICA */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#00E5FF]" />
            <span>SESSÃO RITUALÍSTICA ATIVA</span>
          </label>
          <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto pr-1">
            {sessoes.map((s) => {
              const selecionada = s.id === sessaoSelecionadaId;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    onSelecionarSessao(s.id);
                  }}
                  className={`w-full p-2.5 rounded-xl text-left font-mono text-xs transition-all flex items-center justify-between border ${
                    selecionada
                      ? 'bg-cyan-500/20 border-cyan-500/60 text-[#00E5FF] font-bold shadow-[0_0_15px_rgba(0,229,255,0.2)]'
                      : 'bg-[#091526] border-white/5 text-slate-300 hover:border-cyan-500/30'
                  }`}
                >
                  <span className="truncate">{s.nome}</span>
                  <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                    {s.rito} - G{s.grau}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. ATALHOS DE ACERVO / UPLOAD */}
        <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
          <label className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
            <UploadCloud className="w-3.5 h-3.5 text-[#00E5FF]" />
            <span>GERENCIAMENTO DE ACERVO</span>
          </label>
          <button
            onClick={() => {
              onFechar();
              onAbrirUpload();
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-[#00E5FF] font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload MP3 / Converter YouTube para 320 kbps</span>
          </button>
        </div>

        {/* 3. PARÂMETROS LITÚRGICOS */}
        <div className="p-3 rounded-2xl bg-[#040a14] border border-cyan-500/15 flex items-center justify-between text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Modo Silêncio Litúrgico</span>
          </div>
          <span className="text-emerald-400 font-bold text-[10px] uppercase">
            [ Blindado // Pausa Inicial Ativa ]
          </span>
        </div>

        {/* Botão de Fechar */}
        <div className="flex justify-end pt-1">
          <button
            onClick={onFechar}
            className="px-5 py-2 rounded-xl bg-[#00E5FF] hover:bg-cyan-400 text-black font-mono font-bold text-xs transition-all shadow-[0_0_15px_rgba(0,229,255,0.3)]"
          >
            Concluir & Retornar ao Templo
          </button>
        </div>

      </div>
    </div>
  );
};

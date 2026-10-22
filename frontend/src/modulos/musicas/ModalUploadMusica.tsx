import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, Music, Youtube, DownloadCloud, Sparkles, CheckCircle2, Wand2, Globe } from 'lucide-react';
import { Evento } from '../../compartilhado/tipos';
import clienteHttp from '../../compartilhado/api/cliente_http';
import { useTenant } from '../../compartilhado/contextos/ContextoTenant';
import { useAuth } from '../../compartilhado/contextos/ContextoAutenticacao';
import { extrairMetadadosAudio } from '../../compartilhado/utilitarios/extratorMetadadosAudio';

function extrairMensagemErro(err: any, mensagemPadrao: string): string {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map((d: any) => d?.msg || JSON.stringify(d)).join('; ');
  }
  return err?.message || mensagemPadrao;
}

interface Props {
  onFechar: () => void;
  onSalvo: (novaMusicaId?: string) => void;
  eventoIdPreSelecionado?: string;
  isGlobalAdmin?: boolean;
  esconderEventos?: boolean;
}

/**
 * Modal de Upload de Áudio e Conversão YouTube para o Acervo Harmonia.
 * Adaptado para bottom-sheet em dispositivos móveis e modal centralizado no desktop.
 */
export const ModalUploadMusica: React.FC<Props> = ({
  onFechar,
  onSalvo,
  eventoIdPreSelecionado,
  isGlobalAdmin,
  esconderEventos,
}) => {
  const { lojaAtiva } = useTenant();
  const { usuario } = useAuth();
  const ehSuperAdmin = Boolean(
    isGlobalAdmin ||
    usuario?.permissoes?.includes('super_admin') ||
    usuario?.tipo === 'ADMIN' ||
    usuario?.email?.toLowerCase() === 'mendesalm@gmail.com' ||
    usuario?.dados_especificos?.cim === '272875'
  );
  const [associacaoGlobal, setAssociacaoGlobal] = useState(ehSuperAdmin);
  const [abaAtiva, setAbaAtiva] = useState<'ARQUIVO' | 'YOUTUBE'>('ARQUIVO');
  const [eventosDisponiveis, setEventosDisponiveis] = useState<Evento[]>([]);

  const [titulo, setTitulo] = useState('');
  const [autor, setAutor] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [linkStreaming, setLinkStreaming] = useState('');
  const [converterParaMp3, setConverterParaMp3] = useState(true);
  const [eventosSelecionados, setEventosSelecionados] = useState<string[]>(
    eventoIdPreSelecionado ? [eventoIdPreSelecionado] : []
  );
  const [salvando, setSalvando] = useState(false);
  const [mensagemStatus, setMensagemStatus] = useState('');
  const [lendoMetadados, setLendoMetadados] = useState(false);

  useEffect(() => {
    if (eventoIdPreSelecionado && !eventosSelecionados.includes(eventoIdPreSelecionado)) {
      setEventosSelecionados([eventoIdPreSelecionado]);
    }
  }, [eventoIdPreSelecionado]);

  useEffect(() => {
    const carregarEventos = async () => {
      try {
        const orgId = isGlobalAdmin ? null : lojaAtiva?.id;
        const resp = await clienteHttp.get<Evento[]>('/eventos', {
          params: { organizacao_id: orgId, incluir_globais: true },
        });
        setEventosDisponiveis(resp.data);
      } catch (err) {
        console.error('Erro ao carregar eventos para seleção:', err);
      }
    };
    if (lojaAtiva || isGlobalAdmin) {
      carregarEventos();
    }
  }, [lojaAtiva, isGlobalAdmin]);

  const toggleEvento = (id: string) => {
    if (eventosSelecionados.includes(id)) {
      setEventosSelecionados(eventosSelecionados.filter((e) => e !== id));
    } else {
      setEventosSelecionados([...eventosSelecionados, id]);
    }
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isGlobalAdmin && !lojaAtiva) return;

    if (!esconderEventos && eventosSelecionados.length === 0) {
      alert(
        'Atenção: Selecione pelo menos um Momento Ritualístico abaixo para vincular esta música.'
      );
      return;
    }

    try {
      setSalvando(true);
      let novaMusicaId = undefined;

      if (abaAtiva === 'ARQUIVO') {
        if (!arquivo) {
          alert('Por favor, selecione um arquivo de áudio para upload.');
          return;
        }

        setMensagemStatus('Enviando arquivo de áudio para o servidor...');
        const formData = new FormData();
        // Se associacaoGlobal estiver ativa (SuperAdmin), não envia upload_por_loja_id (torna-se acervo global)
        if (lojaAtiva && !associacaoGlobal) {
          formData.append('upload_por_loja_id', lojaAtiva.id);
        }
        formData.append('arquivo', arquivo);
        formData.append('titulo', titulo.trim() || arquivo.name);
        if (autor.trim()) formData.append('autor_artista', autor.trim());
        formData.append('eventos_sugeridos_ids', JSON.stringify(eventosSelecionados));

        const resp = await clienteHttp.post('/musicas/upload', formData, {
          headers: { 'Content-Type': undefined },
        });
        novaMusicaId = resp.data?.id;
      } else {
        if (!linkStreaming.trim()) {
          alert('Por favor, informe a URL do YouTube.');
          return;
        }

        const orgDestino = (lojaAtiva && !associacaoGlobal) ? lojaAtiva.id : undefined;

        if (converterParaMp3) {
          setMensagemStatus('Baixando áudio e convertendo para MP3 no servidor...');
          const resp = await clienteHttp.post('/musicas/converter-youtube', {
            organizacao_id: orgDestino,
            link_youtube: linkStreaming.trim(),
            titulo: titulo.trim() || undefined,
            autor_artista: autor.trim() || undefined,
            bitrate_kbps: 320,
            eventos_sugeridos_ids: eventosSelecionados,
          });
          novaMusicaId = resp.data?.id;
        } else {
          setMensagemStatus('Cadastrando link de streaming...');
          const resp = await clienteHttp.post('/musicas/streaming', {
            organizacao_id: orgDestino,
            titulo: titulo.trim() || 'Música do YouTube',
            autor_artista: autor.trim() || null,
            tipo_midia: 'YOUTUBE',
            link_externo: linkStreaming.trim(),
            eventos_sugeridos_ids: eventosSelecionados,
          });
          novaMusicaId = resp.data?.id;
        }
      }

      onSalvo(novaMusicaId);
      onFechar();
    } catch (err: any) {
      alert(extrairMensagemErro(err, 'Erro ao processar música.'));
    } finally {
      setSalvando(false);
      setMensagemStatus('');
    }
  };

  return createPortal(
    <div
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000 }}
      className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md"
    >
      <div className="bg-[#0a1428] border border-macaonico-dourado/45 rounded-2xl sm:rounded-3xl w-full max-w-2xl p-4 sm:p-6 max-h-[88dvh] flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3 shrink-0">
          <div className="min-w-0 pr-2">
            <h2 className="text-lg sm:text-2xl font-bold text-white fonte-ritual flex items-center gap-2 truncate">
              <Music className="w-5 h-5 sm:w-6 sm:h-6 text-macaonico-dourado shrink-0" />
              <span>Adicionar Música</span>
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400">
              Envie arquivos MP3/WAV ou adicione links do YouTube ao acervo.
            </p>
          </div>

          <button
            type="button"
            onClick={onFechar}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas */}
        <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-primaria-800/80 p-1 mb-4 border border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => setAbaAtiva('ARQUIVO')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs font-bold transition-all ${
              abaAtiva === 'ARQUIVO'
                ? 'bg-macaonico-dourado text-black shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4 shrink-0" />
            <span className="truncate">Arquivo MP3/WAV</span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('YOUTUBE')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs font-bold transition-all ${
              abaAtiva === 'YOUTUBE'
                ? 'bg-macaonico-dourado text-black shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Youtube className="w-4 h-4 shrink-0" />
            <span className="truncate">YouTube</span>
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSalvar} className="space-y-4 flex-1 overflow-y-auto pr-1 min-h-0">
          {abaAtiva === 'ARQUIVO' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Arquivo de Áudio (.mp3, .wav, .ogg)
              </label>
              <div className="border-2 border-dashed border-white/20 hover:border-macaonico-dourado/60 rounded-2xl p-4 sm:p-6 text-center bg-white/5 transition-colors cursor-pointer relative">
                <input
                  type="file"
                  accept="audio/mp3,audio/wav,audio/ogg,audio/mpeg,audio/m4a"
                  required={!arquivo}
                  onChange={async (e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];
                      setArquivo(file);
                      setLendoMetadados(true);
                      try {
                        const metadados = await extrairMetadadosAudio(file);
                        if (metadados.titulo) {
                          setTitulo(metadados.titulo);
                        }
                        if (metadados.autor_artista) {
                          setAutor(metadados.autor_artista);
                        }
                      } finally {
                        setLendoMetadados(false);
                      }
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <Upload className="w-7 h-7 text-macaonico-dourado mx-auto mb-1.5" />
                {arquivo ? (
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm font-bold text-macaonico-dourado truncate">
                      {arquivo.name} ({(arquivo.size / (1024 * 1024)).toFixed(2)} MB)
                    </p>
                    {lendoMetadados ? (
                      <p className="text-[11px] text-yellow-300 animate-pulse flex items-center justify-center gap-1">
                        <Wand2 className="w-3 h-3 animate-spin" />
                        Identificando título e artistas participantes...
                      </p>
                    ) : (
                      <p className="text-[11px] text-emerald-400 flex items-center justify-center gap-1 font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        Metadados identificados automaticamente
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <p className="text-xs sm:text-sm font-semibold text-white">
                      Toque para selecionar o arquivo de áudio
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">MP3, WAV, OGG ou M4A</p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Link do Vídeo / Música no YouTube
                </label>
                <input
                  type="url"
                  required
                  value={linkStreaming}
                  onChange={(e) => setLinkStreaming(e.target.value)}
                  placeholder="Ex: https://www.youtube.com/watch?v=..."
                  className="w-full bg-primaria-800 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:border-macaonico-dourado outline-none"
                />
              </div>

              <div className="p-3 rounded-2xl bg-primaria-800/80 border border-macaonico-dourado/30">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={converterParaMp3}
                    onChange={(e) => setConverterParaMp3(e.target.checked)}
                    className="mt-1 rounded accent-macaonico-dourado w-4 h-4 cursor-pointer shrink-0"
                  />
                  <div>
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-macaonico-dourado shrink-0" />
                      Converter para MP3 320 kbps
                    </span>
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                      Salva no servidor para reprodução imediata sem anúncios.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Título da Música
              </label>
              <input
                type="text"
                required={abaAtiva === 'ARQUIVO' || !converterParaMp3}
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Hino de Abertura"
                className="w-full bg-primaria-800 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-macaonico-dourado outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Compositor / Intérprete (Opcional)
              </label>
              <input
                type="text"
                value={autor}
                onChange={(e) => setAutor(e.target.value)}
                placeholder="Ex: W. A. Mozart"
                className="w-full bg-primaria-800 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-macaonico-dourado outline-none"
              />
            </div>
          </div>

          {!esconderEventos && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Vincular aos Momentos Ritualísticos:
                </label>
                <span className="text-[11px] text-macaonico-dourado font-bold">
                  {eventosSelecionados.length} selecionado(s)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1.5 bg-primaria-800/40 rounded-2xl border border-white/5">
                {eventosDisponiveis.map((ev) => {
                  const selecionado = eventosSelecionados.includes(ev.id);
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => toggleEvento(ev.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl text-left border transition-all text-xs min-h-[40px] ${
                        selecionado
                          ? 'bg-macaonico-dourado/20 border-macaonico-dourado text-white font-bold'
                          : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <span className="truncate mr-2">{ev.nome}</span>
                      <span
                        className={`w-4 h-4 rounded-md flex items-center justify-center border text-[10px] shrink-0 ${
                          selecionado
                            ? 'bg-macaonico-dourado text-black border-transparent font-black'
                            : 'border-white/20'
                        }`}
                      >
                        {selecionado ? '✓' : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Campo Exclusivo para SuperAdmin: Tornar Associação Global */}
          {ehSuperAdmin && !esconderEventos && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent border border-macaonico-dourado/40">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={associacaoGlobal}
                  onChange={(e) => setAssociacaoGlobal(e.target.checked)}
                  className="mt-0.5 rounded accent-macaonico-dourado w-4 h-4 cursor-pointer shrink-0"
                />
                <div>
                  <span className="text-xs font-bold text-macaonico-dourado flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" />
                    Tornar Associação Global (SuperAdmin)
                  </span>
                  <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                    Disponibiliza esta música e suas sugestões de momentos como matriz pública para todas as Lojas da federação.
                  </p>
                </div>
              </label>
            </div>
          )}

          {salvando && mensagemStatus && (
            <div className="p-3 rounded-xl bg-macaonico-dourado/10 border border-macaonico-dourado/30 text-xs text-macaonico-dourado flex items-center gap-2 animate-pulse">
              <DownloadCloud className="w-4 h-4 animate-bounce shrink-0" />
              <span>{mensagemStatus}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              disabled={salvando}
              onClick={onFechar}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="bg-macaonico-dourado hover:bg-yellow-400 text-black font-bold px-5 py-2.5 rounded-xl text-sm transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {salvando ? (
                <>
                  <DownloadCloud className="w-4 h-4 animate-spin" />
                  <span>Processando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Salvar no Acervo</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

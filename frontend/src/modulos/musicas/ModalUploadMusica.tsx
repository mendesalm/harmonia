import React, { useState, useEffect } from 'react';
import { X, Upload, Music, Youtube, AlertCircle, DownloadCloud, Sparkles, CheckCircle2 } from 'lucide-react';
import { Evento } from '../../compartilhado/tipos';
import clienteHttp from '../../compartilhado/api/cliente_http';
import { useTenant } from '../../compartilhado/contextos/ContextoTenant';

interface Props {
  onFechar: () => void;
  onSalvo: () => void;
  eventoIdPreSelecionado?: string;
  isGlobalAdmin?: boolean;
}

export const ModalUploadMusica: React.FC<Props> = ({ onFechar, onSalvo, eventoIdPreSelecionado, isGlobalAdmin }) => {
  const { lojaAtiva } = useTenant();
  const [abaAtiva, setAbaAtiva] = useState<'ARQUIVO' | 'YOUTUBE'>('ARQUIVO');
  const [eventosDisponiveis, setEventosDisponiveis] = useState<Evento[]>([]);
  
  // Campos
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
          params: { organizacao_id: orgId, incluir_globais: true }
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

    if (eventosSelecionados.length === 0) {
      alert('Atenção: É obrigatório vincular a música a pelo menos um Momento Ritualístico (checklist sugerido) para que ela funcione no Auto-Fill.');
      return;
    }

    try {
      setSalvando(true);

      if (abaAtiva === 'ARQUIVO') {
        if (!arquivo) {
          alert('Por favor, selecione um arquivo de áudio para upload.');
          return;
        }

        setMensagemStatus('Fazendo upload e processando metadados...');
        const formData = new FormData();
        if (lojaAtiva) formData.append('organizacao_id', lojaAtiva.id);
        formData.append('arquivo', arquivo);
        if (titulo.trim()) formData.append('titulo', titulo.trim());
        if (autor.trim()) formData.append('autor_artista', autor.trim());
        formData.append('evento_ids', JSON.stringify(eventosSelecionados));

        await clienteHttp.post('/musicas/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        if (!linkStreaming.trim()) {
          alert('Por favor, informe a URL do YouTube.');
          return;
        }

        if (converterParaMp3) {
          setMensagemStatus('Baixando áudio e convertendo para MP3 320 kbps no servidor da Loja...');
          await clienteHttp.post('/musicas/converter-youtube', {
            organizacao_id: lojaAtiva ? lojaAtiva.id : undefined,
            link_youtube: linkStreaming.trim(),
            titulo: titulo.trim() || undefined,
            autor_artista: autor.trim() || undefined,
            bitrate_kbps: 320,
            evento_ids: eventosSelecionados,
          });
        } else {
          setMensagemStatus('Cadastrando link de streaming...');
          await clienteHttp.post('/musicas/streaming', {
            organizacao_id: lojaAtiva ? lojaAtiva.id : undefined,
            titulo: titulo.trim() || 'Música do YouTube',
            autor_artista: autor.trim() || null,
            tipo_midia: 'YOUTUBE',
            link_externo: linkStreaming.trim(),
            evento_ids: eventosSelecionados,
          });
        }
      }

      onSalvo();
      onFechar();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao processar música.');
    } finally {
      setSalvando(false);
      setMensagemStatus('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="vidro-destaque rounded-3xl w-full max-w-2xl p-6 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white fonte-ritual flex items-center gap-2">
              <Music className="w-6 h-6 text-macaonico-cianoSigma" />
              Acervo • Adicionar Música
            </h2>
            <p className="text-xs text-slate-400">
              Faça upload de arquivos MP3 ou converta áudios do YouTube diretamente para MP3 320 kbps.
            </p>
          </div>

          <button
            onClick={onFechar}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas */}
        <div className="flex rounded-xl bg-primaria-800/80 p-1 mb-5 border border-white/10">
          <button
            type="button"
            onClick={() => setAbaAtiva('ARQUIVO')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
              abaAtiva === 'ARQUIVO'
                ? 'bg-macaonico-cianoSigma text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload de Arquivo (MP3 / WAV / OGG)</span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('YOUTUBE')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
              abaAtiva === 'YOUTUBE'
                ? 'bg-macaonico-cianoSigma text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Youtube className="w-4 h-4 text-red-500" />
            <span>Link do YouTube (Conversor MP3 320kbps)</span>
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSalvar} className="space-y-4 flex-1 overflow-y-auto pr-1">
          {abaAtiva === 'ARQUIVO' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Arquivo de Áudio (.mp3, .wav, .ogg)
              </label>
              <div className="border-2 border-dashed border-white/20 hover:border-macaonico-cianoSigma/50 rounded-2xl p-6 text-center bg-white/5 transition-colors cursor-pointer relative">
                <input
                  type="file"
                  accept="audio/mp3,audio/wav,audio/ogg,audio/mpeg"
                  required={!arquivo}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];
                      setArquivo(file);
                      if (!titulo) {
                        setTitulo(file.name.substring(0, file.name.lastIndexOf('.')) || file.name);
                      }
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <Upload className="w-8 h-8 text-macaonico-cianoSigma mx-auto mb-2" />
                {arquivo ? (
                  <p className="text-sm font-bold text-macaonico-cianoSigma truncate">
                    {arquivo.name} ({(arquivo.size / (1024 * 1024)).toFixed(2)} MB)
                  </p>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-white">Clique para selecionar ou arraste o áudio</p>
                    <p className="text-xs text-slate-400 mt-1">MP3, WAV ou OGG de alta qualidade</p>
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
                  placeholder="Ex: https://www.youtube.com/watch?v=k1-TrAvp_xs"
                  className="w-full bg-primaria-800 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:border-macaonico-cianoSigma outline-none"
                />
              </div>

              {/* Opção de Conversão para MP3 320kbps */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-500/10 to-primaria-800 border border-macaonico-cianoSigma/30">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={converterParaMp3}
                    onChange={(e) => setConverterParaMp3(e.target.checked)}
                    className="mt-1 rounded accent-macaonico-cianoSigma w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-macaonico-cianoSigma" />
                      Converter e Baixar em MP3 320 kbps (Recomendado)
                    </span>
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                      O servidor baixa o áudio, converte na máxima taxa de bits (320 kbps) e salva na pasta exclusiva da sua Loja para execução offline, fluida e com fade-out suave.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Título da Música / Hino {abaAtiva === 'YOUTUBE' && '(Opcional se for converter)'}
              </label>
              <input
                type="text"
                required={abaAtiva === 'ARQUIVO' || !converterParaMp3}
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Hino Maçônico de Abertura"
                className="w-full bg-primaria-800 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:border-macaonico-cianoSigma outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Compositor / Intérprete (Opcional)
              </label>
              <input
                type="text"
                value={autor}
                onChange={(e) => setAutor(e.target.value)}
                placeholder="Ex: W. A. Mozart / Dom Pedro I"
                className="w-full bg-primaria-800 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:border-macaonico-cianoSigma outline-none"
              />
            </div>
          </div>

          {/* Vínculo de Eventos Litúrgicos (Playlists) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300">
                Vincular aos Momentos Ritualísticos (Playlists):
              </label>
              <span className="text-[11px] text-macaonico-cianoSigma font-bold">
                {eventosSelecionados.length} selecionado(s)
              </span>
            </div>

            <p className="text-[11px] text-slate-400 mb-2">
              Marque os momentos litúrgicos em que esta música poderá ser sorteada ou selecionada pelo Mestre.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 bg-primaria-800/40 rounded-2xl border border-white/5">
              {eventosDisponiveis.map((ev) => {
                const selecionado = eventosSelecionados.includes(ev.id);
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => toggleEvento(ev.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl text-left border transition-all text-xs ${
                      selecionado
                        ? 'bg-macaonico-cianoSigma/15 border-macaonico-cianoSigma/40 text-white font-bold shadow-sm'
                        : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="truncate mr-2">{ev.nome}</span>
                    <span className={`w-4 h-4 rounded-md flex items-center justify-center border text-[10px] ${
                      selecionado ? 'bg-macaonico-cianoSigma text-black border-transparent font-black' : 'border-white/20'
                    }`}>
                      {selecionado ? '✓' : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Barra de Status durante Download/Conversão */}
          {salvando && mensagemStatus && (
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-300 flex items-center gap-2 animate-pulse">
              <DownloadCloud className="w-4 h-4 animate-bounce" />
              <span>{mensagemStatus}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              disabled={salvando}
              onClick={onFechar}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="bg-macaonico-cianoSigma hover:bg-cyan-400 text-black font-bold px-6 py-2 rounded-xl text-sm transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-cyan-500/20 flex items-center gap-2"
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
    </div>
  );
};

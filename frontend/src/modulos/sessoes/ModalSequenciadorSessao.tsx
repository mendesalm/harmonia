import React, { useState, useEffect } from 'react';
import { X, ArrowUp, ArrowDown, Trash2, Plus, Music, Check, ShieldCheck, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Sessao, Evento, ItemSequencia } from '../../compartilhado/tipos';
import clienteHttp from '../../compartilhado/api/cliente_http';
import { useTenant } from '../../compartilhado/contextos/ContextoTenant';
import { feedbackTatil } from '../../compartilhado/utilitarios/dispositivoNativo';

interface Props {
  sessaoId: string;
  onFechar: () => void;
  onSalvo: () => void;
}

export const ModalSequenciadorSessao: React.FC<Props> = ({ sessaoId, onFechar, onSalvo }) => {
  const { lojaAtiva } = useTenant();
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [todosEventos, setTodosEventos] = useState<Evento[]>([]);
  const [itensSequencia, setItensSequencia] = useState<ItemSequencia[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [eventoSelecionadoId, setEventoSelecionadoId] = useState('');
  const [posicaoInsercao, setPosicaoInsercao] = useState<'FINAL' | 'INICIO' | 'APOS'>('FINAL');
  const [posicaoAposIndice, setPosicaoAposIndice] = useState<number>(0);
  const [itemRecemAdicionadoId, setItemRecemAdicionadoId] = useState<string | null>(null);

  const carregarDados = async () => {
    try {
      setCarregando(true);
      const [resSessao, resEventos] = await Promise.all([
        clienteHttp.get<Sessao>(`/sessoes/${sessaoId}`),
        clienteHttp.get<Evento[]>('/eventos', { params: { organizacao_id: lojaAtiva?.id, incluir_globais: true } })
      ]);

      setSessao(resSessao.data);
      setItensSequencia(resSessao.data.sequencia_eventos || []);
      setTodosEventos(resEventos.data);
    } catch (err) {
      console.error('Erro ao carregar sessão e eventos:', err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [sessaoId]);

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.index === destination.index) return;

    const nova = Array.from(itensSequencia);
    const [movido] = nova.splice(source.index, 1);
    nova.splice(destination.index, 0, movido);
    nova.forEach((it, idx) => {
      it.ordem = idx + 1;
    });
    setItensSequencia(nova);
    feedbackTatil.clique();
  };

  const moverCima = (index: number) => {
    if (index === 0) return;
    const nova = [...itensSequencia];
    const temp = nova[index - 1];
    nova[index - 1] = nova[index];
    nova[index] = temp;
    // reindexa ordens
    nova.forEach((it, idx) => {
      it.ordem = idx + 1;
    });
    setItensSequencia(nova);
    feedbackTatil.clique();
  };

  const moverBaixo = (index: number) => {
    if (index === itensSequencia.length - 1) return;
    const nova = [...itensSequencia];
    const temp = nova[index + 1];
    nova[index + 1] = nova[index];
    nova[index] = temp;
    nova.forEach((it, idx) => {
      it.ordem = idx + 1;
    });
    setItensSequencia(nova);
    feedbackTatil.clique();
  };

  const removerItem = (index: number) => {
    const nova = itensSequencia.filter((_, idx) => idx !== index);
    nova.forEach((it, idx) => {
      it.ordem = idx + 1;
    });
    setItensSequencia(nova);
    feedbackTatil.clique();
  };

  const adicionarEvento = () => {
    if (!eventoSelecionadoId) return;
    const ev = todosEventos.find((e) => e.id === eventoSelecionadoId);
    if (!ev) return;

    const novoItem: ItemSequencia = {
      id: '',
      evento_id: ev.id,
      evento_nome: ev.nome,
      ordem: 0,
      obrigatorio: true,
      total_musicas: ev.total_musicas || 0,
    };

    let nova = [...itensSequencia];
    if (posicaoInsercao === 'INICIO') {
      nova.unshift(novoItem);
    } else if (posicaoInsercao === 'APOS' && posicaoAposIndice >= 0 && posicaoAposIndice < nova.length) {
      nova.splice(posicaoAposIndice + 1, 0, novoItem);
    } else {
      nova.push(novoItem);
    }

    nova.forEach((it, idx) => {
      it.ordem = idx + 1;
    });

    setItensSequencia(nova);
    setEventoSelecionadoId('');
    setItemRecemAdicionadoId(ev.id);
    feedbackTatil.sucesso();
    setTimeout(() => setItemRecemAdicionadoId(null), 3500);
  };

  const salvarSequencia = async () => {
    try {
      setSalvando(true);
      const payload = {
        eventos: itensSequencia.map((item, idx) => ({
          evento_id: item.evento_id,
          ordem: idx + 1,
          obrigatorio: item.obrigatorio,
          observacao_ritual: item.observacao_ritual || null,
        })),
      };

      await clienteHttp.put(`/sessoes/${sessaoId}/sequencia`, payload);
      onSalvo();
      onFechar();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao salvar esteira de eventos.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sigma-bg/80 backdrop-blur-md">
      <div className="vidro-destaque rounded-3xl w-full max-w-3xl p-6 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div>
            <span className="text-xs text-macaonico-cianoSigma font-bold uppercase tracking-wider">
              Montagem da Esteira Ritualística
            </span>
            <h2 className="text-2xl font-bold text-white fonte-ritual">
              {sessao?.nome || 'Carregando Sessão...'}
            </h2>
            <p className="text-xs text-slate-400">
              Rito: {sessao?.rito} • Grau: {sessao?.grau} • Defina a ordem exata dos momentos litúrgicos.
            </p>
          </div>

          <button
            onClick={onFechar}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Adicionar Evento à Sequência */}
        <div className="bg-primaria-800/80 border border-white/10 rounded-2xl p-4 mb-4 flex flex-col gap-2.5">
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="flex-1 w-full">
              <select
                value={eventoSelecionadoId}
                onChange={(e) => setEventoSelecionadoId(e.target.value)}
                className="w-full bg-primaria-900 border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:border-macaonico-cianoSigma outline-none"
              >
                <option value="">-- Selecione um evento para incluir na sequência --</option>
                {todosEventos.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.nome} {ev.padrao_sistema ? '(Padrão do Rito)' : '(Customizado)'} • {ev.total_musicas || 0} músicas
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={adicionarEvento}
              disabled={!eventoSelecionadoId}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-macaonico-cianoSigma hover:bg-cyan-400 text-black font-bold px-4 py-2 rounded-xl text-sm transition-all disabled:opacity-40 cursor-pointer shadow-md shadow-cyan-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Momento</span>
            </button>
          </div>

          {/* Opções de Posicionamento Inicial */}
          <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-400">
            <span className="font-medium text-slate-300">Posicionar em:</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="posicaoSeq"
                value="FINAL"
                checked={posicaoInsercao === 'FINAL'}
                onChange={() => setPosicaoInsercao('FINAL')}
                className="accent-macaonico-cianoSigma w-3 h-3 cursor-pointer"
              />
              <span className={posicaoInsercao === 'FINAL' ? 'text-cyan-300 font-semibold' : ''}>
                No final
              </span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="posicaoSeq"
                value="INICIO"
                checked={posicaoInsercao === 'INICIO'}
                onChange={() => setPosicaoInsercao('INICIO')}
                className="accent-macaonico-cianoSigma w-3 h-3 cursor-pointer"
              />
              <span className={posicaoInsercao === 'INICIO' ? 'text-cyan-300 font-semibold' : ''}>
                No início (topo)
              </span>
            </label>
            {itensSequencia.length > 0 && (
              <div className="flex items-center gap-1.5">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="posicaoSeq"
                    value="APOS"
                    checked={posicaoInsercao === 'APOS'}
                    onChange={() => setPosicaoInsercao('APOS')}
                    className="accent-macaonico-cianoSigma w-3 h-3 cursor-pointer"
                  />
                  <span className={posicaoInsercao === 'APOS' ? 'text-cyan-300 font-semibold' : ''}>
                    Após:
                  </span>
                </label>
                {posicaoInsercao === 'APOS' && (
                  <select
                    value={posicaoAposIndice}
                    onChange={(e) => setPosicaoAposIndice(Number(e.target.value))}
                    className="bg-primaria-900 border border-white/15 rounded-lg px-2 py-0.5 text-[11px] text-white focus:border-macaonico-cianoSigma outline-none max-w-[200px] truncate"
                  >
                    {itensSequencia.map((item, idx) => (
                      <option key={idx} value={idx}>
                        {idx + 1}. {item.evento_nome}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Lista Sequencial Ordenável com DRAG AND DROP */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {carregando ? (
            <div className="py-12 text-center text-slate-400">Carregando sequência...</div>
          ) : itensSequencia.length === 0 ? (
            <div className="py-12 text-center text-slate-400 bg-white/5 rounded-2xl border border-dashed border-white/10">
              Nenhum momento adicionado a esta sessão ainda. Adicione eventos acima.
            </div>
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="droppable-modal-sequenciador">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="space-y-2"
                  >
                    {itensSequencia.map((item, index) => {
                      const recemAdicionado = itemRecemAdicionadoId === item.evento_id;
                      return (
                        <Draggable
                          key={`seq-${item.evento_id}-${index}`}
                          draggableId={`seq-${item.evento_id}-${index}`}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3 border transition-all ${
                                snapshot.isDragging
                                  ? 'ring-2 ring-macaonico-cianoSigma bg-[#09223f] shadow-[0_16px_36px_rgba(0,0,0,0.9)] z-50 scale-[1.01]'
                                  : recemAdicionado
                                  ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.35)]'
                                  : 'bg-primaria-800/60 hover:bg-primaria-800 border-white/10'
                              }`}
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                {/* Alça de Arraste (Drag Handle) */}
                                <div
                                  {...provided.dragHandleProps}
                                  className="p-1 text-slate-400 hover:text-macaonico-cianoSigma cursor-grab active:cursor-grabbing rounded transition-colors shrink-0"
                                  title="Segure e arraste para reordenar"
                                >
                                  <GripVertical className="w-4 h-4" />
                                </div>

                                <span className="w-7 h-7 rounded-lg bg-macaonico-cianoSigma/15 border border-macaonico-cianoSigma/30 text-macaonico-cianoSigma font-bold text-xs flex items-center justify-center shrink-0">
                                  {index + 1}
                                </span>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-white truncate">{item.evento_nome}</p>
                                    {recemAdicionado && (
                                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-cyan-400 text-black shrink-0 animate-pulse">
                                        Novo
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-400 flex items-center gap-1.5">
                                    <Music className="w-3 h-3 text-macaonico-cianoSigma" />
                                    {item.total_musicas || 0} músicas elegíveis no catálogo
                                  </p>
                                </div>
                              </div>

                              {/* Botões de Ação */}
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => moverCima(index)}
                                  disabled={index === 0}
                                  title="Mover para cima"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-all cursor-pointer"
                                >
                                  <ArrowUp className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moverBaixo(index)}
                                  disabled={index === itensSequencia.length - 1}
                                  title="Mover para baixo"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-all cursor-pointer"
                                >
                                  <ArrowDown className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removerItem(index)}
                                  title="Remover momento"
                                  className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>

        {/* Rodapé do Modal */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-4">
          <span className="text-xs text-slate-400">
            Total de {itensSequencia.length} momentos litúrgicos sequenciados
          </span>

          <div className="flex items-center gap-3">
            <button
              onClick={onFechar}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={salvarSequencia}
              disabled={salvando}
              className="flex items-center gap-2 bg-macaonico-cianoSigma hover:bg-cyan-400 text-black font-bold px-6 py-2.5 rounded-xl text-sm shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{salvando ? 'Gravando...' : 'Salvar Sequência'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { X, ArrowUp, ArrowDown, Trash2, Plus, Music, Check, ShieldCheck } from 'lucide-react';
import { Sessao, Evento, ItemSequencia } from '../../compartilhado/tipos';
import clienteHttp from '../../compartilhado/api/cliente_http';
import { useTenant } from '../../compartilhado/contextos/ContextoTenant';

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
  };

  const removerItem = (index: number) => {
    const nova = itensSequencia.filter((_, idx) => idx !== index);
    nova.forEach((it, idx) => {
      it.ordem = idx + 1;
    });
    setItensSequencia(nova);
  };

  const adicionarEvento = () => {
    if (!eventoSelecionadoId) return;
    const ev = todosEventos.find((e) => e.id === eventoSelecionadoId);
    if (!ev) return;

    const novoItem: ItemSequencia = {
      id: '',
      evento_id: ev.id,
      evento_nome: ev.nome,
      ordem: itensSequencia.length + 1,
      obrigatorio: true,
      total_musicas: ev.total_musicas || 0,
    };

    setItensSequencia([...itensSequencia, novoItem]);
    setEventoSelecionadoId('');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
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
        <div className="bg-primaria-800/80 border border-white/10 rounded-2xl p-4 mb-4 flex flex-col sm:flex-row gap-3 items-center">
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
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all disabled:opacity-40"
          >
            <Plus className="w-4 h-4 text-macaonico-cianoSigma" />
            <span>Adicionar Momento</span>
          </button>
        </div>

        {/* Lista Sequencial Ordenável */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {carregando ? (
            <div className="py-12 text-center text-slate-400">Carregando sequência...</div>
          ) : itensSequencia.length === 0 ? (
            <div className="py-12 text-center text-slate-400 bg-white/5 rounded-2xl border border-dashed border-white/10">
              Nenhum momento adicionado a esta sessão ainda. Adicione eventos acima.
            </div>
          ) : (
            itensSequencia.map((item, index) => (
              <div
                key={`${item.evento_id}-${index}`}
                className="flex items-center justify-between gap-3 bg-primaria-800/60 hover:bg-primaria-800 border border-white/10 rounded-2xl px-4 py-3 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="w-7 h-7 rounded-lg bg-macaonico-cianoSigma/15 border border-macaonico-cianoSigma/30 text-macaonico-cianoSigma font-bold text-xs flex items-center justify-center shrink-0">
                    {index + 1}
                  </span>

                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{item.evento_nome}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                      <Music className="w-3 h-3 text-macaonico-cianoSigma" />
                      {item.total_musicas || 0} músicas elegíveis no catálogo
                    </p>
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => moverCima(index)}
                    disabled={index === 0}
                    title="Mover para cima"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-all"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moverBaixo(index)}
                    disabled={index === itensSequencia.length - 1}
                    title="Mover para baixo"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-all"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removerItem(index)}
                    title="Remover momento"
                    className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
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

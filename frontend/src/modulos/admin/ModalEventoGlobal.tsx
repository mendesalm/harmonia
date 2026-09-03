import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, Loader2, Music } from 'lucide-react';
import clienteHttp from '../../compartilhado/api/cliente_http';

interface Rito {
  id: string;
  nome: string;
}

interface Musica {
  id: string;
  titulo: string;
  autor_artista?: string;
}

interface VariacaoRito {
  rito_id: string;
  nome: string;
  observacao_padrao_mestre_harmonia: string;
}

interface FormData {
  nome: string;
  descricao: string;
  orientacao: string;
  ordem_sugerida: number;
  grau_aplicado: number;
  ritos: VariacaoRito[];
  musicas_sugeridas_ids: string[];
}

interface ModalEventoGlobalProps {
  momentoId?: string; // Se undefined, é criação
  onClose: () => void;
  onSaved: () => void;
}

export const ModalEventoGlobal: React.FC<ModalEventoGlobalProps> = ({ momentoId, onClose, onSaved }) => {
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [ritos, setRitos] = useState<Rito[]>([]);
  const [musicasAcervo, setMusicasAcervo] = useState<Musica[]>([]);
  const [abaAtual, setAbaAtual] = useState<'geral' | 'ritos' | 'musicas'>('geral');

  const [formData, setFormData] = useState<FormData>({
    nome: '',
    descricao: '',
    orientacao: '',
    ordem_sugerida: 999,
    grau_aplicado: 0,
    ritos: [],
    musicas_sugeridas_ids: []
  });

  useEffect(() => {
    const carregarDados = async () => {
      try {
        // Carrega dependências
        const [respRitos, respMusicas] = await Promise.all([
          clienteHttp.get<Rito[]>('/admin/ritos'),
          clienteHttp.get<Musica[]>('/musicas') // Assumindo que existe endpoint para listar acervo
        ]);
        setRitos(respRitos.data);
        setMusicasAcervo(respMusicas.data);

        // Se for edição, carrega o momento
        if (momentoId) {
          const respMomento = await clienteHttp.get<any[]>('/admin/canonicos/momentos');
          const momento = respMomento.data.find(m => m.id === momentoId);
          if (momento) {
            
            // Buscar musicas sugeridas
            // OBS: O schema do momento atual não retorna as musicas_sugeridas.
            // Para simplificar no MVP, vamos buscar as musicas vinculadas ao primeiro evento do rito
            let musicasIds: string[] = [];
            if (momento.eventos && momento.eventos.length > 0) {
              const respEv = await clienteHttp.get<any>(`/eventos/${momento.eventos[0].id}`); // Requer endpoint ou injetar no schema
              // Vamos ignorar a pre-carga das musicas neste MVP se não houver endpoint facil.
            }

            setFormData({
              nome: momento.nome,
              descricao: momento.descricao || '',
              orientacao: momento.orientacao || '',
              ordem_sugerida: momento.ordem_sugerida || 999,
              grau_aplicado: momento.grau_aplicado || 0,
              ritos: momento.eventos ? momento.eventos.map((ev: any) => ({
                rito_id: ev.rito_id,
                nome: ev.nome,
                observacao_padrao_mestre_harmonia: ev.observacao_padrao_mestre_harmonia || ''
              })) : [],
              musicas_sugeridas_ids: musicasIds
            });
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setCarregando(false);
      }
    };
    carregarDados();
  }, [momentoId]);

  const addVariacaoRito = () => {
    const ritosNaoUtilizados = ritos.filter(r => !formData.ritos.find(vr => vr.rito_id === r.id));
    if (ritosNaoUtilizados.length === 0) {
      alert("Todos os ritos já possuem variações.");
      return;
    }
    setFormData({
      ...formData,
      ritos: [...formData.ritos, { rito_id: ritosNaoUtilizados[0].id, nome: formData.nome, observacao_padrao_mestre_harmonia: '' }]
    });
  };

  const removeVariacaoRito = (index: number) => {
    const novos = [...formData.ritos];
    novos.splice(index, 1);
    setFormData({ ...formData, ritos: novos });
  };

  const updateVariacaoRito = (index: number, field: keyof VariacaoRito, value: string) => {
    const novos = [...formData.ritos];
    novos[index] = { ...novos[index], [field]: value };
    setFormData({ ...formData, ritos: novos });
  };

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      if (momentoId) {
        await clienteHttp.put(`/admin/canonicos/momentos/${momentoId}`, formData);
      } else {
        await clienteHttp.post(`/admin/canonicos/momentos`, formData);
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar.");
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#111111] border border-gray-800 rounded-2xl w-full max-w-3xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-[#161616]">
          <div>
            <h2 className="text-2xl font-bold text-white font-cinzel">
              {momentoId ? "Editar Evento Ritualístico" : "Novo Evento Ritualístico"}
            </h2>
            <p className="text-sm text-gray-400 mt-1">Gerencie a Matriz Canônica e suas variações.</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas */}
        <div className="flex border-b border-gray-800">
          <button 
            className={`flex-1 py-3 text-sm font-medium transition-colors ${abaAtual === 'geral' ? 'border-b-2 border-macaonico-dourado text-macaonico-dourado' : 'text-gray-500 hover:text-gray-300'}`}
            onClick={() => setAbaAtual('geral')}
          >
            1. Dados Globais
          </button>
          <button 
            className={`flex-1 py-3 text-sm font-medium transition-colors ${abaAtual === 'ritos' ? 'border-b-2 border-macaonico-dourado text-macaonico-dourado' : 'text-gray-500 hover:text-gray-300'}`}
            onClick={() => setAbaAtual('ritos')}
          >
            2. Variações por Rito ({formData.ritos.length})
          </button>
          <button 
            className={`flex-1 py-3 text-sm font-medium transition-colors ${abaAtual === 'musicas' ? 'border-b-2 border-macaonico-dourado text-macaonico-dourado' : 'text-gray-500 hover:text-gray-300'}`}
            onClick={() => setAbaAtual('musicas')}
          >
            3. Playlist Padrão ({formData.musicas_sugeridas_ids.length})
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#080808]">
          {carregando ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-6">
              
              {/* Aba: Geral */}
              {abaAtual === 'geral' && (
                <div className="space-y-4 animate-in fade-in">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Nome Global (Matriz)</label>
                    <input 
                      type="text" 
                      value={formData.nome}
                      onChange={e => setFormData({...formData, nome: e.target.value})}
                      className="w-full bg-[#111111] border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-macaonico-dourado transition-colors"
                      placeholder="Ex: Entrada do Cortejo"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Ordem Sugerida (Peso)</label>
                    <input 
                      type="number" 
                      value={formData.ordem_sugerida}
                      onChange={e => setFormData({...formData, ordem_sugerida: parseInt(e.target.value) || 0})}
                      className="w-full bg-[#111111] border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-macaonico-dourado transition-colors"
                      placeholder="Ex: 10, 20, 150..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Grau Aplicado</label>
                    <select 
                      value={formData.grau_aplicado}
                      onChange={e => setFormData({...formData, grau_aplicado: parseInt(e.target.value) || 0})}
                      className="w-full bg-[#111111] border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-macaonico-dourado transition-colors"
                    >
                      <option value={0}>0 - Universal (Qualquer Grau)</option>
                      <option value={1}>1 - Aprendiz Maçom</option>
                      <option value={2}>2 - Companheiro Maçom</option>
                      <option value={3}>3 - Mestre Maçom</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Descrição Breve (O que é?)</label>
                    <textarea 
                      value={formData.descricao}
                      onChange={e => setFormData({...formData, descricao: e.target.value})}
                      className="w-full bg-[#111111] border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-macaonico-dourado transition-colors h-24"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Orientação Global (Como fazer?)</label>
                    <textarea 
                      value={formData.orientacao}
                      onChange={e => setFormData({...formData, orientacao: e.target.value})}
                      className="w-full bg-[#111111] border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-macaonico-dourado transition-colors h-24"
                      placeholder="Ex: A música deve estar em surdina."
                    />
                  </div>
                </div>
              )}

              {/* Aba: Ritos */}
              {abaAtual === 'ritos' && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between bg-purple-900/10 border border-purple-900/30 p-4 rounded-xl text-purple-200 text-sm">
                    <p>Adicione variações apenas se um Rito usar um <strong>nome diferente</strong> ou precisar de uma <strong>orientação específica</strong> diferente da global.</p>
                  </div>
                  
                  {formData.ritos.map((vr, idx) => (
                    <div key={idx} className="bg-[#111111] border border-gray-800 p-4 rounded-xl space-y-4 relative group">
                      <button 
                        onClick={() => removeVariacaoRito(idx)}
                        className="absolute top-4 right-4 text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Rito</label>
                          <select 
                            value={vr.rito_id}
                            onChange={e => updateVariacaoRito(idx, 'rito_id', e.target.value)}
                            className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                          >
                            {ritos.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Nome Específico</label>
                          <input 
                            type="text" 
                            value={vr.nome}
                            onChange={e => updateVariacaoRito(idx, 'nome', e.target.value)}
                            className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Orientação Específica para este Rito</label>
                        <textarea 
                          value={vr.observacao_padrao_mestre_harmonia}
                          onChange={e => updateVariacaoRito(idx, 'observacao_padrao_mestre_harmonia', e.target.value)}
                          className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-white h-16"
                        />
                      </div>
                    </div>
                  ))}

                  <button 
                    onClick={addVariacaoRito}
                    className="w-full py-4 border-2 border-dashed border-gray-800 rounded-xl text-gray-400 hover:text-white hover:border-gray-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" /> Adicionar Variação de Rito
                  </button>
                </div>
              )}

              {/* Aba: Musicas */}
              {abaAtual === 'musicas' && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between bg-blue-900/10 border border-blue-900/30 p-4 rounded-xl text-blue-200 text-sm mb-4">
                    <p>Selecione músicas do <strong>Acervo Global</strong> para formarem a playlist padrão sugerida quando uma loja adicionar este evento ao ritual.</p>
                  </div>
                  
                  <div className="bg-[#111111] border border-gray-800 rounded-xl p-4">
                    <label className="block text-sm font-medium text-gray-400 mb-2">Músicas do Acervo</label>
                    <div className="max-h-64 overflow-y-auto space-y-1">
                      {musicasAcervo.filter(m => !m.autor_artista?.includes('Loja')).map(musica => (
                        <label key={musica.id} className="flex items-center gap-3 p-2 hover:bg-black/50 rounded-lg cursor-pointer">
                          <input 
                            type="checkbox"
                            className="w-4 h-4 rounded border-gray-600 text-macaonico-dourado focus:ring-macaonico-dourado bg-black"
                            checked={formData.musicas_sugeridas_ids.includes(musica.id)}
                            onChange={(e) => {
                              if(e.target.checked) {
                                setFormData({...formData, musicas_sugeridas_ids: [...formData.musicas_sugeridas_ids, musica.id]});
                              } else {
                                setFormData({...formData, musicas_sugeridas_ids: formData.musicas_sugeridas_ids.filter(id => id !== musica.id)});
                              }
                            }}
                          />
                          <Music className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-300">{musica.titulo} <span className="text-gray-600">({musica.autor_artista || 'Desconhecido'})</span></span>
                        </label>
                      ))}
                      {musicasAcervo.length === 0 && (
                        <p className="text-sm text-gray-600 text-center py-4">Nenhuma música global encontrada no acervo.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-800 flex justify-end gap-3 bg-[#161616]">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSalvar}
            disabled={salvando || !formData.nome}
            className="flex items-center gap-2 px-8 py-2.5 bg-macaonico-dourado text-black font-bold rounded-xl hover:bg-yellow-500 transition-colors disabled:opacity-50 shadow-lg"
          >
            {salvando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Salvar Evento
          </button>
        </div>

      </div>
    </div>
  );
};

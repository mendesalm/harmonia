import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, Loader2, Music, UploadCloud } from 'lucide-react';
import clienteHttp from '../../compartilhado/api/cliente_http';
import { ModalUploadMusica } from '../musicas/ModalUploadMusica';

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
  const [modalUploadAberto, setModalUploadAberto] = useState(false);
  const [buscaMusica, setBuscaMusica] = useState('');
  const [modoMusicas, setModoMusicas] = useState<'LISTA' | 'SELECAO'>('LISTA');

  const [formData, setFormData] = useState<FormData>({
    nome: '',
    descricao: '',
    orientacao: '',
    ordem_sugerida: 999,
    grau_aplicado: 0,
    ritos: [],
    musicas_sugeridas_ids: []
  });

  const carregarMusicas = async () => {
    try {
      const resp = await clienteHttp.get<Musica[]>('/musicas');
      setMusicasAcervo(resp.data);
    } catch(err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const carregarDados = async () => {
      try {
        // Carrega dependências
        const respRitos = await clienteHttp.get<Rito[]>('/admin/ritos');
        setRitos(respRitos.data);
        await carregarMusicas();

        // Se for edição, carrega o momento
        if (momentoId) {
          const respMomento = await clienteHttp.get<any[]>('/admin/canonicos/momentos');
          const momento = respMomento.data.find(m => m.id === momentoId);
          if (momento) {
            
            // Buscar musicas sugeridas
            let musicasIds: string[] = [];
            if (momento.eventos && momento.eventos.length > 0 && momento.eventos[0].musicas_sugeridas) {
              musicasIds = momento.eventos[0].musicas_sugeridas.map((m: any) => m.musica_id);
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
                  
                  {modoMusicas === 'LISTA' && (
                    <div className="flex flex-col h-[400px]">
                      <div className="flex items-center justify-between bg-blue-900/10 border border-blue-900/30 p-4 rounded-xl text-blue-200 text-sm mb-4">
                        <p>Estas são as músicas vinculadas à playlist deste evento.</p>
                        <button 
                          onClick={() => setModoMusicas('SELECAO')}
                          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors font-semibold whitespace-nowrap"
                        >
                          <Plus className="w-4 h-4" />
                          Adicionar Música
                        </button>
                      </div>

                      {formData.musicas_sugeridas_ids.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-800 rounded-xl bg-[#111111]">
                          <Music className="w-12 h-12 text-gray-600 mb-4" />
                          <p className="text-gray-400 mb-4">Nenhuma música vinculada a este evento ainda.</p>
                          <button 
                            onClick={() => setModoMusicas('SELECAO')}
                            className="bg-macaonico-dourado text-black font-bold px-6 py-2 rounded-lg hover:brightness-110"
                          >
                            Adicionar Músicas
                          </button>
                        </div>
                      ) : (
                        <div className="flex-1 overflow-y-auto space-y-2 bg-[#111111] border border-gray-800 rounded-xl p-4">
                          {musicasAcervo
                            .filter(m => formData.musicas_sugeridas_ids.includes(m.id))
                            .map(musica => (
                              <div key={musica.id} className="flex items-center justify-between p-3 bg-black/40 rounded-lg border border-gray-800 hover:border-gray-600 transition-colors">
                                <div className="flex items-center gap-3">
                                  <Music className="w-5 h-5 text-macaonico-dourado" />
                                  <div className="flex flex-col">
                                    <span className="text-sm font-bold text-white">{musica.titulo}</span>
                                    {musica.autor_artista && <span className="text-xs text-gray-400">{musica.autor_artista}</span>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  {musica.arquivo_url && (
                                    <audio 
                                      controls 
                                      src={`http://localhost:8000${musica.arquivo_url}`} 
                                      className="h-8 w-48 opacity-70 hover:opacity-100 transition-opacity" 
                                      controlsList="nodownload noplaybackrate"
                                    />
                                  )}
                                  <button
                                    onClick={() => setFormData({...formData, musicas_sugeridas_ids: formData.musicas_sugeridas_ids.filter(id => id !== musica.id)})}
                                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                    title="Remover da Playlist"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )}

                  {modoMusicas === 'SELECAO' && (
                    <div className="flex flex-col h-[450px]">
                      <div className="flex items-center justify-between bg-blue-900/10 border border-blue-900/30 p-4 rounded-xl text-blue-200 text-sm mb-4">
                        <p>Selecione músicas do Acervo ou faça um novo upload.</p>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setModalUploadAberto(true)}
                            className="flex items-center gap-2 bg-[#1c1c1c] border border-gray-600 hover:border-gray-400 text-white px-4 py-2 rounded-lg transition-colors font-semibold"
                          >
                            <UploadCloud className="w-4 h-4" />
                            Novo Upload
                          </button>
                          <button 
                            onClick={() => setModoMusicas('LISTA')}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors font-semibold"
                          >
                            Concluir Seleção
                          </button>
                        </div>
                      </div>
                      
                      <div className="bg-[#111111] border border-gray-800 rounded-xl p-4 flex flex-col flex-1">
                        <div className="mb-4">
                          <input 
                            type="text" 
                            placeholder="Buscar música no Acervo..." 
                            value={buscaMusica}
                            onChange={(e) => setBuscaMusica(e.target.value)}
                            className="w-full bg-black border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-macaonico-dourado transition-colors"
                          />
                        </div>
                        
                        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                          {musicasAcervo
                            .filter(m => !m.autor_artista?.includes('Loja'))
                            .filter(m => m.titulo.toLowerCase().includes(buscaMusica.toLowerCase()) || m.autor_artista?.toLowerCase().includes(buscaMusica.toLowerCase()))
                            .map(musica => (
                            <div key={musica.id} className="flex items-center justify-between p-2 hover:bg-black/50 rounded-lg border border-transparent hover:border-gray-800 transition-colors">
                              <label className="flex items-center gap-3 cursor-pointer flex-1">
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
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium text-gray-300">{musica.titulo}</span>
                                  {musica.autor_artista && <span className="text-xs text-gray-500">{musica.autor_artista}</span>}
                                </div>
                              </label>
                              {musica.arquivo_url && (
                                <audio 
                                  controls 
                                  src={`http://localhost:8000${musica.arquivo_url}`} 
                                  className="h-8 w-48 opacity-70 hover:opacity-100 transition-opacity" 
                                  controlsList="nodownload noplaybackrate"
                                />
                              )}
                            </div>
                          ))}
                          
                          {musicasAcervo.length > 0 && musicasAcervo.filter(m => m.titulo.toLowerCase().includes(buscaMusica.toLowerCase())).length === 0 && (
                            <p className="text-sm text-gray-600 text-center py-8">Nenhuma música encontrada com esse nome.</p>
                          )}
                          
                          {musicasAcervo.length === 0 && (
                            <p className="text-sm text-gray-600 text-center py-8">Acervo global vazio.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

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

      {modalUploadAberto && (
        <ModalUploadMusica 
          isGlobalAdmin={true}
          esconderEventos={true}
          onFechar={() => setModalUploadAberto(false)}
          onSalvo={(novaMusicaId) => {
            carregarMusicas();
            if (novaMusicaId) {
              setFormData(prev => ({
                ...prev,
                musicas_sugeridas_ids: [...prev.musicas_sugeridas_ids, novaMusicaId]
              }));
              setModoMusicas('LISTA');
            }
            setModalUploadAberto(false);
          }}
        />
      )}
    </div>
  );
};

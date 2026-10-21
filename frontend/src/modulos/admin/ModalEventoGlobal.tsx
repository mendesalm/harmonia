import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Plus, Trash2, Loader2, Music, UploadCloud, Edit2 } from 'lucide-react';
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
  arquivo_url?: string;
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
  momentoId?: string;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Modal de Administração Global para gerenciar Momentos Canônicos, Variações por Rito e Playlist Padrão.
 * Renderizado via Portal no `document.body` para evitar desalinhamento causado por containers pais.
 */
export const ModalEventoGlobal: React.FC<ModalEventoGlobalProps> = ({
  momentoId,
  onClose,
  onSaved,
}) => {
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [ritos, setRitos] = useState<Rito[]>([]);
  const [musicasAcervo, setMusicasAcervo] = useState<Musica[]>([]);
  const [abaAtual, setAbaAtual] = useState<'geral' | 'ritos' | 'musicas'>('geral');
  const [modalUploadAberto, setModalUploadAberto] = useState(false);
  const [buscaMusica, setBuscaMusica] = useState('');
  const [modoMusicas, setModoMusicas] = useState<'LISTA' | 'SELECAO'>('LISTA');

  const handleEditarMusica = async (
    musicaId: string,
    tituloAtual: string,
    autorAtual: string | null
  ) => {
    const novoTitulo = window.prompt('Digite o novo título da música:', tituloAtual);
    if (novoTitulo === null) return;
    const novoAutor =
      window.prompt('Digite o novo autor/artista (opcional):', autorAtual || '') || null;

    try {
      await clienteHttp.put(`/musicas/${musicaId}`, {
        titulo: novoTitulo,
        autor_artista: novoAutor,
      });
      carregarMusicas();
    } catch (err: any) {
      alert('Erro ao editar música: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleDeletarMusica = async (musicaId: string) => {
    if (
      !window.confirm(
        'ATENÇÃO: Deseja realmente excluir esta música permanentemente do Acervo Global?'
      )
    )
      return;

    try {
      await clienteHttp.delete(`/musicas/${musicaId}`);
      setFormData((prev) => ({
        ...prev,
        musicas_sugeridas_ids: prev.musicas_sugeridas_ids.filter((id) => id !== musicaId),
      }));
      carregarMusicas();
    } catch (err: any) {
      alert('Erro ao deletar música: ' + (err.response?.data?.detail || err.message));
    }
  };

  const [formData, setFormData] = useState<FormData>({
    nome: '',
    descricao: '',
    orientacao: '',
    ordem_sugerida: 999,
    grau_aplicado: 0,
    ritos: [],
    musicas_sugeridas_ids: [],
  });

  const carregarMusicas = async () => {
    try {
      const resp = await clienteHttp.get<Musica[]>('/musicas');
      setMusicasAcervo(resp.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const respRitos = await clienteHttp.get<Rito[]>('/admin/ritos');
        setRitos(respRitos.data);
        await carregarMusicas();

        if (momentoId) {
          const respMomento = await clienteHttp.get<any[]>('/admin/canonicos/momentos');
          const momento = respMomento.data.find((m) => m.id === momentoId);
          if (momento) {
            let musicasIds: string[] = [];
            if (Array.isArray(momento.eventos)) {
              const conjuntoIds = new Set<string>();
              momento.eventos.forEach((ev: any) => {
                (ev.musicas_sugeridas || []).forEach((m: any) => {
                  if (m.musica_id) conjuntoIds.add(m.musica_id);
                });
              });
              musicasIds = Array.from(conjuntoIds);
            }

            setFormData({
              nome: momento.nome,
              descricao: momento.descricao || '',
              orientacao: momento.orientacao || '',
              ordem_sugerida: momento.ordem_sugerida || 999,
              grau_aplicado: momento.grau_aplicado || 0,
              ritos: momento.eventos
                ? momento.eventos.map((ev: any) => ({
                    rito_id: ev.rito_id,
                    nome: ev.nome,
                    observacao_padrao_mestre_harmonia:
                      ev.observacao_padrao_mestre_harmonia || '',
                  }))
                : [],
              musicas_sugeridas_ids: musicasIds,
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
    const ritosNaoUtilizados = ritos.filter(
      (r) => !formData.ritos.find((vr) => vr.rito_id === r.id)
    );
    if (ritosNaoUtilizados.length === 0) {
      alert('Todos os ritos já possuem variações.');
      return;
    }
    setFormData({
      ...formData,
      ritos: [
        ...formData.ritos,
        {
          rito_id: ritosNaoUtilizados[0].id,
          nome: formData.nome,
          observacao_padrao_mestre_harmonia: '',
        },
      ],
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
      alert('Erro ao salvar.');
      setSalvando(false);
    }
  };

  return createPortal(
    <div
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md"
    >
      <div className="bg-[#0a1428] border border-macaonico-dourado/45 rounded-2xl sm:rounded-3xl w-full max-w-3xl max-h-[88dvh] flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/10 bg-[#070e1c] shrink-0">
          <div className="min-w-0 pr-2">
            <h2 className="text-lg sm:text-2xl font-bold text-white font-cinzel truncate">
              {momentoId ? 'Editar Evento Ritualístico' : 'Novo Evento Ritualístico'}
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
              Gerencie a Matriz Canônica e suas variações por Rito.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas */}
        <div className="flex border-b border-white/10 bg-[#070e1c]/60 shrink-0">
          <button
            type="button"
            className={`flex-1 py-2.5 sm:py-3 px-2 text-xs sm:text-sm font-medium transition-colors ${
              abaAtual === 'geral'
                ? 'border-b-2 border-macaonico-dourado text-macaonico-dourado font-bold'
                : 'text-gray-400 hover:text-gray-200'
            }`}
            onClick={() => setAbaAtual('geral')}
          >
            1. Dados Globais
          </button>
          <button
            type="button"
            className={`flex-1 py-2.5 sm:py-3 px-2 text-xs sm:text-sm font-medium transition-colors ${
              abaAtual === 'ritos'
                ? 'border-b-2 border-macaonico-dourado text-macaonico-dourado font-bold'
                : 'text-gray-400 hover:text-gray-200'
            }`}
            onClick={() => setAbaAtual('ritos')}
          >
            2. Ritos ({formData.ritos.length})
          </button>
          <button
            type="button"
            className={`flex-1 py-2.5 sm:py-3 px-2 text-xs sm:text-sm font-medium transition-colors ${
              abaAtual === 'musicas'
                ? 'border-b-2 border-macaonico-dourado text-macaonico-dourado font-bold'
                : 'text-gray-400 hover:text-gray-200'
            }`}
            onClick={() => setAbaAtual('musicas')}
          >
            3. Playlist ({formData.musicas_sugeridas_ids.length})
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
          {carregando ? (
            <div className="flex py-16 items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-macaonico-dourado" />
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-5">
              {/* Aba: Geral */}
              {abaAtual === 'geral' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1">
                      Nome Global (Matriz)
                    </label>
                    <input
                      type="text"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      className="w-full bg-[#0e1c36] border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-macaonico-dourado transition-colors"
                      placeholder="Ex: Entrada do Cortejo"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1">
                        Ordem Sugerida (Peso)
                      </label>
                      <input
                        type="number"
                        value={formData.ordem_sugerida}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            ordem_sugerida: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full bg-[#0e1c36] border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-macaonico-dourado transition-colors"
                        placeholder="Ex: 10, 20, 150..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1">
                        Grau Aplicado
                      </label>
                      <select
                        value={formData.grau_aplicado}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            grau_aplicado: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full bg-[#0e1c36] border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-macaonico-dourado transition-colors"
                      >
                        <option value={0}>0 - Universal (Qualquer Grau)</option>
                        <option value={1}>1 - Aprendiz Maçom</option>
                        <option value={2}>2 - Companheiro Maçom</option>
                        <option value={3}>3 - Mestre Maçom</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1">
                      Descrição Breve (O que é?)
                    </label>
                    <textarea
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      className="w-full bg-[#0e1c36] border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-macaonico-dourado transition-colors h-20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1">
                      Orientação Global (Como fazer?)
                    </label>
                    <textarea
                      value={formData.orientacao}
                      onChange={(e) => setFormData({ ...formData, orientacao: e.target.value })}
                      className="w-full bg-[#0e1c36] border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-macaonico-dourado transition-colors h-20"
                      placeholder="Ex: A música deve estar em surdina."
                    />
                  </div>
                </div>
              )}

              {/* Aba: Ritos */}
              {abaAtual === 'ritos' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-purple-900/15 border border-purple-500/30 p-3.5 rounded-xl text-purple-200 text-xs sm:text-sm">
                    <p>
                      Adicione variações caso um Rito utilize um <strong>nome diferente</strong> ou
                      precise de uma <strong>orientação específica</strong>.
                    </p>
                  </div>

                  {formData.ritos.map((vr, idx) => (
                    <div
                      key={idx}
                      className="bg-[#070e1c]/90 border border-white/10 p-4 rounded-xl space-y-3 relative group"
                    >
                      <button
                        type="button"
                        onClick={() => removeVariacaoRito(idx)}
                        className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-6">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Rito</label>
                          <select
                            value={vr.rito_id}
                            onChange={(e) => updateVariacaoRito(idx, 'rito_id', e.target.value)}
                            className="w-full bg-[#0e1c36] border border-white/15 rounded-lg px-3 py-2 text-sm text-white"
                          >
                            {ritos.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.nome}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">
                            Nome Específico
                          </label>
                          <input
                            type="text"
                            value={vr.nome}
                            onChange={(e) => updateVariacaoRito(idx, 'nome', e.target.value)}
                            className="w-full bg-[#0e1c36] border border-white/15 rounded-lg px-3 py-2 text-sm text-white"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          Orientação Específica para este Rito
                        </label>
                        <textarea
                          value={vr.observacao_padrao_mestre_harmonia}
                          onChange={(e) =>
                            updateVariacaoRito(
                              idx,
                              'observacao_padrao_mestre_harmonia',
                              e.target.value
                            )
                          }
                          className="w-full bg-[#0e1c36] border border-white/15 rounded-lg px-3 py-2 text-sm text-white h-16"
                        />
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addVariacaoRito}
                    className="w-full py-3.5 border-2 border-dashed border-white/15 rounded-xl text-gray-300 hover:text-white hover:border-macaonico-dourado/50 transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <Plus className="w-4 h-4" /> Adicionar Variação de Rito
                  </button>
                </div>
              )}

              {/* Aba: Musicas */}
              {abaAtual === 'musicas' && (
                <div className="space-y-4">
                  {modoMusicas === 'LISTA' && (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-blue-900/15 border border-blue-500/30 p-3.5 rounded-xl text-blue-200 text-xs sm:text-sm">
                        <p>Músicas vinculadas à playlist padrão deste momento.</p>
                        <button
                          type="button"
                          onClick={() => setModoMusicas('SELECAO')}
                          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors font-semibold whitespace-nowrap shrink-0"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Adicionar Música</span>
                        </button>
                      </div>

                      {formData.musicas_sugeridas_ids.length === 0 ? (
                        <div className="py-10 flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-xl bg-[#070e1c]/60">
                          <Music className="w-10 h-10 text-gray-500 mb-3" />
                          <p className="text-xs sm:text-sm text-gray-400 mb-4">
                            Nenhuma música vinculada a este evento ainda.
                          </p>
                          <button
                            type="button"
                            onClick={() => setModoMusicas('SELECAO')}
                            className="bg-macaonico-dourado text-black font-bold px-5 py-2 rounded-xl text-xs sm:text-sm hover:brightness-110"
                          >
                            Adicionar Músicas
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2 bg-[#070e1c]/80 border border-white/10 rounded-xl p-3">
                          {musicasAcervo
                            .filter((m) => formData.musicas_sugeridas_ids.includes(m.id))
                            .map((musica) => (
                              <div
                                key={musica.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-[#0e1c36]/80 rounded-xl border border-white/10"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <Music className="w-4 h-4 text-macaonico-dourado shrink-0" />
                                  <div className="min-w-0">
                                    <span className="block text-xs sm:text-sm font-bold text-white truncate">
                                      {musica.titulo}
                                    </span>
                                    {musica.autor_artista && (
                                      <span className="block text-[11px] text-gray-400 truncate">
                                        {musica.autor_artista}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center justify-end gap-2">
                                  {musica.arquivo_url && (
                                    <audio
                                      controls
                                      src={
                                        clienteHttp.defaults.baseURL
                                          ? `${clienteHttp.defaults.baseURL.replace('/api/v1', '')}${musica.arquivo_url}`
                                          : musica.arquivo_url
                                      }
                                      className="h-8 w-36 sm:w-44 opacity-80 hover:opacity-100"
                                      controlsList="nodownload noplaybackrate"
                                    />
                                  )}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setFormData({
                                        ...formData,
                                        musicas_sugeridas_ids:
                                          formData.musicas_sugeridas_ids.filter(
                                            (id) => id !== musica.id
                                          ),
                                      })
                                    }
                                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                    title="Remover da Playlist"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )}

                  {modoMusicas === 'SELECAO' && (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-blue-900/15 border border-blue-500/30 p-3.5 rounded-xl text-blue-200 text-xs sm:text-sm">
                        <p>Selecione músicas do Acervo ou faça um novo upload.</p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setModalUploadAberto(true)}
                            className="flex items-center gap-1.5 bg-[#0e1c36] border border-white/20 hover:border-macaonico-dourado text-white px-3 py-2 rounded-lg transition-colors font-semibold text-xs"
                          >
                            <UploadCloud className="w-4 h-4" />
                            <span>Novo Upload</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setModoMusicas('LISTA')}
                            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg transition-colors font-semibold text-xs"
                          >
                            <span>Concluir Seleção</span>
                          </button>
                        </div>
                      </div>

                      <div className="bg-[#070e1c]/80 border border-white/10 rounded-xl p-3.5 space-y-3">
                        <input
                          type="text"
                          placeholder="Buscar música no Acervo..."
                          value={buscaMusica}
                          onChange={(e) => setBuscaMusica(e.target.value)}
                          className="w-full bg-[#0e1c36] border border-white/15 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-macaonico-dourado"
                        />

                        <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                          {musicasAcervo
                            .filter((m) => !m.autor_artista?.includes('Loja'))
                            .filter(
                              (m) =>
                                m.titulo.toLowerCase().includes(buscaMusica.toLowerCase()) ||
                                m.autor_artista?.toLowerCase().includes(buscaMusica.toLowerCase())
                            )
                            .map((musica) => (
                              <div
                                key={musica.id}
                                className="flex items-center justify-between gap-2 p-2.5 hover:bg-white/5 rounded-xl border border-transparent hover:border-white/10 transition-colors"
                              >
                                <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                                  <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded accent-macaonico-dourado shrink-0"
                                    checked={formData.musicas_sugeridas_ids.includes(musica.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setFormData({
                                          ...formData,
                                          musicas_sugeridas_ids: [
                                            ...formData.musicas_sugeridas_ids,
                                            musica.id,
                                          ],
                                        });
                                      } else {
                                        setFormData({
                                          ...formData,
                                          musicas_sugeridas_ids:
                                            formData.musicas_sugeridas_ids.filter(
                                              (id) => id !== musica.id
                                            ),
                                        });
                                      }
                                    }}
                                  />
                                  <div className="min-w-0">
                                    <span className="block text-xs sm:text-sm font-medium text-gray-200 truncate">
                                      {musica.titulo}
                                    </span>
                                    {musica.autor_artista && (
                                      <span className="block text-[11px] text-gray-400 truncate">
                                        {musica.autor_artista}
                                      </span>
                                    )}
                                  </div>
                                </label>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handleEditarMusica(
                                        musica.id,
                                        musica.titulo,
                                        musica.autor_artista || null
                                      );
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                                    title="Editar Música"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handleDeletarMusica(musica.id);
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                    title="Excluir do Acervo"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
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
        <div className="px-4 sm:px-6 py-3.5 border-t border-white/10 flex justify-end gap-3 bg-[#070e1c] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSalvar}
            disabled={salvando || !formData.nome}
            className="flex items-center gap-2 px-6 py-2.5 bg-macaonico-dourado text-black text-xs sm:text-sm font-bold rounded-xl hover:bg-yellow-500 transition-colors disabled:opacity-50 shadow-lg"
          >
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Salvar Evento</span>
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
              setFormData((prev) => ({
                ...prev,
                musicas_sugeridas_ids: [...prev.musicas_sugeridas_ids, novaMusicaId],
              }));
              setModoMusicas('LISTA');
            }
            setModalUploadAberto(false);
          }}
        />
      )}
    </div>,
    document.body
  );
};

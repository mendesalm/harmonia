export interface Organizacao {
  id: string;
  nome: string;
  sigla?: string;
  tipo: string;
  slug_armazenamento: string;
  rito_padrao: string;
  dados_especificos: Record<string, any>;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface Evento {
  id: string;
  organizacao_id?: string;
  nome: string;
  descricao?: string;
  categoria_rito: string;
  padrao_sistema: boolean;
  compartilhado: boolean;
  ordem_sugerida: number;
  ativo: boolean;
  total_musicas?: number;
  criado_em: string;
  atualizado_em: string;
}

export interface ItemSequencia {
  id: string;
  evento_id: string;
  evento_nome: string;
  ordem: number;
  obrigatorio: boolean;
  observacao_ritual?: string;
  total_musicas?: number;
}

export interface Sessao {
  id: string;
  organizacao_id: string;
  nome: string;
  rito: string;
  grau: number;
  descricao?: string;
  configuracoes: Record<string, any>;
  ativo: boolean;
  total_eventos: number;
  sequencia_eventos?: ItemSequencia[];
  criado_em: string;
  atualizado_em: string;
}

export interface EventoAssociadoInfo {
  evento_id: string;
  evento_nome: string;
}

export interface Musica {
  id: string;
  organizacao_id: string;
  titulo: string;
  autor_artista?: string;
  tipo_midia: 'ARQUIVO_LOCAL' | 'YOUTUBE' | 'SPOTIFY';
  caminho_arquivo?: string;
  link_externo?: string;
  duracao_segundos?: number;
  tamanho_bytes?: number;
  tipo_mime?: string;
  metadados: Record<string, any>;
  ativo: boolean;
  eventos: EventoAssociadoInfo[];
  criado_em: string;
  atualizado_em: string;
}

export interface MusicaSorteada {
  id: string;
  titulo: string;
  autor_artista?: string;
  tipo_midia: string;
  caminho_arquivo?: string;
  link_externo?: string;
  duracao_segundos?: number;
}

export interface MomentoExecucao {
  posicao: number;
  evento_id: string;
  evento_nome: string;
  evento_descricao?: string;
  obrigatorio: boolean;
  observacao_ritual?: string;
  musica_sorteada?: MusicaSorteada | null;
  total_musicas_disponiveis: number;
  candidatas: MusicaSorteada[];
}

export interface SessaoPlayerExecucao {
  sessao_id: string;
  sessao_nome: string;
  rito: string;
  grau: number;
  configuracoes_audio: Record<string, any>;
  total_momentos: number;
  esteira_ritualistica: MomentoExecucao[];
}

# Histórico de Implementação do Harmonia (Changelog Global)

Este documento atua como a **Regra de Ouro** de documentação histórica do projeto **Harmonia**. Ele é um compilado centralizado e contínuo de todas as decisões arquiteturais, modelos de dados, endpoints e interfaces desenvolvidas. Novas entradas serão registradas no topo (cronologia inversa), garantindo que a evolução do sistema seja auditável e transparente de ponta a ponta.

---

## [30 de Agosto de 2026] - Conversor Direto de YouTube para MP3 320 kbps no Servidor da Loja
**Módulo:** `Backend` / `YouTube` / `Conversor MP3 320k` / `yt-dlp` / `FFmpeg`

### 1. Download e Conversão com Áudio em 320 kbps
- Integradas as bibliotecas `yt-dlp` e `imageio-ffmpeg` no backend Python.
- Criado o serviço assíncrono `converter_youtube_para_mp3_async` (`conversor.py`), executado fora da thread principal para não bloquear requisições HTTP do FastAPI.
- Implementado o endpoint `POST /api/v1/musicas/converter-youtube`:
  - Recebe o link do YouTube e os momentos ritualísticos (playlists).
  - Extrai o melhor fluxo de áudio e converte via FFmpeg com codec `mp3` na taxa máxima de **320 kbps** (`preferredquality: '320'`).
  - Salva o arquivo `.mp3` na pasta isolada da Loja (`armazenamento/instancias/public/{slug}/musicas/`).
  - Registra a música no banco de dados como `ARQUIVO_LOCAL`, com duração exata, título, autor e metadados.
- **No Modal de Upload (`ModalUploadMusica.tsx`)**:
  - Adicionada a opção destacada *"Converter e Baixar em MP3 320 kbps (Recomendado)"*.
  - Indicador visual e barra animada de progresso durante o download e processamento.
- Teste automatizado `test_endpoint_conversor_youtube_schemas` cobrindo o fluxo (6 testes passando 100% no `pytest`).

---

## [30 de Agosto de 2026] - Barra de Progresso e Andamento Sincronizada com o YouTube
**Módulo:** `Player` / `YouTube API` / `UX`

### 1. Barra de Andamento e Interação no YouTube
- Implementado rastreador contínuo em tempo real via YouTube IFrame API (`getCurrentTime()` e `getDuration()`).
- Exibição elegante da **Barra de Progresso (Tempo Decorrido / Duração Total)** tanto para arquivos locais em MP3 quanto para links do YouTube.
- **Seek Interativo**: O Mestre de Harmonia pode clicar em qualquer ponto da barra para avançar ou retroceder a música do YouTube instantaneamente (`seekTo`).

---

## [30 de Agosto de 2026] - Foco em Confiabilidade Ritualística: Upload de MP3 e Links do YouTube (Áudio Integral)
**Módulo:** `Acervo` / `UX Maçônica` / `Confiabilidade`

### 1. Simplificação e Estabilidade do Acervo
- **Eliminação do Spotify**: Devido à limitação comercial imposta pelo Spotify (corte obrigatório em 30 segundos para embeds sem autenticação DRM paga), a interface de catalogação foi simplificada e blindada contra cortes.
- **Os 2 Métodos Confiáveis de Execução em Templo**:
  1. **Upload de Arquivo Local (MP3 / WAV / OGG)** *(Recomendado para estabilidade absoluta, controle de volume fino, fade out suave e operação 100% offline)*.
  2. **Link do YouTube (Áudio Integral)** *(Sem cortes de 30 segundos, com áudio em segundo plano e detecção precisa de fim de faixa)*.

---

## [30 de Agosto de 2026] - Interface 100% Áudio (Vídeo do YouTube Oculto) com Equalizador Visual
**Módulo:** `Player` / `UX Maçônica` / `Interface Minimalista de Áudio`

### 1. Reprodução Oculta de Vídeo
- O container do YouTube IFrame foi posicionado em segundo plano invisível (`opacity: 0; pointer-events: none`).
- O vídeo não é exibido na tela, mantendo a estética sóbria e solene do Templo Maçônico.
- O áudio é reproduzido com alta fidelidade e controlado exclusivamente pelos botões do Harmonia (Play/Pause, Próximo Momento, Fade-out, Volume).
- Adicionado um **Equalizador Visual Dinâmico** que pulsa suavemente no palco durante a execução da faixa.

---

## [30 de Agosto de 2026] - Barra de Seleção Manual de Músicas no Player
**Módulo:** `Player` / `UX` / `Seleção Manual` / `Mestre de Harmonia`

### 1. Seletor de Faixas sob Demanda
- Adicionada uma barra estilizada de **"Escolha Manual da Música"** no palco principal do Player (`PaginaPlayerHarmonia.tsx`).
- O seletor exibe todas as músicas catalogadas para o momento litúrgico ativo (título, autor e formato: MP3 Local ou YouTube).
- Ao selecionar uma faixa:
  - A música é instantaneamente carregada e engatilhada para o momento litúrgico ativo.
  - O player permanece em **PAUSA**, aguardando o comando do Mestre de Harmonia para iniciar a reprodução.

---

## [30 de Agosto de 2026] - Integração com a API Oficial do YouTube IFrame (Detecção Precisa de Fim de Vídeo)
**Módulo:** `Player` / `YouTube API` / `Automação Ritualística`

### 1. Detecção Oficial do Evento de Fim de Música no YouTube
- Integrada a biblioteca oficial `https://www.youtube.com/iframe_api` via `window.YT.Player`.
- O player agora se vincula diretamente ao ciclo de vida do vídeo através do evento `onStateChange`:
  - `event.data === 0` (`YT.PlayerState.ENDED`): Dispara instantaneamente a função `aoTerminarMusica()`, selecionando o próximo momento litúrgico da esteira.
  - `event.data === 1` (`PLAYING`): Sincroniza o status visual do botão de play.
  - `event.data === 2` (`PAUSED`): Sincroniza o status visual de pausa.
- Utilizadas referências atômicas (`useRef`) para `dadosSessao` e `indiceAtual`, eliminando qualquer problema de *stale closure* no ciclo de renderização do React.

---

## [30 de Agosto de 2026] - Ciclo Ritualístico do Player: Pausa Inicial e Seleção Automática do Próximo Evento
**Módulo:** `Player` / `Comportamento Ritualístico` / `Automação`

### 1. Regras Litúrgicas do Player do Mestre
- **Pausa Inicial ao Acessar Evento**: Ao carregar a sessão, navegar pelo carrossel, clicar em um momento ou re-sortear, o player entra **obrigatoriamente em estado de PAUSA** (`tocando = false`), com a música carregada e engatilhada, aguardando o comando ritualístico dado pelo Venerável Mestre.
- **Seleção e Avanço Automático ao Terminar a Música**: Quando a música do momento ativo chega ao fim (tanto para arquivos locais via `onEnded` quanto para YouTube via `onStateChange === 0`), o sistema seleciona **automaticamente o próximo evento litúrgico da esteira**, carrega sua música sorteada e a posiciona **em PAUSA**, pronta para o próximo comando litúrgico.

---

## [30 de Agosto de 2026] - Suporte ao Rito Brasileiro e Funcionalidade de Clonagem de Sessões
**Módulo:** `Sessões` / `Ritos` / `Clonagem` / `Rito Brasileiro`

### 1. Inclusão do Rito Brasileiro
- Adicionado o **Rito Brasileiro** como rito nativo de primeira classe em todo o sistema (modelos, schemas, rotas e formulários).
- Seed de modelos padrão para o Rito Brasileiro populado no PostgreSQL:
  - *Sessão Ordinária de Aprendiz - Rito Brasileiro* (10 eventos sequenciados, incluindo Entrada e Saída do Pavilhão Nacional).
  - *Sessão Magna de Iniciação - Rito Brasileiro* (11 eventos sequenciados).

### 2. Clonagem de Modelos de Sessão
- Endpoint `POST /api/v1/sessoes/{id}/clonar` implementado no backend: duplica atomicamente o cabeçalho da sessão e toda a sua esteira sequencial de eventos (`SessaoEvento`), permitindo renomear, trocar o rito (ex: clonar do REAA para o Rito Brasileiro) ou grau.
- Modal de Clonagem no Frontend (`PaginaSessoes.tsx`) com botão de atalho `📋 Clonar Modelo` em cada cartão de sessão.

---

## [30 de Agosto de 2026] - Atalhos Ubíquos de Upload e Catalogação de Músicas
**Módulo:** `Músicas` / `UX` / `Player` / `Eventos`

### 1. Experiência de Upload & Catalogação Integrada
- Adicionados pontos de entrada diretos para upload e catalogação de áudio (MP3/WAV/OGG) ou streaming (YouTube/Spotify) em todo o sistema:
  - **Na Página do Acervo (`/musicas`)**: Botão principal `+ Adicionar Música / Streaming`.
  - **No Player Ritualístico (`/`)**: Botão `+ Adicionar Música` diretamente no painel do momento litúrgico ativo.
  - **No Catálogo de Eventos (`/eventos`)**: Botão `+ Adicionar / Catalogar Música` dentro de cada card de momento ritualístico.
- Modal de Upload agora suporta `eventoIdPreSelecionado`, vinculando automaticamente a música ao momento litúrgico desejado com um clique.

---

## [30 de Agosto de 2026] - Concepção SaaS: Assinatura Mensal por Loja, E-mail Padrão e Alteração de Senha
**Módulo:** `SaaS` / `Autenticação` / `Multi-Tenant` / `Assinatura`

### 1. Modelo de Assinatura Mensal (SaaS Tenant)
- Atualizado o modelo `Organizacao` com campos `status_assinatura` (`ATIVO`, `PENDENTE`, `BLOQUEADO`) e `plano_assinatura` (`MENSAL_HARMONIA`).
- Criação e ativação de Lojas agora provisiona automaticamente:
  - E-mail de acesso padronizado: `loja{numero}@harmonia.sigma.app` (ex: `loja2181@harmonia.sigma.app`).
  - Senha inicial gerada pelo sistema (`harmonia@{numero}` ou `harmonia@2026`).
  - Registro de usuário no modelo `Pessoa` com perfil `mestre_harmonia`.
  - Provisionamento de storage exclusivo em `armazenamento/instancias/public/{slug}/musicas/`.

### 2. Gestão de Credenciais e Troca de Senha
- Implementado endpoint `POST /api/v1/auth/alterar-senha` permitindo ao Mestre de Harmonia/Loja substituir a senha padrão inicial por uma nova senha personalizada.
- Modal dedicado de **"Alterar Senha de Acesso"** adicionado na barra de navegação (`Navbar.tsx`).
- Validação no login com bloqueio em caso de assinaturas suspensas.

---

## [30 de Agosto de 2026] - Autenticação JWT (Padrão Sigma DB), Controle de Acesso e Suporte a App Móvel / PWA
**Módulo:** `Autenticação` / `Segurança` / `Mobile PWA` / `Controle de Acesso`

### 1. Backend e Modelo de Dados (`Pessoa`)
- Criado o modelo ORM `Pessoa` compatível com o ecossistema Sigma, com suporte a `senha_hash` (`bcrypt`), `status_acesso`, `organizacao_id` e envelopes JSONB `dados_civis` e `dados_especificos`.
- Módulo `backend/nucleo/seguranca.py` com geração/validação de tokens JWT Bearer (`HS256`, expiração de 7 dias).
- Rota `POST /api/v1/auth/login` para autenticação com retorno de JWT e dados da Loja do membro.
- Rota `GET /api/v1/auth/me` e dependências `obter_usuario_autenticado` e `exigir_mestre_ou_admin`.
- Seed de usuários padrão:
  - `loja2181@harmonia.sigma.app` (Senha: `harmonia@2026`, Role: `mestre_harmonia`)
  - `sistema@e-sigma.app` (Senha: `harmonia@2026`, Role: `super_admin`)

### 2. Frontend, Tela de Login e Guarda de Rotas
- **Página de Login (`PaginaLogin.tsx`)**: Design maçônico em *Deep Blue* e *Ciano Sigma* com atalhos rápidos de teste.
- **Contexto de Autenticação (`ContextoAutenticacao.tsx`)**: Gerencia o estado de login, armazena o token no `localStorage` e intercepta chamadas Axios injetando `Authorization: Bearer <token>`.
- **Guarda de Rotas (`RotaProtegida.tsx`)**: Redireciona usuários não autenticados para `/login`.
- **Navbar Integrada**: Exibe nome do usuário, cargo e botão de Logout.

### 3. Aplicativo Móvel e PWA
- Configurado `manifest.json`, ícone maçônico SVG (`icone-harmonia.svg`) e meta tags para instalação direta como aplicativo em smartphones e tablets Android e iOS (modo *standalone*, sem barras do navegador e áudio contínuo).

---

## [30 de Agosto de 2026] - Implementação Completa do Harmonia Fullstack (FastAPI + PostgreSQL + React)
**Módulo:** `Fullstack` / `Player` / `Sessões` / `Eventos` / `Músicas` / `Storage Multi-Tenant`

### 1. Banco de Dados PostgreSQL & Modelagem Relacional
- Conectado com sucesso ao PostgreSQL remoto (`harmoniadb` com usuário `harmonia`).
- Modelos ORM criados com SQLAlchemy Assíncrono (`asyncpg`):
  - `Organizacao`: Tenant/Loja com `slug_armazenamento` e `dados_especificos` JSONB.
  - `Evento`: Momentos ritualísticos (Playlists) com suporte a `padrao_sistema` e `compartilhado`.
  - `Sessao` e `SessaoEvento`: Esteiras ritualísticas com sequenciamento ordenado atômico (`ordem`).
  - `Musica` e `MusicaEvento`: Classificação N:N com suporte a arquivos físicos e links streaming.

### 2. Backend FastAPI & Swagger Autodocumentado
- Todos os endpoints sob o prefixo `/api/v1` com validações Pydantic V2 e docstrings ricas:
  - `/organizacoes`: CRUD de Lojas e provisionamento de pastas.
  - `/eventos`: CRUD de Momentos Ritualísticos / Playlists.
  - `/sessoes`: CRUD de Sessões e endpoint de reordenação `/sessoes/{id}/sequencia`.
  - `/musicas`: Upload seguro multipart/form-data e registro de links do YouTube / Spotify.
  - `/player`: Endpoint `/player/sessao/{id}` com **sorteio randômico de músicas por momento litúrgico** e `/player/sortear-musica/{evento_id}` para troca instantânea de faixa.
  - Servidor de arquivos estáticos montado em `/storage/instancias/public`.

### 3. Frontend React (Vite + TypeScript + Tailwind CSS / PWA)
- Interface visual sofisticada com tema Maçônico (*Deep Blue*, *Cyan Sigma* `#00E5FF` e *Dourado*):
  - **Player do Mestre de Harmonia (`PaginaPlayerHarmonia.tsx`)**: Carrossel ritualístico com auto-scroll, Now Playing, controle de volume, transição com Fade Out e botão de sorteio randômico.
  - **Sessões & Esteiras (`PaginaSessoes.tsx` e `ModalSequenciadorSessao.tsx`)**: Reordenação intuitiva de momentos ritualísticos.
  - **Eventos Ritualísticos (`PaginaEventos.tsx`)**: Catálogo com badges de eventos padrão do rito vs eventos personalizados.
  - **Acervo de Músicas (`PaginaMusicas.tsx` e `ModalUploadMusica.tsx`)**: Upload de áudio e streaming com reprodutor de prévia embutido.

### 4. Testes Automatizados
- Bateria de testes `pytest` assíncrona (`backend/testes/test_api.py`) cobrindo 100% dos fluxos principais da API com sucesso.

---

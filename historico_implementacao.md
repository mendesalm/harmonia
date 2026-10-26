# Histórico de Implementação do Harmonia (Changelog Global)

Este documento atua como a **Regra de Ouro** de documentação histórica do projeto **Harmonia**. Ele é um compilado centralizado e contínuo de todas as decisões arquiteturais, modelos de dados, endpoints e interfaces desenvolvidas. Novas entradas serão registradas no topo (cronologia inversa), garantindo que a evolução do sistema seja auditável e transparente de ponta a ponta.

---

## [26 de Outubro de 2026] - Redesign Litúrgico Nobre, Normalizador Web Audio API, Surdina por Momento, Composição via Acervo e Navegação Tátil Restaurada
**Módulo:** `Player UX` / `Áudio DSP` / `Acervo & Momentos` / `Estabilidade VPS`

### 1. Identidade Visual Nobre e-Sigma (Sem Saturação Neon)
- **Eliminação do Ciano Neon:** Substituição do tema ciano fluorescentes pela paleta oficial e sóbria do e-Sigma:
  - Fundo e superfícies: Preto e Azul Noturno profundo (`#050811`, `#070F1E`, `#0A1428`, `#0E1A2F`).
  - Destaques ritualísticos: Dourado Maçônico (`#DDB96B`) com brilho atenuado (`box-shadow` suave).
  - Equalizador gráfico animado e anéis do disco em tom dourado refinado.
- **Geometria do Carrossel Horizontal:** Calibragem da largura central (`258px`) e espaçamento (`182px`), permitindo que os momentos anterior e seguinte fiquem claramente visíveis nas laterais (~50px e opacidade 75%), tornando a navegação tátil por deslize intuitiva.

### 2. Normalizador de Áudio (Web Audio API) e Surdina por Momento
- **Normalizador de Volume Broadcast:** Criação de `normalizadorAudio.ts` integrando `DynamicsCompressorNode` e transição suave no `GainNode` via rampa linear (`linearRampToValueAtTime`) de 40ms, eliminando oscilações de volume e equalizando faixas com ganhos diferentes.
- **Surdina por Momento Ritualístico:**
  - Adicionada coluna `em_surdina` em `SessaoLojaEvento` com autocorreção (self-healing) de schema no `sincronizacao_tenant.py`.
  - Endpoint `PATCH /api/v1/player/sessao/{sessao_id}/momento/{evento_id}/surdina` para salvar a preferência permanentemente.
  - O modo surdina agora é configurado e memorizado por momento litúrgico (ex.: Palavra a Bem da Ordem).

### 3. Restauração dos Controles de Navegação e Slider de Volume
- **Barra Tátil Clássica:** Retorno aos 5 botões táteis no player:
  - Asa Esquerda: Momento Anterior (`Rewind`) e Faixa Anterior (`SkipBack`).
  - Botão Central: Play/Pause circular 76x76px com anéis dourados concêntricos.
  - Asa Direita: Próxima Faixa (`SkipForward`) e Próximo Momento (`FastForward`).
- **Slider Contínuo de Volume Master:** Acessível pelo botão compacto `Vol: X%` na linha de apoio, expandindo controle deslizante de 0% a 100%.

### 4. Composição de Momentos com Músicas do Acervo Existente
- **Novo Componente `ModalComporMomento.tsx`:**
  - Aba "Músicas no Acervo" com pesquisa instantânea por título ou artista.
  - Pré-escuta de áudio (preview) antes de vincular à cerimônia.
  - Ação em 1 clique para associar ou desassociar músicas ao momento ritualístico.
  - Atualização dinâmica da esteira da sessão ativa no player (`preferida=true`).
  - Aba integrada "Nova Música" para uploads e YouTube quando necessário.
- **Novas Rotas REST no Backend:**
  - `POST /api/v1/eventos/{evento_id}/musicas/{musica_id}` (com replicação canônica entre ritos).
  - `DELETE /api/v1/eventos/{evento_id}/musicas/{musica_id}`.
  - Suporte a filtro textual `busca` em `GET /api/v1/musicas`.

### 5. Resiliência e Correção de Inicialização na VPS
- Corrigida referência ausente `audioRef` que causava tela preta na VPS (`ReferenceError: audioRef is not defined`).
- Envolvido o shell da aplicação com `ErrorBoundary` para evitar falhas catastróficas de tela branca/preta.
- 29 testes automatizados passando 100% no Pytest.

---

## [20 de Outubro de 2026] - Fase 1 SSO/RBAC, Auto-Provisionamento SaaS, Redesign Mobile-First PWA, Desduplicação de Momentos e Self-Healing de Rito
**Módulo:** `Segurança SSO` / `Multi-Tenant` / `Mobile-First PWA` / `Rito Brasileiro`

### 1. Segurança SSO e RBAC (Conformidade `AGENTS.md`)
- Removido fallback de segredo JWT hardcoded em `backend/nucleo/configuracoes.py`.
- Criado `backend/nucleo/dependencias.py` validando tokens exclusivamente via `GET /api/v1/auth/validate` do `e-Sigma` IdP e exigindo assinatura SaaS ativa (`verificar_assinatura_ativa`) ou perfil `super_admin` (`exigir_super_admin`).
- Adicionado endpoint `GET /api/v1/auth/me` no backend do Harmonia e substituído uso de `axios` puro por `clienteHttp` no frontend.

### 2. Sincronização de Tenant (Loja 2181), Desduplicação por Rito e Self-Healing
- Criado `backend/nucleo/sincronizacao_tenant.py` executado na inicialização do FastAPI (`lifespan`) e sob demanda, garantindo que a **ARLS João Pedro Junqueira nº 2181** (`795b19d5-e14c-4c2e-b047-ee99e6e39a9c`) esteja vinculada ao **Rito Brasileiro** e migre automaticamente sessões e músicas de registros legados.
- Filtragem de momentos ritualísticos por `rito_id` da Loja ativa e compartilhamento de músicas equivalentes via `canonico_id`, eliminando duplicidades visuais entre ritos.
- Normalização de `rito_padrao` e `rito_id` em `ContextoTenant.tsx` e `PaginaDashboard.tsx`.

### 3. Reestruturação Responsiva Mobile-First e Correções PWA
- Adicionadas paletas `macaonico.*` e `primaria.*` em `frontend/tailwind.config.js`.
- Layout responsivo `100dvh` em `App.tsx`, `Navbar.tsx`, `PaginaDashboard.tsx`, `PaginaPlayerHarmonia.tsx`, `PaginaSessoes.tsx`, `PaginaEventos.tsx`, `PaginaMusicas.tsx` e telas de administração.
- Corrigido XML do `icone-harmonia.svg`, ocultado Google Login quando `VITE_GOOGLE_CLIENT_ID` não está configurado e ativados `skipWaiting` / `clientsClaim` no Workbox PWA.

---

## [31 de Agosto de 2026] - Redesign Completo do Player: Interface Cyber-Maçônica com Card Litúrgico e Radial Progress Dial
**Módulo:** `Frontend` / `Player UX` / `Cyber-HUD` / `Design System`

### 1. Novo Design HUD Futurista
- **Barra Superior `SYS.ONLINE // HARMONIA`**:
  - Badge de status maçônico com indicador rotativo de neon, ícones de status ritualístico, bluetooth e bateria.
- **Card Litúrgico Central Integrado**:
  - Banner Hero com arte fluídica/líquida de energia em degradê profundo e traçado de ondas.
  - Título do momento litúrgico em display font (`01 // ENTRADA DO CORTEJO`) e estatísticas de trilhas (`X TRACKS // MM:SS`).
  - **Tracklist Dinâmica de Faixas**: Faixa ativa destacada em *Ciano Neon* (`01 // NOME_DA_MUSICA`) com **Equalizador Visual Animado**, e faixas secundárias numeradas (`02 // SEGUNDA_FAIXA`) com duração e seleção com um clique.
- **Radial Progress Dial (Disco Central com Anel Neon)**:
  - Anel circular em SVG com preenchimento em arco neon (`stroke-dasharray` dinâmico) proporcional ao tempo de reprodução.
  - Botão de Play/Pause central em disco escuro com iluminação interna.
  - Suporte a *Seek* angular clicável no anel.
- **Dock de Controles e Esteira Litúrgica**:
  - Botões de ação rápida (`ANTERIOR`, `PRÓXIMO MOMENTO (FADE)`, `SORTEAR`, `+ ADD`).
  - Fita de navegação rápida pelos momentos da sessão.
  - Slider de volume minimalista com traço neon.

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

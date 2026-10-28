# Histórico de Implementação do Harmonia (Changelog Global)

Este documento atua como a **Regra de Ouro** de documentação histórica do projeto **Harmonia**. Ele é um compilado centralizado e contínuo de todas as decisões arquiteturais, modelos de dados, endpoints e interfaces desenvolvidas. Novas entradas serão registradas no topo (cronologia inversa), garantindo que a evolução do sistema seja auditável e transparente de ponta a ponta.

---

## [28 de Outubro de 2026 - Manhã (Estruturação Hierárquica de Pastas Locais por Metadados Litúrgicos)] - Downloader & Organização Local
**Módulo:** `Downloader Litúrgico` / `Organização Automática de Pastas` / `Tags ID3 Locais`

### 1. Hierarquia de Diretórios Locais por Metadados
- **Estruturação Automática:** O utilitário [`downloader_liturgico.py`](file:///c:/Users/engan/Desktop/Harmonia/scripts/downloader_liturgico.py) passa a organizar os arquivos de áudio baixados em uma árvore hierárquica baseada nos metadados selecionados:
  ```
  Desktop\Musicas_{Spotify|YouTube}\
    └── {ESTILO}\                  (ex: CLASSICA, VIOLAO, SOUNDTRACKS, etc.)
        └── {SUBCLASSIFICACAO}\     (ex: GERAL ou AMBIENTE / Surdina)
            └── {MOMENTO_LITURGICO}\(ex: Entrada do Pavilhão Nacional, Acervo Geral)
                └── {Artista} - {Título}.mp3
  ```
- **Gravação de Tags ID3:** Além da estrutura em pastas físicas, o arquivo MP3 recebe tags ID3 internas (`title`, `artist`, `genre` e `album`), garantindo identificação correta em players externos locais (VLC, Windows Media Player, etc.).
- **Limpeza Automática:** Os downloads ocorrem em uma pasta temporária de trabalho que é limpa e removida ao final do processamento, mantendo o diretório local perfeitamente catalogado e sem arquivos soltos na raiz.

---

## [28 de Outubro de 2026 - Manhã (Correção de Foreign Key e Erro 500 no Upload de Músicas)] - Estabilidade & Resolução Canônica
**Módulo:** `Upload de Músicas` / `Resolução de IDs Canônicos e Eventos` / `Downloader Litúrgico`

### 1. Causa Raiz do Erro 500 no Upload
- **Conflito de Foreign Key:** A tabela relacional `musicas_eventos_sugeridos` exige `evento_id` com restrição estrita de chave estrangeira apontando para `eventos_ritualisticos.id`.
- Ao selecionar itens vindos do catálogo canônico global (`momentos_canonicos`), o ID enviado pertencia à tabela de canônicos, violando a constraint do PostgreSQL e disparando HTTP 500 (`Internal Server Error`).

### 2. Resolução Inteligente no Backend (`servicos.py`) e no Downloader
- **Tratamento Híbrido Automático:** Em [`registrar_upload_musica`](file:///c:/Users/engan/Desktop/Harmonia/backend/api/musicas/servicos.py), a lista de IDs recebida agora é inspecionada:
  - Se for `MomentoCanonico`, busca todos os `Eventos` de rito vinculados àquele canônico e os associa sem violar FK.
  - Se for `Evento`, associa diretamente e expande para os demais ritos através de `canonico_id`.
  - Jamais tenta persistir chaves inexistentes na tabela de eventos.
- **Priorização no Downloader Litúrgico:** [`downloader_liturgico.py`](file:///c:/Users/engan/Desktop/Harmonia/scripts/downloader_liturgico.py) passa a listar diretamente os registros de `GET /api/v1/eventos`, garantindo 100% de compatibilidade retroativa e sucesso imediato no envio ao servidor de produção (retornando HTTP 201 Created).

---

## [28 de Outubro de 2026 - Manhã (Downloader Litúrgico Spotify & YouTube com Metadados e Upload Direto)] - Scripts & API
**Módulo:** `Downloader CLI & Scripts .bat` / `Ingestão de Músicas (Spotify/YouTube)` / `Metadados Litúrgicos e Upload Direto`

### 1. Extensão dos Endpoints de Upload e Conversão do Backend
- **Suporte a Estilo e Subclassificação:** Os endpoints `POST /api/v1/musicas/upload` e `POST /api/v1/musicas/converter-youtube` agora aceitam explicitamente `estilo` (`UNIVERSAL`, `CLASSICA`, `VIOLAO`, `SOUNDTRACKS`, `POPULAR`) e `subclassificacao` (`GERAL`, `AMBIENTE`), aplicando as funções de normalização (`normalizar_estilo`, `normalizar_subclassificacao`) de `backend.nucleo.constantes`.
- **Persistência Completa:** `registrar_upload_musica` (`servicos.py`) grava diretamente esses atributos no registro da música no PostgreSQL, permitindo que uploads avulsos ou em lote já entrem no acervo com a taxonomia litúrgica definida.

### 2. Utilitário Python Unificado (`downloader_liturgico.py`)
- **Fontes Suportadas:** Download em 320 kbps a partir do **Spotify** (faixas, álbuns, playlists via `spotdl`) ou **YouTube** (vídeos e playlists via `yt-dlp` com FFmpeg).
- **Entrevista Interativa de Metadados:**
  1. Confirmação/Edição de Título e Artista (com leitura prévia de tags ID3).
  2. Seleção de Estilo Litúrgico (1 a 5).
  3. Seleção de Subclassificação Funcional (1 - Geral ou 2 - Ambiente/Surdina).
  4. Seleção de Momentos Litúrgicos Canônicos obtidos dinamicamente da API do Harmonia.
- **Transferência Imediata para o Acervo:** Pergunta ao usuário se deseja sincronizar a faixa com o Harmonia; em caso afirmativo, autentica via e-Sigma IdP (armazenando token em cache seguro `~/.harmonia_cli_token.json`) e faz o upload com retorno do UUID criado.

### 3. Atualização dos Arquivos Executáveis `.bat`
- **Área de Trabalho (`Desktop`):**
  - `Baixar_Spotify_MP3.bat`: Atualizado para invocar o assistente com fluxo do Spotify.
  - `Baixar_YouTube_MP3.bat`: Criado no Desktop para download e upload direto a partir do YouTube.
- **Versionamento no Repositório:** Ambos os arquivos foram espelhados em `scripts/` do repositório para preservação e rastreabilidade.

---

## [28 de Outubro de 2026 - Manhã (Upload e Conversão de Músicas no Painel de Curadoria Litúrgica)] - Extensão do Admin
**Módulo:** `Painel Admin SuperAdmin` / `Curadoria Litúrgica de Músicas` / `Upload & Streaming Global`

### 1. Adição de Controle de Upload na Curadoria Litúrgica
- **Botão Nobre no Cabeçalho:** Adicionado botão de ação em destaque `[ + Upload de Música ]` no cabeçalho da [`PaginaCuradoriaMusicasAdmin.tsx`](file:///c:/Users/engan/Desktop/Harmonia/frontend/src/modulos/admin/PaginaCuradoriaMusicasAdmin.tsx), com gradiente dourado maçônico e feedback tátil.
- **Ação em Caso de Acervo Vazio:** Se a listagem não retornar faixas com os filtros aplicados, um botão contextual de upload também é apresentado diretamente no centro da tabela.
- **Integração com `ModalUploadMusica` (`isGlobalAdmin={true}`):**
  - Permite tanto o envio de arquivos de áudio locais (MP3, WAV, OGG) quanto a extração e conversão automática de áudio a partir de links do YouTube (320 kbps).
  - Como o modal é aberto pelo SuperAdmin (`isGlobalAdmin={true}`), a música pode ser adicionada diretamente ao acervo global do ecossistema sem amarras de tenant.
  - Ao concluir com sucesso, a lista e a contagem total de músicas são automaticamente atualizadas (`carregarCatalogo()`).
- **Suporte Total ao SuperAdmin `sistema@e-sigma.app`:** O modal reconhece explicitamente `sistema@e-sigma.app` como SuperAdmin no frontend.

---

## [28 de Outubro de 2026 - Manhã (Reconhecimento Explícito de sistema@e-sigma.app como SuperAdmin)] - Fortalecimento RBAC
**Módulo:** `Autenticação SSO e-Sigma` / `RBAC Global` / `Suporte a SuperAdmin Central`

### 1. Inclusão Explícita de `sistema@e-sigma.app`
- **Garantia Incondicional de SuperAdmin:** Adicionada a conta mestre do ecossistema (`sistema@e-sigma.app`) à propriedade `is_super_admin` de `UsuarioEsigma` (`backend/nucleo/auth_esigma.py`), ao lado de `mendesalm@gmail.com`.
- **Privilégios Globais:** Usuários com este privilégio possuem acesso total aos endpoints `/api/v1/admin/*`, status `harmonia_ativo = True` mesmo sem vínculo direto com loja única, e redirecionamento automático para a área de Dashboard Global (`/admin`).
- **Testes Unitários:** Adicionado caso de teste automatizado em `backend/testes/test_auth_rbac.py` validando o reconhecimento incondicional de `sistema@e-sigma.app`.

---

## [28 de Outubro de 2026 - Manhã (Configuração Litúrgica na Capa do Álbum e Play/Stop no Disco)] - Ajuste de Interatividade do Player
**Módulo:** `Player UX Vitrola H-33` / `Carrossel 3D de Álbuns` / `Disco de Vinil (Prato)` / `Modal de Composição Litúrgica`

### 1. Transferência da Configuração Litúrgica para a Capa do Álbum
- **Clique na Capa Ativa:** Clicar na capa do álbum centralizado abre o modal de configuração litúrgica (`ModalComporMomento` via `onAbrirUpload()`), permitindo compor e ordenar músicas do acervo ou realizar upload de novos áudios/vídeos.
- **Clique em Capa Vizinha:** Desloca o carrossel para centralizar e ativar o momento correspondente.
- **Desbloqueio de Eventos Touch/Pointer:** A captura de ponteiro via `setPointerCapture` foi ajustada para ocorrer apenas em deslocamentos reais (`> 6px`), permitindo que cliques rápidos nas capas ocorram sem interferência do gesto de arrasto.

### 2. Clique no Disco de Vinil Alterna Play/Stop
- **Controle Direto na Mídia:** O clique sobre o disco de vinil giratório (ou no prato vazio) agora executa a ação direta de alternar reprodução/pausa (`onAlternarPlayPause()`).
- **Feedback Tátil e Tooltip:** Efeito de escala ativa (`active:scale-[0.98]`), vibração háptica (`feedbackTatil.clique()`) e rótulos contextuais ("Clique no vinil para pausar (Stop)" / "Clique no vinil para tocar (Play)").

---

## [28 de Outubro de 2026 - Manhã (Abertura do Modal de Composição ao Clicar na Capa do Álbum)] - Correção de Eventos Pointer e Abertura de Modal
**Módulo:** `Player UX Vitrola H-33` / `Carrossel 3D de Álbuns` / `Modal de Composição Litúrgica`

### 1. Desbloqueio dos Eventos de Clique nas Capas dos Álbuns
- **Causa Raiz Identificada:** O container pai do carrossel 3D invocava `setPointerCapture` imediatamente no evento `onPointerDown`, o que capturava o fluxo de eventos e suprimia a propagação do evento `click` para os cards filhos das capas dos álbuns.
- **Captura Condicional de Ponteiro:** A captura via `setPointerCapture` agora só é ativada se houver deslocamento real de arrasto (`Math.abs(dx) > 6px`). Cliques e toques estáticos não acionam a captura, garantindo que o evento de clique seja propagado com 100% de confiabilidade em mobile e desktop.
- **Garantia Dupla no `finalizarGesto`:** Caso o navegador cancele o clique sintético, `finalizarGesto` detecta toques sem arrasto (`duracao < 650ms`) e aciona diretamente o card clicado.

### 2. Abertura do Modal de Configuração do Momento Litúrgico (Acervo + Upload)
- **Ação do Clique:** Ao clicar na capa do álbum ativo no carrossel, o player agora invoca `onAbrirUpload()` (`ModalComporMomento`), abrindo a interface completa para buscar músicas no acervo existente com pré-escuta de áudio e vinculação direta ao momento ou realizar novos uploads/vídeos do YouTube.
- **Clique em Álbuns Vizinhos:** Se o clique ocorrer em uma capa vizinha, o carrossel gira e centraliza aquele momento.

---

## [28 de Outubro de 2026 - Manhã (Remoção Estrito Rito, Display Expandido & Navegação por Cliques no Braço)] - Refinamento de UX do Player H-33
**Módulo:** `Player UX Vitrola H-33` / `Painel do Deck` / `Controles do Tonearm` / `Display de Informações`

### 1. Remoção do Badge "Estrito Rito" e Expansão do Display LED
- **Supressão do Elemento:** Removido o badge estático `[ ● ESTRITO RITO ]` do cabeçalho do deck da vitrola.
- **Ampliação do Display Digital:** Com a liberação do espaço horizontal, o visor digital de informações passou a ocupar `flex-1` integralmente, aumentando os paddings (`px-3 py-1.5`), as fontes de leitura (`TEMPO`, título da faixa e artista) e o tamanho do bargraph estéreo VU meter (`w-20 sm:w-24`, barras mais visíveis de `2.5px`).

### 2. Navegação de Faixas por Cliques no Braço da Vitrola
- **Substituição do Gesto de Arrasto:** Eliminada a complexidade de arrastar o braço, substituindo-a por gestos intuitivos de clique sobre a área do cabeçote/agulha:
  - **1 Clique (Simples):** Avança circularmente para a próxima faixa do momento litúrgico (`onTrocarFaixa(proxima, true)` + `feedbackTatil.clique()`).
  - **2 Cliques (Duplo Clique dentro de 260ms):** Retrocede circularmente para a faixa anterior (`onTrocarFaixa(anterior, true)` + `feedbackTatil.acaoForte()`).
- **Transição Angular Fluida:** A posição do braço no disco é recalculada automaticamente e transiciona suavemente (`cubic-bezier`) para o novo ângulo da faixa selecionada.

---

## [28 de Outubro de 2026 - Manhã (Restauração do Braço Reto & Calibração Exata na Borda Externa)] - Correção Geométrica do Tonearm Precision
**Módulo:** `Player UX Vitrola H-33` / `Tonearm Precision` / `Geometria e Alinhamento`

### 1. Visibilidade e Renderização da Haste Reta Nobre (SVG userSpaceOnUse)
- **Correção da Visibilidade do Tubo:** Resolvido o bug de renderização no SVG onde linhas com largura zero falhavam na aplicação do gradiente linear com `objectBoundingBox`. O gradiente agora utiliza `gradientUnits="userSpaceOnUse"`, garantindo visibilidade total, além de filete interno de reflexo especular de alta relojoaria.
- **Haste Reta Audiófila:** Traçado estritamente reto em latão usinado (`M 58 22 L 58 148 L 54 158`), eliminando a curvatura excessiva anterior.
- **Suporte de Descanso (`Tonearm Rest Clip`):** Alinhado perfeitamente sob o eixo vertical da haste (`X = 52px`, centro em 58px) a 0° no descanso do chassi.

### 2. Calibração Angular Cirúrgica na Borda Externa do Vinil (22° a 38°)
- **Cálculo Preciso sobre os Pixels da Interface:**
  - **Repouso (0°):** Braço estritamente na vertical sobre o clip de descanso lateral fora do disco (`distância = 143px`).
  - **Play Inicial (22°):** Ao iniciar o play (00:01), o braço avança 22°, posicionando a cápsula e agulha exatamente na **borda externa** (sulco de entrada do vinil, `distância = 87.3px`, no diâmetro externo de 93px).
  - **Fim da Reprodução (38°):** Percorre gradualmente toda a superfície das faixas até 38° (`distância = 53.3px`), rente ao selo litúrgico central sem invadi-lo.
  - **Arrasto Manual Proporcional:** Intervalo de 22° a 38° mapeado para seleção de faixas, com retorno ao repouso se solto abaixo de 15°.

---

## [27 de Outubro de 2026 - Noite (Arrasto do Braço para Troca de Faixas & Vinil 1800ms)] - Interação Audiófila Tátil no Tonearm e Rotação Dinâmica do Vinil
**Módulo:** `Player UX Vitrola H-33` / `Interação Tátil Audiófila` / `Gestos Pointer` / `Animação Hi-Fi`

### 1. Troca de Faixas por Movimento de Arrasto do Braço da Vitrola
- **Interação Natural com Pointer Events:** Implementada área de toque com hitbox ergonômica (`w-14 h-16`) sobre a cápsula/agulha do braço.
- **Rastreio Angular em Tempo Real:** Durante o arrasto com o dedo ou mouse, o braço calcula $\theta = \arctan2(-dx, dy)$ relativo ao pivô do gimbal (`X = 58px, Y = 22px`), seguindo o toque com latência zero (`transition: none`).
- **Tooltip Audiófilo e Feedback no Visor:** Enquanto arrasta sobre o disco, exibe um badge flutuante translúcido dourado com o número e título da faixa apontada, acompanhado de feedback háptico suave (`acaoSuave()`) a cada transição de sulco.
- **Assentamento da Agulha:** Ao soltar sobre uma região do disco, troca instantaneamente para a faixa apontada e inicia a reprodução (`onTrocarFaixa(faixaAlvo, true)` + `acaoForte()`), com transição suave (`cubic-bezier`).
- **Suporte de Descanso e Gestos Rápidos (Flick):**
  - Se arrastado de volta ao descanso (< 22°), o braço pousa no suporte e pausa a reprodução.
  - Se sofrer flick expressivo para a esquerda ou direita, avança para a próxima faixa ou retrocede para a anterior.

### 2. Calibração da Rotação do Vinil para 1800ms por Volta
- **Velocidade Apropriada para Dispositivos Móveis:** O tempo da animação `@keyframes vinylSpin` foi ajustado de 14s para **1800ms (1.8s)** por rotação em `frontend/src/index.css` e no protótipo HTML, conferindo o dinamismo e a energia visual consagrada de um toca-discos real operando em rotação litúrgica.

---

## [27 de Outubro de 2026 - Noite (Calibração Geométrica do Braço H-33)] - Reconstrução do Tonearm Precision: Eliminação de Peças Desalinhadas e Amplitude Estendida para o Vinil
**Módulo:** `Player UX Vitrola H-33` / `Mecânica Audiófila` / `Tonearm Precision` / `Animação & Geometria`

### 1. Reconstrução Unificada do Conjunto do Braço (Tonearm Assembly)
- **Eliminação de Peças Desalinhadas:** Removido o retângulo solto de anti-skating que se projetava para fora do gimbal e o centro tipo "menos", substituindo-os por um mancal de alta relojoaria torneado em latão com aro de graduação usinado e pivô com rolamento de esferas chanfrado.
- **Suporte de Descanso Fixo no Chassi (`Tonearm Rest Clip`):** Adicionado suporte fixo na lateral direita onde o braço repousa com segurança a 0° quando a reprodução está parada ou o momento não possui álbum.
- **Centro de Rotação Coincidente:** Todo o conjunto (mancal do rolamento, contrapeso traseiro balanceado, haste em S e cápsula fonocaptora) pivota solidariamente em torno do eixo exato do rolamento central (`X = 58px, Y = 22px`), erradicando qualquer desalinhamento durante o movimento.

### 2. Correção da Amplitude Angular da Animação (+22°)
- **Problema Diagnosticado:** O braço estava restrito à faixa de 14° a 17.8°, parando cerca de 26px antes da borda externa do disco de vinil.
- **Calibração Realista (+22°):**
  - **Repouso (0°):** Travado no suporte de descanso fora do prato.
  - **Execução Ativa (36° a 53°):** Ao iniciar a faixa, o braço avança +22° (36°), pousando a agulha com precisão cirúrgica na primeira ranhura externa do disco de vinil; desliza gradualmente ao longo da música até 53° (última ranhura próxima ao selo litúrgico central).
  - **Pausa sem Recuo:** Ao pausar a reprodução, o braço mantém a agulha na ranhura exata da música atual, retornando ao suporte apenas se a faixa for resetada a 0% ou o momento não tiver faixas.

---

## [27 de Outubro de 2026 - Noite (Aprimoramento Stitch)] - Integração Fiel dos Elementos Visuais Stitch: Capas com Moldura Dupla Dourada, Vinil Hi-Fi e Braço de Latão Nobre
**Módulo:** `Player UX Vitrola H-33` / `Design Stitch` / `Acervo & Capas` / `Vinil & Braço Mecânico`

### 1. Capas dos Álbuns (Box 1) - Estética Cerimonial e Moldura Dupla Dourada
- **Moldura Ornamental Nobre:** Inclusão de dupla moldura interna com filete dourado contínuo (`border-[#DDB96B]/40`) e filete dourado tracejado (`border-dashed border-[#DDB96B]/25`), mantendo formato rigorosamente quadrado (cantos retos, `rounded-none` e `borderRadius: 0`).
- **Novo Emblema Maçônico Vetorial Stitch:** Medalhão circular com fundo escurecido e sombra interna (`shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)]`), contendo o Esquadro facetado em dupla tonalidade metálica (`#EED184` e `#AB7F28`) com o Compasso e a letra 'G' central em ouro brilhante (`#FDF3D7`) com efeito `drop-shadow`.
- **Tipografia Solene:** Título do momento em Cinzel dourado e subtítulo das faixas em *Cormorant Garamond* itálico (`font-serif italic text-[#DDB96B] tracking-widest`).
- **Gradientes Soberanos Stitch:** Bordô nobre para o Rito Brasileiro (`linear-gradient(135deg, #460811, #2d060c, #120306)`) e Obsidian/Midnight para os demais ritos.

### 2. Disco de Vinil - Ranhuras Acústicas Hi-Fi Realistas (`.vinyl-grooves`)
- **Textura Hi-Fi:** Aplicação de textura com múltiplos anéis de ranhura concêntrica em gradiente radial e brilho cônico multiangular de 45° a 360°, conferindo acabamento de vinil audiófilo master.
- **Anéis Metálicos de Borda:** Duplo aro sutil de chanfro e profundidade (`border-neutral-700/60` e `border-neutral-800/80`).
- **Selo Central Nobre:** Fundo em gradiente suave com tipografia `H • 33`, nome do momento e rito, mais furo do spindle central usinado em latão e núcleo escuro.
- **Rotação Fluida:** Animação suave `spin-slow` (14s por volta) pausando no estado inativo.

### 3. Braço Fonocaptor Mecânico Stitch (Tonearm System)
- **Gimbal Base de Latão:** Pivô circular em gradiente radial metálico (`brass-knob`), parafuso central chanfrado e contrapeso anti-skating lateral usinado.
- **Tubo em S Curvado com Gradiente Dourado:** Renderização em SVG com `url(#brassGradientStitch)` (`#FFF0B3` via `#D4AF37` a `#805A17`) e sombra de projeção 3D profunda.
- **Cápsula e Agulha Stylus:** Cabeçote de precisão escuro chanfrado com filete em ouro e ponto luminoso indicador de leitura em âmbar (`#ffb938`).
- **Articulação Dinâmica:** Rotação suave baseada no centro do gimbal (`transform-origin: 20px 0px`), avançando sobre as ranhuras do disco conforme a trilha é executada.

### 4. Chassis da Vitrola e Fader Stitch
- **Moldura Chanfrada no Deck:** Borda interna sutil em ouro nobre (`border-[#DDB96B]/20`) no container da vitrola.
- **Fader com Thumb de Lingote de Ouro:** Estilização `.fader-volume-stitch` com marcador de metal chanfrado e marcações de escala litúrgica `0`, `PP (Sórdida)`, `MP`, `MF (Plena)`, `100`.
- **Pílula de Controle:** Botão central Play/Pause com aro de latão chanfrado de 3 níveis (`#fcedaf` / `#caa037` / `#735012`), inner bezel escuro e halo ambiental de brilho dourado.

---

## [27 de Outubro de 2026 - Noite] - Redesign da Vitrola H-33: 1 Momento = 1 Álbum LP (65% do Box), Prato Vazio sem Disco e Supressão de Controles Redundantes
**Módulo:** `Player Litúrgico H-33` / `Carrossel 3D de Álbuns` / `Controles Táteis` / `Qualidade & Codificação`

### 1. Acervo Litúrgico (Box 1) - Capas de Álbuns a 65% do Box
- **Dimensionamento Proporcional Dinâmico:** Cada momento litúrgico é representado visualmente por um álbum LP de capa quadrada (`rounded-none`), com largura e altura calculadas rigorosamente como **65% da largura do box** container (`tamanhoCapa = Math.round(larguraBox * 0.65)`).
- **Projeção Tridimensional Fluida:** O passo horizontal do carrossel 3D e as translações em `geometria.ts` adaptam-se dinamicamente ao tamanho da capa.
- **Regra de Cores Litúrgicas do Rito:**
  - **Rito Brasileiro:** Capas com gradiente nobre Bordô Litúrgico (`#5A0A18` via `#38050D` para `#1C0206`).
  - **Demais Ritos:** Azul Noturno Soberano (*Deep Blue Sovereign*, `#0E1C36` para `#070F1E`).
  - **Sem Bordas Douradas:** Estritamente sem bordas douradas externas nas capas dos álbuns.
- **Micro-layout Interno Nobre:** Top bar com dinâmica (`pp • SURDINA` ou `mf • FORTE`), brasão central com Esquadro & Compasso e 'G' em ouro maçônico, e rodapé com nome do momento e contagem de faixas LP.

### 2. Vitrola H-33 Deck (Box 2) - Regra do Prato Vazio e Controles Audiófilos
- **Prato Vazio sem Vinil:** Se um momento litúrgico não possui trilhas/álbum cadastrado (`candidatas.length === 0`), a vitrola **não exibe o disco de vinil**, apresentando o slipmat/feltro de borracha concêntrico mecânico com atalho estilizado "+ Compor".
- **Braço Audiófilo Precision:** Em repouso total travado em 0° no suporte quando não há álbum ou a reprodução está parada; acopla no disco apenas quando houver faixa em execução.
- **Display LED Digital Integrado:** Exibe o tempo decorrido, VU meter estéreo e trilha ativa (`TRK --: Nenhum álbum neste momento litúrgico` no caso de momento vazio).
- **Fader com Entalhes Gravados:** Controle de volume linear com escala entalhada em `0`, `pp` (28%), `mp` (60%) e `100`.

### 3. Vão Central e Supressão de Elementos Redundantes
- **Indicador do Vão Central:** Barra de progresso dos álbuns com largura contida (`max-w-[280px] self-center`), eliminando espaço morto entre os dois boxes e sem transbordar da tela.
- **Supressão Total dos Botões Redundantes:** Removida a barra de progresso (seekbar) duplicada e a linha inferior de botões extras (`Orientação`, `Surdina`, `Próximo?`, `100%`) de `MasonicControls.tsx`. A área inferior exibe unicamente a pílula ergonômica de controle litúrgico (`MOMENTO` / `FAIXA` / `Play-Pause 76x76` / `FAIXA` / `MOMENTO`).
- **Cabeçalho Unificado:** Menu sanduíche à esquerda, título da sessão centralizado em fonte Cinzel dourada e espaçador de equilíbrio à direita.

### 4. Correção Global de Codificação UTF-8
- **Resolução de Erro de Customização Antigravity:** Identificado e corrigido byte `0xE7` não-UTF8 (codificação Windows-1252 / ANSI) em `.agent/rules/GEMINI.md`, convertendo o arquivo para UTF-8 estrito sem BOM e sanando o aviso `file is not valid utf8`.

---

## [27 de Outubro de 2026] - Classificação Litúrgica por Estilo, Subclassificação de Surdina (Geral/Ambiente), Curadoria Multi-Momentos SuperAdmin e Novo Lobby do Player
**Módulo:** `Classificação Musical` / `Curadoria SuperAdmin` / `Player UX & Carrossel` / `Lobby Litúrgico`

### 1. Sistema de Estilos e Subclassificação Funcional
- **Taxonomia Litúrgica e Golden Enums (`backend/nucleo/constantes.py`):**
  - Estilos: `UNIVERSAL` (padrão retrocompatível inclusivo), `CLASSICA`, `VIOLAO`, `SOUNDTRACKS`, `POPULAR`.
  - Subclassificações: `GERAL` (peças plenas) e `AMBIENTE` (peças suaves para momentos de surdina sem sobressaltos).
- **Modelagem de Dados & Self-Healing Migration:**
  - Colunas `estilo` e `subclassificacao` indexadas em `acervo_musicas`, com autocorreção no startup (`sincronizacao_tenant.py`).
- **Regra de Inclusão Matemática no Player:**
  - O filtro de estilo compõe `{Estilo Selecionado} ∪ {Universal}`, assegurando que momentos sem faixas dedicadas nunca fiquem mudos.
  - Momentos com `em_surdina = True` priorizam automaticamente faixas com subclassificação `AMBIENTE` (ou `surdina = True`), com fallback para `GERAL`.

### 2. Interface de Curadoria do SuperAdmin (`PaginaCuradoriaMusicasAdmin.tsx`)
- Tabela de gestão de alta densidade visual com reprodução de pré-escuta integrada (`AudioPlayer`).
- **Designação Multi-Momentos:** Tags dinâmicas conectadas a `MusicaEventoSugerido` e `MomentoCanonico`, permitindo designar uma mesma faixa para múltiplos momentos (ex.: Tronco de Beneficência, Aclamação).
- **Ações em Lote:** Seleção múltipla com aplicação em massa de estilo, subclassificação e adição de momentos.
- Proteção RBAC estrita via `exigir_super_admin` e rotas dedicadas em `/api/v1/admin/musicas/*`.

### 3. Novo Lobby Litúrgico e Eliminação do Dropdown no Player (`PaginaPrepararSessao.tsx`)
- **Lobby Ritualístico:** Página receptiva em 2 passos antes de entrar no templo:
  1. Escolha do Tipo de Sessão da Loja.
  2. Escolha do Estilo Musical (cards táteis com iconografia, temas e clima da sessão).
  3. Resumo da esteira e botão hero *Iniciar Harmonia no Templo*.
- **Eliminação do Dropdown Legado:** Removido o `<select>` de troca de sessão do topo do Player, substituído por chip informativo fixo (`🏛️ Sessão Ordinária • Estilo Violão`) e botão seguro "Trocar Sessão".
- **Redirecionamento Automático:** Acessos diretos a `/player` sem sessão definida redirecionam suavemente para o Lobby.

### 4. Correções de Sensibilidade e Despoluição Visual no Player
- **Travamento do Carrossel:** Limitado `useGestoPalco.ts` para transição estrita de 1 momento por swipe horizontal (`MAX_PASSOS_X = 1`), eliminando o pulo indevido de momentos (1 para 3).
- **Eliminação de Informações Duplicadas:** Removida a informação repetida de volume do card da música (o volume mestre é controlado na barra inferior).
- **Ícone Dinâmico Amarelo de Surdina:** A tag de texto `SURDINA` sobreposta foi substituída por um botão circular sutil com ícone `Volume1` pulsante em âmbar/dourado, clicável para abrir as configurações e calibragem de surdina.

### 5. Redesign do Card Litúrgico & Marquee Inteligente (`TextoMarquee.tsx`)
- **Marquee Inteligente em Vaivém (Ping-Pong):** Criação do componente `TextoMarquee.tsx` para o título do momento e da faixa musical. Títulos curtos permanecem fixos; títulos longos deslizam suavemente com pausas de leitura nas pontas, eliminando qualquer truncamento no templo.
- **Estrutura Nobre Fiel ao Mockup:**
  - Canto superior esquerdo: botão de `SlidersHorizontal` dourado para calibragem de surdina.
  - Canto superior direito: botão de `Star` (preferência).
  - Centro: vitrola com disco concêntrico e braço mecânico de reprodução.
  - Base do card: pílula de volume `[ 🔊 X% ]`, equalizador espectral multicolorido animado e selo clássico de dinâmica litúrgica: **`pp`** (*pianissimo*) para faixas Ambiente/Surdina e **`mf`** (*mezzo-forte*) para dinâmicas gerais.
  - Rodapé da moldura: botão circular `+` dourado centralizado para compor/adicionar faixas.

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

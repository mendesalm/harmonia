# Harmonia - Guia de Handoff e Inicialização

**Última Atualização:** 27 de Outubro de 2026 (Calibração Geométrica do Braço da Vitrola H-33)  
**Status da Sessão:** 🟢 **Concluído, Validado e Sincronizado (Build Frontend OK + 32 testes Pytest passando 100%)** — Réplica Fiel e Correção de Amplitude do Braço da Vitrola:
- Box 1 (Acervo Litúrgico): Capas dos álbuns com formato rigorosamente quadrado (cantos retos vivos, `borderRadius: 0` e `rounded-none`), moldura ornamental dupla dourada contínua e tracejada (`border-[#DDB96B]/40` e `border-dashed border-[#DDB96B]/25` ambos `rounded-none`), medalhão circular com Esquadro facetado e Compasso em ouro (`#FDF3D7`), tipografia cerimonial com Cinzel e Cormorant Garamond itálico, dimensionadas dinamicamente a 65% da largura do box container (`Math.round(larguraBox * 0.65)`).
- Regra de Cores Litúrgicas do Rito: Bordô nobre Stitch (`#460811` via `#2d060c` a `#120306`) exclusivo para o Rito Brasileiro; Obsidian/Midnight (`#0e1624` via `#0b111a` a `#070a10`) para os demais ritos.
- Box 2 (Vitrola H-33 Deck):
  - Disco de Vinil: Textura hi-fi realista de ranhuras (`.vinyl-grooves`), anéis chanfrados de borda, selo central com furo usinado de spindle e rotação suave `spin-slow` (14s/volta).
  - Braço Mecânico Audiófilo Precision Unificado:
    - Reconstrução da montagem mecânica eliminando peças soltas e desalinhamentos: mancal torneado com anel de graduação em latão usinado, pivô central com gema/rolamento de alta relojoaria, contrapeso traseiro balanceado e suporte de descanso fixo no chassi (`Tonearm Rest Clip`).
    - Haste contínua em S de latão (`strokeWidth="3.4"`, gradiente dourado metálico) nascendo com precisão do centro do rolamento (`X = 58px, Y = 22px`).
    - Correção de Amplitude Angular (+22°): Repouso em 0° no suporte de descanso fora do prato; em execução ativa, avança para 36° (pousando na primeira ranhura da borda externa do vinil) e desliza suavemente até 53° (ranhura final junto ao selo litúrgico central), sem retornar abruptamente no pause.
  - Platter Well rebaixado em preto abissal profundo (`shadow-[inset_0_4px_16px_rgba(0,0,0,0.95)]`).
  - Lâmpada de status litúrgico com luz verde estroboscópica `ESTRITO RITO`.
  - Fader de Volume: Thumb metálico de lingote de ouro chanfrado (`.fader-volume-stitch`) com escala gravada litúrgica `0`, `PP (Sórdida)`, `MP`, `MF (Plena)`, `100`.
- Vão Central & Supressão de Redundâncias: Indicador de progresso centralizado contido (`max-w-[280px] self-center`); supressão completa da seekbar duplicada e dos botões redundantes.
- Pílula de Controles: Botão central circular Play/Pause com aro de latão chanfrado de 3 níveis, inner bezel escuro e halo ambiental de brilho dourado.
- Auditoria de Integridade e Animações: Carrossel 3D testado e validado (gestos de arrasto por ponteiro com inércia, travamento elástico de limites e troca suave de momento/álbum intactos); animações de rotação contínua de vinil (`spin-slow` com pausa limpa), articulação angular do braço mecânico e VU meter multicolorido 100% operacionais.

---

## 🏛️ Estrutura do Projeto

```
Harmonia/
├── backend/
│   ├── api/
│   │   ├── admin/               # Administração Global (Ritos, Momentos Canônicos, Estatísticas)
│   │   ├── eventos/             # Momentos Litúrgicos / Playlists (filtrados por Rito e equivalência canônica)
│   │   ├── sessoes/             # Sessões e Sequenciamento Ordenado (/sessoes/loja/{id} e /sessoes)
│   │   ├── musicas/             # Upload MP3/WAV, Conversor YouTube 320kbps e Links de Streaming
│   │   └── player/              # Player Ritualístico com Sorteio Randômico e Esteira Sequencial
│   ├── nucleo/
│   │   ├── auth_esigma.py       # Introspecção de Token Bearer contra GET /api/v1/auth/validate do e-Sigma
│   │   ├── dependencias.py      # Guards RBAC (verificar_assinatura_ativa, exigir_super_admin)
│   │   ├── sincronizacao_tenant.py # Self-Healing de Organizações, UUID e Rito Brasileiro
│   │   ├── banco.py             # Conexão Async PostgreSQL (SQLAlchemy + asyncpg)
│   │   ├── seguranca.py         # Criptografia bcrypt
│   │   ├── configuracoes.py     # Pydantic Settings (sem segredos hardcoded)
│   │   ├── formatadores.py      # Title Casing inteligente em PT-BR
│   │   └── armazenamento.py     # File System Multi-Tenant isolado por slug
│   ├── testes/
│   │   ├── test_auth_rbac.py    # Testes Pytest de Segurança SSO, Assinatura SaaS e RBAC
│   │   └── test_api.py          # Testes Pytest de Integração (Loja 2181, Rito Brasileiro, Eventos, Player)
│   ├── inicializar_banco.py     # Criação de tabelas e seed inicial (UUID sincronizado)
│   ├── main.py                  # Servidor FastAPI com Lifespan, /api/v1/auth/me e /api/v1/organizacoes
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── modulos/
│   │   │   ├── auth/            # Página de Login SSO (e-mail da estação, CIM ou CPF)
│   │   │   ├── dashboard/       # Console de Harmonia Mobile-First
│   │   │   ├── player/          # Player Ritualístico Responsivo (Timeline, TrackList, Controls, Modal)
│   │   │   ├── sessoes/         # Gestão de Sessões e Esteiras
│   │   │   ├── eventos/         # Catálogo de Momentos Ritualísticos (sem duplicatas entre ritos)
│   │   │   ├── musicas/         # Acervo (Cards Mobile + Tabela Desktop), Upload e Conversão YouTube
│   │   │   └── admin/           # Painel SuperAdmin (Ritos, Momentos Globais, Lojas Cadastradas)
│   │   ├── compartilhado/
│   │   │   ├── componentes/     # Navbar Responsiva (Top Header + Bottom Bar Mobile)
│   │   │   ├── contextos/       # ContextoAutenticacao e ContextoTenant (preservação de rito_padrao)
│   │   │   ├── api/             # clienteHttp Axios (/api/v1 com Bearer Token)
│   │   │   └── tipos/           # Interfaces TypeScript
│   ├── public/
│   │   ├── manifest.json        # Manifesto PWA Mobile
│   │   └── icone-harmonia.svg   # Ícone Vetorial Válido
│   ├── tailwind.config.js       # Tokens macaonico.*, primaria.*, cinzel e inter
│   └── vite.config.ts           # Vite + PWA Workbox (skipWaiting & clientsClaim)
├── historico_implementacao.md   # Changelog Global
└── handoff.md                   # Este documento
```

---

## 🎯 Resumo do que foi Concluído nesta Sessão (20/10/2026)

1. **Fase 1 — Alinhamento de Segurança SSO/RBAC (`AGENTS.md`)**:
   - Removido segredo JWT hardcoded de `backend/nucleo/configuracoes.py`.
   - Criado `backend/nucleo/dependencias.py` com `obter_usuario_logado`, `verificar_assinatura_ativa` e `exigir_super_admin`, validando tokens exclusivamente via `GET /api/v1/auth/validate` do `e-Sigma`.
   - Protegidas todas as rotas de `eventos`, `sessoes`, `musicas`, `player` e `admin`.
   - Substituído `axios` puro por `clienteHttp` em `ModalUploadMusica.tsx` e adicionada rota `GET /api/v1/auth/me` no backend do Harmonia.

2. **Acesso da Loja 2181, Login por CIM (`272875`) e Auto-Provisionamento SaaS no e-Sigma**:
   - Sincronizado o UUID da **ARLS João Pedro Junqueira nº 2181** (`795b19d5-e14c-4c2e-b047-ee99e6e39a9c`) entre `e-Sigma` e `Harmonia`.
   - Configurado `_resolver_loja_id_usuario` no `e-Sigma` para priorizar a organização com módulo `harmonia` ativo quando o obreiro (ex.: CIM `272875`) possui múltiplos vínculos.
   - Implementados no `e-Sigma` os endpoints `POST /api/v1/organizacoes/{id}/harmonia/ativar` (auto-provisiona `loja{numero}@harmonia.e-sigma.app`, ativa assinatura SaaS e envia senha por e-mail) e `POST /api/v1/organizacoes/{id}/harmonia/reenviar-senha`, além de botões dedicados no painel de Organizações do `e-Sigma`.

3. **Reestruturação Responsiva Mobile-First & PWA**:
   - Adicionadas paletas `macaonico.*` e `primaria.*` no `tailwind.config.js` (que antes estavam ausentes e deixavam fundos e botões transparentes).
   - App Shell em `100dvh`, `Navbar.tsx` adaptativa para celulares, `PaginaDashboard.tsx` com CTA no topo, `PaginaPlayerHarmonia.tsx` compacta para operação com uma mão em templo, e cards mobile em `PaginaMusicas.tsx`, `PaginaLojasAdmin.tsx` e `PaginaEventosAdmin.tsx`.
   - Corrigido XML do `icone-harmonia.svg`, blindado `GoogleOAuthProvider` quando `VITE_GOOGLE_CLIENT_ID` não estiver configurado e ativados `skipWaiting` / `clientsClaim` no Service Worker.

4. **Desduplicação de Momentos Ritualísticos e Sincronização do Rito Brasileiro**:
   - Filtragem de momentos por `rito_id` da Loja ativa e consolidação por `canonico_id` em `backend/api/eventos/servicos.py` e `backend/api/musicas/rotas.py`, eliminando momentos duplicados entre Rito Brasileiro e REAA.
   - Criado `backend/nucleo/sincronizacao_tenant.py` (executado no `lifespan` do FastAPI e nas consultas de tenant) para garantir que a Loja 2181 em produção migre qualquer registro legado para o UUID `795b19d5-e14c-4c2e-b047-ee99e6e39a9c` com **Rito Brasileiro** e Sessão Ordinária instanciada.
   - Normalização de `rito_padrao` e `rito_id` no `ContextoTenant.tsx` e `PaginaDashboard.tsx`.

5. **Redesign Litúrgico do Player e Otimizações de Áudio (26/10/2026)**:
   - **Paleta Nobre e-Sigma:** Substituição completa do tom ciano/neon por Azul Noturno (`#070F1E` / `#0A1428` / `#0E1A2F`), Dourado Maçônico (`#DDB96B`) e Slate discreto, eliminando fadiga visual no templo.
   - **Surdina por Momento Ritualístico:** Persistência no banco (`SessaoLojaEvento.em_surdina`) com endpoint `PATCH /api/v1/player/sessao/{sessao_id}/momento/{evento_id}/surdina`, permitindo definir momentos específicos como surdina (ex: Palavra a Bem da Ordem).
   - **Normalizador de Áudio (Web Audio API):** `DynamicsCompressorNode` acoplado ao elemento de áudio com rampa linear (`linearRampToValueAtTime`) de 40ms no `GainNode`, eliminando oscilações e nivelando faixas de diferentes origens.
   - **Visibilidade do Carrossel:** Redução da largura do card central (`258px`), passo horizontal (`182px`) e opacidade dos vizinhos (`0.75`), tornando os cards anterior e seguinte claramente perceptíveis nas bordas da tela.
   - **Controles e Layout:** Reposicionamento do menu sanduíche para o cabeçalho superior direito (desafogando o botão de Orientação Litúrgica), adição de botões de ajuste fino de volume na barra de controle e indicador de volume de execução direto no card da faixa.
   - **Resiliência e Correção VPS:** Resolução do `ReferenceError: audioRef is not defined` e encapsulamento no `ErrorBoundary`.

6. **Restauração dos Controles de Navegação e Composição por Acervo Existente (26/10/2026)**:
   - **Restauração da Barra de Controle:** Retorno aos 5 botões táteis no player: Momento Anterior (`Rewind`), Faixa Anterior (`SkipBack`), Play/Pause circular central (76x76px), Próxima Faixa (`SkipForward`) e Próximo Momento (`FastForward`).
   - **Controle Deslizante de Volume:** Mantido e acessível pelo botão compacto `Vol: X%` na linha de apoio, abrindo popover com slider contínuo de 0% a 100%.
   - **Composição de Momentos com Músicas do Acervo (`ModalComporMomento.tsx`):**
     - Busca em tempo real por título e artista no acervo já salvo.
     - Pré-escuta de áudio (preview) antes de vincular.
     - Vinculação instantânea (`POST /api/v1/eventos/{evento_id}/musicas/{musica_id}`) e desvinculação (`DELETE /api/v1/eventos/{evento_id}/musicas/{musica_id}`).
     - Atualização automática da esteira da sessão ativa no player (`preferida=true`).
     - Aba integrada "Nova Música" para uploads e conversor do YouTube quando necessário.

---

## 🎯 Resumo do que foi Concluído nesta Sessão (27/10/2026)

1. **Correções Imediatas de Usabilidade e Estabilidade no Player**:
   - **Travamento do Carrossel Horizontal:** No hook `useGestoPalco.ts`, calibrada a transição para estritamente 1 momento ritualístico por gesto (`MAX_PASSOS_X = 1`, `INERCIA_X_MS = 60`), eliminando o pulo indevido de momentos (1 para o 3) no celular ou mouse.
   - **Despoluição Visual do Card:** Removida a informação redundante de volume de execução do card da música (o controle de volume já existe na barra inferior).
   - **Ícone Dinâmico Amarelo de Surdina:** A tag de texto `SURDINA` que se sobrepunha ao braço da vitrola e metadados foi substituída por um botão circular sutil com ícone `Volume1` âmbar/dourado pulsante, clicável para abrir diretamente o modal de calibragem de surdina e volume.

2. **Mecanismo de Classificação de Músicas por Estilo e Subclassificação**:
   - **Modelagem de Dados & Self-Healing Migration:** Adicionadas as colunas `estilo` (padrão `UNIVERSAL`) e `subclassificacao` (padrão `GERAL`) na tabela `acervo_musicas`, com índices dedicados e autocorreção no lifespan.
   - **Constantes Padronizadas:** Criado `backend/nucleo/constantes.py` com `EstiloMusica` (`UNIVERSAL`, `CLASSICA`, `VIOLAO`, `SOUNDTRACKS`, `POPULAR`) e `SubclassificacaoMusica` (`GERAL`, `AMBIENTE`).
   - **Regra de Inclusão no Player:** O acervo da sessão é filtrado por `{Estilo Selecionado} ∪ {Universal}`, assegurando que momentos sem faixas exclusivas continuem sempre respaldados por faixas Universais.
   - **Priorização de Surdina:** Em momentos ritualísticos com `em_surdina = True`, o algoritmo de sorteio prioriza automaticamente faixas com subclassificação `AMBIENTE` (ou `surdina = True`), com fallback inteligente para `GERAL`.

3. **Painel SuperAdmin de Curadoria Global de Músicas (`PaginaCuradoriaMusicasAdmin.tsx`)**:
   - Tabela de alta fidelidade com preview de áudio integrado (`AudioPlayer`), edição inline de Estilo e Subclassificação.
   - **Designação Multi-Momentos:** Seletor de momentos ritualísticos canônicos com multi-tags removíveis (`MusicaEventoSugerido`), permitindo associar uma música a múltiplos momentos (ex: *Tronco de Beneficência*, *Aclamação*).
   - **Ações em Lote:** Seleção múltipla por checkboxes com aplicação de estilo, subclassificação e adição de momentos canônicos para dezenas de faixas de uma só vez.
   - **Segurança RBAC:** Endpoints protegidos com `exigir_super_admin`.

4. **Novo Fluxo do Mestre de Harmonia (Lobby Pré-Sessão `PaginaPrepararSessao.tsx`)**:
   - **Lobby Ritualístico:** Ao acessar o Player pelo menu ou pelo Dashboard, o Mestre de Harmonia é recepcionado por uma página dedicada em dois passos:
     1. Escolhe o Tipo de Sessão da Oficina.
     2. Escolhe o Estilo Musical desejado (cards visuais com ícones, temas e clima da sessão).
     3. Resumo da esteira e botão de ação hero *Iniciar Harmonia no Templo*.
   - **Eliminação do Dropdown no Player:** O `<select>` de troca de sessão foi completamente removido do topo do Player, eliminando riscos de toques acidentais durante a sessão no Templo.
   - Substituído por um chip informativo (`🏛️ Sessão Ordinária • Estilo Violão`) com botão de navegação segura para reconfiguração.

5. **Testes Automatizados**:
   - Criado `backend/testes/test_classificacao_estilo.py` cobrindo normalização, priorização de faixas Ambiente em surdina e fallback gracioso. Suíte total com **32 testes Pytest passando 100%**.

6. **Redesign do Card Litúrgico & Efeito Marquee Inteligente (`TextoMarquee.tsx`)**:
   - **Marquee Inteligente em Vaivém (Ping-Pong):** Componente `TextoMarquee.tsx` implementado para o título do momento litúrgico no cabeçalho e para o título da música no card. O texto permanece estático se couber na tela e desliza suavemente caso ultrapasse a largura do container, eliminando qualquer truncamento ou corte feio de palavras.
   - **Disposição Simétrica dos Quatro Cantos:**
     - Topo Esquerdo: Botão com ícone `SlidersHorizontal` dourado, abrindo as calibragens de surdina e áudio.
     - Topo Direito: Estrela de preferência (`Star`), dourada quando ativada.
     - Centro: Disco de vinil girando + braço mecânico da vitrola articulado à direita.
     - Base do Card: Linha tríplice com Pílula de Volume `[ 🔊 10% ]`, Equalizador animado multicolorido e Selo Musical Clássico de Dinâmica: **`pp`** (*pianissimo*) para faixas Ambiente/Surdina e **`mf`** (*mezzo-forte*) para dinâmicas regulares.
   - **Botão `+` Centralizado:** Botão de catalogação e adição de faixas posicionado centralizado no rodapé da moldura do momento.

7. **Correção Crítica no Dispositivo Nativo (Haptics / Vibração)**:
   - Adicionado método `acaoForte()` à API de `feedbackTatil` em `dispositivoNativo.ts` (utilizando `ImpactStyle.Heavy` do `@capacitor/haptics`), sanando o erro `ze.acaoForte is not a function` na inicialização do Player e garantindo execução 100% estável no mobile e na web.

8. **Redesign do Player Vitrola H-33 e Alinhamento Visual Fiel**:
   - **Tamanho da Capa dos Álbuns (65% do Box):** Em `PalcoCarrosseis.tsx`, a capa do álbum LP quadrado tem largura e altura calculadas em 65% da largura do box container (`Math.round(larguraBox * 0.65)`).
   - **Regra de Cores Litúrgicas do Rito:** Bordô nobre exclusivamente para o Rito Brasileiro (`#5A0A18` -> `#220308`) e Deep Blue Sovereign para os demais ritos. Bordas douradas externas suprimidas.
   - **Regra do Prato Vazio:** Quando um momento litúrgico não tem faixas (`candidatas.length === 0`), a vitrola não mostra disco de vinil; exibe o slipmat concêntrico com indicador de "+ Compor", braço travado no descanso (0°) e display LED informando `TRK --: Nenhum álbum neste momento litúrgico`.
   - **Supressão Total dos Botões Redundantes:** Removidos a seekbar inferior duplicada e a linha de botões extras (`Orientação`, `Surdina`, `Próximo?`, `100%`) em `MasonicControls.tsx`.
   - **Barra Central:** Indicador de álbuns contido em `max-w-[280px]` auto-centralizado no vão entre os dois boxes.
   - **Correção da Customização Antigravity:** Corrigida codificação ANSI/Windows-1252 em `.agent/rules/GEMINI.md` para UTF-8 válido.

---

## 🧪 Como Executar e Testar Localmente

```powershell
# Rodar suíte de testes automatizados (32 testes passando)
& "C:\Users\engan\Desktop\Harmonia\venv\Scripts\pytest.exe" "C:\Users\engan\Desktop\Harmonia\backend\testes" -q

# Build de validação do Frontend + PWA
cd frontend
npm run build
```

---

## 📋 Próximos Passos (Para a Próxima Sessão)

1. **Validação em Uso Real no Templo (Loja 2181)**:
   - Testar a adição de músicas locais/YouTube aos momentos da *Minha Sessão Ordinária* do Rito Brasileiro e condução completa pelo Player Ritualístico no celular/tablet.
2. **Fase 2 de Evolução do Harmonia**:
   - Permitir importação rápida de novos templates de sessão do Rito Brasileiro (Sessão Magna de Iniciação, Elevação, Exaltação) diretamente pela tela de Sessões da Loja.
   - Refinar controles de *Fade In / Fade Out* configuráveis por momento ritualístico.

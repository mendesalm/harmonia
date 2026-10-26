# Harmonia - Guia de Handoff e Inicialização

**Última Atualização:** 26 de Outubro de 2026  
**Status da Sessão:** 🟢 **Produção Ativa e Sincronizada (`https://harmonia.e-sigma.app`)** — Redesign do Player Litúrgico com Paleta Nobre e-Sigma (Preto, Azul Noturno e Dourado), Persistência de Surdina por Momento Ritualístico, Normalizador Web Audio API contra Oscilações, Carrossel Horizontal com Visibilidade Periférica, Menu Sanduíche no Topo e Correção de Inicialização na VPS concluídos e publicados.

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

## 🧪 Como Executar e Testar Localmente

```powershell
# Rodar suíte de testes automatizados (29 testes passando)
.\venv\Scripts\pytest.exe backend/testes -q

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

# Harmonia - Guia de Handoff e Inicialização

Bem-vindo ao **Harmonia v2.0**, o ecossistema de gerenciamento de acervo musical e player ritualístico para Mestres de Harmonia de Lojas Maçônicas.

---

## 🏛️ Estrutura do Projeto

```
Harmonia/
├── backend/
│   ├── api/
│   │   ├── auth/                # Autenticação JWT, Troca de Senha e Validação SaaS
│   │   ├── organizacoes/        # CRUD de Lojas, Assinaturas e Auto-provisionamento de Login
│   │   ├── eventos/             # Momentos Litúrgicos / Playlists
│   │   ├── sessoes/             # Sessões e Sequenciamento Ordenado
│   │   ├── musicas/             # Upload MP3/WAV e Streaming YouTube/Spotify
│   │   └── player/              # Player Ritualístico com Sorteio Randômico
│   ├── nucleo/
│   │   ├── banco.py             # Conexão Async PostgreSQL (SQLAlchemy)
│   │   ├── seguranca.py         # Criptografia bcrypt e JWT
│   │   ├── configuracoes.py     # Pydantic Settings
│   │   ├── formatadores.py      # Title Casing inteligente em PT-BR
│   │   └── armazenamento.py     # File System Multi-Tenant
│   ├── armazenamento/
│   │   └── instancias/
│   │       ├── public/          # Músicas e arquivos públicos por {slug}
│   │       └── private/         # Documentos e arquivos protegidos
│   ├── inicializar_banco.py     # Criação de tabelas, migração e seed inicial
│   ├── main.py                  # Servidor FastAPI com Swagger (/docs)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── modulos/
│   │   │   ├── auth/            # Página de Login (Padrão de Loja Assinante)
│   │   │   ├── player/          # Player com Carrossel e Now Playing
│   │   │   ├── sessoes/         # Gestão de Sessões e Esteiras
│   │   │   ├── eventos/         # Catálogo de Eventos / Playlists
│   │   │   └── musicas/         # Acervo, Upload e Links de Streaming
│   │   ├── compartilhado/
│   │   │   ├── componentes/     # Navbar com Modal de Alteração de Senha
│   │   │   ├── contextos/       # ContextoAutenticacao e ContextoTenant
│   │   │   ├── api/             # Axios (/api/v1 com Bearer Token)
│   │   │   └── tipos/           # TypeScript Interfaces
│   ├── public/
│   │   ├── manifest.json        # Instalação PWA Móvel
│   │   └── icone-harmonia.svg   # Ícone do App
│   ├── package.json
│   └── vite.config.ts
├── historico_implementacao.md    # Regra de Ouro: Documentação Histórica
├── handoff.md                   # Este arquivo
├── iniciar_backend.bat          # Executável para iniciar a API
└── iniciar_frontend.bat         # Executável para iniciar o Frontend
```

---

## 🔐 Credenciais Padrão de Acesso

| Usuário | E-mail Padrão da Loja | Senha Inicial | Perfil |
| :--- | :--- | :--- | :--- |
| **Loja Assinante 2181** | `loja2181@harmonia.sigma.app` | `harmonia@2026` | Mestre de Harmonia (Loja 2181) |
| **Super Administrador** | `sistema@e-sigma.app` | `harmonia@2026` | SuperAdmin Global |

> **Nota de Segurança**: A senha inicial padrão fornecida pelo sistema pode ser alterada a qualquer momento pelo usuário através do botão com ícone de chave (**Alterar Senha**) localizado na barra superior.

---

## 🚀 Como Executar o Sistema

### 1. Iniciar o Backend (FastAPI)
Dê um duplo clique no arquivo **`iniciar_backend.bat`** ou execute:

```powershell
.\venv\Scripts\python backend/main.py
```
* **Swagger Interativo**: [http://localhost:8000/docs](http://localhost:8000/docs)

### 2. Iniciar o Frontend (React + PWA)
Dê um duplo clique no arquivo **`iniciar_frontend.bat`** ou execute:

```powershell
cd frontend
npm run dev
```
* **Aplicação Web / Mobile**: [http://localhost:5173](http://localhost:5173)

### 3. Rodar Testes Automatizados
```powershell
.\venv\Scripts\pytest -v
```

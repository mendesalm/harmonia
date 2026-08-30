# 🎼 Harmonia 2.0 • Gerenciador de Acervo e Player Ritualístico Maçônico

> **Aplicativo Web & Mobile (PWA) Multi-Tenant para Mestres de Harmonia**

---

## 🏛️ Visão Geral

O **Harmonia** é uma plataforma concebida para gerenciar o acervo musical litúrgico e conduzir a trilha sonora de sessões ritualísticas maçônicas em Templo. Construído com arquitetura **Multi-Tenant (SaaS)**, permite que cada Loja Maçônica tenha seu espaço seguro e isolado, acervo próprio, personalização de ritos e esteiras ritualísticas completas.

---

## ✨ Principais Funcionalidades

* 🎛️ **Player Ritualístico do Mestre de Harmonia**:
  * **Pausa Inicial Mandatória**: Ao acessar qualquer momento litúrgico, a faixa fica engatilhada e pausada, aguardando a deixa do Venerável Mestre.
  * **Avanço Automático de Momento**: Ao término da música ativa, o sistema avança automaticamente para o próximo momento litúrgico, posicionando-o em pausa.
  * **Barra de Seleção Manual da Música**: Permite que o Mestre escolha instantaneamente qualquer faixa da playlist para aquele momento litúrgico.
  * **Fade Out Gradual**: Suavização suave de volume ao avançar de momento.
  * **Equalizador Visual**: Indicador dinâmico de reprodução no Templo.
  * **Barra de Progresso e Seek**: Rastreamento de tempo decorrido e duração total com clique interativo.
* ⚡ **Conversor Direto do YouTube para MP3 (320 kbps)**:
  * Motor integrado com `yt-dlp` e `FFmpeg` que baixa áudios do YouTube e converte para MP3 em 320 kbps, salvando no servidor da Loja para execução 100% offline.
* 📜 **Suporte Completo aos Ritos**:
  * REAA (Rito Escocês Antigo e Aceito), Rito Brasileiro, York, Moderno, Schroeder e Adonhiramita.
  * **Clonagem de Modelos de Sessão**: Duplicação rápida de esteiras litúrgicas com mudança de rito ou grau.
* 🔒 **SaaS Multi-Tenant e Autenticação JWT (Padrão Sigma)**:
  * E-mails padronizados (`loja{numero}@harmonia.sigma.app`), controle de acesso por perfis e troca de senha pelo usuário.
* 📱 **Mobile PWA First-Class**:
  * Instalável em smartphones e tablets Android e iOS sem barras de navegação (modo *standalone*).

---

## 🛠️ Stack Tecnológica

* **Backend**: Python 3.14 + FastAPI + SQLAlchemy Assíncrono (`asyncpg`) + Pydantic V2 + `yt-dlp` + `imageio-ffmpeg`
* **Banco de Dados**: PostgreSQL Remoto (`harmoniadb`)
* **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Lucide Icons + PWA
* **Testes Automatizados**: Pytest com 100% de cobertura nos fluxos principais.

---

## 🚀 Como Executar o Projeto

### 1. Backend (FastAPI)
```bash
# Ativar o ambiente virtual
.\venv\Scripts\activate

# Executar o servidor backend
uvicorn backend.main:aplicacao --reload --port 8000
```
Swagger UI disponível em: `http://localhost:8000/docs`

### 2. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
Acesse no navegador: `http://localhost:5173`

---

## 🧪 Testes Automatizados
```bash
.\venv\Scripts\pytest -v
```

---

## 📄 Licença
Propriedade do Ecossistema Sigma / Harmonia. Todos os direitos reservados.

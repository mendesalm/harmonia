# Harmonia 🎵

O **Harmonia** é o módulo especialista de Músicas Ritualísticas do Ecossistema Sigma. Ele foi desenhado para ser um aplicativo extremamente leve, focado única e exclusivamente na execução de trilhas sonoras para Lojas Maçônicas.

## 🚀 Arquitetura

Sendo um **Microserviço**, o Harmonia não lida com cobranças, faturas ou criação de lojas. Ele funciona como um aplicativo "satélite" (PWA / Web App) que recebe os usuários autenticados pelo cérebro central (e-Sigma Core).

* **Frontend:** React 18 + Vite, Tailwind CSS, Web Audio API (compressor dinâmico e ganho linear), PWA (Workbox).
* **Backend:** Python + FastAPI (Async/Await), SQLAlchemy assíncrono.
* **Banco de Dados:** PostgreSQL (`harmoniadb`) com SQLAlchemy + `asyncpg`.
* **Armazenamento de Áudio:** Servido pelo filesystem multi-tenant isolado por slug da organização ou streaming.

## 🔐 Autenticação e Single Sign-On (SSO)

O aplicativo Harmonia segue estritamente as regras inegociáveis de segurança do ecossistema e-Sigma:

1. Quando um Mestre de Harmonia faz login (via e-mail da estação, CIM ou CPF), as credenciais são autenticadas no e-Sigma IdP (`https://e-sigma.app/api/auth/login`).
2. O e-Sigma retorna o token JWT do usuário com o vínculo da Loja e módulos ativos.
3. Toda chamada protegida enviada ao backend do Harmonia passa por validação via introspecção no endpoint `GET /api/v1/auth/validate` do e-Sigma. O Harmonia **nunca** decodifica segredos JWT localmente nem aceita headers forjados pelo cliente.
4. O backend do Harmonia valida se o módulo `harmonia` está ativo na assinatura SaaS da Loja (`verificar_assinatura_ativa`) antes de autorizar a reprodução litúrgica.

## 📦 Estrutura do Projeto

* `/backend` - API FastAPI, lógica de playlists e endpoints estáticos para streaming de mp3/wav.
* `/frontend` - Interface moderna com reprodutor de áudio, lista de sugestões por momento ritualístico.
* `.github/workflows` - Scripts de Automação CI/CD.

## 🌐 Deploy (Produção VPS)

O Harmonia está em produção numa VPS Ubuntu (`69.62.89.211`).
* **Frontend:** Servido via Nginx estático (`/var/www/harmonia/frontend/dist`) no domínio `harmonia.e-sigma.app`.
* **Backend:** Rodando via Uvicorn na porta `8000` (`harmonia.service` no Systemd).
* **CI/CD:** Qualquer push aciona o Github Actions que compila o Frontend e reinicia o serviço Systemd automaticamente na VPS.

---
*Harmonia - A trilha sonora da sua Loja, integrada ao Ecossistema Sigma.*

# Harmonia 🎵

O **Harmonia** é o módulo especialista de Músicas Ritualísticas do Ecossistema Sigma. Ele foi desenhado para ser um aplicativo extremamente leve, focado única e exclusivamente na execução de trilhas sonoras para Lojas Maçônicas.

## 🚀 Arquitetura

Sendo um **Microserviço**, o Harmonia não lida com cobranças, faturas ou criação de lojas. Ele funciona como um aplicativo "satélite" (PWA / Web App) que recebe os usuários autenticados pelo cérebro central (e-Sigma Core).

* **Frontend:** React + Vite, Tailwind CSS, Componentes de Áudio nativos.
* **Backend:** Python + FastAPI.
* **Banco de Dados:** SQLite (Armazenamento local super rápido de metadados das músicas).
* **Armazenamento de Áudio:** Servido estaticamente pela VPS ou CDN.

## 🔐 Autenticação e Single Sign-On (SSO)

O aplicativo Harmonia **terceiriza** a sua segurança e autenticação para o `e-sigma.app`.

O fluxo funciona da seguinte maneira:
1. Quando um Mestre de Harmonia tenta logar no aplicativo (Web ou Celular), o frontend do Harmonia dispara um pedido `POST` secretamente para a API do e-Sigma (`https://e-sigma.app/api/auth/login`).
2. Se o e-Sigma validar que a Loja daquele usuário está com a assinatura do módulo Harmonia paga (verificada via Asaas), ele devolve um JWT.
3. O Frontend do Harmonia salva o JWT e, a partir de então, toda requisição de música enviada para o backend do Harmonia leva esse Token.
4. O backend do Harmonia e do e-Sigma compartilham a mesma `JWT_SECRET_KEY`. Assim, o Harmonia confia plenamente na permissão concedida e libera o Player.

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

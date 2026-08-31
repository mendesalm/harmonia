# Histórico de Implementação do Harmonia (Changelog Global)

Este documento atua como a **Regra de Ouro** de documentação histórica do projeto **Harmonia**. Ele é um compilado centralizado e contínuo de todas as decisões arquiteturais, modelos de dados, endpoints e interfaces desenvolvidas. Novas entradas serão registradas no topo (cronologia inversa), garantindo que a evolução do sistema seja auditável e transparente de ponta a ponta.

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

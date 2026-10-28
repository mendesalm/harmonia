#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# EM CONFORMIDADE COM AS REGRAS DE OURO DO E-SIGMA
"""
Harmonia - Downloader Liturgico (Spotify & YouTube) com Metadados e Upload Direto.

Permite baixar musicas do Spotify ou do YouTube em alta fidelidade (320 kbps),
atribuir metadados liturgicos (Estilo, Subclassificacao funcional e
Momentos Ritualisticos Canonicos) e transferir automaticamente para o Acervo do Harmonia.
"""
import argparse
import getpass
import json
import os
import shutil
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# Forca stdout e stderr a aceitarem UTF-8 com fallback seguro no console do Windows
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

import requests

try:
    import imageio_ffmpeg
    FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()
except Exception:
    FFMPEG_EXE = "ffmpeg"

try:
    import mutagen
    from mutagen.easyid3 import EasyID3
    from mutagen.mp3 import MP3
except Exception:
    mutagen = None

API_PADRAO = os.getenv("HARMONIA_API_URL", "https://harmonia.e-sigma.app/api/v1").rstrip("/")
ESIGMA_LOGIN_URL = os.getenv("ESIGMA_LOGIN_URL", "https://e-sigma.app/api/v1/auth/login")
ARQUIVO_TOKEN = Path.home() / ".harmonia_cli_token.json"
PASTA_DOWNLOADS_SPOTIFY = Path.home() / "Desktop" / "Musicas_Spotify"
PASTA_DOWNLOADS_YOUTUBE = Path.home() / "Desktop" / "Musicas_YouTube"

ESTILOS_OPCOES = [
    ("UNIVERSAL", "Universal (Base liturgica para qualquer sessao)"),
    ("CLASSICA", "Classica (Erudita, orquestral, barroca ou renascentista)"),
    ("VIOLAO", "Violao (Acustico, cordas dedilhadas e solo)"),
    ("SOUNDTRACKS", "Soundtracks (Temas cinematograficos e orquestrados)"),
    ("POPULAR", "Popular (Arranjos instrumentais MPB ou folcloricos)"),
]

SUBCLASSIFICACOES_OPCOES = [
    ("GERAL", "Geral (Dinamica regular para momentos solenes e marcantes)"),
    ("AMBIENTE", "Ambiente / Surdina (Textura suave e serena para momentos em PP)"),
]


def limpar_tela():
    """Limpa a tela do terminal."""
    os.system("cls" if os.name == "nt" else "clear")


def banner():
    """Exibe cabecalho do utilitario."""
    print("=" * 72)
    print("   [HARMONIA] DOWNLOADER LITURGICO & UPLOADER PARA O ACERVO")
    print("   Qualidade 320 kbps - Classificacao Canonica - Sincronizacao Direta")
    print("=" * 72)


def salvar_sessao(token: str, email: str):
    """Salva token e email em arquivo local de sessao."""
    try:
        with open(ARQUIVO_TOKEN, "w", encoding="utf-8") as f:
            json.dump({"token": token, "email": email}, f)
    except Exception:
        pass


def carregar_sessao() -> Optional[Dict[str, str]]:
    """Carrega dados da sessao salva."""
    if ARQUIVO_TOKEN.exists():
        try:
            with open(ARQUIVO_TOKEN, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return None
    return None


def obter_token_autenticado() -> str:
    """Valida token salvo ou autentica interativamente contra o e-Sigma IdP."""
    sessao = carregar_sessao()
    if sessao and sessao.get("token"):
        headers = {"Authorization": f"Bearer {sessao['token']}"}
        try:
            res = requests.get("https://e-sigma.app/api/v1/auth/validate", headers=headers, timeout=5)
            if res.status_code == 200:
                print(f"[OK] Conectado ao e-Sigma como: {sessao.get('email', 'Usuario Autenticado')}")
                return sessao["token"]
        except Exception:
            pass

    print("\n--- Autenticacao no e-Sigma (IdP Central) ---")
    while True:
        email = input("E-mail ou CIM: ").strip()
        senha = getpass.getpass("Senha: ").strip()
        if not email or not senha:
            print("[!] E-mail e senha sao obrigatorios.")
            continue

        try:
            print("Validando credenciais junto ao e-Sigma...")
            res = requests.post(
                ESIGMA_LOGIN_URL,
                json={"username": email, "password": senha, "modulo_origem": "harmonia"},
                timeout=12,
            )
            if res.status_code != 200:
                res = requests.post(
                    ESIGMA_LOGIN_URL,
                    data={"username": email, "password": senha, "modulo_origem": "harmonia"},
                    timeout=12,
                )

            if res.status_code == 200:
                dados = res.json()
                token = dados.get("access_token") or dados.get("token")
                if token:
                    salvar_sessao(token, email)
                    print("[OK] Autenticado com sucesso!")
                    return token

            print(f"[!] Falha na autenticacao (HTTP {res.status_code}): {res.text}")
        except Exception as erro:
            print(f"[!] Erro ao conectar ao e-Sigma: {erro}")


def carregar_momentos_liturgicos(token: str) -> List[Dict[str, Any]]:
    """Obtem momentos liturgicos do Harmonia diretamente da tabela de eventos para compatibilidade estrita de FK."""
    headers = {"Authorization": f"Bearer {token}"}
    try:
        res = requests.get(f"{API_PADRAO}/eventos", headers=headers, timeout=8)
        if res.status_code == 200:
            itens = res.json()
            if isinstance(itens, list) and len(itens) > 0:
                return [
                    {
                        "id": str(i["id"]),
                        "nome": i.get("nome", "Momento Liturgico"),
                        "categoria": i.get("categoria_rito") or "Geral",
                        "ordem": i.get("ordem_sugerida") or 99,
                    }
                    for i in itens
                ]
    except Exception:
        pass

    try:
        res = requests.get(f"{API_PADRAO}/admin/canonicos/momentos", headers=headers, timeout=8)
        if res.status_code == 200:
            itens = res.json()
            if isinstance(itens, list):
                return [
                    {
                        "id": str(i["id"]),
                        "nome": i.get("nome", "Momento Canonico"),
                        "categoria": "Canonico",
                        "ordem": i.get("ordem_sugerida", 99),
                    }
                    for i in itens
                ]
    except Exception:
        pass

    return []


def extrair_tags_arquivo(caminho_mp3: Path) -> Tuple[str, str]:
    """Le tags ID3 do arquivo MP3."""
    titulo = caminho_mp3.stem
    artista = "Desconhecido"
    if mutagen is not None:
        try:
            audio = EasyID3(str(caminho_mp3))
            if "title" in audio and audio["title"]:
                titulo = audio["title"][0]
            if "artist" in audio and audio["artist"]:
                artista = audio["artist"][0]
        except Exception:
            pass
    return titulo, artista


def baixar_youtube(url: str, pasta_destino: Path) -> List[Path]:
    """Baixa video ou playlist do YouTube via yt-dlp em 320 kbps."""
    import yt_dlp

    pasta_destino.mkdir(parents=True, exist_ok=True)
    arquivos_antes = set(pasta_destino.glob("*.mp3"))

    ydl_opts = {
        "ffmpeg_location": FFMPEG_EXE,
        "format": "ba/b",
        "outtmpl": str(pasta_destino / "%(title)s.%(ext)s"),
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "320",
            }
        ],
        "postprocessor_args": ["-nostdin"],
        "quiet": False,
        "ignoreerrors": True,
    }

    print(f"\n[*] Baixando do YouTube via yt-dlp (320 kbps)...")
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])

    arquivos_depois = set(pasta_destino.glob("*.mp3"))
    novos = list(arquivos_depois - arquivos_antes)
    return sorted(novos, key=lambda f: f.stat().st_mtime, reverse=True)


def baixar_spotify(link: str, pasta_destino: Path) -> List[Path]:
    """Baixa faixa, album ou playlist do Spotify via spotdl."""
    pasta_destino.mkdir(parents=True, exist_ok=True)
    arquivos_antes = set(pasta_destino.glob("**/*.mp3"))

    print(f"\n[*] Baixando do Spotify via spotdl (320 kbps)...")
    import subprocess
    comando = [
        sys.executable,
        "-m",
        "spotdl",
        "download",
        link,
        "--format",
        "mp3",
        "--bitrate",
        "320k",
        "--output",
        str(pasta_destino / "{artist} - {title}.{output-ext}")
    ]
    try:
        proc = subprocess.run(comando, cwd=str(pasta_destino))
        if proc.returncode != 0:
            print(f"[!] spotdl finalizou com codigo {proc.returncode}.")
    except Exception as erro:
        print(f"[!] Erro ao invocar spotdl: {erro}")

    arquivos_depois = set(pasta_destino.glob("**/*.mp3"))
    novos = list(arquivos_depois - arquivos_antes)
    return sorted(novos, key=lambda f: f.stat().st_mtime, reverse=True)


def coletar_metadados_liturgicos(
    caminho_mp3: Path, momentos: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Menu interativo para coletar e confirmar metadados liturgicos."""
    tag_tit, tag_art = extrair_tags_arquivo(caminho_mp3)

    print("\n" + "-" * 72)
    print(f"Musica: {caminho_mp3.name}")
    print("-" * 72)

    # 1. Titulo e Artista
    t_input = input(f"Titulo da Musica [{tag_tit}]: ").strip()
    titulo_final = t_input if t_input else tag_tit

    a_input = input(f"Compositor / Interprete [{tag_art}]: ").strip()
    artista_final = a_input if a_input else tag_art

    # 2. Estilo Liturgico
    print("\nEstilo Liturgico:")
    for i, (chave, desc) in enumerate(ESTILOS_OPCOES, 1):
        print(f"   [{i}] {desc}")
    op_estilo = input("Escolha o Estilo [1-5, padrao 1 - UNIVERSAL]: ").strip()
    estilo_escolhido = "UNIVERSAL"
    if op_estilo.isdigit() and 1 <= int(op_estilo) <= len(ESTILOS_OPCOES):
        estilo_escolhido = ESTILOS_OPCOES[int(op_estilo) - 1][0]

    # 3. Subclassificacao
    print("\nSubclassificacao Funcional:")
    for i, (chave, desc) in enumerate(SUBCLASSIFICACOES_OPCOES, 1):
        print(f"   [{i}] {desc}")
    op_sub = input("Escolha a Subclassificacao [1-2, padrao 1 - GERAL]: ").strip()
    sub_escolhida = "GERAL"
    if op_sub.isdigit() and 1 <= int(op_sub) <= len(SUBCLASSIFICACOES_OPCOES):
        sub_escolhida = SUBCLASSIFICACOES_OPCOES[int(op_sub) - 1][0]

    # 4. Momentos Liturgicos Designados
    eventos_selecionados = []
    nomes_momentos_selecionados = []
    if momentos:
        print("\nMomentos Liturgicos Designados:")
        print("   (Digite os numeros separados por virgula, ex: 1, 4 - ou ENTER para Acervo Geral)")
        for idx, m in enumerate(momentos[:40], 1):
            print(f"   [{idx:2d}] {m.get('nome')} ({m.get('categoria', 'Geral')})")

        op_mom = input("\nNumeros dos momentos correspondentes: ").strip()
        if op_mom:
            for parte in op_mom.split(","):
                parte = parte.strip()
                if parte.isdigit():
                    num = int(parte) - 1
                    if 0 <= num < len(momentos):
                        eventos_selecionados.append(momentos[num]["id"])
                        nomes_momentos_selecionados.append(momentos[num]["nome"])

    return {
        "titulo": titulo_final,
        "autor_artista": artista_final,
        "estilo": estilo_escolhido,
        "subclassificacao": sub_escolhida,
        "eventos_sugeridos_ids": eventos_selecionados,
        "nomes_momentos": nomes_momentos_selecionados,
    }


def sanitizar_nome_sistema_arquivos(texto: str) -> str:
    """Sanitiza o texto para uso seguro como nome de arquivo ou pasta no Windows."""
    caracteres_invalidos = '<>:"/\\|?*'
    limpo = "".join(c for c in (texto or "") if c not in caracteres_invalidos).strip()
    return limpo or "Geral"


def organizar_arquivo_localmente(
    caminho_mp3: Path, pasta_base: Path, metadados: Dict[str, Any]
) -> Path:
    """
    Move e organiza o arquivo MP3 na estrutura de pastas baseada nos metadados litúrgicos:
    {PASTA_BASE} / {ESTILO} / {SUBCLASSIFICACAO} / {MOMENTO_LITURGICO} / {Artista} - {Titulo}.mp3
    Também grava tags ID3 locais no arquivo MP3.
    """
    estilo_pasta = sanitizar_nome_sistema_arquivos(metadados.get("estilo") or "UNIVERSAL")
    sub_pasta = sanitizar_nome_sistema_arquivos(metadados.get("subclassificacao") or "GERAL")

    nomes_momentos = metadados.get("nomes_momentos", [])
    if nomes_momentos:
        momento_pasta = sanitizar_nome_sistema_arquivos(nomes_momentos[0])
    else:
        momento_pasta = "Acervo Geral"

    pasta_destino_final = pasta_base / estilo_pasta / sub_pasta / momento_pasta
    pasta_destino_final.mkdir(parents=True, exist_ok=True)

    artista_arq = sanitizar_nome_sistema_arquivos(metadados.get("autor_artista") or "Desconhecido")
    titulo_arq = sanitizar_nome_sistema_arquivos(metadados.get("titulo") or caminho_mp3.stem)
    nome_final = f"{artista_arq} - {titulo_arq}.mp3"
    caminho_final = pasta_destino_final / nome_final

    if caminho_mp3.resolve() != caminho_final.resolve():
        if caminho_final.exists():
            caminho_final = pasta_destino_final / f"{artista_arq} - {titulo_arq}_{caminho_mp3.stem[:6]}.mp3"
        try:
            shutil.move(str(caminho_mp3), str(caminho_final))
        except Exception as erro:
            print(f"[!] Aviso ao mover arquivo: {erro}")
            caminho_final = caminho_mp3

    # Grava metadados ID3 internos se mutagen estiver instalado
    if mutagen is not None and caminho_final.exists():
        try:
            try:
                audio = EasyID3(str(caminho_final))
            except Exception:
                audio = mutagen.File(str(caminho_final), easy=True)
                if audio is None:
                    audio = MP3(str(caminho_final), ID3=EasyID3)
                    audio.add_tags()

            audio["title"] = metadados.get("titulo") or titulo_arq
            audio["artist"] = metadados.get("autor_artista") or artista_arq
            audio["genre"] = estilo_pasta
            audio["album"] = momento_pasta
            audio.save()
        except Exception:
            pass

    rel_path = caminho_final
    try:
        rel_path = caminho_final.relative_to(pasta_base.parent)
    except Exception:
        pass
    print(f"[OK] Arquivo local organizado em: {rel_path}")
    return caminho_final


def transferir_para_harmonia(
    token: str, caminho_mp3: Path, metadados: Dict[str, Any]
) -> bool:
    """Envia o arquivo MP3 e seus metadados liturgicos para o backend do Harmonia."""
    headers = {"Authorization": f"Bearer {token}"}
    print(f"\n[*] Transferindo '{metadados['titulo']}' para o Acervo do Harmonia...")

    try:
        with open(caminho_mp3, "rb") as f:
            files = {"arquivo": (caminho_mp3.name, f, "audio/mpeg")}
            data = {
                "titulo": metadados["titulo"],
                "autor_artista": metadados["autor_artista"],
                "estilo": metadados["estilo"],
                "subclassificacao": metadados["subclassificacao"],
                "eventos_sugeridos_ids": json.dumps(metadados["eventos_sugeridos_ids"]),
            }
            res = requests.post(
                f"{API_PADRAO}/musicas/upload",
                headers=headers,
                files=files,
                data=data,
                timeout=180,
            )

        if res.status_code in (200, 201):
            resp_json = res.json()
            print(f"[OK] Sucesso! Musica registrada no Acervo Oficial!")
            print(f"     ID: {resp_json.get('id')}")
            print(f"     Estilo: {metadados['estilo']} | Subclassificacao: {metadados['subclassificacao']}")
            return True
        else:
            print(f"[!] Erro no upload (HTTP {res.status_code}): {res.text}")
            return False
    except Exception as erro:
        print(f"[!] Falha na transferencia: {erro}")
        return False


def processar_fluxo(tipo: str, link_ou_url: Optional[str] = None):
    """Executa o ciclo completo de download, metadados e transferencia."""
    limpar_tela()
    banner()

    pasta_destino = PASTA_DOWNLOADS_SPOTIFY if tipo == "spotify" else PASTA_DOWNLOADS_YOUTUBE
    pasta_temp = pasta_destino / "_temp_download"
    pasta_temp.mkdir(parents=True, exist_ok=True)

    if not link_ou_url:
        origem_str = "Spotify (track/album/playlist)" if tipo == "spotify" else "YouTube (video/playlist)"
        print(f"\nOrigem selecionada: {origem_str.upper()}")
        print(f"Pasta de destino local: {pasta_destino}")
        print("-" * 72)
        link_ou_url = input(f"Cole a URL do {tipo.capitalize()} aqui: ").strip()

    if not link_ou_url:
        print("[!] Nenhuma URL informada.")
        return

    # Download direto para pasta temporária de trabalho
    if tipo == "spotify":
        arquivos = baixar_spotify(link_ou_url, pasta_temp)
    else:
        arquivos = baixar_youtube(link_ou_url, pasta_temp)

    if not arquivos:
        print("[!] Nenhum arquivo MP3 foi localizado apos a operacao.")
        try:
            pasta_temp.rmdir()
        except Exception:
            pass
        input("\nPressione ENTER para continuar...")
        return

    print(f"\n[OK] {len(arquivos)} faixa(s) pronta(s) para classificacao liturgica!")

    # Carrega momentos litúrgicos para enriquecer a taxonomia de pastas locais
    sessao_salva = carregar_sessao()
    token_disponivel = sessao_salva.get("token") if sessao_salva else ""
    momentos = carregar_momentos_liturgicos(token_disponivel)

    # Pergunta prévia sobre envio ao Harmonia
    perguntar_envio = input("\nDeseja transferir as faixas para o Acervo do Harmonia? [S/n]: ").strip().lower()
    deseja_enviar = perguntar_envio in ("", "s", "sim", "y")

    token = None
    if deseja_enviar:
        token = obter_token_autenticado()
        if not momentos:
            momentos = carregar_momentos_liturgicos(token)

    # Processa e organiza cada faixa na estrutura de pastas baseada nos metadados
    for idx, arq in enumerate(arquivos, 1):
        print(f"\n>>> Faixa {idx} de {len(arquivos)}")
        meta = coletar_metadados_liturgicos(arq, momentos)

        # Move o arquivo para a árvore hierárquica: {ESTILO} / {SUBCLASSIFICACAO} / {MOMENTO} / {Arquivo}.mp3
        arq_organizado = organizar_arquivo_localmente(arq, pasta_destino, meta)

        if deseja_enviar and token:
            transferir_para_harmonia(token, arq_organizado, meta)

    # Limpa pasta temporária
    try:
        shutil.rmtree(pasta_temp, ignore_errors=True)
    except Exception:
        pass

    print("\n" + "=" * 72)
    print("[FIM] Processamento liturgico e organizacao de pastas concluidos!")
    print(f"Estrutura gerada em: {pasta_destino}")
    print("=" * 72)


def main():
    parser = argparse.ArgumentParser(description="Harmonia - Downloader Liturgico Spotify & YouTube")
    parser.add_argument("--tipo", choices=["spotify", "youtube"], help="Tipo de servico (spotify ou youtube)")
    parser.add_argument("--url", help="URL direta da musica/album/playlist")
    args = parser.parse_args()

    if args.tipo:
        processar_fluxo(args.tipo, args.url)
        return

    while True:
        limpar_tela()
        banner()
        print("\nEscolha a fonte de audio:")
        print("  [1] Baixar do Spotify (Faixa, Album ou Playlist)")
        print("  [2] Baixar do YouTube (Video ou Playlist)")
        print("  [3] Classificar e Transferir MP3 Local Existente")
        print("  [4] Sair")
        print("-" * 72)

        opcao = input("Opcao [1-4]: ").strip()
        if opcao == "1":
            processar_fluxo("spotify")
        elif opcao == "2":
            processar_fluxo("youtube")
        elif opcao == "3":
            limpar_tela()
            banner()
            caminho_str = input("Caminho do arquivo MP3 local: ").strip().strip('"')
            p = Path(caminho_str)
            if p.exists() and p.is_file():
                token = obter_token_autenticado()
                momentos = carregar_momentos_liturgicos(token)
                meta = coletar_metadados_liturgicos(p, momentos)
                pasta_base = Path.home() / "Desktop" / "Musicas_Harmonia"
                p_organizado = organizar_arquivo_localmente(p, pasta_base, meta)
                transferir_para_harmonia(token, p_organizado, meta)
            else:
                print("[!] Arquivo nao encontrado.")
            input("\nPressione ENTER para voltar ao menu...")
        elif opcao in ("4", "sair", "exit", "q"):
            print("\nAte logo!")
            break


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nOperacao interrompida pelo usuario.")
        sys.exit(0)

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Harmonia - Utilitário Local de Download, Conversão e Upload Direto para o Harmonia.
Funciona em qualquer computador conectado à internet residencial comum sem bloqueios do YouTube.
"""
import os
import sys
import json
import getpass
import requests
from pathlib import Path
import imageio_ffmpeg
import yt_dlp

API_PADRAO = "https://harmonia.e-sigma.app/api/v1"
ESIGMA_LOGIN_URL = "https://e-sigma.app/api/v1/auth/login"
ARQUIVO_TOKEN = Path.home() / ".harmonia_cli_token.json"
PASTA_DOWNLOADS = Path(__file__).resolve().parent.parent / "downloads"


def limpar_tela():
    os.system('cls' if os.name == 'nt' else 'clear')


def banner():
    print("=" * 65)
    print("   HARMONIA - CONVERSOR YOUTUBE & UPLOADER PARA O ACERVO")
    print("=" * 65)


def salvar_sessao(token: str, email: str):
    try:
        with open(ARQUIVO_TOKEN, "w", encoding="utf-8") as f:
            json.dump({"token": token, "email": email}, f)
    except Exception:
        pass


def carregar_sessao():
    if ARQUIVO_TOKEN.exists():
        try:
            with open(ARQUIVO_TOKEN, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return None
    return None


def obter_token_autenticado() -> str:
    sessao = carregar_sessao()
    if sessao and sessao.get("token"):
        # Valida token rapidamente no e-sigma
        headers = {"Authorization": f"Bearer {sessao['token']}"}
        try:
            res = requests.get("https://e-sigma.app/api/v1/auth/validate", headers=headers, timeout=5)
            if res.status_code == 200:
                print(f"[+] Conectado como: {sessao.get('email', 'Usuário Autenticado')}")
                return sessao["token"]
        except Exception:
            pass

    print("\n--- Autenticação e-Sigma ---")
    while True:
        email = input("E-mail: ").strip()
        senha = getpass.getpass("Senha: ").strip()
        if not email or not senha:
            print("[!] E-mail e senha são obrigatórios.")
            continue

        try:
            print("Autenticando no e-Sigma...")
            res = requests.post(
                ESIGMA_LOGIN_URL,
                json={"email": email, "senha": senha},
                timeout=10
            )
            if res.status_code == 200:
                dados = res.json()
                token = dados.get("access_token") or dados.get("token")
                if token:
                    salvar_sessao(token, email)
                    print("[+] Autenticado com sucesso!")
                    return token
            print(f"[!] Erro ao autenticar: {res.text}")
        except Exception as e:
            print(f"[!] Falha na conexão: {e}")


def listar_momentos_ritualisticos(token: str):
    headers = {"Authorization": f"Bearer {token}"}
    try:
        res = requests.get(f"{API_PADRAO}/eventos", headers=headers, timeout=10)
        if res.status_code == 200:
            return res.json()
    except Exception as e:
        print(f"[!] Erro ao carregar momentos ritualísticos: {e}")
    return []


def baixar_e_converter(url: str, bitrate: int = 320) -> tuple[str, str, str]:
    """Baixa o áudio do YouTube e converte para MP3 320kbps."""
    PASTA_DOWNLOADS.mkdir(parents=True, exist_ok=True)
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()

    print(f"\n[*] Conectando ao YouTube via IP Residencial...")
    
    # 1. Extração de Metadados
    with yt_dlp.YoutubeDL({'quiet': True, 'noplaylist': True}) as ydl:
        info = ydl.extract_info(url, download=False)
        titulo = info.get('title', 'Música Sem Título')
        autor = info.get('uploader') or info.get('artist') or info.get('channel') or 'YouTube'
    
    print(f"[*] Vídeo localizado: {titulo}")
    print(f"[*] Canal / Intérprete: {autor}")

    nome_seguro = "".join(c for c in titulo if c.isalnum() or c in (' ', '-', '_')).rstrip()
    arquivo_base = str(PASTA_DOWNLOADS / nome_seguro)
    caminho_mp3 = f"{arquivo_base}.mp3"

    ydl_opts = {
        'ffmpeg_location': ffmpeg_exe,
        'format': 'ba/b',
        'outtmpl': f"{arquivo_base}.%(ext)s",
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': str(bitrate),
        }],
        'postprocessor_args': ['-nostdin'],
        'quiet': False,
        'noplaylist': True,
    }

    print(f"[*] Baixando e convertendo para MP3 {bitrate} kbps...")
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])

    if not os.path.exists(caminho_mp3):
        # Procura arquivos gerados
        for f in PASTA_DOWNLOADS.glob(f"{nome_seguro}*.mp3"):
            caminho_mp3 = str(f)
            break

    print(f"[+] Áudio gerado com sucesso: {caminho_mp3}")
    return caminho_mp3, titulo, autor


def enviar_para_harmonia(token: str, caminho_mp3: str, titulo: str, autor: str, eventos_ids: list[str]):
    headers = {"Authorization": f"Bearer {token}"}
    print(f"\n[*] Enviando '{titulo}' para o servidor Harmonia...")

    with open(caminho_mp3, "rb") as f:
        files = {
            "arquivo": (os.path.basename(caminho_mp3), f, "audio/mpeg")
        }
        data = {
            "titulo": titulo,
            "autor_artista": autor,
            "eventos_sugeridos_ids": json.dumps(eventos_ids),
        }
        res = requests.post(f"{API_PADRAO}/musicas/upload", headers=headers, files=files, data=data, timeout=120)

    if res.status_code in (200, 201):
        print(f"[✓] Sucesso! Música adicionada ao Acervo Global do Harmonia!")
        print(f"    ID: {res.json().get('id')}")
        return True
    else:
        print(f"[!] Falha no upload: HTTP {res.status_code}")
        print(f"    Detalhes: {res.text}")
        return False


def main():
    limpar_tela()
    banner()

    token = obter_token_autenticado()
    momentos = listar_momentos_ritualisticos(token)

    while True:
        print("\n" + "-" * 65)
        url = input("Cole a URL do YouTube (ou 'sair' para encerrar): ").strip()
        if not url or url.lower() in ('sair', 'exit', 'q'):
            print("Até logo!")
            break

        try:
            caminho_mp3, titulo_yt, autor_yt = baixar_e_converter(url)
        except Exception as e:
            print(f"[!] Erro durante o download: {e}")
            continue

        print("\n--- Metadados para o Acervo ---")
        novo_titulo = input(f"Título da Música [{titulo_yt}]: ").strip()
        titulo_final = novo_titulo if novo_titulo else titulo_yt

        novo_autor = input(f"Compositor/Intérprete [{autor_yt}]: ").strip()
        autor_final = novo_autor if novo_autor else autor_yt

        eventos_selecionados = []
        if momentos:
            print("\n--- Selecione o(s) Momento(s) Ritualístico(s) ---")
            print("Exemplos de busca: Digite o número correspondente (separados por vírgula)")
            for idx, m in enumerate(momentos[:30], 1):
                print(f"  [{idx:2d}] {m.get('nome')} ({m.get('categoria_rito')})")

            opcoes = input("\nNúmeros dos momentos (ex: 1, 4) ou deixe vazio para geral: ").strip()
            if opcoes:
                for pedaco in opcoes.split(","):
                    pedaco = pedaco.strip()
                    if pedaco.isdigit():
                        idx_num = int(pedaco) - 1
                        if 0 <= idx_num < len(momentos):
                            eventos_selecionados.append(momentos[idx_num]["id"])

        enviar = input("\nDeseja fazer o upload agora para o Harmonia? [S/n]: ").strip().lower()
        if enviar in ('', 's', 'sim', 'y'):
            enviar_para_harmonia(token, caminho_mp3, titulo_final, autor_final, eventos_selecionados)
        else:
            print(f"Arquivo mantido localmente em: {caminho_mp3}")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nInterrompido pelo usuário.")
        sys.exit(0)

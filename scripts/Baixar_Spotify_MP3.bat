@echo off
chcp 65001 >nul
title Harmonia - Downloader Spotify MP3 (320 kbps) e Acervo Litúrgico
color 0B

set "DIR_RAIZ=%~dp0.."
set "PYTHON_EXE="

if exist "%DIR_RAIZ%\venv\Scripts\python.exe" (
    set "PYTHON_EXE=%DIR_RAIZ%\venv\Scripts\python.exe"
    goto PYTHON_OK
)

python --version >nul 2>&1
if not errorlevel 1 (
    set "PYTHON_EXE=python"
    goto PYTHON_OK
)

py -3 --version >nul 2>&1
if not errorlevel 1 (
    set "PYTHON_EXE=py -3"
    goto PYTHON_OK
)

color 0C
echo [ERRO] Python não encontrado.
pause
exit /b 1

:PYTHON_OK
set "PASTA_DESTINO=%USERPROFILE%\Desktop\Musicas_Spotify"
if not exist "%PASTA_DESTINO%" mkdir "%PASTA_DESTINO%"

:MENU_LOOP
cls
color 0B
echo ======================================================================
echo    🏛️  HARMONIA - DOWNLOADER SPOTIFY (320 KBPS) COM METADADOS LITÚRGICOS  🎵
echo ======================================================================
echo  Pasta Local: "%PASTA_DESTINO%"
echo  Integração: Acervo Global Harmonia (Estilo, Surdina e Momento Canônico)
echo.
echo  Exemplos de links suportados:
echo    - Música:   https://open.spotify.com/track/...
echo    - Álbum:    https://open.spotify.com/album/...
echo    - Playlist: https://open.spotify.com/playlist/...
echo ======================================================================
echo.

set "LINK="
set /p "LINK=>> Cole o link do Spotify aqui e pressione ENTER: "

if "%LINK%"=="" goto MENU_LOOP

"%PYTHON_EXE%" "%DIR_RAIZ%\scripts\downloader_liturgico.py" --tipo spotify --url "%LINK%"

echo.
echo ======================================================================
echo Opções:
echo   [1] Baixar outra música, álbum ou playlist do Spotify
echo   [2] Abrir pasta onde as músicas foram salvas localmente
echo   [3] Sair
echo ======================================================================
echo.

set "OPCAO="
set /p "OPCAO=Escolha uma opção [1, 2 ou 3]: "

if "%OPCAO%"=="1" goto MENU_LOOP
if "%OPCAO%"=="2" (
    start "" "%PASTA_DESTINO%"
    goto MENU_LOOP
)
exit /b 0

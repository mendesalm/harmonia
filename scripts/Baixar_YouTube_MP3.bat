@echo off
title Harmonia - Downloader YouTube MP3
color 0E

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
echo [ERRO] Python nao encontrado.
pause
exit /b 1

:PYTHON_OK
set "PASTA_DESTINO=%USERPROFILE%\Desktop\Musicas_YouTube"
if not exist "%PASTA_DESTINO%" mkdir "%PASTA_DESTINO%"

:MENU_LOOP
cls
color 0E
echo ======================================================================
echo    HARMONIA - DOWNLOADER YOUTUBE (320 KBPS) - ACERVO LITURGICO
echo ======================================================================
echo  Pasta Local: "%PASTA_DESTINO%"
echo  Integracao: Acervo Global Harmonia (Estilo, Surdina e Momento Canonico)
echo.
echo  Exemplos de links suportados:
echo    - Video:    https://www.youtube.com/watch?v=...
echo    - Short:    https://youtu.be/...
echo    - Playlist: https://www.youtube.com/playlist?list=...
echo ======================================================================
echo.

set "LINK="
set /p "LINK=>> Cole o link do YouTube aqui e pressione ENTER: "

if "%LINK%"=="" goto MENU_LOOP

"%PYTHON_EXE%" "%DIR_RAIZ%\scripts\downloader_liturgico.py" --tipo youtube --url "%LINK%"

echo.
echo ======================================================================
echo Opcoes:
echo   [1] Baixar outro video ou playlist do YouTube
echo   [2] Abrir pasta onde as musicas foram salvas localmente
echo   [3] Sair
echo ======================================================================
echo.

set "OPCAO="
set /p "OPCAO=Escolha uma opcao [1, 2 ou 3]: "

if "%OPCAO%"=="1" goto MENU_LOOP
if "%OPCAO%"=="2" (
    start "" "%PASTA_DESTINO%"
    goto MENU_LOOP
)
exit /b 0

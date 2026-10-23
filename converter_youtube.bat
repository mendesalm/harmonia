@echo off
title Harmonia - Conversor Local YouTube
cd /d "%~dp0"
echo Iniciando o conversor local...
if exist "venv\Scripts\python.exe" (
    venv\Scripts\python.exe scripts\converter_local.py
) else (
    python scripts\converter_local.py
)
pause

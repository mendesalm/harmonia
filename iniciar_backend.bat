@echo off
title Harmonia - Backend FastAPI
cd /d "%~dp0"
echo ========================================================
echo   Iniciando Backend do Harmonia v2.0 (FastAPI)
echo   Documentacao Swagger: http://localhost:8000/docs
echo ========================================================
echo.

if not exist "venv\Scripts\python.exe" (
    echo [ERRO] Ambiente virtual venv nao encontrado!
    echo Criando ambiente virtual...
    python -m venv venv
    .\venv\Scripts\pip install -r backend\requirements.txt
)

.\venv\Scripts\python backend\main.py
pause

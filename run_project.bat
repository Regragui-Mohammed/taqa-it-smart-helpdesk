@echo off
title TAQA IT Smart Helpdesk - Modern Launcher
echo ======================================================================
echo    TAQA IT Smart Helpdesk - Modern React + Flask Architecture
echo ======================================================================
echo.

cd /d "%~dp0"

echo [1/3] Starting Flask REST API Backend (Port 5000)...
start "TAQA Backend (Flask API)" cmd /k "py server.py"

echo [2/3] Waiting 2 seconds for backend to initialize...
timeout /t 2 /nobreak >nul

echo [3/3] Starting React Vite Frontend (Port 5173)...
start "TAQA Frontend (React Vite)" cmd /k "cd frontend && npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo ======================================================================
echo  Application is running!
echo  - Frontend React UI : http://localhost:5173
echo  - Backend REST API  : http://localhost:5000
echo ======================================================================
echo Opening browser...
start http://localhost:5173

pause

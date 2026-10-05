@echo off
echo ===================================================
echo Starting Drug Guidance AI (Backend + Frontend)
echo ===================================================

echo Starting FastAPI Backend on port 8001...
start "DrugGuide Backend" cmd /k "cd /d %~dp0 && py -m uvicorn backend.main:app --host 127.0.0.1 --port 8001 --reload"

timeout /t 3 /nobreak >nul

echo Starting Next.js Frontend on port 3000...
start "DrugGuide Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ===================================================
echo Backend running on:  http://127.0.0.1:8001
echo Frontend running on: http://localhost:3000
echo ===================================================
timeout /t 2 /nobreak >nul
start http://localhost:3000

@echo off
title DrugGuide Medical RAG System
echo ========================================================
echo        Starting DrugGuide AI Medical RAG System
echo ========================================================
echo.

echo 1. Starting FastAPI Backend on port 8001...
start "DrugGuide Backend" cmd /k "cd /d %~dp0backend && py -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload"

echo 2. Starting Next.js Frontend on port 3000...
start "DrugGuide Frontend" cmd /k "cd /d %~dp0frontend && npm run dev -- -p 3000"

echo.
echo ========================================================
echo Both servers are launching!
echo Backend:  http://127.0.0.1:8001
echo Frontend: http://localhost:3000
echo ========================================================
timeout /t 5
start http://localhost:3000
exit

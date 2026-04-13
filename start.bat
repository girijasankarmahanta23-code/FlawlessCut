@echo off
echo Starting FlawlessCut...

:: Start FastAPI backend
start "FlawlessCut Backend" cmd /k "cd /d %~dp0 && python -m uvicorn app.main:app --reload --port 8000"

:: Start React frontend
start "FlawlessCut Frontend" cmd /k "cd /d %~dp0frontend && set COMSPEC=C:\Windows\System32\cmd.exe && npm run dev"

echo Both servers are starting...
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173

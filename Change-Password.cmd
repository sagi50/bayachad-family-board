@echo off
setlocal
cd /d "%~dp0"
if not exist "compose.yaml" (
  echo Open this file from the project folder.
  pause
  exit /b 1
)
docker compose exec api python -m app.manage change-password
if errorlevel 1 (
  echo.
  echo Docker must be running and the local API container must be started.
)
pause

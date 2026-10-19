@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Please install Node.js LTS from https://nodejs.org then run this again.
  pause
  exit /b 1
)
if not exist dist\app.js (
  call npm.cmd ci
  if errorlevel 1 exit /b 1
  call npm.cmd run build
  if errorlevel 1 exit /b 1
)
start "" http://127.0.0.1:4173
node server.mjs
pause

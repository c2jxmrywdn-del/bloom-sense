@echo off
cd /d "%~dp0"
if not exist node_modules call npm install
start "" "http://localhost:5179"
call npm run dev

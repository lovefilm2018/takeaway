@echo off
chcp 65001 > nul
title Antigravity CLI - Takeaway (Developer Mode)

set PROMPT_ORIGIN=AGY
set GEMINI_API_KEY=

cd /d "%~dp0"

echo --------------------------------------------------
echo [Git Sync] Syncing latest changes with GitHub...
if exist ".git" (
    git pull --rebase --autostash 2>nul
)

if not exist "C:\Users\TotalBiz\Documents\AI_Usage_Audit" mkdir "C:\Users\TotalBiz\Documents\AI_Usage_Audit"

if exist "C:\Users\TotalBiz\Documents\AI_Usage_Audit\log_session_start.ps1" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\TotalBiz\Documents\AI_Usage_Audit\log_session_start.ps1" -ProjectName "Takeaway"
)

echo.
echo [Antigravity CLI] Launching (Medium Effort)...
echo [Active Project] Takeaway (Direct Restaurant Ordering & Kitchen Portal)
echo [Global Audit]   C:\Users\TotalBiz\Documents\AI_Usage_Audit\global_usage_audit.csv
echo --------------------------------------------------
echo.

agy --effort medium --add-dir "C:\Users\TotalBiz\Documents\AI_Usage_Audit"

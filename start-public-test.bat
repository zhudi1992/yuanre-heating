@echo off
chcp 65001 >nul
title 远热供暖调度 - 公测版
echo ============================================
echo   远热供暖调度系统 - 公测版
echo ============================================
echo.

echo [1/3] 正在启动后端...
cd /d "C:\Users\33565\Desktop\远热供暖调度\server"
start /B node server.js
timeout /t 3 /nobreak >nul

echo [2/3] 正在连接 Cloudflare 隧道...
echo.
echo 公网地址生成中，请稍候...
echo.

C:\Users\33565\AppData\Local\Temp\cloudflared.exe tunnel --url http://localhost:3001 --no-autoupdate

pause

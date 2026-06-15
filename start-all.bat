@echo off
title 远热供暖调度系统
echo ========================================
echo  远热公司 - 供暖调度系统
echo  启动中...
echo ========================================
echo.

rem 启动后端
echo [1/2] 启动后端服务 (端口 3001)...
start "远热调度-后端" cmd /c "cd /d %~dp0server && node server.js"

timeout /t 2 /nobreak >nul

rem 启动前端
echo [2/2] 启动前端服务 (端口 5173)...
start "远热调度-前端" cmd /c "cd /d %~dp0client && npx vite --host"

echo.
echo ========================================
echo  后端: http://localhost:3001
echo  前端: http://localhost:5173
echo ========================================
echo.
pause

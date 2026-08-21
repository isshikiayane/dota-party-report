@echo off
chcp 65001 >nul
title Dota 2 开黑档案
cd /d "%~dp0"

set "DOTA_NODE=%~dp0runtime\node.exe"
if not exist "%DOTA_NODE%" set "DOTA_NODE=node"

"%DOTA_NODE%" --version >nul 2>&1
if errorlevel 1 (
  echo.
  echo 无法启动：没有找到运行环境。
  echo 请下载“Windows 免安装版”完整压缩包，解压后再双击本文件。
  echo.
  pause
  exit /b 1
)

echo.
echo ========================================
echo   Dota 2 开黑档案正在启动
echo ========================================
echo.
echo 浏览器将自动打开：http://localhost:3000
echo 请保持这个窗口开启；关闭窗口即停止服务。
echo.

if not defined OPEN_BROWSER set "OPEN_BROWSER=1"
"%DOTA_NODE%" server\index.js

echo.
echo 服务已经停止。
pause

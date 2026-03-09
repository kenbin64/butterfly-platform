@echo off
REM ButterflyFX Games — Local Development Server (Windows)
REM
REM Usage: run_dev_server.bat
REM
REM This script starts a local HTTP server for development and testing.
REM The game will open automatically in your default browser.

echo.
echo ============================================================
echo ButterflyFX Games - Local Development Server
echo ============================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.7+ from https://www.python.org/
    pause
    exit /b 1
)

REM Run the dev server
python dev_server.py

pause

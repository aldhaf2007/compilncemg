@echo off
echo ==========================================
echo CMS System - Windows Initial Setup
echo ==========================================

echo [1/3] Checking Python installation...
python --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo Error: Python is not installed or not added to PATH.
    echo Please install Python 3.9 or newer from python.org and ensure "Add Python to PATH" is checked during installation.
    pause
    exit /b 1
)

echo [2/3] Installing dependencies...
pip install -r requirements.txt
IF %ERRORLEVEL% NEQ 0 (
    echo Error installing dependencies.
    pause
    exit /b 1
)

echo [3/3] Initializing SQLite database...
python db_setup.py
IF %ERRORLEVEL% NEQ 0 (
    echo Error initializing database.
    pause
    exit /b 1
)

echo ==========================================
echo Setup completed successfully!
echo You can now double-click "run.bat" to start the application.
echo ==========================================
pause

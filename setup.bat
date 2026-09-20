@echo off
setlocal enabledelayedexpansion

title Complaint Management System (CMS) - Windows Setup
color 0B

echo ==============================================================
echo    Complaint Management System (CMS) - Windows Setup
echo ==============================================================
echo.

cd /d "%~dp0"

:: Check Python
echo [1/5] Checking Python installation...
set "PYTHON_EXE="
python --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set "PYTHON_EXE=python"
) else (
    py --version >nul 2>&1
    if %ERRORLEVEL% EQU 0 set "PYTHON_EXE=py"
)

if "%PYTHON_EXE%"=="" (
    echo Python is not detected on your system.
    echo Attempting to install Python via winget...
    winget install -e --id Python.Python.3.11 --accept-package-agreements --accept-source-agreements
    pause
    exit /b 1
)

:: Check MySQL
echo [2/5] Checking MySQL installation...
mysql --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    if exist "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" (
        set "PATH=C:\Program Files\MySQL\MySQL Server 8.4\bin;%PATH%"
    ) else if exist "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" (
        set "PATH=C:\Program Files\MySQL\MySQL Server 8.0\bin;%PATH%"
    ) else if exist "C:\xampp\mysql\bin\mysql.exe" (
        set "PATH=C:\xampp\mysql\bin;%PATH%"
    )
)

:: Ensure MySQL service running
echo [3/5] Starting MySQL service...
net start MySQL84 >nul 2>&1
net start MySQL80 >nul 2>&1
net start MySQL >nul 2>&1
net start MariaDB >nul 2>&1

:: Create .env if not present
if not exist ".env" (
    copy .env.example .env >nul
)

:: Virtual environment & pip
echo [4/5] Setting up virtual environment & dependencies...
if not exist "venv\Scripts\activate.bat" (
    %PYTHON_EXE% -m venv --system-site-packages venv
)

if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
    set "RUN_PY=python"
) else (
    set "RUN_PY=%PYTHON_EXE%"
)

%RUN_PY% -m pip install --upgrade pip -q
%RUN_PY% -m pip install -r requirements.txt -q

:: Initialize database
echo [5/5] Initializing MySQL database and tables...
%RUN_PY% db_setup.py

echo.
echo ==============================================================
echo Setup completed successfully!
echo You can now double-click "run.bat" or "setup_and_run.bat" to start.
echo ==============================================================
pause

@echo off
setlocal enabledelayedexpansion

title Complaint Management System (CMS) - Windows Setup and Run
color 0B

echo ==============================================================
echo    Complaint Management System (CMS) - Windows Setup ^& Run
echo ==============================================================
echo.

cd /d "%~dp0"

:: 1. Check Python
echo [1/6] Checking Python installation...
set "PYTHON_EXE="
python --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set "PYTHON_EXE=python"
) else (
    py --version >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        set "PYTHON_EXE=py"
    )
)

if "%PYTHON_EXE%"=="" (
    echo Python is not detected on your system.
    echo Attempting to install Python via Windows Package Manager (winget)...
    winget --version >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        winget install -e --id Python.Python.3.11 --accept-package-agreements --accept-source-agreements
        echo Python installation initiated. Please restart this script once installation finishes.
        pause
        exit /b 1
    ) else (
        echo Error: Neither Python nor winget was found.
        echo Please download and install Python 3.9+ from https://www.python.org/downloads/
        echo Make sure to CHECK the box "Add python.exe to PATH" during installation!
        pause
        exit /b 1
    )
)

for /f "tokens=*" %%v in ('%PYTHON_EXE% --version') do echo [OK] Found %%v

:: 2. Check for MySQL installation
echo.
echo [2/6] Checking MySQL / MariaDB Server installation...
set "MYSQL_FOUND=0"

mysql --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set "MYSQL_FOUND=1"
    echo [OK] MySQL client found in system PATH.
) else (
    :: Check standard Windows install locations
    if exist "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" (
        set "PATH=C:\Program Files\MySQL\MySQL Server 8.4\bin;%PATH%"
        set "MYSQL_FOUND=1"
        echo [OK] Found MySQL Server 8.4 in Program Files.
    ) else if exist "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" (
        set "PATH=C:\Program Files\MySQL\MySQL Server 8.0\bin;%PATH%"
        set "MYSQL_FOUND=1"
        echo [OK] Found MySQL Server 8.0 in Program Files.
    ) else if exist "C:\xampp\mysql\bin\mysql.exe" (
        set "PATH=C:\xampp\mysql\bin;%PATH%"
        set "MYSQL_FOUND=1"
        echo [OK] Found MySQL in C:\xampp\mysql\bin.
    )
)

:: Check if MySQL Windows service is registered
sc query MySQL84 >nul 2>&1
if %ERRORLEVEL% EQU 0 set "MYSQL_FOUND=1"
sc query MySQL80 >nul 2>&1
if %ERRORLEVEL% EQU 0 set "MYSQL_FOUND=1"
sc query MySQL >nul 2>&1
if %ERRORLEVEL% EQU 0 set "MYSQL_FOUND=1"
sc query MariaDB >nul 2>&1
if %ERRORLEVEL% EQU 0 set "MYSQL_FOUND=1"

if "%MYSQL_FOUND%"=="0" (
    echo MySQL does not appear to be installed on this Windows PC.
    echo Attempting to install MySQL Server via winget...
    winget --version >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo Running: winget install Oracle.MySQL ...
        winget install -e --id Oracle.MySQL --accept-package-agreements --accept-source-agreements
        if %ERRORLEVEL% NEQ 0 (
            echo Trying MariaDB.Server as alternative...
            winget install -e --id MariaDB.Server --accept-package-agreements --accept-source-agreements
        )
    ) else (
        echo Windows Package Manager (winget) is not available.
        echo Please install MySQL Server manually from:
        echo https://dev.mysql.com/downloads/installer/
        echo (or install XAMPP from https://www.apachefriends.org/)
        pause
    )
)

:: 3. Ensure MySQL service is running
echo.
echo [3/6] Verifying MySQL service is active...
net start MySQL84 >nul 2>&1
net start MySQL80 >nul 2>&1
net start MySQL >nul 2>&1
net start MariaDB >nul 2>&1

:: 4. Check configuration (.env)
echo.
echo [4/6] Checking configuration (.env)...
if not exist ".env" (
    echo Creating .env from .env.example...
    copy .env.example .env >nul
    echo [OK] Created .env file. You can edit database credentials in this file anytime.
) else (
    echo [OK] Existing .env file found.
)

:: 5. Python virtual environment & dependencies
echo.
echo [5/6] Setting up virtual environment and installing packages...
if not exist "venv\Scripts\activate.bat" (
    echo Creating virtual environment in .\venv ...
    %PYTHON_EXE% -m venv --system-site-packages venv
    if %ERRORLEVEL% NEQ 0 (
        echo Error creating venv with system packages, trying standard venv...
        %PYTHON_EXE% -m venv venv
    )
)

if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
    set "RUN_PY=python"
) else (
    set "RUN_PY=%PYTHON_EXE%"
)

echo Checking dependencies...
%RUN_PY% -c "import flask, mysql.connector, jwt, werkzeug, cryptography" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Installing required packages from requirements.txt...
    %RUN_PY% -m pip install --upgrade pip -q
    %RUN_PY% -m pip install -r requirements.txt -q
)
echo [OK] Dependencies ready.

:: 6. Initialize database and schema
echo.
echo [6/6] Initializing MySQL database and tables...
%RUN_PY% db_setup.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [NOTE] If MySQL connection failed because your root user has a password,
    echo open the .env file in Notepad and set DB_PASSWORD=your_password
    echo Then run this script again.
    pause
    exit /b 1
)

:: Launch
cls
color 0A
echo ==============================================================
echo    CMS System Setup Successful! Server is launching...
echo ==============================================================
echo.
echo Access the web application in your browser:
echo    http://localhost:5000/  or  http://127.0.0.1:5000/
echo.
echo Default Seeded Accounts:
echo    • Administrator : admin     / admin123
echo    • Staff (IT)    : staff_it  / staff123
echo    • Staff (HR)    : staff_hr  / staff123
echo    • Staff (Ops)   : staff_ops / staff123
echo    • Staff (Fin)   : staff_fin / staff123
echo    • Complainant   : john_doe  / john123
echo.
echo Press CTRL+C in this console window to stop the server.
echo ==============================================================
echo.

start "" http://localhost:5000/
%RUN_PY% app.py

pause

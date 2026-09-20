# ==============================================================================
# Complaint Management System (CMS) - Windows PowerShell Automated Setup & Run
# ==============================================================================

Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "   Complaint Management System (CMS) - PowerShell Setup & Run" -ForegroundColor Cyan
Write-Host "==============================================================" -ForegroundColor Cyan

Set-Location -Path $PSScriptRoot

# 1. Check Python
Write-Host "`n[1/6] Checking Python installation..." -ForegroundColor Yellow
$PythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $PythonCmd) {
    $PythonCmd = Get-Command py -ErrorAction SilentlyContinue
}

if (-not $PythonCmd) {
    Write-Host "Python was not found. Attempting to install via winget..." -ForegroundColor Yellow
    $WingetCmd = Get-Command winget -ErrorAction SilentlyContinue
    if ($WingetCmd) {
        winget install -e --id Python.Python.3.11 --accept-package-agreements --accept-source-agreements
        Write-Host "Please restart this script once Python installation finishes." -ForegroundColor Green
        Pause
        Exit 1
    } else {
        Write-Host "Please install Python 3.9+ from https://www.python.org/downloads/ (Remember to check 'Add to PATH')." -ForegroundColor Red
        Pause
        Exit 1
    }
}
Write-Host "Found Python: $(& $PythonCmd.Name --version)" -ForegroundColor Green

# 2. Check MySQL / MariaDB Server
Write-Host "`n[2/6] Checking MySQL / MariaDB Server..." -ForegroundColor Yellow
$MysqlCmd = Get-Command mysql -ErrorAction SilentlyContinue
if (-not $MysqlCmd) {
    # Check standard directories
    $Candidates = @(
        "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe",
        "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
        "C:\xampp\mysql\bin\mysql.exe"
    )
    foreach ($cand in $Candidates) {
        if (Test-Path $cand) {
            $binDir = Split-Path -Path $cand -Parent
            $env:Path = "$binDir;" + $env:Path
            $MysqlCmd = Get-Command mysql -ErrorAction SilentlyContinue
            Write-Host "Found MySQL at $cand" -ForegroundColor Green
            break
        }
    }
}

if (-not $MysqlCmd) {
    Write-Host "MySQL is not installed. Attempting installation via winget..." -ForegroundColor Yellow
    $WingetCmd = Get-Command winget -ErrorAction SilentlyContinue
    if ($WingetCmd) {
        winget install -e --id Oracle.MySQL --accept-package-agreements --accept-source-agreements
    } else {
        Write-Host "Please download MySQL Server from https://dev.mysql.com/downloads/installer/ or install XAMPP." -ForegroundColor Yellow
    }
}

# 3. Ensure MySQL service is running
Write-Host "`n[3/6] Checking MySQL Windows Service..." -ForegroundColor Yellow
$Services = @("MySQL84", "MySQL80", "MySQL", "MariaDB")
foreach ($sName in $Services) {
    $svc = Get-Service -Name $sName -ErrorAction SilentlyContinue
    if ($svc) {
        if ($svc.Status -ne 'Running') {
            Write-Host "Starting service $sName..." -ForegroundColor Cyan
            Start-Service -Name $sName -ErrorAction SilentlyContinue
        } else {
            Write-Host "Service $sName is running." -ForegroundColor Green
        }
    }
}

# 4. Check .env configuration
Write-Host "`n[4/6] Checking configuration (.env)..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env file. Database credentials can be configured there." -ForegroundColor Green
} else {
    Write-Host "Existing .env file found." -ForegroundColor Green
}

# 5. Virtual Environment & Dependencies
Write-Host "`n[5/6] Setting up virtual environment & installing dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "venv\Scripts\Activate.ps1")) {
    & $PythonCmd.Name -m venv venv
}

$VenvPython = "venv\Scripts\python.exe"
if (-not (Test-Path $VenvPython)) {
    $VenvPython = $PythonCmd.Name
}

& $VenvPython -m pip install --upgrade pip -q
& $VenvPython -m pip install -r requirements.txt -q
Write-Host "Dependencies installed." -ForegroundColor Green

# 6. Initialize Database and Tables
Write-Host "`n[6/6] Initializing database and tables..." -ForegroundColor Yellow
& $VenvPython db_setup.py

Write-Host "`n==============================================================" -ForegroundColor Cyan
Write-Host "   Setup complete! Launching server..." -ForegroundColor Green
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "Open browser at: http://localhost:5000/" -ForegroundColor Cyan
Write-Host "Default login: admin / admin123" -ForegroundColor Green
Write-Host "Press CTRL+C to stop the server.`n"

Start-Process "http://localhost:5000/"
& $VenvPython app.py

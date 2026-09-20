@echo off
title Complaint Management System (CMS) Server
color 0A

cd /d "%~dp0"

echo ==============================================================
echo    Starting Complaint Management System (CMS) Server
echo ==============================================================
echo.
echo Web portal: http://localhost:5000/
echo Keep this window open while using the application.
echo Press CTRL+C to stop the server.
echo ==============================================================
echo.

if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
    python app.py
) else (
    python app.py
)

pause

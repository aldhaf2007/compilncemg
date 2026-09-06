#!/bin/bash
echo "=========================================="
echo "CMS System - Linux/macOS Initial Setup"
echo "=========================================="

echo "[1/3] Checking Python installation..."
if ! command -v python3 &> /dev/null
then
    echo "Error: python3 could not be found. Please install Python 3.9+."
    exit 1
fi

echo "[2/3] Installing dependencies..."
python3 -m pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "Error installing dependencies."
    exit 1
fi

echo "[3/3] Initializing SQLite database..."
python3 db_setup.py
if [ $? -ne 0 ]; then
    echo "Error initializing database."
    exit 1
fi

echo "=========================================="
echo "Setup completed successfully!"
echo "You can now run './run.sh' to start the application."
echo "=========================================="

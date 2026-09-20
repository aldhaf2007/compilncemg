#!/usr/bin/env bash
# ==============================================================================
# CMS System - Linux Initial Setup (Dependencies + MySQL Configuration)
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================="
echo "CMS System - Linux Initial Setup"
echo "=========================================="

# 1. Check Python
echo "[1/4] Checking Python installation..."
if ! command -v python3 &> /dev/null; then
    echo "Python 3 could not be found. Please install Python 3.9+."
    exit 1
fi

# 2. Check MySQL / MariaDB
echo "[2/4] Checking MySQL / MariaDB Server..."
if ! command -v mysql &> /dev/null && ! command -v mariadb &> /dev/null; then
    echo "MySQL/MariaDB client not found. Running full automated setup..."
    ./setup_and_run.sh
    exit $?
fi

# 3. Environment & Dependencies
echo "[3/4] Setting up virtual environment & dependencies..."
if [ ! -d "venv" ]; then
    python3 -m venv --system-site-packages venv || {
        echo "Failed to create virtual environment. Ensure python3-venv is installed."
        exit 1
    }
fi

source venv/bin/activate
if ! python3 -c "import flask, mysql.connector, jwt, werkzeug, cryptography" &>/dev/null; then
    echo "Installing requirements via pip..."
    pip install -r requirements.txt || true
fi

# 4. Database Setup
echo "[4/4] Initializing MySQL database and tables..."
python3 db_setup.py

echo "=========================================="
echo "Setup completed successfully!"
echo "Run './run.sh' or './setup_and_run.sh' to start the application."
echo "=========================================="

#!/usr/bin/env bash
# ==============================================================================
# CMS System - Linux Quick Run
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
fi

echo "=========================================="
echo "Starting Complaint Management System (CMS)"
echo "Web portal: http://localhost:5000/"
echo "Press CTRL+C to stop the server."
echo "=========================================="

python3 app.py

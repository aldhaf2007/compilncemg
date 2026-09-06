#!/bin/bash
echo "=========================================="
echo "Starting CMS - Complaint Management System"
echo "=========================================="

if [ ! -f "complaints.db" ]; then
    echo "Database not found. Running initial setup..."
    python3 db_setup.py
fi

echo "Server starting at http://127.0.0.1:5000"
echo "Press Ctrl+C to stop the server."
python3 app.py

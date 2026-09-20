#!/usr/bin/env bash
# ==============================================================================
# Complaint Management System (CMS) - Automated Setup & Run for Linux
# Automatically installs Python dependencies, checks/installs/configures MySQL,
# sets up the database and tables, and launches the web application.
# ==============================================================================

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}==============================================================${NC}"
echo -e "${CYAN}   Complaint Management System (CMS) - Linux Setup & Run     ${NC}"
echo -e "${CYAN}==============================================================${NC}"

# 1. Determine script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 2. Check for Python 3
echo -e "\n${YELLOW}[1/6] Checking Python 3 installation...${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Python 3 is not installed.${NC} Attempting to install Python 3..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y python3 python3-pip python3-venv
    elif command -v dnf &> /dev/null; then
        sudo dnf install -y python3 python3-pip
    elif command -v yum &> /dev/null; then
        sudo yum install -y python3 python3-pip
    elif command -v pacman &> /dev/null; then
        sudo pacman -Sy --noconfirm python python-pip
    else
        echo -e "${RED}Could not auto-install Python 3. Please install Python 3.9+ manually.${NC}"
        exit 1
    fi
fi
PYTHON_VERSION=$(python3 --version)
echo -e "${GREEN}✓ Found ${PYTHON_VERSION}${NC}"

# 3. Check / Install MySQL or MariaDB Server
echo -e "\n${YELLOW}[2/6] Checking MySQL / MariaDB Server...${NC}"
MYSQL_CMD=""
if command -v mysql &> /dev/null; then
    MYSQL_CMD="mysql"
elif command -v mariadb &> /dev/null; then
    MYSQL_CMD="mariadb"
fi

if [ -z "$MYSQL_CMD" ]; then
    echo -e "${YELLOW}MySQL/MariaDB is not detected on your system.${NC}"
    echo "Installing MySQL Server automatically..."
    
    if command -v apt-get &> /dev/null; then
        sudo apt-get update
        sudo apt-get install -y mysql-server || sudo apt-get install -y mariadb-server
    elif command -v dnf &> /dev/null; then
        sudo dnf install -y mysql-server || sudo dnf install -y mariadb-server
    elif command -v yum &> /dev/null; then
        sudo yum install -y mysql-server || sudo yum install -y mariadb-server
    elif command -v pacman &> /dev/null; then
        sudo pacman -Sy --noconfirm mariadb
        sudo mariadb-install-db --user=mysql --basedir=/usr --datadir=/var/lib/mysql
    elif command -v zypper &> /dev/null; then
        sudo zypper install -y mariadb
    else
        echo -e "${RED}Unsupported package manager. Please install MySQL Server manually.${NC}"
        exit 1
    fi
    
    # Re-check command
    if command -v mysql &> /dev/null; then
        MYSQL_CMD="mysql"
    elif command -v mariadb &> /dev/null; then
        MYSQL_CMD="mariadb"
    fi
fi
echo -e "${GREEN}✓ MySQL / MariaDB client found: ${MYSQL_CMD}${NC}"

# 4. Ensure MySQL service is running
echo -e "\n${YELLOW}[3/6] Ensuring MySQL / MariaDB service is active...${NC}"
SERVICE_NAME=""
if systemctl list-unit-files 2>/dev/null | grep -E -q "mysql\.service"; then
    SERVICE_NAME="mysql"
elif systemctl list-unit-files 2>/dev/null | grep -E -q "mariadb\.service"; then
    SERVICE_NAME="mariadb"
elif command -v service &> /dev/null; then
    SERVICE_NAME="mysql"
fi

if [ -n "$SERVICE_NAME" ]; then
    if ! systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
        echo "Starting ${SERVICE_NAME} service..."
        sudo systemctl start "$SERVICE_NAME" 2>/dev/null || sudo service "$SERVICE_NAME" start 2>/dev/null || true
        sudo systemctl enable "$SERVICE_NAME" 2>/dev/null || true
    fi
fi

# Verify MySQL server is alive
if mysqladmin -u root ping &>/dev/null || $MYSQL_CMD -u root -e "SELECT 1;" &>/dev/null; then
    echo -e "${GREEN}✓ MySQL server is running and accessible as root!${NC}"
else
    echo -e "${YELLOW}! MySQL is running, checking credentials via .env configuration.${NC}"
fi

# 5. Check or create .env file
echo -e "\n${YELLOW}[4/6] Checking configuration file (.env)...${NC}"
if [ ! -f ".env" ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env file.${NC}"
else
    echo -e "${GREEN}✓ Existing .env file found.${NC}"
fi

# 6. Setup Python Virtual Environment and Install Dependencies
echo -e "\n${YELLOW}[5/6] Setting up Python virtual environment & dependencies...${NC}"
if [ ! -d "venv" ]; then
    echo "Creating virtual environment in ./venv..."
    python3 -m venv --system-site-packages venv || {
        echo -e "${YELLOW}python3-venv missing. Attempting to install...${NC}"
        if command -v apt-get &> /dev/null; then
            sudo apt-get install -y python3-venv python3-pip
        fi
        python3 -m venv --system-site-packages venv
    }
fi

source venv/bin/activate
echo "Checking Python package requirements..."
if ! python3 -c "import flask, mysql.connector, jwt, werkzeug, cryptography" &>/dev/null; then
    echo "Installing missing requirements via pip..."
    pip install -r requirements.txt || {
        echo -e "${YELLOW}Warning: Pip install encountered an issue (e.g. offline). Checking if core modules exist...${NC}"
    }
fi

if python3 -c "import flask, mysql.connector, jwt, werkzeug, cryptography" &>/dev/null; then
    echo -e "${GREEN}✓ Python dependencies are ready!${NC}"
else
    echo -e "${RED}Error: Some dependencies could not be imported. Please run: pip install -r requirements.txt${NC}"
    exit 1
fi

# 7. Initialize Database and Tables
echo -e "\n${YELLOW}[6/6] Initializing MySQL database and schema...${NC}"
python3 db_setup.py

echo -e "\n${CYAN}==============================================================${NC}"
echo -e "${GREEN}   Setup completed successfully! System is ready to launch.  ${NC}"
echo -e "${CYAN}==============================================================${NC}"
echo -e "Access the system in your web browser at:"
echo -e "   ${CYAN}http://localhost:5000/${NC} or ${CYAN}http://127.0.0.1:5000/${NC}"
echo ""
echo -e "Default seeded accounts for testing:"
echo -e "   • Administrator : ${GREEN}admin${NC}     / ${GREEN}admin123${NC}"
echo -e "   • Staff (IT)    : ${GREEN}staff_it${NC}  / ${GREEN}staff123${NC}"
echo -e "   • Staff (HR)    : ${GREEN}staff_hr${NC}  / ${GREEN}staff123${NC}"
echo -e "   • Staff (Ops)   : ${GREEN}staff_ops${NC} / ${GREEN}staff123${NC}"
echo -e "   • Staff (Fin)   : ${GREEN}staff_fin${NC} / ${GREEN}staff123${NC}"
echo -e "   • Complainant   : ${GREEN}john_doe${NC}  / ${GREEN}john123${NC}"
echo -e "${CYAN}--------------------------------------------------------------${NC}"
echo "Starting Flask Server (Press CTRL+C to stop)..."
python3 app.py

# Complaint Management System (CMS)

A modern, full-stack Complaint Management System built with Python Flask, RESTful APIs, JWT Authentication, MySQL, and a responsive web dashboard.

---

## 🌟 Key Features

- **Permanent MySQL Database**: High-performance relational database storage (`complaint_db`) supporting InnoDB foreign keys, cascades, and ACID compliance.
- **Automated 1-Command Setup for Windows and Linux**: Automated script detects your OS, checks if MySQL is installed, automatically installs & starts MySQL Server if missing, installs Python dependencies, creates the database schema, and starts the server.
- **Role-Based Access Control (RBAC)**:
  - **Complainant**: Submit new complaints, attach evidence files, track status updates in real-time.
  - **Staff**: View assigned department complaints, update status, add audit logs/resolutions.
  - **Admin**: Full system access to manage users, reassign complaints, view global analytics.
- **Automated Department Routing Engine**: Automatically routes complaints to department staff (HR, IT, Finance, Operations) based on category.
- **Evidence & File Attachment**: Support for image, document, and PDF evidence uploads (`.png`, `.jpg`, `.pdf`, `.docx`, etc.).
- **JWT Token Authentication**: Secure token-based API authentication with automatic expiry.
- **Interactive Dashboard & Analytics**: Visual charts powered by Chart.js displaying complaint resolution stats and department workloads.
- **Notification Engine**: Optional email notifications via SMTP and SMS notifications via Twilio.

---

## 📁 Project Structure

```text
compilncemg/
├── app.py                # Main Flask application (REST API & Web Server)
├── config.py             # Configuration settings & MySQL connection factory
├── db_setup.py           # MySQL database schema initialization & seed script
├── requirements.txt      # Python dependencies (Flask, mysql-connector-python, etc.)
├── setup_and_run.sh      # 1-Click Automated Setup & Launcher for Linux / macOS
├── setup_and_run.bat     # 1-Click Automated Setup & Launcher for Windows (Command Prompt)
├── setup_and_run.ps1     # 1-Click Automated Setup & Launcher for Windows (PowerShell)
├── setup.sh / setup.bat  # Dependency & MySQL initialization only
├── run.sh / run.bat      # Quick application launcher
├── Procfile              # Production Web process declaration
├── render.yaml           # Cloud deployment blueprint
├── static/               # Frontend UI assets
│   ├── css/              # Stylesheets
│   ├── js/               # Frontend JavaScript & Chart integrations
│   ├── login.html        # Authentication portal
│   ├── register.html     # Registration view
│   └── dashboard.html    # Main interactive dashboard
└── uploads/              # Evidence file upload directory
```

---

## 🚀 1-Command Quick Start

### On Linux / macOS:
Open a terminal in this project folder and run:
```bash
./setup_and_run.sh
```
*What this does automatically:*
1. Checks for Python 3 and creates an isolated virtual environment (`venv`).
2. Checks if MySQL or MariaDB is installed. **If not installed, it automatically installs and starts it via your system package manager (`apt`, `dnf`, `yum`, `pacman`, or `zypper`)**.
3. Installs all required Python libraries.
4. Initializes the `complaint_db` database, creates all relational tables, and seeds initial users.
5. Launches the Flask server at `http://localhost:5000/`.

---

### On Windows:
Double-click **`setup_and_run.bat`** (or right-click `setup_and_run.ps1` and choose "Run with PowerShell"):
```cmd
setup_and_run.bat
```
*What this does automatically:*
1. Checks for Python (and auto-installs via `winget` if missing).
2. Checks for MySQL / MariaDB Server. **If missing, it automatically installs MySQL Server via `winget` and starts the service**.
3. Sets up a local virtual environment and installs Python dependencies.
4. Initializes the `complaint_db` database and schema.
5. Automatically opens your browser at `http://localhost:5000/` and starts the server.

---

## 🔑 Default Test Accounts

| Role | Username | Password | Department |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin` | `admin123` | System Master |
| **Staff (IT)** | `staff_it` | `staff123` | IT Support |
| **Staff (HR)** | `staff_hr` | `staff123` | Human Resources |
| **Staff (Operations)** | `staff_ops` | `staff123` | Operations |
| **Staff (Finance)** | `staff_fin` | `staff123` | Finance |
| **Complainant** | `john_doe` | `john123` | Standard User |

---

## ⚙️ Configuration (.env)

If your MySQL instance has a custom password or remote host, create/edit `.env`:

```ini
# MySQL Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=complaint_db

# Security
JWT_SECRET=super-secret-key-1234567890-cms-system
JWT_EXPIRY_HOURS=24
```

---

## 🧪 Verification & Testing

To test the database and all API endpoints programmatically:
```bash
python3 -c "from app import app; from db_setup import setup_database; setup_database(); client=app.test_client(); resp=client.post('/api/auth/login', json={'username':'admin','password':'admin123'}); print('Status:', resp.status_code)"
```

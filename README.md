# Complaint Management System (CMS)

A modern, full-stack Complaint Management System built with Python Flask, RESTful APIs, JWT Authentication, SQLite, and a responsive web dashboard.

---

## 🌟 Key Features

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
├── app.py              # Main Flask application (REST API & Web Server)
├── config.py           # Configuration settings & Environment variables
├── db_setup.py         # SQLite database schema initialization & seed script
├── convert_sqlite.py   # Database migration/utility helper
├── requirements.txt    # Python package dependencies
├── setup.bat / .sh     # Automated setup script (Windows / Linux)
├── run.bat / .sh       # Application launcher script (Windows / Linux)
├── static/             # Frontend UI assets
│   ├── css/            # Stylesheets
│   ├── js/             # Frontend JavaScript & Chart integrations
│   ├── login.html      # Authentication portal
│   ├── register.html   # Registration view
│   └── dashboard.html  # Main interactive dashboard
└── uploads/            # Evidence file upload directory
```

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.9 or higher installed.

### 1. Installation

#### On Linux / macOS:
```bash
./setup.sh
```

#### On Windows:
Double-click `setup.bat` or run:
```cmd
setup.bat
```

*This will automatically install required Python packages and initialize the SQLite database (`complaints.db`).*

---

### 2. Configuration (Optional)

Copy `.env.example` to `.env` to customize settings:

```bash
cp .env.example .env
```

Available environment variables:
- `JWT_SECRET`: Custom secret key for signing tokens.
- `SMTP_SERVER`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`: Email notification settings.
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`: SMS notification settings.

---

### 3. Running the Application

#### On Linux / macOS:
```bash
./run.sh
```

#### On Windows:
Double-click `run.bat` or run:
```cmd
run.bat
```

Open your browser and navigate to:
**`http://127.0.0.1:5000`**

---

## 🔑 Default Test Accounts

Initial seed users pre-populated by `db_setup.py`:

| Username | Password | Role | Department |
| :--- | :--- | :--- | :--- |
| `admin` | `admin123` | **Admin** | *System Admin* |
| `staff_hr` | `staff123` | **Staff** | Human Resources |
| `staff_it` | `staff123` | **Staff** | IT |
| `staff_fin` | `staff123` | **Staff** | Finance |
| `staff_ops` | `staff123` | **Staff** | Operations |
| `john_doe` | `john123` | **Complainant** | *N/A* |

---

## 🔌 API Endpoints Summary

- `POST /api/register` - User registration
- `POST /api/login` - User authentication & JWT generation
- `GET /api/complaints` - Fetch complaints list (role-filtered)
- `POST /api/complaints` - File a new complaint (with optional evidence file upload)
- `PUT /api/complaints/<id>` - Update complaint status/assignment
- `GET /api/dashboard/stats` - Fetch aggregate stats for charts

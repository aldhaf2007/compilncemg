import sqlite3
from werkzeug.security import generate_password_hash
from config import Config
import os

def setup_database():
    print("Connecting to SQLite database...")
    try:
        conn = sqlite3.connect(Config.DB_FILE_PATH)
        cursor = conn.cursor()
    except Exception as e:
        print(f"Failed to connect to SQLite: {e}")
        return

    # Enable foreign keys
    cursor.execute("PRAGMA foreign_keys = ON;")

    # Create tables
    print("Creating tables...")

    # 1. users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username VARCHAR(50) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(50) NOT NULL,
            department VARCHAR(50) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 2. complaints table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS complaints (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            complainant_id INTEGER NOT NULL,
            title VARCHAR(150) NOT NULL,
            description TEXT NOT NULL,
            category VARCHAR(50) NOT NULL,
            priority VARCHAR(50) NOT NULL DEFAULT 'Low',
            status VARCHAR(50) NOT NULL DEFAULT 'Filed',
            evidence_url VARCHAR(255) DEFAULT NULL,
            assigned_to INTEGER DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (complainant_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
        )
    """)

    # 3. audit_logs table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            complaint_id INTEGER DEFAULT NULL,
            staff_id INTEGER NOT NULL,
            action VARCHAR(255) NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE SET NULL
        )
    """)

    # Seed users
    print("Seeding initial users if they do not exist...")
    users_to_seed = [
        # username, password, role, department
        ('admin', 'admin123', 'Admin', None),
        ('staff_hr', 'staff123', 'Staff', 'Human Resources'),
        ('staff_it', 'staff123', 'Staff', 'IT'),
        ('staff_fin', 'staff123', 'Staff', 'Finance'),
        ('staff_ops', 'staff123', 'Staff', 'Operations'),
        ('john_doe', 'john123', 'Complainant', None)
    ]

    for username, password, role, dept in users_to_seed:
        cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
        if not cursor.fetchone():
            pwd_hash = generate_password_hash(password)
            cursor.execute(
                "INSERT INTO users (username, password_hash, role, department) VALUES (?, ?, ?, ?)",
                (username, pwd_hash, role, dept)
            )
            print(f"Seeded user: {username}")

    conn.commit()
    cursor.close()
    conn.close()
    print("Database setup completed successfully!")

if __name__ == "__main__":
    setup_database()

import mysql.connector
from mysql.connector import Error
from werkzeug.security import generate_password_hash
from config import Config, get_mysql_connection_args

def setup_database():
    conn_args = get_mysql_connection_args(with_database=False)
    target_info = conn_args.get('unix_socket') or f"{conn_args.get('host')}:{conn_args.get('port')}"
    print(f"Connecting to MySQL server at {target_info} as '{conn_args.get('user')}'...")

    try:
        conn = mysql.connector.connect(**conn_args)
        cursor = conn.cursor()
    except Error as e:
        print(f"Failed to connect to MySQL server: {e}")
        print("Please ensure MySQL is running and credentials in config.py / .env are correct.")
        return False

    try:
        # Create database if it does not exist
        print(f"Ensuring database '{Config.DB_NAME}' exists...")
        cursor.execute(
            f"CREATE DATABASE IF NOT EXISTS `{Config.DB_NAME}` "
            "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
        )
        cursor.execute(f"USE `{Config.DB_NAME}`;")

        # Create tables
        print("Ensuring tables exist...")

        # 1. users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role ENUM('Complainant', 'Staff', 'Admin') NOT NULL,
                department VARCHAR(50) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """)

        # 2. complaints table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS complaints (
                id INT AUTO_INCREMENT PRIMARY KEY,
                complainant_id INT NOT NULL,
                title VARCHAR(150) NOT NULL,
                description TEXT NOT NULL,
                category VARCHAR(50) NOT NULL,
                priority ENUM('Low', 'Medium', 'High', 'Critical') NOT NULL DEFAULT 'Low',
                status ENUM('Filed', 'In Progress', 'Escalated', 'Resolved') NOT NULL DEFAULT 'Filed',
                evidence_url VARCHAR(255) DEFAULT NULL,
                assigned_to INT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (complainant_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """)

        # 3. audit_logs table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                complaint_id INT DEFAULT NULL,
                staff_id INT NOT NULL,
                action VARCHAR(255) NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """)

        # Seed users if they do not exist
        print("Checking initial users...")
        users_to_seed = [
            ('admin', 'admin123', 'Admin', None),
            ('staff_hr', 'staff123', 'Staff', 'Human Resources'),
            ('staff_it', 'staff123', 'Staff', 'IT'),
            ('staff_fin', 'staff123', 'Staff', 'Finance'),
            ('staff_ops', 'staff123', 'Staff', 'Operations'),
            ('john_doe', 'john123', 'Complainant', None)
        ]

        for username, password, role, dept in users_to_seed:
            cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
            if not cursor.fetchone():
                pwd_hash = generate_password_hash(password)
                cursor.execute(
                    "INSERT INTO users (username, password_hash, role, department) VALUES (%s, %s, %s, %s)",
                    (username, pwd_hash, role, dept)
                )
                print(f"Seeded initial user: {username} ({role})")

        # Seed an example complaint if the complaints table is empty
        cursor.execute("SELECT COUNT(*) FROM complaints")
        complaints_count = cursor.fetchone()[0]
        if complaints_count == 0:
            print("Seeding example complaint...")
            cursor.execute("SELECT id FROM users WHERE username = 'john_doe'")
            john_row = cursor.fetchone()
            cursor.execute("SELECT id FROM users WHERE username = 'staff_it'")
            staff_it_row = cursor.fetchone()

            if john_row and staff_it_row:
                john_id = john_row[0]
                staff_it_id = staff_it_row[0]
                cursor.execute("""
                    INSERT INTO complaints (complainant_id, title, description, category, priority, status, assigned_to)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    john_id,
                    "Air Conditioning Malfunction in Server Room B",
                    "The cooling units in Server Room B have ceased functioning. Temperature is currently rising at 1.5 degrees per hour, posing a thermal shutdown risk to server hardware.",
                    "IT",
                    "Critical",
                    "In Progress",
                    staff_it_id
                ))
                complaint_id = cursor.lastrowid
                cursor.execute("""
                    INSERT INTO audit_logs (complaint_id, staff_id, action)
                    VALUES (%s, %s, %s)
                """, (complaint_id, staff_it_id, "Complaint auto-assigned on creation based on IT category."))
                cursor.execute("""
                    INSERT INTO audit_logs (complaint_id, staff_id, action)
                    VALUES (%s, %s, %s)
                """, (complaint_id, staff_it_id, "Status updated from 'Filed' to 'In Progress'."))
                print("Seeded example complaint #1.")

        conn.commit()
        print("Database and tables initialized successfully!")
        return True
    except Error as e:
        print(f"Error during database setup: {e}")
        return False
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    success = setup_database()
    exit(0 if success else 1)

import sys
import re

with open('app.py', 'r') as f:
    content = f.read()

# Replace mysql.connector with sqlite3
content = content.replace("import mysql.connector\nfrom mysql.connector import Error", "import sqlite3\nfrom sqlite3 import Error")

# Replace get_db_connection
old_get_db = """# Helper to get database connection
def get_db_connection():
    return mysql.connector.connect(
        host=app.config['DB_HOST'],
        user=app.config['DB_USER'],
        password=app.config['DB_PASSWORD'],
        database=app.config['DB_NAME']
    )"""

new_get_db = """# Helper to get database connection
def get_db_connection(dictionary=False):
    conn = sqlite3.connect(app.config['DB_FILE_PATH'])
    if dictionary:
        conn.row_factory = sqlite3.Row
    return conn"""
content = content.replace(old_get_db, new_get_db)

# Replace db_cursor
old_db_cursor = """# Context manager to prevent connection leaks
@contextmanager
def db_cursor(dictionary=False):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=dictionary)
        yield cursor
        conn.commit()
    except Exception as e:
        if conn:
            conn.rollback()
        raise e
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()"""

new_db_cursor = """# Context manager to prevent connection leaks
@contextmanager
def db_cursor(dictionary=False):
    conn = None
    cursor = None
    try:
        conn = get_db_connection(dictionary)
        cursor = conn.cursor()
        yield cursor
        conn.commit()
    except Exception as e:
        if conn:
            conn.rollback()
        raise e
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()"""
content = content.replace(old_db_cursor, new_db_cursor)

# Replace TIMESTAMPDIFF for analytics
old_analytics = """            # Using TIMESTAMPDIFF in hours for complaints where status = 'Resolved'
            cursor.execute(\"\"\"
                SELECT AVG(TIMESTAMPDIFF(HOUR, created_at, updated_at)) as avg_hours 
                FROM complaints 
                WHERE status = 'Resolved'
            \"\"\")"""

new_analytics = """            # Using julianday in hours for complaints where status = 'Resolved'
            cursor.execute(\"\"\"
                SELECT AVG((julianday(updated_at) - julianday(created_at)) * 24) as avg_hours 
                FROM complaints 
                WHERE status = 'Resolved'
            \"\"\")"""
content = content.replace(old_analytics, new_analytics)

# Replace all %s with ? for SQL queries (since %s in app.py is only used for sql parameters)
content = content.replace("%s", "?")

with open('app.py', 'w') as f:
    f.write(content)

print("app.py converted to sqlite successfully!")

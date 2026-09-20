import os

# Optionally load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

class Config:
    # MySQL Database configuration
    DB_HOST = os.environ.get('DB_HOST', 'localhost')
    DB_PORT = int(os.environ.get('DB_PORT', 3306))
    DB_USER = os.environ.get('DB_USER', 'root')
    DB_PASSWORD = os.environ.get('DB_PASSWORD', '')
    DB_NAME = os.environ.get('DB_NAME', 'complaint_db')
    DB_UNIX_SOCKET = os.environ.get('DB_UNIX_SOCKET', '')

    # JWT Security configuration
    JWT_SECRET = os.environ.get('JWT_SECRET', 'super-secret-key-1234567890-cms-system')
    JWT_EXPIRY_HOURS = int(os.environ.get('JWT_EXPIRY_HOURS', 24))

    # File Upload configuration
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB limit
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf', 'doc', 'docx', 'txt'}

    # Notification settings (SMTP)
    SMTP_SERVER = os.environ.get('SMTP_SERVER', '')
    SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
    SMTP_USER = os.environ.get('SMTP_USER', '')
    SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
    SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'noreply@cms-system.com')

    # Notification settings (Twilio SMS)
    TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID', '')
    TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN', '')
    TWILIO_FROM_NUMBER = os.environ.get('TWILIO_FROM_NUMBER', '')
    COMPLAINANT_PHONE = os.environ.get('COMPLAINANT_PHONE', '')  # Target phone for simulation

def get_mysql_connection_args(with_database=False):
    """
    Returns appropriate connection kwargs for mysql.connector.
    Automatically detects local UNIX sockets on Linux for maximum speed and compatibility,
    while falling back to TCP host:port for Windows and remote database servers.
    """
    args = {
        'user': Config.DB_USER,
        'password': Config.DB_PASSWORD,
    }
    if with_database:
        args['database'] = Config.DB_NAME

    # Check for unix socket on Linux/macOS
    unix_socket = Config.DB_UNIX_SOCKET
    if not unix_socket:
        for candidate in ['/var/lib/mysql/mysql.sock', '/var/run/mysqld/mysqld.sock', '/tmp/mysql.sock']:
            if os.path.exists(candidate):
                unix_socket = candidate
                break

    if unix_socket and Config.DB_HOST in ('localhost', '127.0.0.1'):
        args['unix_socket'] = unix_socket
    else:
        args['host'] = Config.DB_HOST
        args['port'] = Config.DB_PORT

    return args

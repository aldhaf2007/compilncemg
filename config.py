import os

class Config:
    # Database configuration
    DB_FILE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'complaints.db')

    # JWT Security configuration
    JWT_SECRET = os.environ.get('JWT_SECRET', 'super-secret-key-1234567890-cms-system')
    JWT_EXPIRY_HOURS = 24

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

import os
import datetime
import jwt
from flask import Flask, request, jsonify, send_from_directory, redirect
import sqlite3
from sqlite3 import Error
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from config import Config
import smtplib
from email.mime.text import MIMEText
from contextlib import contextmanager

app = Flask(__name__)
app.config.from_object(Config)

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

def dict_factory(cursor, row):
    return {col[0]: row[idx] for idx, col in enumerate(cursor.description)}

# Helper to get database connection
def get_db_connection(dictionary=False):
    conn = sqlite3.connect(app.config['DB_FILE_PATH'])
    if dictionary:
        conn.row_factory = dict_factory
    return conn

# Context manager to prevent connection leaks
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
            conn.close()

# Helper to verify ALLOWED_EXTENSIONS
def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

# JWT authentication helper decorator
def token_required(f):
    def decorator(*args, **kwargs):
        token = None
        # Check Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        
        try:
            data = jwt.decode(token, app.config['JWT_SECRET'], algorithms=['HS256'])
            # Fetch user from DB using connection context manager
            with db_cursor(dictionary=True) as cursor:
                cursor.execute("SELECT id, username, role, department FROM users WHERE id = ?", (data['user_id'],))
                current_user = cursor.fetchone()
            
            if not current_user:
                return jsonify({'message': 'Invalid token, user not found!'}), 401
                
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token!'}), 401
            
        return f(current_user, *args, **kwargs)
    
    decorator.__name__ = f.__name__
    return decorator

# Auto-assignment routing engine function
def auto_assign_complaint(category, cursor):
    # Mapping Categories to Staff Departments
    category_map = {
        'HR': 'Human Resources',
        'IT': 'IT',
        'Finance': 'Finance',
        'Operations': 'Operations'
    }
    dept = category_map.get(category)
    if not dept:
        return None
    
    # Query staff in this department who have the fewest active (non-Resolved) complaints assigned
    query = """
        SELECT u.id, COUNT(c.id) as active_count
        FROM users u
        LEFT JOIN complaints c ON u.id = c.assigned_to AND c.status != 'Resolved'
        WHERE u.role = 'Staff' AND u.department = ?
        GROUP BY u.id
        ORDER BY active_count ASC, u.id ASC
        LIMIT 1
    """
    cursor.execute(query, (dept,))
    row = cursor.fetchone()
    if row:
        return row['id'] # Return user_id of the staff member
    
    return None

# Automated Notification Module helper
def send_notification(complaint_id, title, new_status, complainant_username, staff_username):
    message_body = (
        f"Hello {complainant_username},\n\n"
        f"Your complaint #{complaint_id} titled '{title}' has been updated to status: '{new_status}' "
        f"by Staff Member ({staff_username}).\n\n"
        f"Best regards,\nComplaint Management System Support Team"
    )

    # Log to server console for simulation
    print("\n" + "="*50)
    print("AUTOMATED CMS NOTIFICATION ALERT (SIMULATION)")
    print(f"To: {complainant_username}")
    print(f"Subject: Status Change Alert - Complaint #{complaint_id}")
    print(f"Message: {message_body}")
    print("="*50 + "\n")

    # Real SMTP execution block if configured
    if app.config['SMTP_SERVER'] and app.config['SMTP_USER'] and app.config['SMTP_PASSWORD']:
        try:
            msg = MIMEText(message_body)
            msg['Subject'] = f"CMS Status Update - Complaint #{complaint_id}"
            msg['From'] = app.config['SENDER_EMAIL']
            # We assume username could match an email, or append domain
            msg['To'] = complainant_username if '@' in complainant_username else f"{complainant_username}@example.com"
            
            with smtplib.SMTP(app.config['SMTP_SERVER'], app.config['SMTP_PORT']) as server:
                server.starttls()
                server.login(app.config['SMTP_USER'], app.config['SMTP_PASSWORD'])
                server.send_message(msg)
            print("Real SMTP Email Notification sent successfully!")
        except Exception as e:
            print(f"Failed to send real SMTP notification: {e}")

# Frontend Routes - Root and pages
@app.route('/')
def home():
    return send_from_directory('static', 'login.html')

@app.route('/login.html')
def login_page():
    return send_from_directory('static', 'login.html')

@app.route('/register.html')
def register_page():
    return send_from_directory('static', 'register.html')

@app.route('/dashboard.html')
def dashboard_page():
    return send_from_directory('static', 'dashboard.html')

# Static assets serving (CSS/JS)
@app.route('/css/<path:path>')
def send_css(path):
    return send_from_directory('static/css', path)

@app.route('/js/<path:path>')
def send_js(path):
    return send_from_directory('static/js', path)

# Auth API Endpoints
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')
    role = data.get('role', 'Complainant')
    department = data.get('department')

    if not username or not password:
        return jsonify({'message': 'Username and password are required!'}), 400

    if role not in ['Complainant', 'Staff']:
        return jsonify({'message': 'Registration of Admin accounts is disabled. Only one Admin access is allowed in the system.'}), 400

    # Clean department logic
    if role != 'Staff':
        department = None

    password_hash = generate_password_hash(password)

    try:
        with db_cursor() as cursor:
            # Check if username exists
            cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
            if cursor.fetchone():
                return jsonify({'message': 'Username already exists!'}), 400

            cursor.execute(
                "INSERT INTO users (username, password_hash, role, department) VALUES (?, ?, ?, ?)",
                (username, password_hash, role, department)
            )
        return jsonify({'message': 'Registration successful!'}), 201
    except Error as e:
        return jsonify({'message': f'Database error: {str(e)}'}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'message': 'Username and password are required!'}), 400

    try:
        with db_cursor(dictionary=True) as cursor:
            cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
            user = cursor.fetchone()

        if not user or not check_password_hash(user['password_hash'], password):
            return jsonify({'message': 'Invalid username or password!'}), 401

        # Generate JWT
        token_payload = {
            'user_id': user['id'],
            'username': user['username'],
            'role': user['role'],
            'department': user['department'],
            'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=app.config['JWT_EXPIRY_HOURS'])
        }
        token = jwt.encode(token_payload, app.config['JWT_SECRET'], algorithm='HS256')

        return jsonify({
            'message': 'Login successful!',
            'token': token,
            'user': {
                'id': user['id'],
                'username': user['username'],
                'role': user['role'],
                'department': user['department']
            }
        }), 200
    except Error as e:
        return jsonify({'message': f'Database error: {str(e)}'}), 500

# API Complaints routes
@app.route('/api/complaints', methods=['POST'])
@token_required
def create_complaint(current_user):
    if current_user['role'] != 'Complainant':
        return jsonify({'message': 'Only complainants can file complaints!'}), 403

    # Parse multi-part form data
    title = request.form.get('title')
    description = request.form.get('description')
    category = request.form.get('category')
    priority = request.form.get('priority', 'Low')

    if not title or not description or not category:
        return jsonify({'message': 'Title, description, and category are required fields!'}), 400

    if priority not in ['Low', 'Medium', 'High', 'Critical']:
        return jsonify({'message': 'Invalid priority flag!'}), 400

    # Evidence intake
    evidence_url = None
    if 'evidence' in request.files:
        file = request.files['evidence']
        if file and file.filename != '':
            if allowed_file(file.filename):
                filename = secure_filename(file.filename)
                # Prefix filename with timestamp to prevent collisions
                timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
                filename = f"{timestamp}_{filename}"
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(file_path)
                evidence_url = filename # Save filename to evidence_url key
            else:
                return jsonify({'message': 'File extension not allowed!'}), 400

    try:
        with db_cursor(dictionary=True) as cursor:
            # Run routing engine to get auto-assigned staff
            assigned_to = auto_assign_complaint(category, cursor)

            # Write to database
            cursor.execute(
                """INSERT INTO complaints (complainant_id, title, description, category, priority, status, evidence_url, assigned_to) 
                   VALUES (?, ?, ?, ?, ?, 'Filed', ?, ?)""",
                (current_user['id'], title, description, category, priority, evidence_url, assigned_to)
            )
            complaint_id = cursor.lastrowid
            
            # If assigned, insert initial audit log
            if assigned_to:
                cursor.execute(
                    "INSERT INTO audit_logs (complaint_id, staff_id, action) VALUES (?, ?, ?)",
                    (complaint_id, assigned_to, "Complaint auto-assigned on creation based on category.")
                )

        # Send creation simulation log
        print(f"\n[ROUTING ENGINE] Complaint #{complaint_id} auto-assigned to staff user ID: {assigned_to}\n")

        return jsonify({
            'message': 'Complaint submitted successfully!',
            'complaint_id': complaint_id,
            'assigned_to': assigned_to
        }), 201
    except Error as e:
        return jsonify({'message': f'Database error: {str(e)}'}), 500

@app.route('/api/complaints', methods=['GET'])
@token_required
def get_complaints(current_user):
    role = current_user['role']
    search_query = request.args.get('search', '')
    category = request.args.get('category', '')
    status = request.args.get('status', '')
    priority = request.args.get('priority', '')

    try:
        with db_cursor(dictionary=True) as cursor:
            # Formulate query based on role
            if role == 'Complainant':
                # Complainant retrieves their own complaints
                query = """
                    SELECT c.*, u.username as assigned_staff_name 
                    FROM complaints c
                    LEFT JOIN users u ON c.assigned_to = u.id
                    WHERE c.complainant_id = ?
                """
                params = [current_user['id']]
            elif role == 'Staff':
                # Staff retrieves complaints assigned to them
                query = """
                    SELECT c.*, u.username as complainant_name 
                    FROM complaints c
                    JOIN users u ON c.complainant_id = u.id
                    WHERE c.assigned_to = ?
                """
                params = [current_user['id']]
            else:  # Admin
                # Admin retrieves all complaints
                query = """
                    SELECT c.*, u1.username as complainant_name, u2.username as assigned_staff_name
                    FROM complaints c
                    JOIN users u1 ON c.complainant_id = u1.id
                    LEFT JOIN users u2 ON c.assigned_to = u2.id
                    WHERE 1=1
                """
                params = []

            # Filters
            if search_query:
                query += " AND c.title LIKE ?"
                params.append(f"%{search_query}%")
            if category:
                query += " AND c.category = ?"
                params.append(category)
            if status:
                query += " AND c.status = ?"
                params.append(status)
            if priority:
                query += " AND c.priority = ?"
                params.append(priority)

            query += " ORDER BY c.created_at DESC"

            cursor.execute(query, params)
            complaints = cursor.fetchall()
        
        return jsonify(complaints), 200
    except Error as e:
        return jsonify({'message': f'Database error: {str(e)}'}), 500

@app.route('/api/complaints/<int:complaint_id>', methods=['GET'])
@token_required
def get_complaint_details(current_user, complaint_id):
    try:
        with db_cursor(dictionary=True) as cursor:
            # Load complaint
            cursor.execute("""
                SELECT c.*, u1.username as complainant_name, u2.username as assigned_staff_name
                FROM complaints c
                JOIN users u1 ON c.complainant_id = u1.id
                LEFT JOIN users u2 ON c.assigned_to = u2.id
                WHERE c.id = ?
            """, (complaint_id,))
            complaint = cursor.fetchone()
            
            if not complaint:
                return jsonify({'message': 'Complaint not found!'}), 404
                
            # Access control
            if current_user['role'] == 'Complainant' and complaint['complainant_id'] != current_user['id']:
                return jsonify({'message': 'Unauthorized to view this complaint!'}), 403
                
            if current_user['role'] == 'Staff' and complaint['assigned_to'] != current_user['id']:
                return jsonify({'message': 'Unauthorized to view this complaint!'}), 403

            # Load audit logs for this complaint
            cursor.execute("""
                SELECT a.*, u.username as staff_name 
                FROM audit_logs a
                JOIN users u ON a.staff_id = u.id
                WHERE a.complaint_id = ?
                ORDER BY a.timestamp ASC
            """, (complaint_id,))
            audit_logs = cursor.fetchall()
            
        complaint['audit_logs'] = audit_logs
        return jsonify(complaint), 200
    except Error as e:
        return jsonify({'message': f'Database error: {str(e)}'}), 500

@app.route('/api/complaints/<int:complaint_id>', methods=['PUT'])
@token_required
def update_complaint(current_user, complaint_id):
    role = current_user['role']
    data = request.get_json() or {}
    
    new_status = data.get('status')
    new_assignment = data.get('assigned_to')

    if not new_status and not new_assignment:
        return jsonify({'message': 'No modifications requested.'}), 400

    try:
        with db_cursor(dictionary=True) as cursor:
            # Load current state
            cursor.execute("SELECT * FROM complaints WHERE id = ?", (complaint_id,))
            complaint = cursor.fetchone()
            
            if not complaint:
                return jsonify({'message': 'Complaint not found!'}), 404

            # Staff Authorization check
            if role == 'Staff':
                if complaint['assigned_to'] != current_user['id']:
                    return jsonify({'message': 'You can only update complaints assigned to you!'}), 403
                if new_assignment:
                    return jsonify({'message': 'Staff cannot modify assignment targets!'}), 403
                if new_status not in ['In Progress', 'Escalated', 'Resolved']:
                    return jsonify({'message': 'Invalid status update for Staff!'}), 400

            # Admin Authorization check
            if role == 'Admin':
                if new_status and new_status not in ['Filed', 'In Progress', 'Escalated', 'Resolved']:
                    return jsonify({'message': 'Invalid status flag!'}), 400

            actions_taken = []
            
            # Perform updates
            if new_status and new_status != complaint['status']:
                cursor.execute("UPDATE complaints SET status = ? WHERE id = ?", (new_status, complaint_id))
                # Insert audit log
                audit_message = f"Status updated from '{complaint['status']}' to '{new_status}'."
                cursor.execute(
                    "INSERT INTO audit_logs (complaint_id, staff_id, action) VALUES (?, ?, ?)",
                    (complaint_id, current_user['id'], audit_message)
                )
                actions_taken.append(audit_message)
                
                # Fetch complainant username to send notification
                cursor.execute("SELECT username FROM users WHERE id = ?", (complaint['complainant_id'],))
                complainant = cursor.fetchone()
                if complainant:
                    send_notification(
                        complaint_id=complaint_id,
                        title=complaint['title'],
                        new_status=new_status,
                        complainant_username=complainant['username'],
                        staff_username=current_user['username']
                    )

            if new_assignment and int(new_assignment) != complaint['assigned_to']:
                if role != 'Admin':
                    return jsonify({'message': 'Only Admins can override assignment targets!'}), 403
                    
                # Verify assigned user is indeed Staff/Admin
                cursor.execute("SELECT username, role FROM users WHERE id = ?", (new_assignment,))
                assigned_user = cursor.fetchone()
                if not assigned_user or assigned_user['role'] not in ['Staff', 'Admin']:
                    return jsonify({'message': 'Assignment target must be a valid staff or admin user!'}), 400

                cursor.execute("UPDATE complaints SET assigned_to = ? WHERE id = ?", (new_assignment, complaint_id))
                # Insert audit log
                audit_message = f"Assignment updated to {assigned_user['username']} (Manual Admin Override)."
                cursor.execute(
                    "INSERT INTO audit_logs (complaint_id, staff_id, action) VALUES (?, ?, ?)",
                    (complaint_id, current_user['id'], audit_message)
                )
                actions_taken.append(audit_message)

        return jsonify({
            'message': 'Complaint updated successfully!',
            'actions': actions_taken
        }), 200
    except Error as e:
        return jsonify({'message': f'Database error: {str(e)}'}), 500

@app.route('/api/complaints/<int:complaint_id>/evidence', methods=['GET'])
@token_required
def download_evidence(current_user, complaint_id):
    try:
        with db_cursor(dictionary=True) as cursor:
            cursor.execute("SELECT complainant_id, assigned_to, evidence_url FROM complaints WHERE id = ?", (complaint_id,))
            complaint = cursor.fetchone()
        
        if not complaint or not complaint['evidence_url']:
            return jsonify({'message': 'Evidence file not found!'}), 404

        # Access check
        if current_user['role'] == 'Complainant' and complaint['complainant_id'] != current_user['id']:
            return jsonify({'message': 'Access denied to this file!'}), 403
        if current_user['role'] == 'Staff' and complaint['assigned_to'] != current_user['id']:
            return jsonify({'message': 'Access denied to this file!'}), 403
            
        return send_from_directory(app.config['UPLOAD_FOLDER'], complaint['evidence_url'])
    except Error as e:
        return jsonify({'message': f'Database error: {str(e)}'}), 500

# Admin endpoints
@app.route('/api/staff', methods=['GET'])
@token_required
def get_staff_list(current_user):
    if current_user['role'] != 'Admin':
        return jsonify({'message': 'Unauthorized access!'}), 403
    try:
        with db_cursor(dictionary=True) as cursor:
            cursor.execute("SELECT id, username, department FROM users WHERE role = 'Staff' ORDER BY username ASC")
            staff = cursor.fetchall()
        return jsonify(staff), 200
    except Error as e:
        return jsonify({'message': f'Database error: {str(e)}'}), 500

# Analytics endpoint
@app.route('/api/analytics', methods=['GET'])
@token_required
def get_analytics(current_user):
    if current_user['role'] != 'Admin':
        return jsonify({'message': 'Unauthorized access!'}), 403
        
    try:
        with db_cursor(dictionary=True) as cursor:
            # 1. Distribution by Category
            cursor.execute("SELECT category, COUNT(*) as count FROM complaints GROUP BY category")
            category_dist = cursor.fetchall()
            
            # 2. Distribution by Status
            cursor.execute("SELECT status, COUNT(*) as count FROM complaints GROUP BY status")
            status_dist = cursor.fetchall()

            # 3. Distribution by Priority
            cursor.execute("SELECT priority, COUNT(*) as count FROM complaints GROUP BY priority")
            priority_dist = cursor.fetchall()

            # 4. Average Resolution Time (in hours)
            # Using julianday in hours for complaints where status = 'Resolved'
            cursor.execute("""
                SELECT AVG((julianday(updated_at) - julianday(created_at)) * 24) as avg_hours 
                FROM complaints 
                WHERE status = 'Resolved'
            """)
            avg_res_row = cursor.fetchone()
            avg_resolution_hours = round(float(avg_res_row['avg_hours']), 2) if avg_res_row and avg_res_row['avg_hours'] is not None else 0

            # 5. Total counts
            cursor.execute("SELECT COUNT(*) as total FROM complaints")
            total_complaints = cursor.fetchone()['total']
        
        return jsonify({
            'total': total_complaints,
            'category_distribution': category_dist,
            'status_distribution': status_dist,
            'priority_distribution': priority_dist,
            'avg_resolution_hours': avg_resolution_hours
        }), 200
    except Error as e:
        return jsonify({'message': f'Database error: {str(e)}'}), 500

# Admin User Management API - List all users
@app.route('/api/admin/users', methods=['GET'])
@token_required
def admin_list_users(current_user):
    if current_user['role'] != 'Admin':
        return jsonify({'message': 'Unauthorized access!'}), 403
    try:
        with db_cursor(dictionary=True) as cursor:
            cursor.execute("SELECT id, username, role, department, created_at FROM users ORDER BY role ASC, username ASC")
            users_list = cursor.fetchall()
        return jsonify(users_list), 200
    except Error as e:
        return jsonify({'message': f'Database error: {str(e)}'}), 500

# Admin User Management API - Create a user
@app.route('/api/admin/users', methods=['POST'])
@token_required
def admin_create_user(current_user):
    if current_user['role'] != 'Admin':
        return jsonify({'message': 'Unauthorized access!'}), 403
    
    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')
    role = data.get('role')
    department = data.get('department')

    if not username or not password or not role:
        return jsonify({'message': 'Username, password, and role are required!'}), 400

    if role not in ['Complainant', 'Staff']:
        return jsonify({'message': 'Creation of Admin accounts is disabled. Only one Admin access is allowed in the system.'}), 400

    if role != 'Staff':
        department = None

    password_hash = generate_password_hash(password)

    try:
        with db_cursor() as cursor:
            # Check if username exists
            cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
            if cursor.fetchone():
                return jsonify({'message': 'Username already exists!'}), 400

            cursor.execute(
                "INSERT INTO users (username, password_hash, role, department) VALUES (?, ?, ?, ?)",
                (username, password_hash, role, department)
            )
        return jsonify({'message': 'User registered successfully!'}), 201
    except Error as e:
        return jsonify({'message': f'Database error: {str(e)}'}), 500

# Admin User Management API - Delete a user
@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
@token_required
def admin_delete_user(current_user, user_id):
    if current_user['role'] != 'Admin':
        return jsonify({'message': 'Unauthorized access!'}), 403

    if user_id == current_user['id']:
        return jsonify({'message': 'Cannot delete your own administrator account!'}), 400

    try:
        with db_cursor() as cursor:
            # Verify user exists
            cursor.execute("SELECT username FROM users WHERE id = ?", (user_id,))
            user_row = cursor.fetchone()
            if not user_row:
                return jsonify({'message': 'User not found!'}), 404

            cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
        return jsonify({'message': f"User '{user_row[0]}' deleted successfully!"}), 200
    except Error as e:
        return jsonify({'message': f'Database error: {str(e)}'}), 500

if __name__ == '__main__':
    # Start internal webserver
    app.run(host='0.0.0.0', port=5000, debug=True)

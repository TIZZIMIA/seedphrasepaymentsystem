import os
import csv
from io import StringIO
from datetime import datetime

from flask import Flask, request, jsonify, session, redirect, url_for, render_template, Response
import psycopg2
import bcrypt
import sendgrid
from sendgrid.helpers.mail import Mail, Attachment, FileContent, FileType, FileName, Disposition
from twilio.rest import Client
from apscheduler.schedulers.background import BackgroundScheduler
from flask_sslify import SSLify

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "supersecretkey")
sslify = SSLify(app)

# Environment variables (Heroku sets DATABASE_URL automatically)
DATABASE_URL = os.getenv("DATABASE_URL")

# SendGrid configuration
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")

# Twilio configuration (if you choose to use SMS notifications)
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")  # e.g., "+1234567890"

# --- Helper Functions ---
def connect_db():
    return psycopg2.connect(DATABASE_URL, sslmode='require')

def hash_password(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def check_password(password, hashed):
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def log_activity(admin_username, action):
    """Log admin activity in the database."""
    try:
        conn = connect_db()
        cur = conn.cursor()
        cur.execute("INSERT INTO activity_logs (admin_username, action) VALUES (%s, %s)", (admin_username, action))
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        print("Failed to log activity:", e)

# --- Email & SMS Functions ---
def send_email(wallet, amount):
    sg = sendgrid.SendGridAPIClient(api_key=SENDGRID_API_KEY)
    message = Mail(
        from_email="your-email@example.com",  # Replace with your verified sender
        to_emails="user@example.com",         # Replace with recipient or make it dynamic
        subject="Payment Confirmed",
        html_content=f"<p>Your payment of {amount} has been confirmed for wallet {wallet}.</p>"
    )
    sg.send(message)

def send_sms(wallet, amount, user_phone):
    client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    message = client.messages.create(
        body=f"Payment of {amount} confirmed for wallet {wallet}.",
        from_=TWILIO_PHONE_NUMBER,
        to=user_phone
    )

def send_csv_email():
    """Send the CSV report via email."""
    try:
        conn = connect_db()
        cur = conn.cursor()
        cur.execute("SELECT wallet_address, amount, transaction_id, status FROM payments")
        payments = cur.fetchall()
        cur.close()
        conn.close()

        # Create CSV data
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(["Wallet Address", "Amount", "Transaction ID", "Status"])
        writer.writerows(payments)

        sg = sendgrid.SendGridAPIClient(api_key=SENDGRID_API_KEY)
        message = Mail(
            from_email="your-email@example.com",
            to_emails="admin@example.com",  # Replace with your admin email
            subject="Weekly Payments CSV Report",
            html_content="Attached is the latest payments report."
        )

        attachment = Attachment()
        attachment.file_content = FileContent(output.getvalue().encode("utf-8"))
        attachment.file_type = FileType("text/csv")
        attachment.file_name = FileName("payments.csv")
        attachment.disposition = Disposition("attachment")
        message.attachment = attachment

        sg.send(message)
        # Log system activity
        log_activity("system", "Weekly CSV report emailed.")
    except Exception as e:
        print("Error sending CSV email:", e)

# --- APScheduler for Weekly CSV Email ---
scheduler = BackgroundScheduler()
scheduler.add_job(func=send_csv_email, trigger="interval", weeks=1)
scheduler.start()

# --- Routes for Payment Confirmation ---
@app.route('/trust-wallet-webhook', methods=['POST'])
def trust_wallet_webhook():
    """
    Expected JSON payload from Trust Wallet webhook:
    {
      "wallet": "0xExampleWallet",
      "amount": 5,
      "transaction_id": "tx123..."
    }
    """
    data = request.json
    wallet = data.get("wallet")
    amount = data.get("amount")
    transaction_id = data.get("transaction_id")

    if not wallet or not amount or not transaction_id:
        return jsonify({"success": False, "error": "Invalid data"}), 400

    try:
        conn = connect_db()
        cur = conn.cursor()
        # Insert or update payment record (wallet_address assumed to be unique)
        cur.execute("""
            INSERT INTO payments (wallet_address, amount, transaction_id, status, created_at)
            VALUES (%s, %s, %s, 'confirmed', NOW())
            ON CONFLICT (wallet_address) DO UPDATE 
            SET status = 'confirmed', amount = %s, transaction_id = %s, created_at = NOW()
        """, (wallet, amount, transaction_id, amount, transaction_id))
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

    # Send notifications
    send_email(wallet, amount)
    # Uncomment the following line and replace the phone number if you want to send SMS
    # send_sms(wallet, amount, "+1234567890")

    return jsonify({"success": True, "message": "Payment confirmed and notifications sent"}), 200

# --- Admin Authentication & Management ---
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        conn = connect_db()
        cur = conn.cursor()
        cur.execute("SELECT password FROM admins WHERE username = %s", (username,))
        admin = cur.fetchone()
        cur.close()
        conn.close()

        if admin and check_password(password, admin[0]):
            session['logged_in'] = True
            session['admin_username'] = username
            return redirect(url_for('dashboard'))
        else:
            return "Invalid credentials", 401

    return """
    <form method="post">
        <input type="text" name="username" placeholder="Username" required>
        <input type="password" name="password" placeholder="Password" required>
        <button type="submit">Login</button>
    </form>
    """

@app.route('/logout')
def logout():
    session.pop('logged_in', None)
    session.pop('admin_username', None)
    return redirect(url_for('login'))

# --- Dashboard with Filters ---
@app.route('/dashboard')
def dashboard():
    if not session.get('logged_in'):
        return redirect(url_for('login'))

    conn = connect_db()
    cur = conn.cursor()

    query = "SELECT wallet_address, amount, transaction_id, status, created_at FROM payments WHERE 1=1"
    params = []

    date_filter = request.args.get('date')
    status_filter = request.args.get('status')

    if date_filter:
        query += " AND DATE(created_at) = %s"
        params.append(date_filter)
    if status_filter:
        query += " AND status = %s"
        params.append(status_filter)

    query += " ORDER BY created_at DESC"

    cur.execute(query, params)
    payments = cur.fetchall()
    cur.close()
    conn.close()

    return render_template('dashboard.html', payments=payments)

# --- CSV Export & Trigger Email ---
@app.route('/export-payments')
def export_payments():
    if not session.get('logged_in'):
        return redirect(url_for('login'))

    conn = connect_db()
    cur = conn.cursor()
    cur.execute("SELECT wallet_address, amount, transaction_id, status, created_at FROM payments")
    payments = cur.fetchall()
    cur.close()
    conn.close()

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["Wallet Address", "Amount", "Transaction ID", "Status", "Created At"])
    writer.writerows(payments)

    # Log admin activity
    log_activity(session.get('admin_username'), "Exported payments CSV")
    response = Response(output.getvalue(), mimetype="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=payments.csv"
    return response

@app.route('/send-csv-email')
def trigger_csv_email():
    if not session.get('logged_in'):
        return redirect(url_for('login'))
    
    send_csv_email()
    log_activity(session.get('admin_username'), "Triggered CSV email report")
    return "CSV report sent successfully!"

# --- Admin Management Panel ---
@app.route('/admin-panel')
def admin_panel():
    if not session.get('logged_in'):
        return redirect(url_for('login'))

    conn = connect_db()
    cur = conn.cursor()
    cur.execute("SELECT username FROM admins")
    admins = cur.fetchall()
    cur.close()
    conn.close()

    return render_template('admin_panel.html', admins=admins)

@app.route('/add-admin', methods=['POST'])
def add_admin():
    if not session.get('logged_in'):
        return redirect(url_for('login'))

    username = request.form['username']
    password = request.form['password']
    hashed_password = hash_password(password)

    conn = connect_db()
    cur = conn.cursor()
    cur.execute("INSERT INTO admins (username, password) VALUES (%s, %s) ON CONFLICT DO NOTHING", (username, hashed_password))
    conn.commit()
    cur.close()
    conn.close()

    log_activity(session.get('admin_username'), f"Added admin: {username}")
    return redirect(url_for('admin_panel'))

@app.route('/remove-admin', methods=['POST'])
def remove_admin():
    if not session.get('logged_in'):
        return redirect(url_for('login'))

    username = request.form['username']
    conn = connect_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM admins WHERE username = %s", (username,))
    conn.commit()
    cur.close()
    conn.close()

    log_activity(session.get('admin_username'), f"Removed admin: {username}")
    return redirect(url_for('admin_panel'))

# --- Main ---
if __name__ == '__main__':
    # For production on Heroku, use a WSGI server like Gunicorn
    app.run(debug=True)

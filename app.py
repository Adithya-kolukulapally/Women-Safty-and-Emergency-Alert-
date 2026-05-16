from flask import Flask, render_template, request, redirect, url_for, flash, session
import sqlite3
import os

app = Flask(__name__)
app.secret_key = 'your_secret_key'

DB_FILE = 'database.db'

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        )
    ''')

    # Contacts table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            phone TEXT
        )
    ''')

    # Sample contacts (add only if table is empty)
    cursor.execute("SELECT * FROM contacts")
    if not cursor.fetchall():
        sample_contacts = [
            ("Alice", "+911234567890"),
            ("Bob", "+919876543210"),
            ("Charlie", "+919812345678")
        ]
        cursor.executemany("INSERT INTO contacts (name, phone) VALUES (?, ?)", sample_contacts)

    conn.commit()
    conn.close()

init_db()

# ROUTES
@app.route('/')
def index():
    if 'user' not in session:
        return render_template('index.html', page='login')
    return render_template('index.html', page='home')

@app.route('/login', methods=['POST'])
def login():
    username = request.form.get('username')
    password = request.form.get('password')

    # Save any username/password in session
    if username and password:
        session['user'] = username
        return redirect(url_for('index'))
    else:
        flash("Please enter username and password.", "error")
        return redirect(url_for('index'))

@app.route('/logout')
def logout():
    session.pop('user', None)
    return redirect(url_for('index'))

@app.route('/contacts', methods=['GET', 'POST'])
def contacts():
    if 'user' not in session:
        return redirect(url_for('index'))

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    if request.method == 'POST':
        name = request.form.get('name')
        phone = request.form.get('phone')
        if name and phone:
            cursor.execute("INSERT INTO contacts (name, phone) VALUES (?, ?)", (name, phone))
            conn.commit()
            flash("Contact added!", "success")
        return redirect(url_for('contacts'))

    cursor.execute("SELECT * FROM contacts")
    all_contacts = cursor.fetchall()
    conn.close()
    return render_template('index.html', page='contacts', contacts=all_contacts)

@app.route('/panic', methods=['POST'])
def panic():
    if 'user' not in session:
        return redirect(url_for('index'))

    latitude = request.form.get('latitude')
    longitude = request.form.get('longitude')
    message_body = f"🚨 Emergency! I need help. My location: https://maps.google.com/?q={latitude},{longitude}"

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT name, phone FROM contacts")
    contacts = cursor.fetchall()
    conn.close()

    # Print SMS messages to console (for testing/demo)
    for name, phone in contacts:
        print(f"SMS to {phone} ({name}): {message_body}")

    flash("Emergency messages printed to console. On mobile, use call/SMS links.", "success")
    return render_template('index.html', page='home', message_body=message_body, contacts=contacts)

if __name__ == '__main__':
    app.run(debug=True)


@app.route('/live_location', methods=['POST'])
def live_location():
    if 'user' not in session:
        return "Unauthorized", 401

    data = request.get_json()
    latitude = data.get('latitude')
    longitude = data.get('longitude')

    print(f"Live Location: {latitude}, {longitude}")

    return "OK"
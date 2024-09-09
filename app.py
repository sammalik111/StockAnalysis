import os
import requests
from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from datetime import timedelta
from werkzeug.security import generate_password_hash, check_password_hash
import yfinance as yf
from db import db  # Import db from db.py
import json

app = Flask(__name__)
app.secret_key = 'your_secret_key'  # Change this in production
FINNHUB_API_KEY = 'crf5su9r01qk4jsb316gcrf5su9r01qk4jsb3170'  # Your Finnhub API Key

# Set session lifetime to 2 hours
app.permanent_session_lifetime = timedelta(hours=2)

# Define path to the users.db file located in your environment folder
basedir = os.path.abspath(os.path.dirname(__file__))
db_path = os.path.join(basedir, 'databases/users.db')  # Adjust path if needed

# Flask-SQLAlchemy configuration to use the users.db file
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize SQLAlchemy with the Flask app
db.init_app(app)

# Import models after db initialization to avoid circular imports
with app.app_context():
    from user import AddUser  # Import AddUser after initializing db

# Define User model for SQLAlchemy
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False, unique=True)
    password = db.Column(db.String(200), nullable=False)

    def __init__(self, name, password):
        self.name = name
        self.password = generate_password_hash(password)

# In-memory representation of user preferences and stocks
users_data = {}

# Route for the home page (accessible only when logged in)
@app.route('/')
def home():
    if 'user' in session:
        user = session['user']  # Load user information from the session
        return render_template('index.html', username=user['name'], favorite_stocks=user['favorite_stocks'])
    return redirect(url_for('login'))



@app.route('/profile', methods=['GET', 'POST'])
def profile():
    return render_template('profile.html')

@app.route('/preferences', methods=['GET', 'POST'])
def preferences():
    return render_template('preferences.html')

@app.route('/upload', methods=['GET', 'POST'])
def upload():
    return render_template('uploadcsv.html')




# Route for login page
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        # Query the database to find the user
        user = AddUser.query.filter_by(name=username).first()

        if user and check_password_hash(user.password, password):
            session.permanent = True  # Set session lifetime

            # Load favorite_stocks and preferences from the database (stored as JSON)
            favorite_stocks = json.loads(user.favorite_stocks) if user.favorite_stocks else {}
            preferences = json.loads(user.preferences) if user.preferences else {
                'theme': 'light',
                'currency': 'USD',
                'language': 'en',
                'sectors': [],
                'risk_tolerance': [],
            }

            # Store user information in the session
            session['user'] = {
                'name': user.name,
                'favorite_stocks': favorite_stocks,
                'preferences': preferences,
            }

            flash('Login successful!', 'success')
            return redirect(url_for('home'))
        else:
            flash('Invalid username or password', 'danger')
    return render_template('login.html')



# Route for the register page
@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        confirm_password = request.form['confirm_password']

        # Validate passwords match
        if password != confirm_password:
            flash('Passwords do not match', 'danger')
            return redirect(url_for('register'))

        # Check if username already exists
        existing_user = AddUser.query.filter_by(name=username).first()
        if existing_user:
            flash('Username already exists', 'danger')
            return redirect(url_for('register'))

        # Create a new user and save to the database
        new_user = AddUser(username, generate_password_hash(password))
        db.session.add(new_user)
        db.session.commit()

        flash('Registration successful, please log in!', 'success')
        return redirect(url_for('login'))

    return render_template('register.html')


@app.route('/search_stock', methods=['GET'])
def search_stock():
    query = request.args.get('query', '').lower()
    if not query:
        return jsonify({'error': 'No query provided'}), 400 

    try:
        # API request to Finnhub's Symbol Lookup endpoint
        url = f"https://finnhub.io/api/v1/search?q={query}&token={FINNHUB_API_KEY}"
        response = requests.get(url)

        # Check if the request was successful
        if response.status_code != 200:
            return jsonify({'error': 'Finnhub API request failed'}), response.status_code

        # Parse the response as JSON
        data = response.json()

        # Check if any results are found
        if 'result' not in data or len(data['result']) == 0:
            return jsonify({'error': 'No matches found'}), 404

        matches = data['result'][:10]
        result = [
            {
                'symbol': match.get('symbol'),
                'name': match.get('description'),
                'type': match.get('type'),
                'displaySymbol': match.get('displaySymbol')
                # 'price' : yf.Ticker(match.get('symbol')).history(period="1d")['Close'].iloc[-1] or 0
            }
            for match in matches
        ]
        return jsonify(result)

    except Exception as e:
        return jsonify({'error': 'An internal server error occurred'}), 500

@app.route('/add_stock', methods=['POST'])
def add_stock():
    data = request.get_json()

    if 'user' in session:
        user_name = session['user']['name']
        
        # Query the database for the logged-in user
        user = AddUser.query.filter_by(name=user_name).first()

        if user:
            # Add the stock symbol to the user's favorite stocks
            user.add_stock(data.get('symbol'), {"price": 100})  # Example stock data

            # Commit the change to the database
            db.session.commit()

            # Update the session with the new favorite stocks list
            session['user']['favorite_stocks'] = json.loads(user.favorite_stocks)

            return jsonify({'favorites': session['user']['favorite_stocks']})
    
    return jsonify({'error': 'User not logged in or session expired'}), 403


# Route to log out and end session
@app.route('/logout')
def logout():
    session.pop('user', None)  # Remove the user from session
    flash('You have been logged out!', 'info')
    return redirect(url_for('login'))

# Ensure that the app context is active when creating the database
if __name__ == '__main__':
    with app.app_context():
        db.create_all()  # Create tables if not already present
    app.run()

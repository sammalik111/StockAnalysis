import os
import requests
from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify, g
from datetime import timedelta
from werkzeug.security import generate_password_hash, check_password_hash
import yfinance as yf
from db import db  # Import db from db.py
import json
from news import get_news  # Import the get_news function
from stock_data import stock_data


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


# Load user before every request and make it globally available
@app.before_request
def load_user():
    g.current_user = None

    # Check if the user is in the session
    if 'user' in session:
        user_name = session['user']['name']

        # Query the database for the user
        user = AddUser.query.filter_by(name=user_name).first()

        if user:
            # Deserialize favorite_stocks and preferences
            favorite_stocks = json.loads(user.favorite_stocks) if user.favorite_stocks else []
            preferences = json.loads(user.preferences) if user.preferences else {
                'theme': 'light',
                'currency': 'USD',
                'language': 'en',
                'sectors': [],
                'risk_tolerance': [],
            }

            # Store user info in Flask's `g` object
            g.current_user = {
                'name': user.name,
                'favorite_stocks': favorite_stocks,
                'preferences': preferences,
            }

# Make user data available to all templates globally
@app.context_processor
def inject_user():
    """Inject the `current_user` into all templates."""
    return dict(current_user=g.current_user)


# Route for the home page (accessible only when logged in)
@app.route('/')
def home():
    if g.current_user:
        return render_template('index.html', username=g.current_user['name'], favorite_stocks=g.current_user['favorite_stocks'])
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

@app.route('/news', methods=['GET'])
def news():
    """Endpoint to get news articles for all favorite stocks of the current user."""
    all_articles = []
    favorite_stocks = g.current_user.get('favorite_stocks', [])

    if not favorite_stocks:
        return jsonify({'error': 'No favorite stocks found'}), 400

    for stock_name in favorite_stocks:
        try:
            articles = get_news(stock_name)
            for article in articles:
                all_articles.append({
                    'title': article['title'],
                    'stock_name': stock_name,
                    'link': article['link'],
                    'source': article['source'],    
                })
        except Exception as e:
            print(f"Error fetching news for stock '{stock_name}': {e}")

    return all_articles



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

            # Store user information in the session
            session['user'] = {
                'name': user.name,
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
                'displaySymbol': match.get('displaySymbol'),
            }
            for match in matches
        ]
        return jsonify(result)

    except Exception as e:
        return jsonify({'error': 'An internal server error occurred'}), 500


@app.route('/add_stock', methods=['POST'])
def add_stock():
    data = request.get_json()

    if g.current_user:
        user_name = g.current_user['name']

        # Query the database for the logged-in user
        user = AddUser.query.filter_by(name=user_name).first()

        if user:
            # Add the stock symbol to the user's favorite stocks
            user.add_stock(data.get('symbol'))  # Example stock data

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

@app.route('/stock', methods=['GET'])
def stock_page():
    symbol = request.args.get('query', 'AAPL')  # Default to 'AAPL' if no query param
    this_data = stock_data(symbol)
    return this_data 
    
    
# Ensure that the app context is active when creating the database
if __name__ == '__main__':
    with app.app_context():
        db.create_all()  # Create tables if not already present
    app.run()

from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify, g
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta
import yfinance as yf
import pandas as pd
import requests
import json
import os


# Import helper files from resources
from resources.helperFiles.news import get_news
from resources.helperFiles.db import db
from resources.helperFiles.stock_data import stock_data

app = Flask(
    __name__,
    static_folder='static',  # Static files folder
    template_folder='templates'  # Templates folder
)

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
    from resources.helperFiles.user import AddUser  # Import AddUser after initializing db


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
                'email': user.email,
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
    if g.current_user:
        username = g.current_user['name']
        email = g.current_user.get('email', 'user@example.com')
        return render_template('profile.html', username=username, email=email)
    else:
        flash('Please log in first.', 'danger')
        return redirect(url_for('login'))

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

        if user:
            # Print the stored hash for debugging purposes
            print(f"Stored password hash: {user.password}")

            # Check if the password matches the stored hash
            if check_password_hash(user.password, password):
                session.permanent = True  # Set session lifetime
                session['user'] = {'name': user.name}

                flash('Login successful!', 'success')
                return redirect(url_for('home'))
            else:
                flash('Invalid password', 'danger')
        else:
            flash('Invalid username', 'danger')

    return render_template('login.html')


# Route for the register page
@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
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
        
        # Check if email already exists
        existing_email = AddUser.query.filter_by(email=email).first()
        if existing_email:
            flash('Email already exists', 'danger')
            return redirect(url_for('register'))

        # Create a new user and save to the database
        new_user = AddUser(username, email, password)  # Password will be hashed in the constructor
        db.session.add(new_user)
        db.session.commit()

        flash('Registration successful, please log in!', 'success')
        return redirect(url_for('login'))

    return render_template('register.html')


@app.route('/get_stock_data', methods=['GET'])
def get_stock_data():
    symbol = request.args.get('symbol')
    if not symbol:
        return jsonify({'error': 'No symbol provided'}), 400

    try:
        # Fetch stock data using Finnhub
        url = f'https://finnhub.io/api/v1/quote'
        params = {
            'symbol': symbol,
            'token': FINNHUB_API_KEY
        }
        response = requests.get(url, params=params)
        data = response.json()

        if 'error' in data:
            return jsonify({'error': data['error']}), 404

        # Extract price and change
        price = data.get('c', 'N/A')  # Current price
        open_price = data.get('o', 'N/A')  # Opening price
        high_price = data.get('h', 'N/A')  # High price
        low_price = data.get('l', 'N/A')  # Low price

        # Calculate the change percentage
        if open_price and open_price != 'N/A':
            change_percentage = ((price - open_price) / open_price) * 100
        else:
            change_percentage = 'N/A'

        # Return the data as JSON
        return jsonify({'price': price, 'change': change_percentage})
    except Exception as e:
        # Handle errors (e.g., invalid symbol, API issues)
        return jsonify({'error': str(e)}), 500


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
            user.add_stock(data.get('symbol')) 
            db.session.commit()

            # Update the session with the new favorite stocks list
            session['user']['favorite_stocks'] = json.loads(user.favorite_stocks)
            return jsonify({'favorites': session['user']['favorite_stocks']})

    return jsonify({'error': 'User not logged in or session expired'}), 403


@app.route('/remove_stock', methods=['POST'])
def remove_stock():
    data = request.get_json()
    symbol = data.get('symbol')

    if g.current_user:
        user_name = g.current_user['name']

        # Query the database for the logged-in user
        user = AddUser.query.filter_by(name=user_name).first()

        if user:
            user.remove_stock(symbol)  # Ensure this method updates the favorite_stocks list
            db.session.commit()

            # Update the session with the new favorite stocks list
            g.current_user['favorite_stocks'] = json.loads(user.favorite_stocks)
            session['user']['favorite_stocks'] = g.current_user['favorite_stocks']
            return jsonify({'favorites': g.current_user['favorite_stocks']})

    return jsonify({'error': 'User not logged in or session expired'}), 403


@app.route('/recommendations', methods=['GET'])
def recommendations():
    try:
        # get the top 100 stock tickers from the S&P 500
        url = 'https://en.wikipedia.org/wiki/List_of_S%26P_500_companies'
        df = pd.read_html(url)[0]
        tickers = df['Symbol'].tolist()
        tickers = tickers[:5]  # Limit to top 100 for recommendations
        
        return jsonify(tickers)
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

    return jsonify({'error': 'No recommendations available'}), 404

@app.route('/update-profile', methods=['POST'])
def update_profile():
    if g.current_user:
        user_name = g.current_user['name']
        user = AddUser.query.filter_by(name=user_name).first()

        if user:
            # Retrieve form data
            changes = request.form

            # Check if the new username or email is already taken by another user
            new_username = changes.get('username', user.name)
            new_email = changes.get('email', user.email)
            existing_user = AddUser.query.filter(
                (AddUser.name == new_username) | (AddUser.email == new_email)
            ).filter(AddUser.id != user.id).first()

            if existing_user:
                return jsonify({'error': 'Username or email already exists'}), 400

            # Update user details in the database
            user.name = new_username
            user.email = new_email

            # Check if the old password matches before allowing password change
            old_password = changes.get('oldpassword')
            new_password = changes.get('password')

            if old_password and new_password:
                if check_password_hash(user.password, old_password):
                    user.password = generate_password_hash(new_password)
                else:
                    return jsonify({'error': 'Old password is incorrect'}), 400

            # Commit the changes to the database
            db.session.commit()

            # Update the session with the new user data
            session['user'] = {
                'name': user.name,
                'email': user.email
            }

            # Also update the `g.current_user` to reflect the changes
            g.current_user['name'] = user.name
            g.current_user['email'] = user.email

            return jsonify({'success': 'Profile updated successfully'})

    return jsonify({'error': 'User not logged in or session expired'}), 403



# Route to log out and end session
@app.route('/logout')
def logout():
    session.pop('user', None)  # Remove the user from session
    flash('You have been logged out!', 'info')
    return redirect(url_for('login'))

@app.route('/stock', methods=['GET'])
def stock_page():
    # Get the stock symbol, price and change from the query parameters
    symbol = request.args.get('symbol')
    price = request.args.get('price')
    change = request.args.get('change')
    
    # take price and change from the index.html page of the 
    this_data = stock_data(symbol, price, change)
    return this_data 
    
    
# Ensure that the app context is active when creating the database
if __name__ == '__main__':
    with app.app_context():
        db.create_all()  # Create tables if not already present
    app.run()

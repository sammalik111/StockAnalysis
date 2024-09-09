from flask import session
from user import AddUser
import json

def get_current_user():
    """Fetch the current user from the session, if logged in."""
    if 'user' not in session:
        return None

    # Get the username from the session
    user_name = session['user']['name']

    # Query the database for the user
    user = AddUser.query.filter_by(name=user_name).first()

    if user:
        # Ensure `favorite_stocks` is deserialized to a list
        user.favorite_stocks = json.loads(user.favorite_stocks) if user.favorite_stocks else []
        
        # Ensure `preferences` is deserialized to a dict
        user.preferences = json.loads(user.preferences) if user.preferences else {
            'theme': 'light',
            'currency': 'USD',
            'language': 'en',
            'sectors': [],
            'risk_tolerance': [],
        }

        return user
    return None

def update_user_session(user):
    """Update the session with the user's favorite stocks and preferences."""
    session['user']['favorite_stocks'] = user.favorite_stocks if isinstance(user.favorite_stocks, list) else []
    session['user']['preferences'] = user.preferences if isinstance(user.preferences, dict) else {
        'theme': 'light',
        'currency': 'USD',
        'language': 'en',
        'sectors': [],
        'risk_tolerance': [],
    }

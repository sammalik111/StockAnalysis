from werkzeug.security import generate_password_hash
from resources.helperFiles.db import db
import json

class AddUser(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False, unique=True)
    password = db.Column(db.String(200), nullable=False)
    favorite_stocks = db.Column(db.Text, nullable=True)  # Store as JSON string
    preferences = db.Column(db.Text, nullable=True)      # Store as JSON string
    email = db.Column(db.String(120), nullable=False, unique=True)

    def __init__(self, name, email, password, favorite_stocks=None, preferences=None):
        self.name = name
        self.password = generate_password_hash(password)
        self.email = email
        # Ensure favorite_stocks and preferences are stored as JSON strings
        self.favorite_stocks = json.dumps(favorite_stocks or [])  # Default to empty list
        self.preferences = json.dumps(preferences or {
            'theme': 'light',
            'currency': 'USD',
            'language': 'en',
            'sectors': [],
            'risk_tolerance': [],
        })

    def add_stock(self, stock_name):
        try:
            stocks = json.loads(self.favorite_stocks)
            if not isinstance(stocks, list):
                stocks = []
        except (json.JSONDecodeError, TypeError):
            stocks = []
        stocks.append(stock_name)

        self.favorite_stocks = json.dumps(stocks)
        db.session.commit()

    def remove_stock(self, stock_name):
        try:
            stocks = json.loads(self.favorite_stocks)
            if not isinstance(stocks, list):
                stocks = []
        except (json.JSONDecodeError, TypeError):
            stocks = []

        if stock_name in stocks:
            stocks.remove(stock_name)
            self.favorite_stocks = json.dumps(stocks)
            db.session.commit()

    def set_sectors(self, new_sectors):
        try:
            # Load current preferences
            preferences = json.loads(self.preferences)
            
            # Get the existing sectors from preferences or create a new list
            sectors = preferences.get('sectors', [])
            
            # Ensure sectors is a list
            if not isinstance(sectors, list):
                sectors = []

            # Loop through new sectors and add them if they don't already exist
            for sector in new_sectors:
                if sector not in sectors:
                    sectors.append(sector)
            
            # Update the sectors in preferences
            preferences['sectors'] = sectors
            self.preferences = json.dumps(preferences)
            
            # Commit the changes to the database
            db.session.commit()

        except (json.JSONDecodeError, TypeError) as e:
            print(f"Error updating sectors: {e}")




    def get_preferences(self):
        # Convert the stored JSON string back to a Python dictionary
        return json.loads(self.preferences)

    def get_favorite_stocks(self):
        # Convert the stored JSON string back to a Python list
        return json.loads(self.favorite_stocks)

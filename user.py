from db import db
import json
from werkzeug.security import generate_password_hash

class AddUser(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False, unique=True)
    password = db.Column(db.String(200), nullable=False)
    favorite_stocks = db.Column(db.Text, nullable=True)  # Store as JSON string
    preferences = db.Column(db.Text, nullable=True)      # Store as JSON string

    def __init__(self, name, password, favorite_stocks=None, preferences=None):
        self.name = name
        self.password = generate_password_hash(password)
        self.favorite_stocks = json.dumps(favorite_stocks or [])  # Convert to JSON string
        self.preferences = json.dumps(preferences or {
            'theme': 'light',
            'currency': 'USD',
            'language': 'en',
            'sectors': [],
            'risk_tolerance': [],
        })

    def add_stock(self, stock_name):
        # Load existing stocks, add new stock, and then update the JSON string
        stocks = json.loads(self.favorite_stocks)
        stocks.append(stock_name)
        self.favorite_stocks = json.dumps(stocks)

    def set_preferences(self, new_preferences):
        # Set new preferences and convert them to a JSON string
        self.preferences = json.dumps(new_preferences)

    def get_preferences(self):
        # Convert the stored JSON string back to a Python dictionary
        return json.loads(self.preferences)

    def get_favorite_stocks(self):
        # Convert the stored JSON string back to a Python list
        return json.loads(self.favorite_stocks)

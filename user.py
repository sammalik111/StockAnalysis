from db import db  # Import db from db.py
import json

class AddUser(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False, unique=True)
    password = db.Column(db.String(200), nullable=False)
    favorite_stocks = db.Column(db.Text, nullable=True)  # Store favorite stocks as JSON
    preferences = db.Column(db.Text, nullable=True)  # Store preferences as JSON

    def __init__(self, name, password):
        self.name = name
        self.password = password
        self.favorite_stocks = json.dumps({})  # Initialize as an empty JSON object
        self.preferences = json.dumps({
            'theme': 'light',
            'currency': 'USD',
            'language': 'en',
            'sectors': [],
            'risk_tolerance': [],
        })  # Initialize preferences as a JSON object

    def add_stock(self, stock_name, stock):
        stocks = json.loads(self.favorite_stocks)
        stocks[stock_name] = stock
        self.favorite_stocks = json.dumps(stocks)

    def remove_stock(self, stock_name):
        stocks = json.loads(self.favorite_stocks)
        stocks.pop(stock_name, None)
        self.favorite_stocks = json.dumps(stocks)

    def add_preferred_sectors(self, sector_name):
        prefs = json.loads(self.preferences)
        prefs['sectors'].append(sector_name)
        self.preferences = json.dumps(prefs)

    def remove_preferred_sectors(self, sector_name):
        prefs = json.loads(self.preferences)
        prefs['sectors'].remove(sector_name)
        self.preferences = json.dumps(prefs)

    def add_risk_tolerance(self, risk_level):
        prefs = json.loads(self.preferences)
        prefs['risk_tolerance'].append(risk_level)
        self.preferences = json.dumps(prefs)

    def remove_risk_tolerance(self, risk_level):
        prefs = json.loads(self.preferences)
        prefs['risk_tolerance'].remove(risk_level)
        self.preferences = json.dumps(prefs)

    def __repr__(self):
        return f"<User(name={self.name}, favorite_stocks={self.favorite_stocks}, preferences={self.preferences})>"

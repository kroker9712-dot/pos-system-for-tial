"""Create tables without Flask-Migrate. Run: python init_db.py"""
import os
import sys
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from app.extensions import db

app = create_app()

with app.app_context():
    db.create_all()
    print("Database tables created.")
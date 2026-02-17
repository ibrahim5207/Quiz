from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Quiz(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    question = db.Column(db.String(500), nullable=False)
    options = db.Column(db.JSON, nullable=False)
    correct_answer = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(100), default='General')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class UserScore(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), nullable=False)
    score = db.Column(db.Integer, default=0)
    total_questions = db.Column(db.Integer, default=0)
    completed_at = db.Column(db.DateTime, default=datetime.utcnow)

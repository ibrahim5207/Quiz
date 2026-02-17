from flask import Flask, request, jsonify
from flask_cors import CORS
from models import db, Quiz, UserScore
from quiz_data import quiz_questions
import random

app = Flask(__name__)
CORS(app)

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///quiz.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

# Create tables and populate initial data
with app.app_context():
    db.create_all()
    
    # Add sample questions if database is empty
    if Quiz.query.count() == 0:
        for q in quiz_questions:
            quiz = Quiz(
                question=q['question'],
                options=q['options'],
                correct_answer=q['correct_answer'],
                category=q['category']
            )
            db.session.add(quiz)
        db.session.commit()
        print("Sample questions added!")

# API Routes
@app.route('/api/questions', methods=['GET'])
def get_questions():
    """Get all quiz questions"""
    questions = Quiz.query.all()
    result = []
    for q in questions:
        result.append({
            'id': q.id,
            'question': q.question,
            'options': q.options,
            'category': q.category
        })
    return jsonify(result)

@app.route('/api/question/random', methods=['GET'])
def get_random_question():
    """Get a random question"""
    count = Quiz.query.count()
    if count == 0:
        return jsonify({'error': 'No questions available'}), 404
    
    random_id = random.randint(1, count)
    question = Quiz.query.get(random_id)
    
    return jsonify({
        'id': question.id,
        'question': question.question,
        'options': question.options,
        'category': question.category
    })

@app.route('/api/check-answer', methods=['POST'])
def check_answer():
    """Check if answer is correct"""
    data = request.json
    question_id = data.get('question_id')
    user_answer = data.get('answer')
    
    question = Quiz.query.get(question_id)
    if not question:
        return jsonify({'error': 'Question not found'}), 404
    
    is_correct = (user_answer == question.correct_answer)
    
    return jsonify({
        'correct': is_correct,
        'correct_answer': question.correct_answer,
        'explanation': f"The correct answer is {question.correct_answer}"
    })

@app.route('/api/save-score', methods=['POST'])
def save_score():
    """Save user score"""
    data = request.json
    username = data.get('username', 'Anonymous')
    score = data.get('score', 0)
    total = data.get('total', 0)
    
    user_score = UserScore(username=username, score=score, total_questions=total)
    db.session.add(user_score)
    db.session.commit()
    
    return jsonify({'message': 'Score saved successfully', 'id': user_score.id})

@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    """Get top scores"""
    top_scores = UserScore.query.order_by(UserScore.score.desc()).limit(10).all()
    result = []
    for score in top_scores:
        result.append({
            'username': score.username,
            'score': score.score,
            'total': score.total_questions,
            'completed_at': score.completed_at.strftime('%Y-%m-%d %H:%M')
        })
    return jsonify(result)

@app.route('/api/categories', methods=['GET'])
def get_categories():
    """Get all categories"""
    categories = db.session.query(Quiz.category).distinct().all()
    return jsonify([cat[0] for cat in categories])

if __name__ == '__main__':
    app.run(debug=True, port=5000)

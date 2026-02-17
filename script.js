// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

// State
let currentQuestion = null;
let score = 0;
let totalQuestions = 0;
let quizActive = false;
let username = '';

// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const quizArea = document.getElementById('quizArea');
const questionText = document.getElementById('questionText');
const categoryEl = document.getElementById('category');
const optionsContainer = document.getElementById('optionsContainer');
const currentQuestionEl = document.getElementById('currentQuestion');
const totalQuestionsEl = document.getElementById('totalQuestions');
const leaderboardContent = document.getElementById('leaderboardContent');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadLeaderboard();
    addMessage('bot', 'Type "start" to begin the quiz!');
});

// Event Listeners
sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Message Handling
async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    addMessage('user', message);
    userInput.value = '';

    await processUserMessage(message.toLowerCase());
}

function addMessage(sender, text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    messageDiv.innerHTML = text;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function processUserMessage(message) {
    // Command handling
    if (message === 'start') {
        startQuiz();
    } else if (message === 'rules' || message === 'help') {
        showRules();
    } else if (message === 'leaderboard') {
        showLeaderboard();
    } else if (message === 'categories') {
        showCategories();
    } else if (message.startsWith('my name is ')) {
        username = message.replace('my name is ', '').trim();
        addMessage('bot', `Nice to meet you, ${username}! Type 'start' to begin the quiz.`);
    } else if (quizActive && currentQuestion) {
        // Check if message matches any option
        const options = currentQuestion.options;
        const matchedOption = options.find(opt => 
            opt.toLowerCase() === message.toLowerCase()
        );
        
        if (matchedOption) {
            await checkAnswer(matchedOption);
        } else {
            addMessage('bot', 'Please select an option by typing the answer, or type "start" for a new question.');
        }
    } else {
        addMessage('bot', "I don't understand. Try: 'start', 'rules', 'leaderboard', or 'categories'");
    }
}

// Quiz Functions
async function startQuiz() {
    quizActive = true;
    score = 0;
    totalQuestions = 0;
    
    try {
        const response = await fetch(`${API_BASE_URL}/question/random`);
        const question = await response.json();
        
        currentQuestion = question;
        totalQuestions++;
        
        displayQuizQuestion(question);
        addMessage('bot', `🎯 Question ${totalQuestions}: ${question.question}`);
        
        quizArea.style.display = 'block';
    } catch (error) {
        console.error('Error starting quiz:', error);
        addMessage('bot', 'Sorry, I couldn\'t start the quiz. Please try again.');
    }
}

function displayQuizQuestion(question) {
    questionText.textContent = question.question;
    categoryEl.textContent = question.category;
    
    optionsContainer.innerHTML = '';
    question.options.forEach(option => {
        const button = document.createElement('button');
        button.className = 'option-btn';
        button.textContent = option;
        button.onclick = () => handleOptionClick(option);
        optionsContainer.appendChild(button);
    });
    
    currentQuestionEl.textContent = totalQuestions;
}

async function handleOptionClick(selectedOption) {
    await checkAnswer(selectedOption);
}

async function checkAnswer(selectedOption) {
    if (!currentQuestion) return;
    
    // Disable all option buttons
    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.disabled = true;
    });
    
    try {
        const response = await fetch(`${API_BASE_URL}/check-answer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                question_id: currentQuestion.id,
                answer: selectedOption
            })
        });
        
        const result = await response.json();
        
        // Highlight correct/wrong answers
        document.querySelectorAll('.option-btn').forEach(btn => {
            if (btn.textContent === result.correct_answer) {
                btn.classList.add('correct');
            } else if (btn.textContent === selectedOption && !result.correct) {
                btn.classList.add('wrong');
            }
        });
        
        if (result.correct) {
            score++;
            addMessage('bot', `✅ Correct! ${result.explanation}`);
        } else {
            addMessage('bot', `❌ Wrong! ${result.explanation}`);
        }
        
        // Ask for next question after delay
        setTimeout(async () => {
            if (totalQuestions < 5) { // Limit to 5 questions per game
                await nextQuestion();
            } else {
                await endQuiz();
            }
        }, 2000);
        
    } catch (error) {
        console.error('Error checking answer:', error);
        addMessage('bot', 'Sorry, there was an error checking your answer.');
    }
}

async function nextQuestion() {
    try {
        const response = await fetch(`${API_BASE_URL}/question/random`);
        const question = await response.json();
        
        currentQuestion = question;
        totalQuestions++;
        
        displayQuizQuestion(question);
        addMessage('bot', `Next question: ${question.question}`);
    } catch (error) {
        console.error('Error getting next question:', error);
    }
}

async function endQuiz() {
    quizActive = false;
    quizArea.style.display = 'none';
    
    addMessage('bot', `🎉 Quiz completed! Your score: ${score}/${totalQuestions}`);
    
    // Save score
    if (username) {
        try {
            await fetch(`${API_BASE_URL}/save-score`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: username,
                    score: score,
                    total: totalQuestions
                })
            });
            
            addMessage('bot', 'Score saved! Check the leaderboard.');
            loadLeaderboard();
        } catch (error) {
            console.error('Error saving score:', error);
        }
    }
    
    score = 0;
    totalQuestions = 0;
}

// Helper Functions
function showRules() {
    addMessage('bot', `
📋 Quiz Rules:
• Type 'start' to begin
• You'll get random questions
• Choose the correct answer
• 5 questions per game
• Score points for correct answers
• Save your score to the leaderboard
    `);
}

async function showCategories() {
    try {
        const response = await fetch(`${API_BASE_URL}/categories`);
        const categories = await response.json();
        
        addMessage('bot', `📚 Available Categories:\n• ${categories.join('\n• ')}`);
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function showLeaderboard() {
    loadLeaderboard();
    addMessage('bot', 'Check the leaderboard on the right side!');
}

async function loadLeaderboard() {
    try {
        const response = await fetch(`${API_BASE_URL}/leaderboard`);
        const scores = await response.json();
        
        if (scores.length === 0) {
            leaderboardContent.innerHTML = '<p>No scores yet. Be the first!</p>';
            return;
        }
        
        leaderboardContent.innerHTML = '';
        scores.forEach((score, index) => {
            const item = document.createElement('div');
            item.className = 'leaderboard-item';
            item.innerHTML = `
                <span class="username">${index + 1}. ${score.username}</span>
                <span class="score">${score.score}/${score.total}</span>
            `;
            leaderboardContent.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        leaderboardContent.innerHTML = '<p>Error loading leaderboard</p>';
    }
}

/**
 * MCQ Quiz App - Logic & Parser
 */

class QuizApp {
    constructor() {
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.userAnswers = [];
        this.isQuizFinished = false;

        // UI Elements
        this.screens = {
            start: document.getElementById('start-screen'),
            quiz: document.getElementById('quiz-screen'),
            result: document.getElementById('result-screen')
        };
        
        this.mdInput = document.getElementById('md-input');
        this.startBtn = document.getElementById('start-btn');
        this.fileInput = document.getElementById('file-input');
        this.browseBtn = document.getElementById('browse-btn');
        
        this.questionText = document.getElementById('question-text');
        this.optionsContainer = document.getElementById('options-container');
        this.questionNumber = document.getElementById('question-number');
        this.scoreTracker = document.getElementById('score-tracker');
        this.progressFill = document.getElementById('progress-fill');
        
        this.prevBtn = document.getElementById('prev-btn');
        this.nextBtn = document.getElementById('next-btn');
        
        this.finalScore = document.getElementById('final-score');
        this.statTotal = document.getElementById('stat-total');
        this.statCorrect = document.getElementById('stat-correct');
        this.statWrong = document.getElementById('stat-wrong');
        this.restartBtn = document.getElementById('restart-btn');
        this.redoWrongBtn = document.getElementById('redo-wrong-btn');

        this.initEventListeners();
        this.initDragAndDrop();
    }

    initEventListeners() {
        this.startBtn.addEventListener('click', () => this.handleStart());
        this.browseBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        this.nextBtn.addEventListener('click', () => this.goNext());
        this.prevBtn.addEventListener('click', () => this.goPrev());
        this.restartBtn.addEventListener('click', () => this.resetQuiz());
        this.redoWrongBtn.addEventListener('click', () => this.startRedoWrong());
    }

    initDragAndDrop() {
        const dropZone = this.screens.start;
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.add('drag-active');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.remove('drag-active');
            }, false);
        });

        dropZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const file = dt.files[0];
            if (file) this.handleFileSelect({ target: { files: [file] } });
        }, false);
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            this.mdInput.value = event.target.result;
            // Reset input value to allow re-selecting the same file
            e.target.value = '';
            // Provide visual feedback
            this.handleStart();
        };
        reader.onerror = () => {
            e.target.value = '';
            alert('Không thể đọc file. Vui lòng thử lại.');
        };
        reader.readAsText(file);
    }

    handleStart() {
        const rawText = this.mdInput.value.trim();
        if (!rawText) {
            alert('Vui lòng dán nội dung Markdown vào ô văn bản.');
            return;
        }

        this.questions = this.parseMarkdown(rawText);
        
        if (this.questions.length === 0) {
            alert('Không tìm thấy câu hỏi nào hợp lệ trong nội dung của bạn. Hãy kiểm tra lại định dạng (Câu X: ... Đáp án: X)');
            return;
        }

        this.startQuiz();
    }

    parseMarkdown(text) {
        const questions = [];
        
        // Normalize text: Replace fancy characters, normalize line endings
        text = text.replace(/[：]/g, ':').replace(/\r\n/g, '\n');
        
        // Split into potential blocks based on common patterns (Double newlines are standard separators)
        // We look for anything that looks like a question start to split more reliably
        let questionBlocks = text.split(/(?:\n\s*\n|^)(?=(?:#+\s*|(?:\*\*|))?(?:Câu|Question|Q|C|Ques|Part|)\s*(?:\d+[:.]?|)[:.]?\s*(?:\*\*|)?)/i);
        
        // Filter out empty blocks
        questionBlocks = questionBlocks.filter(b => b.trim().length > 0);
        
        questionBlocks.forEach(block => {
            const lines = block.split('\n').map(l => l.trim()).filter(l => l !== '');
            if (lines.length < 2) return;

            let qText = '';
            const options = [];
            let correctAnswer = '';
            let foundOptions = false;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                
                // Detection for options: A. text, [A] text, A) text, - A. text, etc.
                const optMatch = line.match(/^(?:[-*•]\s*)?([A-E])[.)\s\]\-]+(.+)/i);
                
                if (optMatch) {
                    foundOptions = true;
                    options.push({
                        letter: optMatch[1].toUpperCase(),
                    text: optMatch[2].replace(/\*\*/g, '').trim()
                    });
                    continue;
                }

                // Detection for answer: "Đáp án: A", "Answer: A", etc.
                const ansMatch = line.match(/(?:Đáp án|Answer|Correct|Result|Key|Ans|Chọn)[:\s-*]+([A-E])/i);
                if (ansMatch) {
                    correctAnswer = ansMatch[1].toUpperCase();
                    continue;
                }

                // If it's not an option or answer, and we haven't found options yet, it's part of the question text
                if (!foundOptions) {
                    // Remove prefixes like "Câu 1:", "1.", "###", etc. from the first line
                    let cleanedLine = line;
                    if (i === 0) {
                        cleanedLine = line.replace(/^(?:#+\s*|(?:\*\*|))?(?:Câu|Question|Q|C|Ques|Part)\s*\d*[:.]?\s*/i, '')
                                           .replace(/^\d+[:.]\s*/, '')
                                           .replace(/[*#]/g, '');
                    } else {
                        cleanedLine = line.replace(/[*#]/g, '');
                    }
                    
                    cleanedLine = cleanedLine.trim();
                    if (cleanedLine) {
                       qText += (qText ? ' ' : '') + cleanedLine;
                    }
                } else if (!correctAnswer) {
                    // If we found options but the line is NOT an option or answer keyword, check if it's a bolded answer like **A**
                    const boldAnsMatch = line.match(/\*\*([A-E])\*\*/);
                    if (boldAnsMatch) correctAnswer = boldAnsMatch[1].toUpperCase();
                }
            }

            // Final check for unlabelled answers (just a single letter on a line after options)
            if (!correctAnswer && foundOptions) {
                for (let i = lines.length - 1; i >= 0; i--) {
                    const line = lines[i].trim();
                    if (line.match(/^[A-E]$/i)) {
                        correctAnswer = line.toUpperCase();
                        break;
                    }
                }
            }

            if (qText && options.length >= 2 && correctAnswer) {
                questions.push({
                    text: qText,
                    options: options,
                    answer: correctAnswer
                });
            }
        });

        return questions;
    }


    startQuiz() {
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.userAnswers = new Array(this.questions.length).fill(null);
        this.isQuizFinished = false;
        
        this.switchScreen('quiz');
        this.renderQuestion();
    }

    switchScreen(screenName) {
        Object.values(this.screens).forEach(s => s.classList.remove('active'));
        this.screens[screenName].classList.add('active');
        window.scrollTo(0, 0);
    }

    renderQuestion() {
        const question = this.questions[this.currentQuestionIndex];
        const userAnswer = this.userAnswers[this.currentQuestionIndex];
        
        this.questionText.textContent = question.text;
        this.questionNumber.textContent = `Câu hỏi ${this.currentQuestionIndex + 1}/${this.questions.length}`;
        this.scoreTracker.textContent = `Đúng: ${this.score}`;
        
        const progress = ((this.currentQuestionIndex + 1) / this.questions.length) * 100;
        this.progressFill.style.width = `${progress}%`;

        this.optionsContainer.innerHTML = '';
        question.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            if (userAnswer === opt.letter) btn.classList.add('selected');
            
            // If already answered this question, show feedback
            if (userAnswer !== null) {
                btn.classList.add('disabled');
                if (opt.letter === question.answer) btn.classList.add('correct');
                else if (userAnswer === opt.letter) btn.classList.add('wrong');
            }

            btn.innerHTML = `
                <span class="letter">${opt.letter}</span>
                <span class="option-text">${opt.text}</span>
            `;

            btn.onclick = () => this.handleOptionClick(opt.letter);
            this.optionsContainer.appendChild(btn);
        });

        // Update nav buttons
        this.prevBtn.disabled = this.currentQuestionIndex === 0;
        this.nextBtn.textContent = this.currentQuestionIndex === this.questions.length - 1 ? 'Xem kết quả' : 'Câu tiếp theo';
    }

    handleOptionClick(letter) {
        if (this.userAnswers[this.currentQuestionIndex] !== null) return;

        this.userAnswers[this.currentQuestionIndex] = letter;
        const correct = this.questions[this.currentQuestionIndex].answer;
        
        if (letter === correct) {
            this.score++;
        }

        this.renderQuestion();
    }

    goNext() {
        if (this.currentQuestionIndex < this.questions.length - 1) {
            this.currentQuestionIndex++;
            this.renderQuestion();
        } else {
            this.showResults();
        }
    }

    goPrev() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.renderQuestion();
        }
    }

    showResults() {
        this.isQuizFinished = true;
        this.finalScore.textContent = `${this.score}/${this.questions.length}`;
        this.statTotal.textContent = this.questions.length;
        this.statCorrect.textContent = this.score;
        this.statWrong.textContent = this.questions.length - this.score;
        
        // Show/hide redo wrong button
        const wrongCount = this.questions.length - this.score;
        this.redoWrongBtn.style.display = wrongCount > 0 ? 'block' : 'none';

        const percentage = (this.score / this.questions.length) * 100;
        const msg = document.getElementById('result-message');
        if (percentage >= 80) msg.textContent = "Tuyệt vời! Bạn là một bậc thầy kiến thức.";
        else if (percentage >= 50) msg.textContent = "Khá tốt! Hãy ôn tập thêm một chút nữa nhé.";
        else msg.textContent = "Cố gắng lên! Bạn cần dành thêm thời gian học tập.";

        this.switchScreen('result');
    }

    startRedoWrong() {
        const wrongQuestions = this.questions.filter((q, index) => {
            return this.userAnswers[index] !== q.answer;
        });

        if (wrongQuestions.length > 0) {
            this.questions = wrongQuestions;
            this.startQuiz();
        }
    }

    copyResults() {
        const text = `Kết quả Quiz: ${this.score}/${this.questions.length} (${Math.round(this.score/this.questions.length*100)}%)`;
        navigator.clipboard.writeText(text).then(() => {
            const btn = document.getElementById('copy-btn');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<span>Đã sao chép!</span>';
            setTimeout(() => btn.innerHTML = originalText, 2000);
        });
    }

    resetQuiz() {
        this.switchScreen('start');
        this.mdInput.value = '';
    }
}

// Initialize App via index.html scripts to avoid double instantiation

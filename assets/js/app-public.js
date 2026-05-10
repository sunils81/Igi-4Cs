/* IGI 4Cs Public Quiz — app-public.js v1 */

// ============ CONFIG ============
const QUIZ_DURATION_SECONDS = 5 * 60; // 5 minutes
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwZVl7J17oCnq_A4N8PbvGHdUOcqKe5eItx-ZA0fhSX9d6A1tEtqgjP5ubDCqoh1_ZGBw/exec';
const QUIZ_URL = 'https://igi-4-cs.vercel.app';

// ============ QUESTIONS ============
const quizQuestions = [
    { id:1,  question:"What does the term 'Carat' specifically measure in a diamond?",                                    options:["Size","Weight","Diameter","Depth"],                                                        correct:1 },
    { id:2,  question:"How many milligrams is equal to 1 carat?",                                                        options:["50 mg","100 mg","200 mg","400 mg"],                                                       correct:2 },
    { id:3,  question:"Which is the highest color grade on the standard diamond color scale?",                            options:["A","D","Z","G"],                                                                          correct:1 },
    { id:4,  question:"A diamond graded 'H' in color is categorized as:",                                                 options:["Colorless","Near Colorless","Faint Yellow","Very Light Yellow"],                          correct:1 },
    { id:5,  question:"What does 'Clarity' refer to in a diamond?",                                                       options:["Polish quality","Symmetry","Internal & external characteristics","Brightness"],           correct:2 },
    { id:6,  question:"Which clarity grade indicates a diamond with no inclusions or blemishes visible under 10x magnification?", options:["VVS1","IF","FL (Flawless)","VS1"],                                             correct:2 },
    { id:7,  question:"What is the general term for internal characteristics found in a diamond?",                        options:["Blemishes","Inclusions","Flaws","Cracks"],                                               correct:1 },
    { id:8,  question:"Which cut grade represents the highest standard of proportions, polish, and symmetry?",            options:["Good","Very Good","Excellent","Fair"],                                                   correct:2 },
    { id:9,  question:"In a well-cut Round Brilliant diamond, what happens to the light entering the stone?",             options:["Escapes through the bottom","Leaks from the sides","Reflects back to the viewer","Gets absorbed"], correct:2 },
    { id:10, question:"What does 'Eye-Clean' mean in diamond retail terminology?",                                         options:["Internally Flawless","No inclusions visible to the naked eye","Perfectly white","No fluorescence"], correct:1 },
    { id:11, question:"Which of the following is NOT one of the 4Cs of diamonds?",                                        options:["Carat","Color","Cost","Cut"],                                                            correct:2 },
    { id:12, question:"On the standard clarity scale, 'SI1' stands for:",                                                 options:["Slightly Included 1","Small Inclusion 1","Standard Inclusion 1","Significant Inclusion 1"], correct:0 },
    { id:13, question:"What is the primary factor that determines a diamond's brilliance?",                                options:["Color grade","Cut quality","Carat weight","Clarity grade"],                              correct:1 },
    { id:14, question:"Which color grade range is considered 'Colorless'?",                                               options:["D-F","G-J","K-M","N-R"],                                                                correct:0 },
    { id:15, question:"What is 'Fire' in relation to a diamond?",                                                         options:["Brightness","Red / orange / blue flashes of color","Sparkle","Polish luster"],           correct:1 },
    { id:16, question:"What does 'Scintillation' refer to in a diamond?",                                                 options:["Color dispersion","Sparkle when the diamond moves","Weight distribution","Surface smoothness"], correct:1 },
    { id:17, question:"A '1-pointer' diamond weighs approximately:",                                                      options:["0.01 carats","0.10 carats","1.00 carat","0.001 carats"],                                 correct:0 },
    { id:18, question:"Which inclusion type resembles a small feather-like break inside the diamond?",                    options:["Crystal","Cloud","Feather","Needle"],                                                    correct:2 },
    { id:19, question:"Which two diamond shapes are considered 'Fancy Cuts'?",                                            options:["Round Brilliant & Princess","Princess & Oval","Round & Emerald","None of the above"],    correct:1 },
    { id:20, question:"The 'Table' of a diamond is best described as:",                                                   options:["The largest flat facet on the top","The bottom pointed facet","The girdle circumference","The crown angle"], correct:0 },
    { id:21, question:"How many facets does a standard Round Brilliant cut diamond have?",                                 options:["32","48","58","64"],                                                                     correct:2 },
    { id:22, question:"Which of the 4Cs typically has the greatest impact on a diamond's price per carat?",               options:["Clarity","Color","Cut","Carat Weight"],                                                  correct:3 },
    { id:23, question:"A diamond graded 'SI2' in clarity means inclusions are:",                                          options:["Not visible under any magnification","Visible under 10x magnification only","Easily visible to the naked eye in most cases","Only visible under 100x magnification"], correct:1 },
    { id:24, question:"What does 'Fluorescence' refer to in a diamond?",                                                  options:["The sparkle seen in sunlight","A glow emitted under ultraviolet light","The reflection of light from the table","The color grading under lab lighting"], correct:1 },
    { id:25, question:"Which diamond shape typically appears largest for its carat weight due to its elongated outline?",  options:["Round Brilliant","Princess","Marquise","Cushion"],                                       correct:2 }
];

// ============ STATE ============
let currentUser = {};
let timeRemaining = QUIZ_DURATION_SECONDS;
let timerInterval = null;
let quizSubmitted = false;
let quizStartTime = null;
let userAnswers = {};
let shuffledQuestions = [];
let currentQuestionIndex = 0;
let finalScore = 0;
let finalTotal = 25;

// ============ HELPERS ============
function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
}

// ============ DOM REFS ============
let els = {};

document.addEventListener('DOMContentLoaded', () => {
    els = {
        landing:    document.getElementById('landing-section'),
        reg:        document.getElementById('registration-section'),
        quiz:       document.getElementById('quiz-section'),
        result:     document.getElementById('result-section'),
        fullName:   document.getElementById('fullName'),
        email:      document.getElementById('email'),
        mobile:     document.getElementById('mobile'),
        countryCode:document.getElementById('countryCode'),
        country:    document.getElementById('country'),
        profession: document.getElementById('profession'),
        city:       document.getElementById('city'),
        takeQuizBtn:document.getElementById('take-quiz-btn'),
        startBtn:   document.getElementById('start-btn'),
        timer:      document.getElementById('timer'),
        qContainer: document.getElementById('questions-container'),
        infoName:   document.getElementById('info-name'),
        resName:    document.getElementById('res-name'),
        resScore:   document.getElementById('res-score'),
        resPct:     document.getElementById('res-pct'),
        resTime:    document.getElementById('res-time'),
        resBadge:   document.getElementById('res-badge'),
        reviewList: document.getElementById('review-list'),
    };

    els.takeQuizBtn.addEventListener('click', () => {
        els.landing.classList.add('hidden');
        els.reg.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Auto-sync country code when country changes
    const countryCodeMap = {
        'India': '+91', 'USA': '+1', 'UAE': '+971', 'UK': '+44',
        'Singapore': '+65', 'Australia': '+61', 'Canada': '+1-CA',
        'Belgium': '+32', 'Hong Kong': '+852', 'Israel': '+972',
        'Japan': '+81', 'Thailand': '+66', 'South Africa': '+27'
    };
    els.country.addEventListener('change', () => {
        const code = countryCodeMap[els.country.value];
        if (code) els.countryCode.value = code;
        else els.countryCode.value = 'other';
    });

    els.startBtn.addEventListener('click', handleStart);
});

// ============ REGISTRATION ============
function handleStart() {
    const name  = els.fullName.value.trim();
    const email = els.email.value.trim();

    if (!name || !email) {
        alert('Please enter your name and email to continue.');
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Please enter a valid email address.');
        return;
    }

    currentUser = {
        name,
        email,
        mobile:      els.mobile.value.trim() || '',
        countryCode: els.mobile.value.trim() ? els.countryCode.value.replace('-CA','') : '',
        country:     els.country.value || 'India',
        profession:  els.profession.value || 'Not specified',
        city:        els.city.value.trim() || ''
    };

    startQuiz();
}

function startQuiz() {
    // Shuffle questions and options
    shuffledQuestions = shuffle(quizQuestions).map(q => {
        const indices = shuffle([0,1,2,3]);
        return {
            ...q,
            options:    indices.map(i => q.options[i]),
            correct:    indices.indexOf(q.correct),
            originalId: q.id
        };
    });

    userAnswers = {};
    quizSubmitted = false;
    currentQuestionIndex = 0;

    els.reg.classList.add('hidden');
    els.quiz.classList.remove('hidden');
    els.infoName.textContent = currentUser.name;

    quizStartTime = Date.now();
    startTimer();
    showQuestion(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============ TIMER ============
function startTimer() {
    timeRemaining = QUIZ_DURATION_SECONDS;
    const endTime = Date.now() + (QUIZ_DURATION_SECONDS * 1000);

    timerInterval = setInterval(() => {
        timeRemaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
        const m = Math.floor(timeRemaining / 60).toString().padStart(2,'0');
        const s = (timeRemaining % 60).toString().padStart(2,'0');
        els.timer.textContent = `${m}:${s}`;
        if (timeRemaining <= 60) els.timer.classList.add('warning');
        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            submitQuiz('Time expired');
        }
    }, 1000);
}

// ============ MILESTONES ============
const milestones = {
    5:  { emoji:'💡', text:'5 down, 20 to go — great start!' },
    10: { emoji:'⚡', text:'10 done — you\'re on a roll!' },
    15: { emoji:'🔥', text:'Halfway there — keep it up!' },
    20: { emoji:'💎', text:'Only 5 left — finish strong!' },
    25: { emoji:'🏁', text:'All 25 answered — well done!' }
};

function showToast(emoji, text) {
    const existing = document.getElementById('milestone-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = 'milestone-toast';
    toast.innerHTML = `<span class="toast-emoji">${emoji}</span><span class="toast-text">${text}</span>`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('toast-visible'));
    setTimeout(() => {
        toast.classList.remove('toast-visible');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// ============ QUESTIONS ============
function showQuestion(idx) {
    const q     = shuffledQuestions[idx];
    const total = shuffledQuestions.length;
    const saved = userAnswers[q.id];

    els.qContainer.innerHTML = `
        <div class="question-card">
            <span class="question-number">Question ${idx+1} of ${total}</span>
            <div class="question-progress">
                <div class="question-progress-bar" style="width:${((idx+1)/total)*100}%"></div>
            </div>
            <p class="question-text">${escapeHtml(q.question)}</p>
            <div class="options">
                ${q.options.map((opt,oIdx) => `
                    <label class="option-label ${saved===oIdx?'selected':''}">
                        <input type="radio" name="q${q.id}" value="${oIdx}" ${saved===oIdx?'checked':''}>
                        <span>${escapeHtml(opt)}</span>
                    </label>
                `).join('')}
            </div>
        </div>
        <div class="question-nav">
            <button class="btn-nav" onclick="goToPrev()" ${idx===0?'disabled':''}>← Previous</button>
            <span class="nav-dots">${shuffledQuestions.map((_,i) => `
                <span class="dot ${i===idx?'active':(userAnswers[shuffledQuestions[i].id]!==undefined?'answered':'')}" onclick="goToQuestion(${i})"></span>
            `).join('')}</span>
            ${idx < total-1
                ? `<button class="btn-nav btn-nav-next" onclick="goToNext()">Next →</button>`
                : `<button class="btn-nav btn-nav-submit" onclick="submitQuiz('Manual submission')">Submit ✓</button>`
            }
        </div>
    `;

    els.qContainer.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const wasAnswered = userAnswers[q.id] !== undefined;
            userAnswers[q.id] = parseInt(radio.value);
            els.qContainer.querySelectorAll('.option-label').forEach(l => l.classList.remove('selected'));
            radio.closest('.option-label').classList.add('selected');
            const dots = document.querySelectorAll('.dot');
            if (dots[idx]) dots[idx].classList.add('answered');
            if (!wasAnswered) {
                const count = Object.keys(userAnswers).length;
                if (milestones[count]) showToast(milestones[count].emoji, milestones[count].text);
            }
        });
    });
}

function goToNext() {
    if (currentQuestionIndex < shuffledQuestions.length-1) {
        currentQuestionIndex++;
        showQuestion(currentQuestionIndex);
    }
}
function goToPrev() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        showQuestion(currentQuestionIndex);
    }
}
function goToQuestion(idx) {
    currentQuestionIndex = idx;
    showQuestion(idx);
}

// ============ SUBMISSION ============
function submitQuiz(reason) {
    if (quizSubmitted) return;
    quizSubmitted = true;
    if (timerInterval) clearInterval(timerInterval);

    let score = 0;
    shuffledQuestions.forEach(q => {
        if (userAnswers[q.id] === q.correct) score++;
    });

    finalScore = score;
    finalTotal = shuffledQuestions.length;

    const rawSeconds = quizStartTime ? Math.floor((Date.now()-quizStartTime)/1000) : QUIZ_DURATION_SECONDS;
    const timeStr    = formatDuration(rawSeconds);
    const pct        = Math.round((score/finalTotal)*100);

    // Build wrong answers
    const wrongAnswers = shuffledQuestions
        .filter(q => userAnswers[q.id] !== q.correct)
        .map(q => ({
            qNum:     q.originalId,
            question: q.question,
            given:    userAnswers[q.id] !== undefined ? q.options[userAnswers[q.id]] : 'Not answered',
            correct:  q.options[q.correct]
        }));

    // Send to GAS (fire and forget)
    const payload = {
        source:      'public',
        name:        currentUser.name,
        email:       currentUser.email,
        mobile:      currentUser.mobile,
        countryCode: currentUser.countryCode,
        country:     currentUser.country,
        profession:  currentUser.profession,
        city:        currentUser.city,
        score,
        total:       finalTotal,
        timeTaken:   timeStr,
        submitReason:reason,
        deviceType:  /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
        screenRes:   `${window.screen.width}x${window.screen.height}`,
        userAgent:   navigator.userAgent,
        wrongAnswers,
        submittedAt: new Date().toISOString()
    };

    fetch(GAS_WEB_APP_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
    }).catch(() => {});

    showResult(score, finalTotal, timeStr, pct, wrongAnswers);
}

// ============ RESULT ============
function showResult(score, total, timeStr, pct, wrongAnswers) {
    els.quiz.classList.add('hidden');
    els.result.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    bindCourseInterest();

    els.resName.textContent = currentUser.name;
    els.resTime.textContent = timeStr;
    els.resPct.textContent  = pct + '%';

    // Animate score
    let current = 0;
    els.resScore.textContent = `0 / ${total}`;
    const interval = setInterval(() => {
        current = Math.min(current + 1, score);
        els.resScore.textContent = `${current} / ${total}`;
        if (current >= score) clearInterval(interval);
    }, 60);

    // Badge
    let badge, badgeColor;
    if (pct >= 90)      { badge = '🏆 Diamond Expert';  badgeColor = '#b5944a'; }
    else if (pct >= 75) { badge = '💎 4Cs Pro';         badgeColor = '#0e6674'; }
    else if (pct >= 60) { badge = '💡 On Your Way';     badgeColor = '#2980b9'; }
    else                { badge = '📚 Keep Learning';   badgeColor = '#c0392b'; }

    els.resBadge.textContent = badge;
    els.resBadge.style.color = badgeColor;

    // Answer review — show all questions
    const reviewHtml = shuffledQuestions.map((q, idx) => {
        const givenIdx   = userAnswers[q.id];
        const isCorrect  = givenIdx === q.correct;
        const givenText  = givenIdx !== undefined ? q.options[givenIdx] : 'Not answered';
        const correctText = q.options[q.correct];

        return `
            <div class="review-item ${isCorrect ? 'correct' : 'wrong'}">
                <div class="review-q"><span>Q${idx+1}.</span>${escapeHtml(q.question)}</div>
                <div class="review-answers">
                    ${isCorrect
                        ? `<span class="review-given correct-ans">✓ ${escapeHtml(givenText)}</span>`
                        : `<span class="review-given">✗ ${escapeHtml(givenText)}</span>
                           <span class="review-correct">✓ ${escapeHtml(correctText)}</span>`
                    }
                </div>
            </div>
        `;
    }).join('');

    els.reviewList.innerHTML = reviewHtml;
}

// ============ SHARE ============
function getShareText() {
    const pct   = Math.round((finalScore / finalTotal) * 100);
    const badge = pct >= 90 ? '🏆 Diamond Expert'
                : pct >= 75 ? '💎 4Cs Pro'
                : pct >= 60 ? '💡 On Your Way'
                : '📚 Keep Learning';
    return `I scored ${finalScore}/${finalTotal} (${pct}%) on the IGI 4Cs Diamond Quiz and earned the badge: ${badge}! 💎\n\nCan you beat my score? Take the quiz here: ${QUIZ_URL}`;
}

function shareWhatsApp() {
    const text = encodeURIComponent(getShareText());
    window.open(`https://wa.me/?text=${text}`, '_blank');
}

function shareLinkedIn() {
    const url  = encodeURIComponent(QUIZ_URL);
    const pct  = Math.round((finalScore / finalTotal) * 100);
    const text = encodeURIComponent(`I scored ${finalScore}/${finalTotal} (${pct}%) on the IGI 4Cs Diamond Knowledge Quiz! 💎 Test your diamond knowledge too:`);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}&summary=${text}`, '_blank');
}

function copyShareLink() {
    const text = getShareText();
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('copy-btn');
        btn.textContent = '✅ Copied!';
        setTimeout(() => { btn.textContent = '🔗 Copy Link'; }, 2500);
    }).catch(() => {
        alert('Copy this link: ' + QUIZ_URL);
    });
}

// ============ COURSE INTEREST ============
function bindCourseInterest() {
    const btn = document.getElementById('course-submit-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
        const course = document.getElementById('course-select').value;
        if (!course) { alert('Please select a course to continue.'); return; }

        btn.disabled = true;
        btn.textContent = 'Sending...';

        const payload = {
            source:     'course_interest',
            name:       currentUser.name,
            email:      currentUser.email,
            mobile:     currentUser.mobile,
            countryCode:currentUser.countryCode,
            country:    currentUser.country,
            city:       currentUser.city,
            profession: currentUser.profession,
            course:     course,
            score:      finalScore,
            total:      finalTotal,
            pct:        Math.round((finalScore/finalTotal)*100) + '%',
            submittedAt: new Date().toISOString()
        };

        fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        }).catch(() => {});

        // Show confirmation regardless (no-cors = no response)
        document.getElementById('course-confirm').classList.remove('hidden');
        btn.textContent = '✓ Sent';
    });
}

// ============ RETAKE ============
function retakeQuiz() {
    // Reset state
    userAnswers    = {};
    quizSubmitted  = false;
    currentQuestionIndex = 0;
    finalScore     = 0;

    // Reset UI
    els.result.classList.add('hidden');
    els.landing.classList.remove('hidden');
    els.timer.classList.remove('warning');
    els.timer.textContent = '05:00';
    window.scrollTo({ top:0, behavior:'smooth' });
}

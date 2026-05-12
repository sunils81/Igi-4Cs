/* IGI 4Cs Public Quiz — app-public.js v1 */

// ============ CONFIG ============
const QUIZ_DURATION_SECONDS = 5 * 60; // 5 minutes
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwZVl7J17oCnq_A4N8PbvGHdUOcqKe5eItx-ZA0fhSX9d6A1tEtqgjP5ubDCqoh1_ZGBw/exec';
const QUIZ_URL = 'https://igi-4-cs.vercel.app';

// ── EmailJS Config ──
const EMAILJS_SERVICE_ID  = 'service_jglwfxg';
const EMAILJS_TEMPLATE_ID = 'template_xnuvsjy';
const EMAILJS_PUBLIC_KEY  = 'ubOFK0SB5o7vcTANR';

// ── OTP State ──
let otpCode = '', otpExpiry = null, otpCountdownIv = null, otpAttempts = 0;
const OTP_EXPIRY_SEC = 300, OTP_MAX_ATTEMPTS = 5;

// ============ QUESTIONS ============
const quizQuestions = [
    { id:1,  question:"What does the term 'Carat' specifically measure in a diamond?",                                    options:["Size","Weight","Diameter","Depth"],                                                        correct:1 },
    { id:2,  question:"How many milligrams is equal to 1 carat?",                                                        options:["50 mg","100 mg","200 mg","400 mg"],                                                       correct:2 },
    { id:3,  question:"Which is the highest grade on the normal color grading scale for diamonds?",                            options:["A","D","Z","G"],                                                                          correct:1 },
    { id:4,  question:"A diamond graded 'H' in color is categorized as:",                                                 options:["Colorless","Near Colorless","Faint Yellow","Very Light Yellow"],                          correct:1 },
    { id:5,  question:"What does the 'Clarity' grade assess?",                                                       options:["Polish and symmetry","Transparency","Blemishes and inclusions","Brightness and fire"],           correct:2 },
    { id:6,  question:"A diamond completely free of inclusions and blemishes under 10X magnification may earn which grade?", options:["VVS1","IF (Internally Flawless)","FL (Flawless)","VS1"],              correct:2 },
    { id:7,  question:"What is the general term for characteristics trapped inside a diamond?",                        options:["Blemishes","Inclusions","Carbon","Cracks"],                                               correct:1 },
    { id:8,  question:"Which cut grade represents the highest standard of proportions, polish, and symmetry?",            options:["Good","Very Good","Excellent-Ideal","Fair"],                                                   correct:2 },
    { id:9,  question:"In a well-cut Round Brilliant diamond, what happens to the light entering the stone?",             options:["Leaks through the bottom","Escapes from the sides","Reflects back to the viewer","Gets absorbed"], correct:2 },
    { id:10, question:"What does 'Eye-Clean' mean in diamond retail terminology?",                                         options:["Internally Flawless","No characteristics visible to the naked eye","Perfectly white","No fluorescence"], correct:1 },
    { id:11, question:"Which is NOT one of the traditional 4Cs of diamonds?",                                        options:["Cut","Clarity","Carat","Cost"],                                              correct:3 },
    { id:12, question:"'SI1' stands for:",                                                                                options:["Super Included 1","Slightly Included 1","Semi Included 1","Surface Included 1"],          correct:1 },
    { id:13, question:"The factor that produces a diamond's brightness, fire and contrast is:",                                options:["Color grade","Cut quality","Carat weight","Clarity grade"],                              correct:1 },
    { id:14, question:"Which color grade range is considered 'Colorless'?",                                               options:["D-F","G-J","K-M","N-R"],                                                                correct:0 },
    { id:15, question:"What is 'Fire' in a diamond?",                                                                    options:["The sparkle seen when the diamond is moved","Dispersed light seen as spectral colors","Reflections of colors in the environment","The overall brightness of the stone"], correct:1 },
    { id:16, question:"What does 'Scintillation' refer to in a diamond?",                                                 options:["The overall whiteness of the stone","The color saturation that appears under bright lights","Brightness, fire, and contrast seen together with motion","The depth percentage"], correct:2 },
    { id:17, question:"A '1-pointer' diamond weighs approximately:",                                                      options:["0.01 carats","0.10 carats","1.00 carat","0.001 carats"],                                 correct:0 },
    { id:18, question:"A feather-like break inside a diamond is called a:",                                               options:["Knot","Cloud","Feather","Twinning wisp"],                                              correct:2 },
    { id:19, question:"Which of the following are considered 'Fancy Shaped' diamonds?",                                      options:["Round Brilliant only","Oval, Marquise, Princess, Pear","Only square shapes","Only elongated shapes"], correct:1 },
    { id:20, question:"The 'Table' of a diamond is best described as:",                                                   options:["The largest flat facet on the top","The bottom pointed facet","The girdle circumference","The crown angle"], correct:0 },
    { id:21, question:"How many facets does a modern Round Brilliant cut diamond have?",                                 options:["32","48","57","64"],                                                                     correct:2 },
    { id:22, question:"Which of the 4Cs has the single greatest influence on a diamond's total price?",                   options:["Clarity","Color","Cut Quality","Carat Weight"],                                                  correct:3 },
    { id:23, question:"What is typically true of characteristics within diamonds graded 'SI2'?",                  options:["Not visible under any magnification","Noticeable at 10x magnification; possibly eye-visible","Always visible to the naked eye","Hardly visible under 10x magnification; never eye-visible"], correct:1 },
    { id:24, question:"What does 'Fluorescence' refer to in a diamond?",                                                  options:["The sparkle seen in sunlight","A glow emitted under ultraviolet light","The reflection of light from the table","The color grading under lab lighting"], correct:1 },
    { id:25, question:"Which diamond shape typically appears large for its carat weight due to its elongated outline?",  options:["Round Brilliant","Princess","Marquise","Cushion"],                                       correct:2 }
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

    // Auto-sync country code + show/hide city field when country changes
    const countryCodeMap = {
        'India': '+91', 'Belgium': '+32', 'USA': '+1', 'UAE': '+971',
        'China': '+86', 'Hong Kong': '+852', 'UK': '+44',
        'Singapore': '+65', 'Australia': '+61', 'Canada': '+1-CA',
        'Japan': '+81', 'Israel': '+972', 'Thailand': '+66',
        'Turkey': '+90', 'Italy': '+39', 'South Africa': '+27'
    };

    function updateCityField(country) {
        const cityGroup = document.getElementById('city-group');
        const cityLabel = document.getElementById('city-label');
        const cityInput = document.getElementById('city');

        if (!country || country === '') {
            cityGroup.style.display = 'none';
            cityInput.required = false;
            cityInput.value = '';
        } else if (country === 'India') {
            cityGroup.style.display = 'flex';
            cityLabel.textContent = 'City *';
            cityInput.placeholder = 'e.g. Mumbai, Delhi, Surat...';
            cityInput.required = true;
        } else {
            cityGroup.style.display = 'flex';
            cityLabel.textContent = 'State / Region (optional)';
            cityInput.placeholder = 'e.g. California, Dubai Marina...';
            cityInput.required = false;
        }
    }

    // Trigger on page load for default (India)
    updateCityField(els.country.value);

    els.country.addEventListener('change', () => {
        const code = countryCodeMap[els.country.value];
        if (code) els.countryCode.value = code;
        else els.countryCode.value = 'other';
        updateCityField(els.country.value);
    });

    els.startBtn.addEventListener('click', handleStart);
});

// ============ REGISTRATION ============
function handleStart() {
    const name  = els.fullName.value.trim();
    const email = els.email.value.trim();
    if (!name || !email) { alert('Please enter your name and email to continue.'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { alert('Please enter a valid email address.'); return; }
    const country = els.country.value || 'India';
    if (country === 'India' && !els.city.value.trim()) { alert('Please enter your city.'); return; }
    currentUser = {
        name, email,
        mobile:      els.mobile.value.trim() || '',
        countryCode: els.mobile.value.trim() ? els.countryCode.value.replace('-CA','') : '',
        country:     els.country.value || 'India',
        profession:  els.profession.value || 'Not specified',
        city:        els.city.value.trim() || ''
    };
    sendOTP();
}

// ============ OTP ENGINE ============
function generateOTP() { return Math.floor(100000 + Math.random() * 900000).toString(); }

function sendOTP() {
    const btn = els.startBtn;
    btn.textContent = 'Sending Code...'; btn.classList.add('otp-sending');
    otpCode = generateOTP(); otpExpiry = Date.now() + (OTP_EXPIRY_SEC * 1000); otpAttempts = 0;
    emailjs.init(EMAILJS_PUBLIC_KEY);
    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        to_name: currentUser.name, to_email: currentUser.email,
        otp_code: otpCode, quiz_name: 'IGI 4Cs Diamond Quiz', expiry_min: '5'
    }).then(() => {
        btn.textContent = 'Start Quiz →'; btn.classList.remove('otp-sending');
        showOTPSection();
    }).catch(err => {
        btn.textContent = 'Start Quiz →'; btn.classList.remove('otp-sending');
        console.error('EmailJS error:', err);
        alert('Failed to send verification code. Please check your email and try again.');
    });
}

function showOTPSection() {
    els.reg.classList.add('hidden');
    const sec = document.getElementById('otp-section');
    sec.classList.remove('hidden');
    document.getElementById('otp-email-display').textContent = currentUser.email;
    document.getElementById('otp-error').classList.add('hidden');
    document.getElementById('otp-expired').classList.add('hidden');
    clearOTPBoxes(); startOTPCountdown(); initOTPBoxes();
    setTimeout(() => document.querySelectorAll('.otp-box')[0]?.focus(), 100);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function clearOTPBoxes() {
    document.querySelectorAll('.otp-box').forEach(b => { b.value = ''; b.classList.remove('filled','success','error'); });
}

function initOTPBoxes() {
    const boxes = [...document.querySelectorAll('.otp-box')];
    boxes.forEach((box, i) => { const nb = box.cloneNode(true); box.parentNode.replaceChild(nb, box); });
    const fb = [...document.querySelectorAll('.otp-box')];
    fb.forEach((box, i) => {
        box.addEventListener('input', () => {
            box.value = box.value.replace(/[^0-9]/g, '');
            box.classList.toggle('filled', !!box.value);
            if (box.value && i < fb.length - 1) fb[i+1].focus();
            if (fb.every(b => b.value)) verifyOTP();
        });
        box.addEventListener('keydown', e => {
            if (e.key === 'Backspace' && !box.value && i > 0) { fb[i-1].focus(); fb[i-1].value = ''; fb[i-1].classList.remove('filled'); }
            if (e.key === 'Enter') verifyOTP();
        });
        box.addEventListener('paste', e => {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g,'').slice(0,6);
            text.split('').forEach((ch, idx) => { if (fb[idx]) { fb[idx].value = ch; fb[idx].classList.add('filled'); } });
            if (fb.every(b => b.value)) verifyOTP();
        });
    });
}

function verifyOTP() {
    const entered = [...document.querySelectorAll('.otp-box')].map(b => b.value).join('');
    if (entered.length < 6) return;
    document.getElementById('otp-error').classList.add('hidden');
    document.getElementById('otp-expired').classList.add('hidden');
    if (Date.now() > otpExpiry) {
        document.querySelectorAll('.otp-box').forEach(b => b.classList.add('error'));
        document.getElementById('otp-expired').classList.remove('hidden');
        document.getElementById('otp-timer-txt').classList.add('hidden');
        document.getElementById('resend-otp-btn').classList.remove('hidden');
        stopOTPCountdown(); return;
    }
    otpAttempts++;
    if (entered === otpCode) {
        document.querySelectorAll('.otp-box').forEach(b => b.classList.add('success'));
        stopOTPCountdown();
        showToast('✅', 'Email verified! Starting quiz...');
        setTimeout(() => { document.getElementById('otp-section').classList.add('hidden'); startQuiz(); }, 900);
    } else {
        document.querySelectorAll('.otp-box').forEach(b => b.classList.add('error'));
        setTimeout(() => {
            document.querySelectorAll('.otp-box').forEach(b => b.classList.remove('error'));
            const rem = OTP_MAX_ATTEMPTS - otpAttempts;
            document.getElementById('otp-error').textContent = rem > 0
                ? `❌ Incorrect code. ${rem} attempt${rem===1?'':'s'} remaining.`
                : '❌ Too many incorrect attempts. Please request a new code.';
            document.getElementById('otp-error').classList.remove('hidden');
            clearOTPBoxes(); document.querySelectorAll('.otp-box')[0]?.focus();
        }, 500);
    }
}

function startOTPCountdown() {
    stopOTPCountdown();
    const timerEl = document.getElementById('otp-countdown');
    const txtEl   = document.getElementById('otp-timer-txt');
    const resendBtn = document.getElementById('resend-otp-btn');
    txtEl.classList.remove('hidden','urgent'); resendBtn.classList.add('hidden');
    otpCountdownIv = setInterval(() => {
        const rem = Math.max(0, Math.ceil((otpExpiry - Date.now()) / 1000));
        timerEl.textContent = `${Math.floor(rem/60).toString().padStart(2,'0')}:${(rem%60).toString().padStart(2,'0')}`;
        if (rem <= 60) txtEl.classList.add('urgent');
        if (rem <= 0) { stopOTPCountdown(); txtEl.classList.add('hidden'); resendBtn.classList.remove('hidden'); }
    }, 1000);
}

function stopOTPCountdown() { if (otpCountdownIv) { clearInterval(otpCountdownIv); otpCountdownIv = null; } }

function goBackToRegistration() {
    stopOTPCountdown();
    document.getElementById('otp-section').classList.add('hidden');
    els.reg.classList.remove('hidden');
}

// Wire verify + resend buttons on DOM ready (added to existing DOMContentLoaded)
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('verify-otp-btn')?.addEventListener('click', verifyOTP);
    document.getElementById('resend-otp-btn')?.addEventListener('click', () => {
        clearOTPBoxes();
        document.getElementById('otp-error').classList.add('hidden');
        document.getElementById('otp-expired').classList.add('hidden');
        otpAttempts = 0; otpCode = generateOTP(); otpExpiry = Date.now() + (OTP_EXPIRY_SEC * 1000);
        emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
            to_name: currentUser.name, to_email: currentUser.email,
            otp_code: otpCode, quiz_name: 'IGI 4Cs Diamond Quiz', expiry_min: '5'
        }).then(() => { startOTPCountdown(); showToast('✉️', 'New code sent to your email!'); })
          .catch(() => showToast('⚠️', 'Failed to resend. Please try again.'));
    });
});

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

    // Meta Pixel — quiz started
    if (typeof fbq !== 'undefined') fbq('track', 'InitiateCheckout', { content_name: 'IGI 4Cs Quiz Started' });
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

    // Meta Pixel — quiz completed
    if (typeof fbq !== 'undefined') fbq('track', 'CompleteRegistration', {
        content_name: 'IGI 4Cs Quiz Completed',
        value: score,
        currency: 'INR'
    });

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

        // Meta Pixel — course lead
        if (typeof fbq !== 'undefined') fbq('track', 'Lead', {
            content_name: course,
            content_category: 'IGI Course Enquiry'
        });
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

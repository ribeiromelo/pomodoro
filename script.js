// Timer logic with Web Worker and Wake Lock support
// Load or set default timer settings
window.settings = {
    pomodoro: 25,
    short: 5,
    long: 15,
    sound: "1"
};

// Load settings from localStorage if available
if (localStorage.getItem('pomodoroSettings')) {
    window.settings = JSON.parse(localStorage.getItem('pomodoroSettings'));
}

// Sound options
const sounds = {
    "1": "https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3",
    "2": "https://assets.mixkit.co/sfx/preview/mixkit-melodic-bonus-collect-1938.mp3",
    "3": "https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3"
};

// Load theme preference
if (localStorage.getItem('theme') === 'light') {
    document.body.classList.add('light-mode');
    document.getElementById('theme-icon').classList.replace('fa-moon', 'fa-sun');
}

let currentMode = 'pomodoro';
let minutes = window.settings.pomodoro;
let seconds = 0;
let isRunning = false;
let timerInterval;

// Web Worker for background timer
let timerWorker = null;
let wakeLock = null;
let useWorker = true;

// Initialize Web Worker
try {
    timerWorker = new Worker('timer-worker.js');
    timerWorker.addEventListener('message', handleWorkerMessage);
    timerWorker.addEventListener('error', (e) => {
        console.error('Timer Worker Error:', e);
        useWorker = false;
    });
} catch (e) {
    console.error('Web Worker not supported:', e);
    useWorker = false;
}

let completedSessions = parseInt(localStorage.getItem('completedSessions')) || 0;
let totalSessions = parseInt(localStorage.getItem('totalSessions')) || 0;

const timeDisplay = document.getElementById('time-display');
const startPauseBtn = document.getElementById('start-pause-btn');
const progressCircle = document.querySelector('.progress-ring__circle');
const completedSessionsEl = document.getElementById('completed-sessions');
const totalSessionsEl = document.getElementById('total-sessions');
const progressBar = document.getElementById('progress-bar');
const fullscreenBtn = document.getElementById('fullscreen-btn');
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const pomodoroTab = document.getElementById('pomodoro-tab');
const shortTab = document.getElementById('short-tab');
const longTab = document.getElementById('long-tab');
const focusBtn = document.getElementById('focus-mode-btn');
const exitFocusBtn = document.getElementById('exit-focus-btn');
const focusArea = document.getElementById('focus-area');

// Cookie banner references
const cookieBanner = document.getElementById('cookie-banner');
const acceptCookiesBtn = document.getElementById('accept-cookies');
const denyCookiesBtn = document.getElementById('deny-cookies');

// Initialize progress circle
progressCircle.style.strokeDashoffset = "283";

// Handle messages from Web Worker
function handleWorkerMessage(e) {
    const { type, minutes: workerMinutes, seconds: workerSeconds, mode } = e.data;
    
    if (type === 'tick') {
        minutes = workerMinutes;
        seconds = workerSeconds;
        updateDisplay();
    } else if (type === 'completed') {
        handleTimerComplete(mode);
    }
}

function handleTimerComplete(mode) {
    isRunning = false;
    startPauseBtn.textContent = 'START';
    startPauseBtn.classList.remove('animate-pulse-slow');
    startPauseBtn.setAttribute('aria-label', 'Iniciar timer');
    
    // Play selected sound
    const audio = new Audio(sounds[window.settings.sound]);
    audio.play().catch(e => console.log('Audio play failed:', e));
    
    // Notification
    if (Notification.permission === 'granted') {
        new Notification('Pomodoro Completo!', {
            body: mode === 'pomodoro' ? 'Hora de uma pausa!' : 'Hora de voltar ao trabalho!',
            icon: 'https://placehold.co/128/8B5CF6/white?text=P+',
            requireInteraction: true
        });
    }
    
    // If it was a pomodoro session, increment completed sessions
    if (mode === 'pomodoro') {
        completedSessions++;
        localStorage.setItem('completedSessions', completedSessions);
    }
    
    // Release wake lock
    releaseWakeLock();
    
    updateDisplay();
}

function updateDisplay() {
    timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.title = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} | PomodoroPro`;

    // Update progress circle
    const totalSeconds = window.settings[currentMode] * 60;
    const remainingSeconds = minutes * 60 + seconds;
    const offset = 283 - (remainingSeconds / totalSeconds) * 283;
    progressCircle.style.strokeDashoffset = offset;
    
    // Update stats
    completedSessionsEl.textContent = completedSessions;
    totalSessionsEl.textContent = totalSessions;
    progressBar.style.width = totalSessions > 0 ? `${(completedSessions / totalSessions) * 100}%` : '0%';
    document.querySelector('[role="progressbar"]').setAttribute('aria-valuenow', totalSessions > 0 ? ((completedSessions / totalSessions) * 100).toFixed(0) : '0');
}

// Wake Lock API to prevent device sleep
async function requestWakeLock() {
    if ('wakeLock' in navigator) {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('Wake Lock activated');
            
            wakeLock.addEventListener('release', () => {
                console.log('Wake Lock released');
            });
        } catch (err) {
            console.error(`Wake Lock error: ${err.name}, ${err.message}`);
        }
    }
}

function releaseWakeLock() {
    if (wakeLock !== null) {
        wakeLock.release()
            .then(() => {
                wakeLock = null;
            })
            .catch(err => console.error('Wake Lock release error:', err));
    }
}

// Reacquire wake lock when page becomes visible
document.addEventListener('visibilitychange', async () => {
    if (wakeLock !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
    }
});

function toggleTimer() {
    if (isRunning) {
        // Pause
        if (useWorker && timerWorker) {
            timerWorker.postMessage({ action: 'pause' });
        } else {
            clearInterval(timerInterval);
        }
        
        startPauseBtn.textContent = 'START';
        startPauseBtn.classList.remove('animate-pulse-slow');
        startPauseBtn.setAttribute('aria-label', 'Iniciar timer');
        releaseWakeLock();
    } else {
        // Start
        if (useWorker && timerWorker) {
            timerWorker.postMessage({
                action: 'start',
                data: {
                    minutes: minutes,
                    seconds: seconds,
                    mode: currentMode,
                    totalSeconds: window.settings[currentMode] * 60
                }
            });
        } else {
            // Fallback to regular timer
            timerInterval = setInterval(() => {
                if (seconds === 0) {
                    if (minutes === 0) {
                        clearInterval(timerInterval);
                        handleTimerComplete(currentMode);
                        return;
                    }
                    minutes--;
                    seconds = 59;
                } else {
                    seconds--;
                }
                updateDisplay();
            }, 1000);
        }
        
        startPauseBtn.textContent = 'PAUSE';
        startPauseBtn.classList.add('animate-pulse-slow');
        startPauseBtn.setAttribute('aria-label', 'Pausar timer');
        
        // Request wake lock to keep device awake
        requestWakeLock();
    }
    isRunning = !isRunning;
}

window.resetTimer = function() {
    if (useWorker && timerWorker) {
        timerWorker.postMessage({
            action: 'reset',
            data: {
                minutes: window.settings[currentMode],
                seconds: 0,
                mode: currentMode,
                totalSeconds: window.settings[currentMode] * 60
            }
        });
    } else {
        clearInterval(timerInterval);
    }
    
    minutes = window.settings[currentMode];
    seconds = 0;
    isRunning = false;
    startPauseBtn.textContent = 'START';
    startPauseBtn.classList.remove('animate-pulse-slow');
    startPauseBtn.setAttribute('aria-label', 'Iniciar timer');
    releaseWakeLock();
    updateDisplay();
};

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
        fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
        fullscreenBtn.setAttribute('aria-label', 'Sair do modo tela cheia');
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
            fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
            fullscreenBtn.setAttribute('aria-label', 'Entrar em modo tela cheia');
        }
    }
}

function toggleTheme() {
    document.body.classList.toggle('light-mode');
    
    if (document.body.classList.contains('light-mode')) {
        themeIcon.classList.replace('fa-moon', 'fa-sun');
        localStorage.setItem('theme', 'light');
        cookieBanner.classList.add('light-mode');
    } else {
        themeIcon.classList.replace('fa-sun', 'fa-moon');
        localStorage.setItem('theme', 'dark');
        cookieBanner.classList.remove('light-mode');
    }
}

let isFocusMode = false;
function toggleFocusMode() {
    isFocusMode = !isFocusMode;
    
    const elementsToHide = document.querySelectorAll(".left-column, .center-column, .right-column, footer, .main-container > div:first-child, .main-container > div:nth-child(2)");

    if (isFocusMode) {
        document.body.classList.add('focus-mode-active');
        elementsToHide.forEach(el => {
            el.style.display = 'none';
        });

        focusBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
        focusBtn.setAttribute('aria-label', 'Sair do Modo Foco Total');
        
        focusArea.classList.add("scale-[1.25]", "transition-transform");
        document.body.classList.add("flex", "items-center", "justify-center");
        focusArea.classList.remove("mb-8");
        focusArea.style.margin = "auto";
        cookieBanner.style.display = 'none';
    } else {
        document.body.classList.remove('focus-mode-active');
        elementsToHide.forEach(el => {
            el.style.display = '';
        });

        focusBtn.innerHTML = '<i class="fas fa-eye"></i>';
        focusBtn.setAttribute('aria-label', 'Ativar Modo Foco Total');
        
        focusArea.classList.remove("scale-[1.25]");
        document.body.classList.remove("flex", "items-center", "justify-center");
        focusArea.classList.add("mb-8");
        focusArea.style.margin = "";
        if (localStorage.getItem('cookieConsent') !== 'accepted') {
            cookieBanner.style.display = 'flex';
        }
    }
}

// --- To-Do List ---
let tasks = JSON.parse(localStorage.getItem('pomodoroTasks')) || [];

const taskList = document.getElementById('task-list');
const newTaskInput = document.getElementById('new-task-input');
const addTaskBtn = document.getElementById('add-task-btn');
const noTasksMessage = document.getElementById('no-tasks-message');

function renderTasks() {
    taskList.innerHTML = '';
    if (tasks.length === 0) {
        noTasksMessage.classList.remove('hidden');
    } else {
        noTasksMessage.classList.add('hidden');
    }

    tasks.forEach((task, index) => {
        const taskItem = document.createElement('div');
        taskItem.className = "flex items-center bg-gray-700/50 rounded-lg p-3 border border-gray-600 task-item";
        taskItem.setAttribute('role', 'listitem');
        
        const checkBtn = document.createElement('button');
        checkBtn.className = `w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center focus:outline-none transition-colors ${task.completed ? 'border-purple-500 bg-purple-500' : 'border-gray-500 hover:border-purple-500'}`;
        checkBtn.innerHTML = task.completed ? '<i class="fas fa-check text-white text-xs"></i>' : '';
        checkBtn.setAttribute('aria-label', task.completed ? `Marcar "${task.text}" como não concluída` : `Marcar "${task.text}" como concluída`);
        checkBtn.addEventListener('click', () => toggleTask(index));
        
        const taskText = document.createElement('span');
        taskText.textContent = task.text;
        taskText.className = `flex-1 text-white ${task.completed ? 'task-completed' : ''}`;
        taskText.setAttribute('aria-live', 'polite');
        
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        deleteBtn.className = 'text-gray-400 hover:text-red-500 ml-4 transition-colors btn-press';
        deleteBtn.setAttribute('aria-label', `Excluir tarefa: ${task.text}`);
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTask(index);
        });

        taskItem.appendChild(checkBtn);
        taskItem.appendChild(taskText);
        taskItem.appendChild(deleteBtn);
        taskList.appendChild(taskItem);
    });
}

function addTask() {
    const text = newTaskInput.value.trim();
    if (text !== '') {
        tasks.push({ text, completed: false });
        saveTasks();
        renderTasks();
        newTaskInput.value = '';
        totalSessions++;
        localStorage.setItem('totalSessions', totalSessions);
        updateDisplay();
    }
}

function toggleTask(index) {
    tasks[index].completed = !tasks[index].completed;
    
    if (tasks[index].completed) {
        completedSessions++;
    } else {
        completedSessions--;
    }
    
    saveTasks();
    renderTasks();
    localStorage.setItem('completedSessions', completedSessions);
    updateDisplay();
}

function deleteTask(index) {
    if (tasks[index].completed) {
        completedSessions--;
    }
    tasks.splice(index, 1);
    totalSessions--;
    
    saveTasks();
    renderTasks();
    localStorage.setItem('completedSessions', completedSessions);
    localStorage.setItem('totalSessions', totalSessions);
    updateDisplay();
}

function saveTasks() {
    localStorage.setItem('pomodoroTasks', JSON.stringify(tasks));
}

function switchMode(mode) {
    currentMode = mode;
    window.resetTimer();
    
    pomodoroTab.classList.remove('bg-gradient-to-r', 'from-purple-600', 'to-indigo-600', 'text-white');
    shortTab.classList.remove('bg-gradient-to-r', 'from-purple-600', 'to-indigo-600', 'text-white');
    longTab.classList.remove('bg-gradient-to-r', 'from-purple-600', 'to-indigo-600', 'text-white');
    
    pomodoroTab.setAttribute('aria-selected', 'false');
    shortTab.setAttribute('aria-selected', 'false');
    longTab.setAttribute('aria-selected', 'false');

    if (mode === 'pomodoro') {
        pomodoroTab.classList.add('bg-gradient-to-r', 'from-purple-600', 'to-indigo-600', 'text-white');
        pomodoroTab.setAttribute('aria-selected', 'true');
    } else if (mode === 'short') {
        shortTab.classList.add('bg-gradient-to-r', 'from-purple-600', 'to-indigo-600', 'text-white');
        shortTab.setAttribute('aria-selected', 'true');
    } else {
        longTab.classList.add('bg-gradient-to-r', 'from-purple-600', 'to-indigo-600', 'text-white');
        longTab.setAttribute('aria-selected', 'true');
    }
}

// Cookie Consent
function showCookieBanner() {
    if (localStorage.getItem('cookieConsent') !== 'accepted') {
        cookieBanner.classList.add('show');
        cookieBanner.classList.remove('hidden');
        if (document.body.classList.contains('light-mode')) {
            cookieBanner.classList.add('light-mode');
        }
    }
}

function hideCookieBanner() {
    cookieBanner.classList.remove('show');
    cookieBanner.addEventListener('transitionend', () => {
        cookieBanner.classList.add('hidden');
    }, { once: true });
}

acceptCookiesBtn.addEventListener('click', () => {
    localStorage.setItem('cookieConsent', 'accepted');
    hideCookieBanner();
});

denyCookiesBtn.addEventListener('click', () => {
    localStorage.setItem('cookieConsent', 'denied');
    hideCookieBanner();
});

document.addEventListener('DOMContentLoaded', showCookieBanner);

// Event listeners
startPauseBtn.addEventListener('click', toggleTimer);
document.getElementById('reset-btn').addEventListener('click', window.resetTimer);
fullscreenBtn.addEventListener('click', toggleFullscreen);
themeToggle.addEventListener('click', toggleTheme);
focusBtn.addEventListener('click', toggleFocusMode);
exitFocusBtn.addEventListener('click', toggleFocusMode);
pomodoroTab.addEventListener('click', () => switchMode('pomodoro'));
shortTab.addEventListener('click', () => switchMode('short'));
longTab.addEventListener('click', () => switchMode('long'));
addTaskBtn.addEventListener('click', addTask);
newTaskInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') addTask();
});

// Notification permission
if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
    Notification.requestPermission();
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    const isTyping = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
    if (isTyping) return;

    switch (e.code) {
        case 'Space':
            e.preventDefault();
            toggleTimer();
            break;
        case 'KeyR':
            e.preventDefault();
            window.resetTimer();
            break;
        case 'KeyF':
            e.preventDefault();
            toggleFullscreen();
            break;
    }
});

// Initialize display
updateDisplay();
renderTasks();

// Video controls
const video = document.getElementById('motivational-video');
const overlay = document.getElementById('video-overlay');
const playButton = document.getElementById('play-button');

video.addEventListener('play', () => {
    overlay.style.opacity = '0';
    setTimeout(() => {
        overlay.style.display = 'none';
    }, 300);
});

video.addEventListener('pause', () => {
    overlay.style.display = 'flex';
    setTimeout(() => {
        overlay.style.opacity = '1';
    }, 10);
});

playButton.addEventListener('click', (e) => {
    e.stopPropagation();
    video.play();
});

overlay.addEventListener('click', () => {
    if(video.paused) {
        video.play();
    } else {
        video.pause();
    }
});

// Prevent context menu on video
document.getElementById('motivational-video').addEventListener('contextmenu', function(e) {
    e.preventDefault();
    return false;
});

// Update footer year
document.getElementById('current-year').textContent = new Date().getFullYear();

// Sync with worker periodically to ensure accuracy
if (useWorker && timerWorker) {
    setInterval(() => {
        if (isRunning) {
            timerWorker.postMessage({ action: 'sync' });
        }
    }, 10000); // Sync every 10 seconds
}

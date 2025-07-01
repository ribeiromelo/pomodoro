// Timer logic
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

let currentMode = 'pomodoro'; // 'pomodoro' | 'short' | 'long'
let minutes = window.settings.pomodoro;
let seconds = 0;
let isRunning = false;
let timerInterval;
let timeWhenHidden; // Variável para armazenar o tempo quando a aba for escondida

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
const exitFocusBtn = document = document.getElementById('exit-focus-btn');
const focusArea = document.getElementById('focus-area');

// Referências para o banner de cookies
const cookieBanner = document.getElementById('cookie-banner');
const acceptCookiesBtn = document.getElementById('accept-cookies');
const denyCookiesBtn = document.getElementById('deny-cookies');


// Initialize progress circle
progressCircle.style.strokeDashoffset = "283";

function updateDisplay() {
    timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.title = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} | PomodoroPro`; // Update tab title

    // Update progress circle (for current mode's time)
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

function toggleTimer() {
    if (isRunning) {
        clearInterval(timerInterval);
        startPauseBtn.textContent = 'START';
        startPauseBtn.classList.remove('animate-pulse-slow');
        startPauseBtn.setAttribute('aria-label', 'Iniciar timer');
    } else {
        // Quando o timer é iniciado, reset timeWhenHidden
        timeWhenHidden = null;
        timerInterval = setInterval(() => {
            if (seconds === 0) {
                if (minutes === 0) {
                    clearInterval(timerInterval);
                    
                    // Play selected sound
                    const audio = new Audio(sounds[window.settings.sound]);
                    audio.play();
                    
                    // Notification
                    if (Notification.permission === 'granted') {
                        new Notification('Pomodoro Completo!', {
                            body: currentMode === 'pomodoro' ? 'Hora de uma pausa!' : 'Hora de voltar ao trabalho!',
                            icon: 'https://placehold.co/128/8B5CF6/white?text=P+'
                        });
                    }
                    
                    // Change button to "START" and reset timer
                    isRunning = false;
                    startPauseBtn.textContent = 'START';
                    startPauseBtn.classList.remove('animate-pulse-slow');
                    startPauseBtn.setAttribute('aria-label', 'Iniciar timer');
                    
                    // If it was a pomodoro session, increment completed sessions
                    if (currentMode === 'pomodoro') {
                        completedSessions++;
                        localStorage.setItem('completedSessions', completedSessions);
                        updateDisplay();
                    }
                    return;
                }
                minutes--;
                seconds = 59;
            } else {
                seconds--;
            }
            updateDisplay();
        }, 1000);
        startPauseBtn.textContent = 'PAUSE';
        startPauseBtn.classList.add('animate-pulse-slow');
        startPauseBtn.setAttribute('aria-label', 'Pausar timer');
    }
    isRunning = !isRunning;
}

// 'resetTimer' agora é uma função global
window.resetTimer = function() {
    clearInterval(timerInterval);
    minutes = window.settings[currentMode];
    seconds = 0;
    isRunning = false;
    startPauseBtn.textContent = 'START';
    startPauseBtn.classList.remove('animate-pulse-slow');
    startPauseBtn.setAttribute('aria-label', 'Iniciar timer');
    timeWhenHidden = null; // Reseta também ao reiniciar o timer
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

// Toggle theme
function toggleTheme() {
    document.body.classList.toggle('light-mode');
    
    if (document.body.classList.contains('light-mode')) {
        themeIcon.classList.replace('fa-moon', 'fa-sun');
        localStorage.setItem('theme', 'light');
        cookieBanner.classList.add('light-mode'); // Aplica tema ao banner
    } else {
        themeIcon.classList.replace('fa-sun', 'fa-moon');
        localStorage.setItem('theme', 'dark');
        cookieBanner.classList.remove('light-mode'); // Remove tema do banner
    }
}

// Focus mode toggle
let isFocusMode = false;
function toggleFocusMode() {
    isFocusMode = !isFocusMode;
    
    const elementsToHide = document.querySelectorAll(".left-column, .center-column, .right-column, footer, .main-container > div:first-child, .main-container > div:nth-child(2)"); // Hide header and tabs

    if (isFocusMode) {
        document.body.classList.add('focus-mode-active');
        elementsToHide.forEach(el => {
            el.style.display = 'none';
        });

        focusBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
        focusBtn.setAttribute('aria-label', 'Sair do Modo Foco Total');
        
        // Adjust visual focus
        focusArea.classList.add("scale-[1.25]", "transition-transform");
        document.body.classList.add("flex", "items-center", "justify-center");
        focusArea.classList.remove("mb-8");
        focusArea.style.margin = "auto"; // Center the timer
        cookieBanner.style.display = 'none'; // Esconde o banner de cookies no modo foco
    } else {
        document.body.classList.remove('focus-mode-active');
        elementsToHide.forEach(el => {
            el.style.display = ''; // Reset display to default
        });

        focusBtn.innerHTML = '<i class="fas fa-eye"></i>';
        focusBtn.setAttribute('aria-label', 'Ativar Modo Foco Total');
        
        focusArea.classList.remove("scale-[1.25]");
        document.body.classList.remove("flex", "items-center", "justify-center");
        focusArea.classList.add("mb-8");
        focusArea.style.margin = ""; // Remove custom margin
        if (localStorage.getItem('cookieConsent') !== 'accepted') { // Mostra se não aceitou
            cookieBanner.style.display = 'flex'; // Volta a mostrar o banner de cookies
        }
    }
}

// --- To-Do List ---
let tasks = JSON.parse(localStorage.getItem('pomodoroTasks')) || [];

const taskList = document.getElementById('task-list');
const newTaskInput = document.getElementById('new-task-input');
const addTaskBtn = document.getElementById('add-task-btn');
const noTasksMessage = document.getElementById('no-tasks-message');

// Render tasks
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
        taskText.setAttribute('aria-live', 'polite'); // Announce changes to screen readers
        
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

// Add new task
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

// Toggle task completion
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

// Delete task
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

// Save tasks to localStorage
function saveTasks() {
    localStorage.setItem('pomodoroTasks', JSON.stringify(tasks));
}

// Switch timer mode
function switchMode(mode) {
    currentMode = mode;
    window.resetTimer(); // Chama a versão global de resetTimer
    
    // Update active tab
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

// --- Cookie Consent Logic ---
function showCookieBanner() {
    // Verifica se o usuário já aceitou os cookies
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
    }, { once: true }); // Garante que o evento só seja executado uma vez
}

acceptCookiesBtn.addEventListener('click', () => {
    localStorage.setItem('cookieConsent', 'accepted');
    hideCookieBanner();
});

denyCookiesBtn.addEventListener('click', () => {
    // Para este caso simples, "recusar" significa não salvar nada.
    // Em apps mais complexos, talvez seria necessário limpar dados ou desabilitar features.
    localStorage.setItem('cookieConsent', 'denied');
    hideCookieBanner();
    // Você pode adicionar uma lógica aqui para limpar dados existentes se o usuário recusar
    // Por exemplo, para "resetar" as configurações e tarefas:
    // localStorage.removeItem('pomodoroSettings');
    // localStorage.removeItem('pomodoroTasks');
    // localStorage.removeItem('completedSessions');
    // localStorage.removeItem('totalSessions');
    // window.location.reload(); // Recarregar a página para aplicar as novas configurações
});

// Exibe o banner de cookies quando a página carrega
document.addEventListener('DOMContentLoaded', showCookieBanner);


// Event listeners
startPauseBtn.addEventListener('click', toggleTimer);
document.getElementById('reset-btn').addEventListener('click', window.resetTimer); // Chama a versão global
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
if (Notification.permission !== 'granted') {
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
            window.resetTimer(); // Chama a versão global
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

// Controles do vídeo motivacional
const video = document.getElementById('motivational-video');
const overlay = document.getElementById('video-overlay');
const playButton = document.getElementById('play-button');

// Mostrar/ocultar overlay
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

// Controles de clique
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

// Bloqueia atalhos de teclado
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
    }
});

// Bloqueia menu de contexto no vídeo
document.getElementById('motivational-video').addEventListener('contextmenu', function(e) {
    e.preventDefault();
    return false;
});

// Atualiza o ano automaticamente no rodapé
document.getElementById('current-year').textContent = new Date().getFullYear();

// --- Nova lógica para contagem em segundo plano (Visibility API) ---
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // A aba foi para segundo plano (ou navegador minimizado)
        if (isRunning) { // Só importa se o timer estava rodando
            timeWhenHidden = Date.now(); // Armazena o timestamp exato
            console.log("Timer escondido em:", new Date(timeWhenHidden)); // Para debug
        }
    } else {
        // A aba voltou a ficar ativa
        if (isRunning && timeWhenHidden) {
            const timeInBackground = Date.now() - timeWhenHidden; // Tempo em milissegundos que a aba ficou escondida
            console.log("Timer visível novamente. Tempo em segundo plano:", timeInBackground / 1000, "segundos"); // Para debug

            // Converte milissegundos para segundos e arredonda para baixo
            const elapsedSeconds = Math.floor(timeInBackground / 1000);

            // Calcula o total de segundos restantes no timer
            let totalRemainingSeconds = (minutes * 60) + seconds;

            // Subtrai o tempo passado em segundo plano
            totalRemainingSeconds -= elapsedSeconds;

            if (totalRemainingSeconds <= 0) {
                // Se o tempo esgotou enquanto estava escondido, finalize o timer
                minutes = 0;
                seconds = 0;
                clearInterval(timerInterval);
                isRunning = false;
                startPauseBtn.textContent = 'START';
                startPauseBtn.classList.remove('animate-pulse-slow');
                startPauseBtn.setAttribute('aria-label', 'Iniciar timer');

                // Toca som e notifica, mesmo que tarde
                const audio = new Audio(sounds[window.settings.sound]);
                audio.play();
                if (Notification.permission === 'granted') {
                    new Notification('Pomodoro Completo!', {
                        body: currentMode === 'pomodoro' ? 'Hora de uma pausa!' : 'Hora de voltar ao trabalho! (concluído em segundo plano)',
                        icon: 'https://placehold.co/128/8B5CF6/white?text=P+'
                    });
                }
                
                // Se era um pomodoro, incrementa sessões concluídas
                if (currentMode === 'pomodoro') {
                    completedSessions++;
                    localStorage.setItem('completedSessions', completedSessions);
                }
            } else {
                // Se ainda resta tempo, atualiza minutes e seconds
                minutes = Math.floor(totalRemainingSeconds / 60);
                seconds = totalRemainingSeconds % 60;
            }
            timeWhenHidden = null; // Reseta a variável
            updateDisplay(); // Atualiza o display imediatamente
        }
    }
});

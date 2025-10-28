// Web Worker for Pomodoro Timer
// This runs in a separate thread and continues even when tab is in background

let timerState = {
    isRunning: false,
    minutes: 25,
    seconds: 0,
    mode: 'pomodoro',
    startTime: null,
    totalSeconds: 1500
};

let intervalId = null;

// Listen for messages from main thread
self.addEventListener('message', (e) => {
    const { action, data } = e.data;
    
    switch (action) {
        case 'start':
            startTimer(data);
            break;
        case 'pause':
            pauseTimer();
            break;
        case 'reset':
            resetTimer(data);
            break;
        case 'sync':
            syncTime();
            break;
        case 'updateSettings':
            updateSettings(data);
            break;
    }
});

function startTimer(data) {
    if (data) {
        timerState.minutes = data.minutes;
        timerState.seconds = data.seconds;
        timerState.mode = data.mode;
        timerState.totalSeconds = data.totalSeconds;
    }
    
    timerState.isRunning = true;
    timerState.startTime = Date.now();
    
    // Use setInterval instead of setTimeout for better accuracy
    if (intervalId) {
        clearInterval(intervalId);
    }
    
    intervalId = setInterval(() => {
        if (timerState.isRunning) {
            tick();
        }
    }, 1000);
    
    // Send immediate update
    sendUpdate();
}

function tick() {
    if (timerState.seconds === 0) {
        if (timerState.minutes === 0) {
            // Timer completed
            timerState.isRunning = false;
            clearInterval(intervalId);
            
            self.postMessage({
                type: 'completed',
                mode: timerState.mode
            });
            return;
        }
        timerState.minutes--;
        timerState.seconds = 59;
    } else {
        timerState.seconds--;
    }
    
    sendUpdate();
}

function pauseTimer() {
    timerState.isRunning = false;
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
    sendUpdate();
}

function resetTimer(data) {
    timerState.isRunning = false;
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
    
    if (data) {
        timerState.minutes = data.minutes;
        timerState.seconds = data.seconds;
        timerState.mode = data.mode;
        timerState.totalSeconds = data.totalSeconds;
    }
    
    sendUpdate();
}

function syncTime() {
    // Calculate elapsed time since start to ensure accuracy
    if (timerState.isRunning && timerState.startTime) {
        const elapsed = Math.floor((Date.now() - timerState.startTime) / 1000);
        const totalSeconds = timerState.minutes * 60 + timerState.seconds;
        const remaining = Math.max(0, totalSeconds - elapsed);
        
        timerState.minutes = Math.floor(remaining / 60);
        timerState.seconds = remaining % 60;
        
        if (remaining === 0) {
            timerState.isRunning = false;
            clearInterval(intervalId);
            
            self.postMessage({
                type: 'completed',
                mode: timerState.mode
            });
            return;
        }
    }
    
    sendUpdate();
}

function updateSettings(data) {
    if (data) {
        timerState.totalSeconds = data.totalSeconds;
    }
}

function sendUpdate() {
    self.postMessage({
        type: 'tick',
        minutes: timerState.minutes,
        seconds: timerState.seconds,
        isRunning: timerState.isRunning,
        mode: timerState.mode
    });
}

// Keep alive ping every 30 seconds to prevent worker from being terminated
setInterval(() => {
    if (timerState.isRunning) {
        syncTime();
    }
}, 30000);

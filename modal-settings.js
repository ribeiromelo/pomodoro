// Modal Settings Logic
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeModalBtn = document.getElementById('close-modal');
const cancelSettingsBtn = document.getElementById('cancel-settings');
const saveSettingsBtn = document.getElementById('save-settings');
const soundSelector = document.getElementById('sound-selector');

function openModal() {
    // Fill modal inputs with current settings (from script.js's settings variable)
    document.getElementById('modal-pomodoro-time').value = window.settings.pomodoro;
    document.getElementById('modal-short-break').value = window.settings.short;
    document.getElementById('modal-long-break').value = window.settings.long;
    soundSelector.value = window.settings.sound;
    
    settingsModal.classList.remove('modal-hidden');
    settingsModal.classList.add('modal-visible');
    settingsModal.setAttribute('aria-hidden', 'false');
    // Focus first input for accessibility
    document.getElementById('modal-pomodoro-time').focus();
}

function closeModal() {
    settingsModal.classList.remove('modal-visible');
    settingsModal.classList.add('modal-hidden');
    settingsModal.setAttribute('aria-hidden', 'true');
}

// Save settings
saveSettingsBtn.addEventListener('click', () => {
    const pomodoro = parseInt(document.getElementById('modal-pomodoro-time').value);
    const short = parseInt(document.getElementById('modal-short-break').value);
    const long = parseInt(document.getElementById('modal-long-break').value);
    const sound = soundSelector.value;

    if (pomodoro > 0 && short > 0 && long > 0) {
        // Update global settings from script.js
        window.settings.pomodoro = pomodoro;
        window.settings.short = short;
        window.settings.long = long;
        window.settings.sound = sound;

        localStorage.setItem('pomodoroSettings', JSON.stringify(window.settings));
        
        // Re-initialize timer and update display with new settings
        if (typeof window.resetTimer === 'function') {
            window.resetTimer();
        }
        closeModal();
    } else {
        alert("Todos os tempos devem ser maiores que zero.");
    }
});

// Event listeners for modal
settingsBtn.addEventListener('click', openModal);
closeModalBtn.addEventListener('click', closeModal);
cancelSettingsBtn.addEventListener('click', closeModal);

// Close modal when clicking outside
settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
        closeModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && settingsModal.classList.contains('modal-visible')) {
        closeModal();
    }
});
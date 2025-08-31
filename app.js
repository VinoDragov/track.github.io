// Gestion des données
let habits = JSON.parse(localStorage.getItem('habits')) || [];

// Éléments DOM
const habitsContainer = document.getElementById('habits-container');
const habitNameInput = document.getElementById('habit-name');
const habitFrequencySelect = document.getElementById('habit-frequency');
const addHabitButton = document.getElementById('add-habit');
const totalHabitsElement = document.getElementById('total-habits');
const completionRateElement = document.getElementById('completion-rate');
const currentStreakElement = document.getElementById('current-streak');
const longestStreakElement = document.getElementById('longest-streak');
const installButton = document.getElementById('install-btn');

// Fonctions
function saveHabits() {
    localStorage.setItem('habits', JSON.stringify(habits));
    updateStats();
}

function addHabit() {
    const name = habitNameInput.value.trim();
    const frequency = habitFrequencySelect.value;
    
    if (!name) {
        alert('Veuillez entrer un nom pour votre habitude');
        return;
    }
    
    const habit = {
        id: Date.now(),
        name,
        frequency,
        completedDates: [],
        createdAt: new Date().toISOString()
    };
    
    habits.push(habit);
    saveHabits();
    renderHabits();
    
    // Réinitialiser le formulaire
    habitNameInput.value = '';
}

function toggleHabitDate(habitId, date) {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;
    
    const dateStr = date.toDateString();
    const index = habit.completedDates.indexOf(dateStr);
    
    if (index > -1) {
        habit.completedDates.splice(index, 1);
    } else {
        habit.completedDates.push(dateStr);
    }
    
    saveHabits();
    renderHabits();
}

function deleteHabit(habitId) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette habitude ?')) {
        habits = habits.filter(h => h.id !== habitId);
        saveHabits();
        renderHabits();
    }
}

function renderHabits() {
    habitsContainer.innerHTML = '';
    
    if (habits.length === 0) {
        habitsContainer.innerHTML = `
            <div class="empty-state">
                <p>Vous n'avez aucune habitude enregistrée.</p>
                <p>Ajoutez votre première habitude pour commencer à tracker !</p>
            </div>
        `;
        return;
    }
    
    habits.forEach(habit => {
        const habitElement = document.createElement('div');
        habitElement.className = 'habit-card';
        
        // Générer les 7 derniers jours pour le suivi
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            days.push(date);
        }
        
        const dayBoxes = days.map(date => {
            const isChecked = habit.completedDates.includes(date.toDateString());
            return `
                <div class="day-box">
                    <div class="day-label">${date.getDate()}/${date.getMonth() + 1}</div>
                    <div class="day-checkbox ${isChecked ? 'checked' : ''}" 
                         data-date="${date.toISOString()}">
                        ${isChecked ? '✓' : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        // Calculer les séries
        const { currentStreak, longestStreak } = calculateStreaks(habit);
        
        habitElement.innerHTML = `
            <div class="habit-title">
                <span>${habit.name}</span>
                <button class="delete-btn" data-id="${habit.id}">×</button>
            </div>
            <div class="habit-frequency">${getFrequencyText(habit.frequency)}</div>
            <div class="streak-info">
                <span>Série actuelle: ${currentStreak} jours</span>
                <span>Record: ${longestStreak} jours</span>
            </div>
            <div class="habit-tracker">${dayBoxes}</div>
        `;
        
        habitsContainer.appendChild(habitElement);
        
        // Ajouter les événements pour les cases à cocher
        habitElement.querySelectorAll('.day-checkbox').forEach(box => {
            box.addEventListener('click', () => {
                const date = new Date(box.dataset.date);
                toggleHabitDate(habit.id, date);
            });
        });
        
        // Ajouter l'événement pour le bouton de suppression
        habitElement.querySelector('.delete-btn').addEventListener('click', () => {
            deleteHabit(habit.id);
        });
    });
}

function calculateStreaks(habit) {
    if (habit.completedDates.length === 0) {
        return { currentStreak: 0, longestStreak: 0 };
    }
    
    // Trier les dates du plus récent au plus ancien
    const sortedDates = habit.completedDates
        .map(dateStr => new Date(dateStr))
        .sort((a, b) => b - a);
    
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;
    
    // Vérifier la série actuelle (jours consécutifs jusqu'à aujourd'hui)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < sortedDates.length; i++) {
        const currentDate = new Date(sortedDates[i]);
        currentDate.setHours(0, 0, 0, 0);
        
        const nextDate = i > 0 ? new Date(sortedDates[i-1]) : null;
        if (nextDate) {
            nextDate.setHours(0, 0, 0, 0);
            
            // Vérifier si les dates sont consécutives
            const diffTime = nextDate - currentDate;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                tempStreak++;
            } else {
                if (tempStreak > longestStreak) longestStreak = tempStreak;
                tempStreak = 1;
            }
        }
        
        // Vérifier la série actuelle
        if (i === 0) {
            const diffToday = today - currentDate;
            const diffDays = Math.floor(diffToday / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0 || (diffDays === 1 && currentStreak === 0)) {
                currentStreak = tempStreak;
            }
        }
    }
    
    if (tempStreak > longestStreak) longestStreak = tempStreak;
    
    return { currentStreak, longestStreak };
}

function getFrequencyText(frequency) {
    switch(frequency) {
        case 'daily': return 'À faire tous les jours';
        case 'weekly': return 'À faire chaque semaine';
        case 'monthly': return 'À faire chaque mois';
        default: return frequency;
    }
}

function updateStats() {
    totalHabitsElement.textContent = habits.length;
    
    if (habits.length === 0) {
        completionRateElement.textContent = '0%';
        currentStreakElement.textContent = '0';
        longestStreakElement.textContent = '0';
        return;
    }
    
    // Calculer le taux de réussite global
    const today = new Date().toDateString();
    let totalPossible = 0;
    let totalCompleted = 0;
    
    habits.forEach(habit => {
        // Pour chaque habitude, vérifier si elle aurait dû être faite aujourd'hui
        // Pour simplifier, nous considérons qu'une habitude doit être faite tous les jours
        totalPossible++;
        if (habit.completedDates.includes(today)) {
            totalCompleted++;
        }
    });
    
    const completionRate = Math.round((totalCompleted / totalPossible) * 100);
    completionRateElement.textContent = `${completionRate}%`;
    
    // Calculer les séries globales
    let globalCurrentStreak = 0;
    let globalLongestStreak = 0;
    
    habits.forEach(habit => {
        const { currentStreak, longestStreak } = calculateStreaks(habit);
        if (currentStreak > globalCurrentStreak) globalCurrentStreak = currentStreak;
        if (longestStreak > globalLongestStreak) globalLongestStreak = longestStreak;
    });
    
    currentStreakElement.textContent = globalCurrentStreak;
    longestStreakElement.textContent = globalLongestStreak;
}

// Gestion de la PWA
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installButton.style.display = 'block';
});

installButton.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            installButton.style.display = 'none';
        }
        deferredPrompt = null;
    }
});

// Service Worker pour la PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('SW enregistré: ', registration);
            })
            .catch(registrationError => {
                console.log('Échec enregistrement SW: ', registrationError);
            });
    });
}

// Événements
addHabitButton.addEventListener('click', addHabit);

// Initialisation
renderHabits();
updateStats();
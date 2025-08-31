// Gestion des données
let habits = JSON.parse(localStorage.getItem('habits')) || [];
let currentDate = new Date();
let calendarDate = new Date();

// Éléments DOM
const habitsContainer = document.getElementById('habits-container');
const habitsView = document.getElementById('habits-view');
const calendarView = document.getElementById('calendar-view');
const viewToggle = document.getElementById('view-toggle');
const calendarElement = document.getElementById('calendar');
const currentMonthElement = document.getElementById('current-month');
const prevMonthButton = document.getElementById('prev-month');
const nextMonthButton = document.getElementById('next-month');
const habitNameInput = document.getElementById('habit-name');
const habitColorInput = document.getElementById('habit-color');
const habitDurationInput = document.getElementById('habit-duration');
const habitFrequencySelect = document.getElementById('habit-frequency');
const habitCategoryInput = document.getElementById('habit-category');
const saveHabitButton = document.getElementById('save-habit');
const addHabitButton = document.getElementById('add-habit-btn');
const addHabitModal = document.getElementById('add-habit-modal');
const closeModal = document.querySelector('.close');
const totalHabitsElement = document.getElementById('total-habits');
const completionRateElement = document.getElementById('completion-rate');
const currentStreakElement = document.getElementById('current-streak');
const longestStreakElement = document.getElementById('longest-streak');
const calendarLegend = document.getElementById('calendar-legend');

// Fonctions de base
function saveHabits() {
    localStorage.setItem('habits', JSON.stringify(habits));
    updateStats();
    renderCalendarLegend();
}

function addHabit() {
    const name = habitNameInput.value.trim();
    const color = habitColorInput.value;
    const duration = parseInt(habitDurationInput.value);
    const frequency = habitFrequencySelect.value;
    const category = habitCategoryInput.value.trim();
    
    if (!name) {
        alert('Veuillez entrer un nom pour votre activité');
        return;
    }
    
    if (duration < 1) {
        alert('La durée doit être d\'au moins 1 minute');
        return;
    }
    
    const habit = {
        id: Date.now(),
        name,
        color,
        duration,
        frequency,
        category: category || 'Général',
        completedDates: [],
        createdAt: new Date().toISOString()
    };
    
    habits.push(habit);
    saveHabits();
    renderHabits();
    renderCalendar();
    
    // Réinitialiser le formulaire et fermer la modale
    habitNameInput.value = '';
    habitColorInput.value = '#4caf50';
    habitDurationInput.value = '15';
    habitCategoryInput.value = '';
    addHabitModal.style.display = 'none';
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
    renderCalendar();
}

function deleteHabit(habitId) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette activité ?')) {
        habits = habits.filter(h => h.id !== habitId);
        saveHabits();
        renderHabits();
        renderCalendar();
    }
}

function renderHabits() {
    habitsContainer.innerHTML = '';
    
    if (habits.length === 0) {
        habitsContainer.innerHTML = `
            <div class="empty-state">
                <p>Vous n'avez aucune activité enregistrée.</p>
                <p>Appuyez sur le bouton "+" pour ajouter votre première activité !</p>
            </div>
        `;
        return;
    }
    
    habits.forEach(habit => {
        const habitElement = document.createElement('div');
        habitElement.className = 'habit-card';
        habitElement.style.borderLeftColor = habit.color;
        
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
                         data-date="${date.toISOString()}"
                         style="${isChecked ? `background-color: ${habit.color}; border-color: ${habit.color}` : ''}">
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
            <div class="habit-meta">
                <span>${habit.category}</span>
                <span class="habit-duration">${habit.duration} min</span>
                <span>${getFrequencyText(habit.frequency)}</span>
            </div>
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

function renderCalendar() {
    calendarElement.innerHTML = '';
    
    // Mettre à jour le titre du mois
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                       'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    currentMonthElement.textContent = `${monthNames[calendarDate.getMonth()]} ${calendarDate.getFullYear()}`;
    
    // Obtenir le premier jour du mois et le nombre de jours
    const firstDay = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1);
    const lastDay = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Ajouter les cases vides pour les jours avant le premier du mois
    for (let i = 0; i < firstDay.getDay(); i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day empty';
        calendarElement.appendChild(emptyDay);
    }
    
    // Ajouter les jours du mois
    const today = new Date();
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        const currentDay = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day);
        
        // Vérifier si c'est aujourd'hui
        const isToday = currentDay.toDateString() === today.toDateString();
        
        // Obtenir les activités complétées ce jour
        const completedHabits = getCompletedHabitsForDate(currentDay);
        
        dayElement.className = `calendar-day ${isToday ? 'today' : ''}`;
        dayElement.innerHTML = `
            <div class="day-number">${day}</div>
            <div class="day-habits">
                ${completedHabits.map(habit => `
                    <div class="day-habit-dot" style="background-color: ${habit.color}" title="${habit.name}"></div>
                `).join('')}
            </div>
        `;
        
        calendarElement.appendChild(dayElement);
    }
}

function renderCalendarLegend() {
    calendarLegend.innerHTML = '';
    
    if (habits.length === 0) {
        calendarLegend.innerHTML = '<p>Aucune activité à afficher</p>';
        return;
    }
    
    habits.forEach(habit => {
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        legendItem.innerHTML = `
            <div class="legend-color" style="background-color: ${habit.color}"></div>
            <span>${habit.name}</span>
        `;
        calendarLegend.appendChild(legendItem);
    });
}

function getCompletedHabitsForDate(date) {
    const dateStr = date.toDateString();
    return habits.filter(habit => habit.completedDates.includes(dateStr));
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
        case 'daily': return 'Quotidienne';
        case 'weekly': return 'Hebdomadaire';
        case 'monthly': return 'Mensuelle';
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

// Gestion des vues (activités vs calendrier)
function toggleView() {
    if (habitsView.classList.contains('active')) {
        habitsView.classList.remove('active');
        calendarView.classList.add('active');
        viewToggle.textContent = 'Activités';
        renderCalendar();
    } else {
        calendarView.classList.remove('active');
        habitsView.classList.add('active');
        viewToggle.textContent = 'Calendrier';
    }
}

// Navigation dans le calendrier
function changeMonth(direction) {
    calendarDate.setMonth(calendarDate.getMonth() + direction);
    renderCalendar();
}

// Événements
viewToggle.addEventListener('click', toggleView);
prevMonthButton.addEventListener('click', () => changeMonth(-1));
nextMonthButton.addEventListener('click', () => changeMonth(1));
saveHabitButton.addEventListener('click', addHabit);
addHabitButton.addEventListener('click', () => {
    addHabitModal.style.display = 'block';
});
closeModal.addEventListener('click', () => {
    addHabitModal.style.display = 'none';
});

// Fermer la modale en cliquant en dehors
window.addEventListener('click', (event) => {
    if (event.target === addHabitModal) {
        addHabitModal.style.display = 'none';
    }
});

// Initialisation
renderHabits();
updateStats();
renderCalendarLegend();
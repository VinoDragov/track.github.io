// Gestion des données
let habits = JSON.parse(localStorage.getItem('habits')) || [];
let currentDate = new Date();
let calendarDate = new Date();
let longPressTimer = null;
let currentHabitToDelete = null;

// Éléments DOM
const habitsContainer = document.getElementById('habits-container');
const habitsView = document.getElementById('habits-view');
const calendarView = document.getElementById('calendar-view');
const menuButton = document.getElementById('menu-button');
const navigationMenu = document.getElementById('navigation-menu');
const calendarElement = document.getElementById('calendar');
const currentMonthElement = document.getElementById('current-month');
const prevMonthButton = document.getElementById('prev-month');
const nextMonthButton = document.getElementById('next-month');
const habitEmojiInput = document.getElementById('habit-emoji');
const habitNameInput = document.getElementById('habit-name');
const habitColorInput = document.getElementById('habit-color');
const habitDurationInput = document.getElementById('habit-duration');
const saveHabitButton = document.getElementById('save-habit');
const addHabitButton = document.getElementById('add-habit-btn');
const addHabitModal = document.getElementById('add-habit-modal');
const deleteConfirmModal = document.getElementById('delete-confirm-modal');
const closeModal = document.querySelector('.close');
const cancelDeleteButton = document.getElementById('cancel-delete');
const confirmDeleteButton = document.getElementById('confirm-delete');
const todayDateElement = document.getElementById('today-date');
const calendarLegend = document.getElementById('calendar-legend');
const navItems = document.querySelectorAll('.nav-item');
const emojiSuggestions = document.querySelectorAll('.emoji-suggestion');

// Fonctions de base
function saveHabits() {
    localStorage.setItem('habits', JSON.stringify(habits));
    renderCalendarLegend();
}

function addHabit() {
    const emoji = habitEmojiInput.value.trim();
    const name = habitNameInput.value.trim();
    const color = habitColorInput.value;
    const duration = parseInt(habitDurationInput.value);
    
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
        emoji: emoji || '✅',
        name,
        color,
        duration,
        frequency: 'daily',
        completedDates: [],
        createdAt: new Date().toISOString()
    };
    
    habits.push(habit);
    saveHabits();
    renderHabits();
    renderCalendar();
    
    // Réinitialiser le formulaire et fermer la modale
    habitEmojiInput.value = '';
    habitNameInput.value = '';
    habitColorInput.value = '#4caf50';
    habitDurationInput.value = '15';
    addHabitModal.style.display = 'none';
}

function toggleHabitDate(habitId, date) {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;
    
    // Ne pas permettre de cocher les jours futurs
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date > today) {
        return;
    }
    
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
    habits = habits.filter(h => h.id !== habitId);
    saveHabits();
    renderHabits();
    renderCalendar();
    deleteConfirmModal.style.display = 'none';
}

function renderHabits() {
    habitsContainer.innerHTML = '';
    
    // Mettre à jour la date d'aujourd'hui
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    todayDateElement.textContent = today.toLocaleDateString('fr-FR', options);
    
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
        habitElement.dataset.id = habit.id;
        
        // Vérifier si l'activité est déjà cochée aujourd'hui
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isCheckedToday = habit.completedDates.includes(today.toDateString());
        
        habitElement.innerHTML = `
            <div class="habit-card-content">
                <div class="habit-emoji">${habit.emoji}</div>
                <div class="habit-info">
                    <div class="habit-title">${habit.name}</div>
                    <div class="habit-meta">
                        <span class="habit-duration">${habit.duration} min</span>
                    </div>
                </div>
            </div>
            <div class="day-checkbox ${isCheckedToday ? 'checked' : ''}" 
                 data-date="${today.toISOString()}"
                 style="${isCheckedToday ? `background-color: ${habit.color}; border-color: ${habit.color}` : `border-color: ${habit.color}`}">
                ${isCheckedToday ? '✓' : ''}
            </div>
            <div class="delete-confirm-overlay">
                <span class="delete-text">Relâchez pour supprimer</span>
            </div>
        `;
        
        habitsContainer.appendChild(habitElement);
        
        // Ajouter l'événement pour la case à cocher
        const checkbox = habitElement.querySelector('.day-checkbox');
        checkbox.addEventListener('click', (e) => {
            e.stopPropagation(); // Empêche la propagation à l'élément parent
            const date = new Date(checkbox.dataset.date);
            toggleHabitDate(habit.id, date);
        });
        
        // Ajouter les événements pour l'appui long
        setupLongPress(habitElement, habit.id);
    });
}

function setupLongPress(element, habitId) {
    let pressTimer;
    const overlay = element.querySelector('.delete-confirm-overlay');
    
    const startPress = (e) => {
        // Ignorer complètement si l'élément cliqué est la checkbox
        if (e.target.closest('.day-checkbox')) return;
        
        pressTimer = setTimeout(() => {
            currentHabitToDelete = habitId;
            overlay.classList.add('visible');
        }, 1000);
    };
    
    const endPress = () => {
        clearTimeout(pressTimer);
        if (overlay.classList.contains('visible')) {
            deleteConfirmModal.style.display = 'block';
        }
        overlay.classList.remove('visible');
    };
    
    // Événements tactiles
    element.addEventListener('touchstart', startPress);
    element.addEventListener('touchend', endPress);
    element.addEventListener('touchmove', () => {
        clearTimeout(pressTimer);
        overlay.classList.remove('visible');
    });
    
    // Événements souris
    element.addEventListener('mousedown', startPress);
    element.addEventListener('mouseup', endPress);
    element.addEventListener('mouseleave', () => {
        clearTimeout(pressTimer);
        overlay.classList.remove('visible');
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
                    <div class="day-habit-dot" style="background-color: ${habit.color}" title="${habit.emoji} ${habit.name}"></div>
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
            <span>${habit.emoji} ${habit.name}</span>
        `;
        calendarLegend.appendChild(legendItem);
    });
}

function getCompletedHabitsForDate(date) {
    const dateStr = date.toDateString();
    return habits.filter(habit => habit.completedDates.includes(dateStr));
}

// Gestion du menu de navigation
function toggleMenu(event) {
    event.stopPropagation();
    navigationMenu.classList.toggle('open');
}

function closeMenu() {
    navigationMenu.classList.remove('open');
}

function switchView(viewId) {
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    
    document.getElementById(viewId).classList.add('active');
    
    if (viewId === 'calendar-view') {
        renderCalendar();
    }
    
    closeMenu();
}

// Navigation dans le calendrier
function changeMonth(direction) {
    calendarDate.setMonth(calendarDate.getMonth() + direction);
    renderCalendar();
}

// Événements
menuButton.addEventListener('click', toggleMenu);

// Fermer le menu en cliquant à l'extérieur
document.addEventListener('click', (event) => {
    if (!event.target.closest('.menu-container')) {
        closeMenu();
    }
});

// Navigation entre les vues
navItems.forEach(item => {
    item.addEventListener('click', () => {
        const viewId = item.getAttribute('data-view');
        switchView(viewId);
    });
});

// Suggestions d'emoji
emojiSuggestions.forEach(suggestion => {
    suggestion.addEventListener('click', () => {
        habitEmojiInput.value = suggestion.getAttribute('data-emoji');
    });
});

prevMonthButton.addEventListener('click', () => changeMonth(-1));
nextMonthButton.addEventListener('click', () => changeMonth(1));
saveHabitButton.addEventListener('click', addHabit);
addHabitButton.addEventListener('click', () => {
    addHabitModal.style.display = 'block';
});
closeModal.addEventListener('click', () => {
    addHabitModal.style.display = 'none';
});
cancelDeleteButton.addEventListener('click', () => {
    deleteConfirmModal.style.display = 'none';
});
confirmDeleteButton.addEventListener('click', () => {
    if (currentHabitToDelete) {
        deleteHabit(currentHabitToDelete);
    }
});

// Fermer les modales en cliquant en dehors
window.addEventListener('click', (event) => {
    if (event.target === addHabitModal) {
        addHabitModal.style.display = 'none';
    }
    if (event.target === deleteConfirmModal) {
        deleteConfirmModal.style.display = 'none';
    }
});

// Initialisation
renderHabits();
renderCalendarLegend();
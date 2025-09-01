// Gestion des données
let habits = [];
let currentDate = new Date();
let calendarDate = new Date();
let currentHabitToDelete = null;
let currentUser = null;
let habitsListener = null;
let progressChart = null;
let selectedTimeFilter = 7; // Filtre par défaut: 7 jours

// Éléments DOM
const habitsContainer = document.getElementById('habits-container');
const habitsView = document.getElementById('habits-view');
const calendarView = document.getElementById('calendar-view');
const progressView = document.getElementById('progress-view');
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

// Initialisation de l'application
async function initApp() {
    try {
        // Se connecter anonymement à Firebase
        currentUser = await signInAnonymously();
        
        // Charger les habitudes depuis Firestore
        habits = await loadHabitsFromFirestore(currentUser.uid);
        renderHabits();
        renderCalendarLegend();
        
        // Configurer l'écouteur en temps réel
        habitsListener = setupHabitsListener(currentUser.uid, (updatedHabits) => {
            habits = updatedHabits;
            renderHabits();
            renderCalendar();
            renderCalendarLegend();
            
            // Mettre à jour le graphique si on est sur la vue progrès
            if (progressView.classList.contains('active')) {
                renderProgressChart();
            }
        });
    } catch (error) {
        console.error("Erreur lors de l'initialisation:", error);
        // Fallback vers le stockage local si Firebase échoue
        habits = JSON.parse(localStorage.getItem('habits')) || [];
        renderHabits();
        renderCalendarLegend();
        
        // Initialiser le graphique si on est sur la vue progrès
        if (progressView.classList.contains('active')) {
            renderProgressChart();
        }
    }
}

// Fonctions de base
async function saveHabits() {
    try {
        // Sauvegarder chaque habitude dans Firestore
        for (const habit of habits) {
            habit.userId = currentUser.uid;
            await saveHabitToFirestore(habit);
        }
    } catch (error) {
        console.error("Erreur lors de la sauvegarde Firebase, utilisation du stockage local:", error);
        localStorage.setItem('habits', JSON.stringify(habits));
    }
}

async function addHabit() {
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
        emoji: emoji || '✅',
        name,
        color,
        duration,
        frequency: 'daily',
        completedDates: [],
        createdAt: new Date().toISOString(),
        userId: currentUser.uid
    };
    
    try {
        await saveHabitToFirestore(habit);
        habits.push(habit);
        
        // Réinitialiser le formulaire et fermer la modale
        habitEmojiInput.value = '';
        habitNameInput.value = '';
        habitColorInput.value = '#4caf50';
        habitDurationInput.value = '15';
        addHabitModal.style.display = 'none';
    } catch (error) {
        console.error("Erreur lors de l'ajout, utilisation du stockage local:", error);
        habit.id = Date.now().toString();
        habits.push(habit);
        localStorage.setItem('habits', JSON.stringify(habits));
        
        // Réinitialiser le formulaire et fermer la modale
        habitEmojiInput.value = '';
        habitNameInput.value = '';
        habitColorInput.value = '#4caf50';
        habitDurationInput.value = '15';
        addHabitModal.style.display = 'none';
        
        renderHabits();
        renderCalendar();
    }
}

async function toggleHabitDate(habitId, date) {
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
    
    try {
        await saveHabitToFirestore(habit);
    } catch (error) {
        console.error("Erreur lors de la mise à jour, utilisation du stockage local:", error);
        localStorage.setItem('habits', JSON.stringify(habits));
    }
    
    renderHabits();
    renderCalendar();
    
    // Mettre à jour le graphique si on est sur la vue progrès
    if (progressView.classList.contains('active')) {
        renderProgressChart();
    }
}

async function deleteHabit(habitId) {
    try {
        await deleteHabitFromFirestore(habitId);
        habits = habits.filter(h => h.id !== habitId);
    } catch (error) {
        console.error("Erreur lors de la suppression, utilisation du stockage local:", error);
        habits = habits.filter(h => h.id !== habitId);
        localStorage.setItem('habits', JSON.stringify(habits));
    }
    
    deleteConfirmModal.style.display = 'none';
    renderHabits();
    renderCalendar();
    
    // Mettre à jour le graphique si on est sur la vue progrès
    if (progressView.classList.contains('active')) {
        renderProgressChart();
    }
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
            <div class="habit-actions">
                <button class="delete-habit-btn" title="Supprimer cette activité">🗑️</button>
                <div class="day-checkbox ${isCheckedToday ? 'checked' : ''}" 
                     data-date="${today.toISOString()}"
                     style="${isCheckedToday ? `background-color: ${habit.color}; border-color: ${habit.color}` : `border-color: ${habit.color}`}">
                    ${isCheckedToday ? '✓' : ''}
                </div>
            </div>
        `;
        
        habitsContainer.appendChild(habitElement);
        
        // Ajouter l'événement pour la case à cocher
        const checkbox = habitElement.querySelector('.day-checkbox');
        checkbox.addEventListener('click', (e) => {
            e.stopPropagation();
            const date = new Date(checkbox.dataset.date);
            toggleHabitDate(habit.id, date);
        });
        
        // Ajouter l'événement pour le bouton de suppression
        const deleteButton = habitElement.querySelector('.delete-habit-btn');
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            currentHabitToDelete = habit.id;
            deleteConfirmModal.style.display = 'block';
        });
    });
}

function calculateHabitStats(days = 7) {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - days);
    
    const stats = [];
    let totalTime = 0;
    
    habits.forEach(habit => {
        // Compter le nombre de fois où l'habitude a été complétée dans la période
        const completedInPeriod = habit.completedDates.filter(dateStr => {
            const date = new Date(dateStr);
            return date >= startDate && date <= now;
        }).length;
        
        // Calculer le temps total pour cette habitude
        const habitTotalTime = completedInPeriod * habit.duration;
        
        if (completedInPeriod > 0) {
            stats.push({
                name: habit.name,
                emoji: habit.emoji,
                color: habit.color,
                count: completedInPeriod,
                totalTime: habitTotalTime
            });
            
            totalTime += habitTotalTime;
        }
    });
    
    // Trier par temps total décroissant
    stats.sort((a, b) => b.totalTime - a.totalTime);
    
    return { stats, totalTime };
}

function renderProgressChart() {
    const ctx = document.getElementById('progress-chart');
    
    if (!ctx) return;
    
    // Détruire le graphique existant s'il y en a un
    if (progressChart) {
        progressChart.destroy();
    }
    
    const { stats, totalTime } = calculateHabitStats(selectedTimeFilter);
    
    if (stats.length === 0) {
        document.getElementById('stats-summary').innerHTML = `
            <div class="empty-state">
                <p>Aucune donnée à afficher pour cette période.</p>
            </div>
        `;
        return;
    }
    
    // Préparer les données pour le graphique
    const labels = stats.map(stat => `${stat.emoji} ${stat.name}`);
    const data = stats.map(stat => stat.totalTime);
    const backgroundColors = stats.map(stat => stat.color);
    
    // Créer le graphique camembert
    progressChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 15,
                        padding: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const percentage = Math.round((value / totalTime) * 100);
                            return `${context.label}: ${value} min (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
    
    // Afficher le résumé des statistiques
    let summaryHTML = '';
    stats.forEach(stat => {
        const percentage = Math.round((stat.totalTime / totalTime) * 100);
        summaryHTML += `
            <div class="stat-item">
                <div class="stat-label">
                    <div class="stat-color" style="background-color: ${stat.color}"></div>
                    <span>${stat.emoji} ${stat.name}</span>
                </div>
                <div class="stat-value">${stat.totalTime} min (${percentage}%)</div>
            </div>
        `;
    });
    
    summaryHTML += `
        <div class="total-time">
            Temps total: ${totalTime} minutes
        </div>
    `;
    
    document.getElementById('stats-summary').innerHTML = summaryHTML;
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
    } else if (viewId === 'progress-view') {
        renderProgressChart();
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

// Gestion des filtres de temps pour la vue progrès
document.addEventListener('DOMContentLoaded', function() {
    // Gestion des filtres de temps
    document.querySelectorAll('.time-filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.time-filter-btn').forEach(b => {
                b.classList.remove('active');
            });
            this.classList.add('active');
            selectedTimeFilter = parseInt(this.getAttribute('data-days'));
            renderProgressChart();
        });
    });
    
    // Initialiser le graphique si on est déjà sur la vue progrès
    if (progressView.classList.contains('active')) {
        renderProgressChart();
    }
});

// Initialisation
initApp();
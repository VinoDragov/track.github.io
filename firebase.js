// Configuration Firebase - À remplacer avec votre propre configuration
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialiser Firebase
firebase.initializeApp(firebaseConfig);

// Références aux services Firebase
const db = firebase.firestore();
const auth = firebase.auth();

// Fonction pour se connecter anonymement
async function signInAnonymously() {
    try {
        const userCredential = await auth.signInAnonymously();
        console.log("Connecté anonymement avec l'UID:", userCredential.user.uid);
        return userCredential.user;
    } catch (error) {
        console.error("Erreur de connexion anonyme:", error);
        throw error;
    }
}

// Fonctions pour gérer les habitudes dans Firestore
async function saveHabitToFirestore(habit) {
    try {
        if (habit.id) {
            // Mise à jour d'une habitude existante
            await db.collection('habits').doc(habit.id).set(habit);
        } else {
            // Création d'une nouvelle habitude
            const docRef = await db.collection('habits').add(habit);
            habit.id = docRef.id;
            await db.collection('habits').doc(habit.id).set(habit);
        }
        return habit;
    } catch (error) {
        console.error("Erreur lors de la sauvegarde:", error);
        throw error;
    }
}

async function deleteHabitFromFirestore(habitId) {
    try {
        await db.collection('habits').doc(habitId).delete();
    } catch (error) {
        console.error("Erreur lors de la suppression:", error);
        throw error;
    }
}

async function loadHabitsFromFirestore(userId) {
    try {
        const snapshot = await db.collection('habits')
            .where('userId', '==', userId)
            .get();
        
        const habits = [];
        snapshot.forEach(doc => {
            habits.push({ id: doc.id, ...doc.data() });
        });
        
        return habits;
    } catch (error) {
        console.error("Erreur lors du chargement:", error);
        throw error;
    }
}

// Écouter les changements en temps réel
function setupHabitsListener(userId, callback) {
    return db.collection('habits')
        .where('userId', '==', userId)
        .onSnapshot(snapshot => {
            const habits = [];
            snapshot.forEach(doc => {
                habits.push({ id: doc.id, ...doc.data() });
            });
            callback(habits);
        }, error => {
            console.error("Erreur d'écouteur:", error);
        });
}
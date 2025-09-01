// Configuration Firebase - À remplacer avec votre propre configuration
const firebaseConfig = {
  apiKey: "AIzaSyAS0g79eae9r97oNbiiJvZRkCoozeUY40s",
  authDomain: "track-b149e.firebaseapp.com",
  databaseURL: "https://track-b149e-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "track-b149e",
  storageBucket: "track-b149e.firebasestorage.app",
  messagingSenderId: "310280121473",
  appId: "1:310280121473:web:10adf16bd96ebb2df67180"
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
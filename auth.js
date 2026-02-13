import {
    auth, db, googleProvider,
    signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut,
    doc, getDoc, setDoc
} from "./firebase-config.js";

export const AuthService = {
    async register(email, password, name) {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Create user document in Firestore
            await setDoc(doc(db, "users", user.uid), {
                email: email,
                name: name,
                isAdmin: false,
                purchasedCourses: [],
                progress: {}
            });

            return user;
        } catch (error) {
            console.error("Registration error:", error);
            throw error;
        }
    },

    async login(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            return userCredential.user;
        } catch (error) {
            console.error("Login error:", error);
            throw error;
        }
    },

    async loginWithGoogle() {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            // Check if user document exists, if not create it
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (!userDoc.exists()) {
                await setDoc(doc(db, "users", user.uid), {
                    email: user.email,
                    name: user.displayName,
                    isAdmin: false,
                    purchasedCourses: [],
                    progress: {}
                });
            }

            return user;
        } catch (error) {
            console.error("Google Auth error:", error);
            throw error;
        }
    },

    async logout() {
        await signOut(auth);
    },

    onAuthChange(callback) {
        return onAuthStateChanged(auth, callback);
    },

    async getUserData(uid) {
        const userDoc = await getDoc(doc(db, "users", uid));
        return userDoc.exists() ? userDoc.data() : null;
    }
};

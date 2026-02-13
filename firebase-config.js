import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, onSnapshot, query, where, orderBy } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCK7ShhKDhO333r6E8WEWaacUWL-D_NxzU",
    authDomain: "neuron-study.firebaseapp.com",
    projectId: "neuron-study",
    storageBucket: "neuron-study.firebasestorage.app",
    messagingSenderId: "357331302081",
    appId: "1:357331302081:web:2a2f3937bc870311cf4640"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { 
    auth, db, googleProvider,
    signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut,
    doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, onSnapshot, query, where, orderBy
};

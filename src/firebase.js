import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyArRqdXtXuY4DJaAmL2IIaIs_7OwksaWq0",
  authDomain: "oyfound.firebaseapp.com",
  projectId: "oyfound",
  storageBucket: "oyfound.firebasestorage.app",
  messagingSenderId: "339824668768",
  appId: "1:339824668768:web:6e4b21265bf201216b5305",
  measurementId: "G-QHJ6BRJHDG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export these constants so your pages can use them
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
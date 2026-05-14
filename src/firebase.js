import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDwt9h7MaOo2Dh03qGm43FfWad1cOtgex4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "nickname-game.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://nickname-game-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "nickname-game",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "nickname-game.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "113593747204",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:113593747204:web:af9a4baecd75703874b251",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-4LCCK0YJ2E"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

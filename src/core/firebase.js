import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDwt9h7MaOo2Dh03qGm43FfWad1cOtgex4",
  authDomain: "nickname-game.firebaseapp.com",
  databaseURL: "https://nickname-game-default-rtdb.firebaseio.com",
  projectId: "nickname-game",
  storageBucket: "nickname-game.firebasestorage.app",
  messagingSenderId: "113593747204",
  appId: "1:113593747204:web:af9a4baecd75703874b251",
  measurementId: "G-4LCCK0YJ2E"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

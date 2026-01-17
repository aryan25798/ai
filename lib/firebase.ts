import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your exact config (keep yours)
const firebaseConfig = {
  apiKey: "AIzaSyDis973yN78yNM3_tL7P_3IEXNwbC3WGq8",
  authDomain: "fast-chat-app-72874.firebaseapp.com",
  projectId: "fast-chat-app-72874",
  storageBucket: "fast-chat-app-72874.firebasestorage.app",
  messagingSenderId: "821071796025",
  appId: "1:821071796025:web:7473759cc27d0ddd39bae8"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app); // Export Auth
export const googleProvider = new GoogleAuthProvider(); // Export Google Provider
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Replace with your Firebase project configuration
// You can get this from the Firebase Console -> Project Settings -> General -> Your Apps
const firebaseConfig = {
    apiKey: "AIzaSyDlFSJq0Yp73fhUlL8-bSvMV3tfEWr2O5w",
    authDomain: "academyvb-pro.firebaseapp.com",
    projectId: "academyvb-pro",
    storageBucket: "academyvb-pro.firebasestorage.app",
    messagingSenderId: "773738627742",
    appId: "1:773738627742:web:9047222f77be9cb6dc318f",
    measurementId: "G-ND4T2E4RLS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export default app;

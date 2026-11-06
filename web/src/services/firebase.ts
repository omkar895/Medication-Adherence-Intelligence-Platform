import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAe-mEiPokxi93rPnSlbjGWG0X4yAcuE4Y",
  authDomain: "grand-glazing-96m9v.firebaseapp.com",
  projectId: "grand-glazing-96m9v",
  storageBucket: "grand-glazing-96m9v.firebasestorage.app",
  messagingSenderId: "436227649311",
  appId: "1:436227649311:web:ab8e1d840f14016f420a2a",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  onAuthStateChanged,
};
export type { FirebaseUser };

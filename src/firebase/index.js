import { initializeApp } from "firebase/app"
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from "firebase/auth"
import {
  getFirestore,
  doc,
  addDoc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  deleteDoc
} from "firebase/firestore"
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "firebase/storage"

const firebaseConfig = {
  apiKey: "AIzaSyDpamGt2bsT6TJMwnerIUTSfCVFBTJtos4",
  authDomain: "utility-haze.firebaseapp.com",
  projectId: "utility-haze",
  storageBucket: "utility-haze.firebasestorage.app",
  messagingSenderId: "686237947418",
  appId: "1:686237947418:web:f03ba19ab8fff43110a3a3"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)
const storage = getStorage(app)
const googleProvider = new GoogleAuthProvider()

export {
  app,
  auth,
  db,
  storage,
  storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut,
  doc,
  addDoc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  deleteDoc
}

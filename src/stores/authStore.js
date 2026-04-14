import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc
} from '../firebase/index.js'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const userProfile = ref(null)
  const isAuthReady = ref(false)
  const devModeActive = ref(localStorage.getItem('dev_mode_active') === 'true')

  // Setup Firebase Auth Listener
  onAuthStateChanged(auth, async (currentUser) => {
    user.value = currentUser
    if (currentUser) {
      await fetchUserProfile(currentUser.uid)
    } else {
      userProfile.value = null
    }
    isAuthReady.value = true
  })

  async function fetchUserProfile(uid) {
    try {
      const docRef = doc(db, "utenti", uid)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        userProfile.value = docSnap.data()
      } else {
        userProfile.value = {}
      }
    } catch (e) {
      console.error("Errore caricamento profilo:", e)
      userProfile.value = {}
    }
  }

  async function updateProfile(profileData) {
    if (!user.value) return false
    try {
      const docRef = doc(db, "utenti", user.value.uid)
      await setDoc(docRef, profileData, { merge: true })
      
      // Update local state
      userProfile.value = { ...userProfile.value, ...profileData }
      return true
    } catch (e) {
      console.error(e)
      return false
    }
  }

  async function loginWithGoogle() {
    return await signInWithPopup(auth, googleProvider)
  }

  async function loginWithEmail(email, password) {
    return await signInWithEmailAndPassword(auth, email, password)
  }

  async function registerWithEmail(email, password) {
    return await createUserWithEmailAndPassword(auth, email, password)
  }

  async function resetPassword(email) {
    return await sendPasswordResetEmail(auth, email)
  }

  function logout() {
    return signOut(auth)
  }

  return {
    user,
    userProfile,
    isAuthReady,
    devModeActive,
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    resetPassword,
    logout,
    updateProfile
  }
})

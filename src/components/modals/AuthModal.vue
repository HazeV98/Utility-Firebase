<template>
  <div v-if="show" class="modal-overlay" @click.self="close">
    <div class="modal-content glass-card">
      <span class="close-btn" @click="close">&times;</span>
      <h3 class="modal-title">Backup Cloud</h3>
      
      <div class="form-group">
        <input type="email" v-model="email" placeholder="La tua email" class="input-field" @keyup.enter="loginEmail">
        <input type="password" v-model="password" placeholder="Password" class="input-field" @keyup.enter="loginEmail">
      </div>

      <div class="form-options">
        <a href="#" @click.prevent="recuperaPassword" class="forgot-link">Password dimenticata?</a>
      </div>

      <div class="action-buttons">
        <button class="btn btn-primary" @click="loginEmail">Accedi</button>
        <button class="btn btn-secondary" @click="registraEmail">Registrati</button>
      </div>

      <div class="divider"></div>

      <button class="btn btn-google" @click="loginGoogle">
        <span class="btn-icon">☁️</span> Accedi con Google
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../../stores/authStore'

const props = defineProps({
  show: Boolean
})
const emit = defineEmits(['close'])

const authStore = useAuthStore()
const email = ref('')
const password = ref('')

const close = () => {
  emit('close')
}

const loginEmail = async () => {
  try {
    await authStore.loginWithEmail(email.value, password.value)
    close()
  } catch(e) {
    alert("Errore Login: " + e.message)
  }
}

const registraEmail = async () => {
  try {
    await authStore.registerWithEmail(email.value, password.value)
    close()
  } catch(e) {
    alert("Errore Registrazione: " + e.message)
  }
}

const recuperaPassword = async () => {
  if(!email.value) return alert("Inserisci la tua email!")
  try {
    await authStore.resetPassword(email.value)
    alert("Email inviata!")
  } catch(e) {
    alert("Errore: " + e.message)
  }
}

const loginGoogle = async () => {
  try {
    await authStore.loginWithGoogle()
    close()
  } catch(e) {
    alert("Errore Login: " + e.message)
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background-color: rgba(0,0,0,0.6);
  backdrop-filter: blur(5px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 5000;
  padding: 20px;
  box-sizing: border-box;
}

.modal-content {
  width: 100%;
  max-width: 350px;
  position: relative;
  text-align: center;
}

.close-btn {
  position: absolute;
  right: 15px;
  top: 10px;
  font-size: 28px;
  cursor: pointer;
  color: var(--text-muted);
}

.modal-title {
  margin-top: 5px;
  color: var(--text-color);
  font-size: 20px;
}

.form-group {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-options {
  text-align: right;
  margin: 10px 0 15px 0;
}

.forgot-link {
  font-size: 13px;
  color: var(--primary);
  font-weight: bold;
  text-decoration: none;
}

.action-buttons {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}
.action-buttons .btn {
  flex: 1;
}

.btn-primary { background: var(--text-color); }
.btn-secondary { background: #11cdef; }

.divider {
  height: 1px;
  background: #e9ecef;
  margin: 20px 0;
}

.btn-google {
  background: #ea4335;
  width: 100%;
}
.btn-icon { margin-right: 8px; }
</style>

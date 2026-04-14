<template>
  <div v-if="show" class="modal-overlay" @click.self="close">
    <div class="modal-content glass-card">
      <span class="close-btn" @click="close">&times;</span>
      <h3 class="modal-title">Profilo Utente</h3>
      
      <div v-if="authStore.devModeActive" class="admin-badge">
        🛠️ Account Amministratore
      </div>

      <div v-if="showStrikes" class="strikes-alert">
        <span v-if="strikeCount < 3">⚠️ Revoche rubrica usate: <b>{{ strikeCount }}</b> su 3</span>
        <span v-else>🚫 <b>Accesso Rubrica Bloccato:</b> Limite revoche superato.</span>
      </div>

      <div class="form-container">
        <label>Email:</label>
        <input type="text" :value="authStore.user?.email" disabled class="input-disabled">
        
        <label>Nome:</label>
        <input type="text" v-model="profileForm.nome" placeholder="Inserisci nome">
        
        <label>Cognome:</label>
        <input type="text" v-model="profileForm.cognome" placeholder="Inserisci cognome">
        
        <label>Mansione:</label>
        <select v-model="profileForm.mansione">
          <option value="">-- Seleziona Mansione --</option>
          <option value="Marinaio">Marinaio</option>
          <option value="Preposto al comando">Preposto al comando</option>
          <option value="Comandante">Comandante</option>
          <option value="Timoniere">Timoniere</option>
          <option value="Marinaio polivalente">Marinaio polivalente</option>
          <option value="Direttore di macchina">Direttore di macchina</option>
        </select>

        <label>Matricola:</label>
        <input type="text" v-model="profileForm.matricola" placeholder="Inserisci matricola">

        <label>Telefono:</label>
        <input type="tel" v-model="profileForm.telefono" placeholder="Inserisci numero di telefono">
      </div>

      <button class="btn btn-save" :disabled="isSaving" @click="salvaProfilo">
        {{ isSaving ? '⏳ Salvataggio...' : 'Salva Modifiche' }}
      </button>
      
      <div class="divider"></div>
      
      <button class="btn btn-logout" @click="logout">Esci (Logout)</button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue'
import { useAuthStore } from '../../stores/authStore'

const props = defineProps({
  show: Boolean
})
const emit = defineEmits(['close'])

const authStore = useAuthStore()
const isSaving = ref(false)

const profileForm = reactive({
  nome: '',
  cognome: '',
  mansione: '',
  matricola: '',
  telefono: ''
})

const strikeCount = computed(() => {
  return authStore.userProfile?.revoche_rubrica || 0
})

const showStrikes = computed(() => {
  return strikeCount.value > 0 && !authStore.devModeActive
})

watch(() => props.show, (newVal) => {
  if(newVal && authStore.userProfile) {
    profileForm.nome = authStore.userProfile.nome || ''
    profileForm.cognome = authStore.userProfile.cognome || ''
    profileForm.mansione = authStore.userProfile.mansione || ''
    profileForm.matricola = authStore.userProfile.matricola || ''
    profileForm.telefono = authStore.userProfile.telefono || ''
  }
})

const close = () => {
  emit('close')
}

const salvaProfilo = async () => {
  isSaving.value = true
  const success = await authStore.updateProfile({ ...profileForm })
  isSaving.value = false
  if (success) {
    alert("✅ Profilo salvato correttamente!")
    close()
  } else {
    alert("❌ Errore durante il salvataggio.")
  }
}

const logout = async () => {
  await authStore.logout()
  close()
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
  max-width: 380px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  text-align: left;
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
  text-align: center;
  margin-bottom: 20px;
}

.admin-badge {
  background: #cce5ff;
  color: #004085;
  border: 1px dashed var(--primary);
  padding: 8px;
  border-radius: var(--radius);
  text-align: center;
  font-size: 13px;
  font-weight: bold;
  margin-bottom: 15px;
}

.strikes-alert {
  font-size: 12px;
  color: #856404;
  background: #fff3cd;
  padding: 10px;
  border-radius: var(--radius);
  margin-bottom: 15px;
  text-align: center;
  border: 1px solid #ffeeba;
}
.strikes-alert span {
  display: block;
}

.form-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 20px;
}

.form-container label {
  font-size: 12px;
  color: var(--text-muted);
  font-weight: bold;
  margin-top: 4px;
}

.input-disabled {
  background: #f8f9fa;
  color: #666;
}

.btn-save {
  background: var(--success);
  width: 100%;
}

.divider {
  height: 1px;
  background: #e9ecef;
  margin: 20px 0;
}

.btn-logout {
  background: var(--text-muted);
  width: 100%;
}
</style>

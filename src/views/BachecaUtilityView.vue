<template>
  <div class="bacheca-utility-view">
    <AppHeader @openAuth="showAuth = true" @openProfile="showProfile = true" />

    <div class="content-area">
      <div v-if="loading" class="status-message">Caricamento messaggi in corso...</div>
      <div v-else>
        <button v-if="isAdmin" class="btn-action" style="margin-bottom: 15px; margin-top: 0" @click="apriModaleNuovo">
          + Aggiungi Messaggio
        </button>

        <div v-if="messaggi.length === 0" class="status-message">Nessun avviso in bacheca.</div>
        
        <div class="lista-messaggi" v-else>
          <div v-for="m in messaggi" :key="m.id" class="card">
            <button v-if="isAdmin" class="btn-delete" @click="eliminaMessaggio(m.id)">Elimina</button>
            <div class="msg-date">📅 {{ formattaDataOra(m.timestamp) }}</div>
            <div class="msg-text">{{ m.testo }}</div>
            <a v-if="m.link" :href="m.link" target="_blank" class="msg-link">🔗 Apri Link Esterno</a>
          </div>
        </div>
      </div>
    </div>

    <div v-if="modalNuovo" class="modal">
      <div class="modal-content">
        <h3 style="margin-top: 5px; color: var(--primary);">Nuovo Avviso</h3>
        
        <label style="font-size: 12px; font-weight: bold; color: #666;">Testo del messaggio:</label>
        <textarea v-model="formMsg.testo" class="input-field" rows="5" placeholder="Scrivi qui la comunicazione..."></textarea>
        
        <label style="font-size: 12px; font-weight: bold; color: #666;">Link Esterno (Opzionale):</label>
        <input type="url" v-model="formMsg.link" class="input-field" placeholder="es. https://www.google.it o link Drive">
        
        <button class="btn-action" :disabled="pubblicando" @click="pubblicaMessaggio">
          {{ pubblicando ? "⏳ Pubblicazione..." : "Pubblica Avviso" }}
        </button>
        <button class="btn-action" style="background:#6c757d; margin-top: 10px;" @click="modalNuovo = false">Annulla</button>
      </div>
    </div>

    <AuthModal :show="showAuth" @close="showAuth = false" />
    <ProfileModal :show="showProfile" @close="showProfile = false" />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import AppHeader from '../components/layout/AppHeader.vue'
import AuthModal from '../components/modals/AuthModal.vue'
import ProfileModal from '../components/modals/ProfileModal.vue'
import { db } from '../firebase'
import { collection, getDocs, query, orderBy, addDoc, deleteDoc, doc } from 'firebase/firestore'
import { useAuthStore } from '../stores/authStore.js'

const authStore = useAuthStore()
const isAdmin = computed(() => {
  return localStorage.getItem('dev_mode_active') === 'true'
})

const showAuth = ref(false)
const showProfile = ref(false)

const messaggi = ref([])
const loading = ref(true)

const modalNuovo = ref(false)
const formMsg = ref({ testo: '', link: '' })
const pubblicando = ref(false)

const caricaBacheca = async () => {
  loading.value = true
  try {
    const q = query(collection(db, "bacheca_utility"), orderBy("timestamp", "desc"))
    const snap = await getDocs(q)
    const arr = []
    snap.forEach(d => { arr.push({ id: d.id, ...d.data() }) })
    messaggi.value = arr
    localStorage.setItem('ultimo_accesso_bacheca', Date.now())
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const apriModaleNuovo = () => {
  formMsg.value = { testo: '', link: '' }
  modalNuovo.value = true
}

const pubblicaMessaggio = async () => {
  if (!formMsg.value.testo.trim()) return alert("Inserisci il testo del messaggio.")
  
  pubblicando.value = true
  try {
    await addDoc(collection(db, "bacheca_utility"), {
      testo: formMsg.value.testo.trim(),
      link: formMsg.value.link.trim(),
      timestamp: Date.now()
    })
    modalNuovo.value = false
    caricaBacheca()
  } catch (err) {
    alert("❌ Errore durante la pubblicazione: " + err.message)
  } finally {
    pubblicando.value = false
  }
}

const eliminaMessaggio = async (id) => {
  if (!confirm("Sei sicuro di voler eliminare questo avviso?")) return
  try {
    await deleteDoc(doc(db, "bacheca_utility", id))
    caricaBacheca()
  } catch (e) {
    alert("Errore durante l'eliminazione.")
  }
}

const formattaDataOra = (ts) => {
  const d = new Date(ts)
  return d.toLocaleDateString('it-IT') + " alle " + d.toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'})
}

onMounted(() => {
  caricaBacheca()
})
</script>

<style scoped>
.bacheca-utility-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}
.content-area {
  width: 100%;
  max-width: 400px;
  padding: 0 20px 40px 20px;
  box-sizing: border-box;
  text-align: center;
}
.status-message {
  color: var(--text-muted);
  text-align: center;
  margin-top: 20px;
  font-size: 15px;
}
.lista-messaggi {
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.05);
  text-align: left;
  position: relative;
  border-left: 5px solid var(--primary);
}
.msg-date {
  font-size: 11px;
  color: #888;
  margin-bottom: 8px;
  font-weight: bold;
  text-transform: uppercase;
}
.msg-text {
  font-size: 15px;
  line-height: 1.5;
  color: #444;
  white-space: pre-wrap;
  margin-bottom: 10px;
}
.msg-link {
  display: inline-block;
  background: #e9ecef;
  color: var(--primary);
  padding: 10px 15px;
  border-radius: 8px;
  font-size: 14px;
  text-decoration: none;
  font-weight: bold;
  margin-top: 5px;
  word-break: break-all;
  width: 100%;
  box-sizing: border-box;
  text-align: center;
}

.btn-action {
  background-color: var(--success);
  color: white;
  border: none;
  padding: 15px;
  font-size: 16px;
  font-weight: bold;
  border-radius: 10px;
  cursor: pointer;
  width: 100%;
  transition: opacity 0.2s;
  margin-top: 10px;
}
.btn-action:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-delete {
  position: absolute;
  top: 15px;
  right: 15px;
  background: var(--danger);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 5px 10px;
  font-size: 12px;
  cursor: pointer;
}

/* Modal */
.modal {
  display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); justify-content: center; align-items: center; z-index: 3000; padding: 15px; box-sizing: border-box;
}
.modal-content {
  background-color: white; padding: 25px; border-radius: 12px; width: 100%; max-width: 350px; text-align: left; box-shadow: 0 5px 15px rgba(0,0,0,0.3); max-height: 90vh; overflow-y: auto;
}
.input-field {
  width: 100%;
  padding: 12px;
  margin-bottom: 15px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  box-sizing: border-box;
  font-size: 14px;
  font-family: inherit;
  background-color: white;
}
</style>

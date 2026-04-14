<template>
  <div class="rubrica-view">
    <AppHeader @openAuth="showAuth = true" @openProfile="showProfile = true" />

    <div v-if="!authStore.isAuthReady || loading" class="view-container">
      <p class="loading-text">Verifica in corso...</p>
    </div>

    <!-- No Auth -->
    <div v-else-if="!authStore.user" class="view-container">
      <div class="card glass-card center-text">
        <h3 class="danger-text">Accesso Richiesto</h3>
        <p class="muted-text">La rubrica è un'area protetta riservata ai colleghi. Per accedere devi effettuare il login tramite il Cloud nella Home page.</p>
        <router-link to="/" class="btn btn-action mt-3">Torna alla Home</router-link>
      </div>
    </div>

    <!-- Blocked -->
    <div v-else-if="isBlocked" class="view-container">
      <div class="card glass-card center-text">
        <h3 class="danger-text">🚫 Accesso Bloccato</h3>
        <p class="muted-text">
          Hai rimosso il tuo numero dalla rubrica più volte del consentito.<br><br>
          Per proteggere la community da comportamenti scorretti, il tuo accesso alla funzione rubrica è stato bloccato definitivamente.
        </p>
        <router-link to="/" class="btn btn-action bg-gray mt-3">Torna alla Home</router-link>
      </div>
    </div>

    <!-- Opt-In Required -->
    <div v-else-if="!hasOptedIn" class="view-container">
      <div class="card glass-card center-text">
        <h3 class="primary-text">🤝 Condividi per accedere</h3>
        <p class="muted-text">Questa rubrica contiene i numeri di telefono dei colleghi che hanno deciso di condividerli. <br><br><b>Solo chi condivide il proprio numero può visualizzare quello degli altri.</b> Vuoi unirti?</p>
        
        <div v-if="!authStore.devModeActive" class="strike-warning">
          ⚠️ <b>Regola Anti-Furbetti:</b> Se revochi ripetutamente la condivisione del numero il sistema ti bloccherà permanentemente l'accesso alla rubrica.
        </div>
        
        <button class="btn btn-action mt-3" @click="avviaCondivisione">Condividi il tuo numero</button>
      </div>
    </div>

    <!-- Directory Directory -->
    <div v-else class="view-container directory-mode">
      <input type="text" v-model="searchQuery" class="search-bar" placeholder="🔍 Cerca collega...">
      
      <div class="contacts-list">
        <div v-if="filteredContacts.length === 0" class="muted-text center-text">Nessun collega trovato.</div>
        
        <div v-for="c in filteredContacts" :key="c.telefono + c.nome" class="contact-item">
          <div class="contact-info">
            <div class="contact-name">{{ capitalize(c.cognome) }} {{ capitalize(c.nome) }}</div>
            <div class="contact-detail">{{ c.mansione || 'N/D' }} | Mat: {{ c.matricola || 'N/D' }}</div>
            <div class="contact-phone">{{ c.telefono }}</div>
          </div>
          <div class="contact-actions">
            <a :href="'tel:' + c.telefono.replace(/\s+/g, '')" class="action-icon">📞</a>
            <a :href="'https://wa.me/39' + c.telefono.replace(/\s+/g, '')" target="_blank" class="action-icon wa-icon">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="#25D366"><path d="M12.031 0C5.385 0 .018 5.366.018 12.012c0 2.125.553 4.197 1.603 6.012L.05 24l6.115-1.604c1.745.965 3.738 1.474 5.866 1.474 6.646 0 12.013-5.366 12.013-12.012S18.677 0 12.031 0zm-.018 21.84c-1.796 0-3.553-.483-5.093-1.396l-.365-.216-3.791.994.996-3.697-.238-.377a9.98 9.98 0 0 1-1.528-5.337C1.994 6.452 6.444 2.016 12.013 2.016c2.705 0 5.247 1.053 7.158 2.966 1.91 1.912 2.964 4.456 2.964 7.165 0 5.564-4.45 10.003-10.012 10.003l-.11-.31zm5.503-7.534c-.302-.151-1.785-.881-2.062-.981-.277-.101-.479-.151-.68.151-.202.302-.781.981-.957 1.182-.176.202-.353.226-.655.075-.302-.151-1.275-.47-2.428-1.503-.896-.803-1.501-1.794-1.677-2.096-.176-.302-.019-.465.132-.616.136-.136.302-.353.453-.53.151-.176.202-.302.302-.504.101-.202.05-.378-.025-.53-.075-.151-.68-1.64-.932-2.245-.245-.59-.495-.51-.68-.52-.176-.01-.378-.01-.58-.01-.202 0-.53.076-.807.378-.277.302-1.058 1.034-1.058 2.52 0 1.487 1.083 2.924 1.234 3.125.151.202 2.132 3.255 5.163 4.561 2.222.956 2.87.805 3.373.68.591-.148 1.785-.73 2.037-1.435.252-.705.252-1.31.176-1.435-.075-.126-.277-.202-.58-.353z"/></svg>
            </a>
          </div>
        </div>
      </div>

      <button class="btn btn-danger-outline mt-3" @click="revocaCondivisione">Smetti di condividere</button>
    </div>
    
    <AuthModal :show="showAuth" @close="showAuth = false" />
    <ProfileModal :show="showProfile" @close="handleProfileClosed" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { collection, getDocs, doc, getDoc, setDoc, deleteDoc, db } from '../firebase'
import { useAuthStore } from '../stores/authStore'
import AppHeader from '../components/layout/AppHeader.vue'
import AuthModal from '../components/modals/AuthModal.vue'
import ProfileModal from '../components/modals/ProfileModal.vue'

const authStore = useAuthStore()
const showAuth = ref(false)
const showProfile = ref(false)

const loading = ref(true)
const isBlocked = ref(false)
const hasOptedIn = ref(false)
const contatti = ref([])
const searchQuery = ref('')
let needsRetry = false

const checkStatus = async () => {
  if (!authStore.user) return
  loading.value = true
  try {
    const prof = authStore.userProfile || {}
    if (prof.revoche_rubrica >= 3 && !authStore.devModeActive) {
      isBlocked.value = true
      // ensure they are out of public rubrica
      try { await deleteDoc(doc(db, "rubrica", authStore.user.uid)) } catch(e){}
    } else {
      isBlocked.value = false
      const rubricaSnap = await getDoc(doc(db, "rubrica", authStore.user.uid))
      if (rubricaSnap.exists()) {
        hasOptedIn.value = true
        await fetchContatti()
      } else {
        hasOptedIn.value = false
      }
    }
  } catch(e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

watch(() => authStore.isAuthReady, (ready) => {
  if (ready) checkStatus()
}, { immediate: true })

const fetchContatti = async () => {
  try {
    const snap = await getDocs(collection(db, "rubrica"))
    let list = []
    snap.forEach((d) => {
      const data = d.data()
      if (data.nome && data.cognome) list.push(data)
    })
    list.sort((a, b) => (a.cognome + " " + a.nome).localeCompare((b.cognome + " " + b.nome)))
    contatti.value = list
  } catch(e) {
    console.error(e)
  }
}

const filteredContacts = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if(!q) return contatti.value
  return contatti.value.filter(c => {
    const full = `${c.nome} ${c.cognome} ${c.matricola||''} ${c.telefono||''} ${c.mansione||''}`.toLowerCase()
    return full.includes(q)
  })
})

const avviaCondivisione = () => {
  const prof = authStore.userProfile || {}
  if (prof.nome && prof.cognome && prof.mansione && prof.telefono) {
    salvaCondivisione(prof)
  } else {
    // Apri modale profilo per compilare
    needsRetry = true
    showProfile.value = true
  }
}

const handleProfileClosed = () => {
  showProfile.value = false
  if (needsRetry) {
    needsRetry = false
    avviaCondivisione() // Ritenta
  }
}

const salvaCondivisione = async (prof) => {
  loading.value = true
  try {
    await setDoc(doc(db, "rubrica", authStore.user.uid), {
      nome: prof.nome, cognome: prof.cognome, mansione: prof.mansione,
      matricola: prof.matricola || '', telefono: prof.telefono
    })
    hasOptedIn.value = true
    await fetchContatti()
  } catch(e) {
    alert("Errore: " + e.message)
  } finally {
    loading.value = false
  }
}

const revocaCondivisione = async () => {
  const prof = authStore.userProfile || {}
  const revoche = prof.revoche_rubrica || 0
  
  if(authStore.devModeActive) {
    if(!confirm("🛠️ Sei Admin: Revoca senza strike?")) return
    await deleteDoc(doc(db, "rubrica", authStore.user.uid))
    checkStatus()
    return
  }

  if(!confirm(`Attenzione! Ti rimangono ${2-revoche} tentativi prima del blocco (Strike). Continuare?`)) return
  
  loading.value = true
  try {
    await deleteDoc(doc(db, "rubrica", authStore.user.uid))
    await authStore.updateProfile({ revoche_rubrica: revoche + 1 })
    checkStatus()
  } catch(e) {
    alert("Errore.")
  } finally {
    loading.value = false
  }
}

const capitalize = (str) => {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}
</script>

<style scoped>
.rubrica-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.view-container {
  width: 100%;
  max-width: 400px;
  padding: 0 20px;
  box-sizing: border-box;
}

.center-text { text-align: center; }
.danger-text { color: var(--danger); margin-top: 0; }
.primary-text { color: var(--primary); margin-top: 0; }
.muted-text { color: var(--text-muted); font-size: 15px; line-height: 1.5; }
.loading-text { text-align: center; color: var(--text-muted); margin-top: 50px; }

.mt-3 { margin-top: 20px; }
.btn-action {
  width: 100%;
  background-color: var(--success);
}
.bg-gray { background-color: #6c757d; }

.strike-warning {
  background: #fff3cd; color: #856404;
  padding: 10px; border-radius: 8px; font-size: 12px; margin-top: 15px; text-align: left;
}

.search-bar { margin-bottom: 20px; }

.contact-item {
  background: white;
  padding: 15px;
  border-radius: var(--radius);
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 10px rgba(0,0,0,0.04);
  border-left: 4px solid var(--primary);
  transition: var(--transition);
}
.contact-item:hover {
  transform: translateX(3px);
  box-shadow: 0 4px 15px rgba(0,0,0,0.08);
}

.contact-info { text-align: left; }
.contact-name { font-weight: bold; font-size: 16px; color: var(--primary); margin-bottom: 2px; }
.contact-detail { font-size: 13px; color: #666; margin-bottom: 2px; }
.contact-phone { font-size: 14px; color: var(--text-color); font-weight: 500; }

.contact-actions { display: flex; gap: 8px; }
.action-icon {
  background: var(--bg-color);
  border-radius: 50%;
  width: 40px; height: 40px;
  display: flex; align-items: center; justify-content: center;
  text-decoration: none; font-size: 20px; color: var(--text-color);
}
.wa-icon { background: transparent; }

.btn-danger-outline {
  display: inline-block;
  background: transparent;
  color: var(--danger);
  border: 2px solid var(--danger);
  padding: 12px;
  font-weight: 600;
  width: 100%;
}
</style>

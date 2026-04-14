<template>
  <div class="documenti-view">
    <AppHeader @openAuth="showAuth = true" @openProfile="showProfile = true" />

    <div class="content-area">
      <div v-if="loading" class="status-message">Caricamento documenti...</div>
      <div v-else-if="error" class="status-message error-text" v-html="error"></div>
      <div v-else-if="files.length === 0" class="status-message">Nessun documento presente in archivio.</div>
      
      <div v-else class="file-list">
        <div v-for="file in files" :key="file.originalName" class="file-row">
          <a :href="file.path" target="_blank" class="file-btn">{{ file.displayName }}</a>
          <div class="download-btn" @click="download(file.path, file.originalName)">⬇️</div>
        </div>
      </div>
    </div>
    
    <AuthModal :show="showAuth" @close="showAuth = false" />
    <ProfileModal :show="showProfile" @close="showProfile = false" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import AppHeader from '../components/layout/AppHeader.vue'
import AuthModal from '../components/modals/AuthModal.vue'
import ProfileModal from '../components/modals/ProfileModal.vue'

const showAuth = ref(false)
const showProfile = ref(false)

const CARTELLA_DOCS = "documenti"
const files = ref([])
const loading = ref(true)
const error = ref(null)

const loadData = async () => {
  try {
    const ts = new Date().getTime()
    const res = await fetch(`/mappa_file.json?t=${ts}`)
    if (!res.ok) throw new Error("Not found")
    
    const datiMappa = await res.json()
    const rawFiles = datiMappa.albero
      .filter(p => p.startsWith(`${CARTELLA_DOCS}/`) && p.split('/').length === 2)
      .map(p => p.split('/')[1])
      
    rawFiles.sort((a, b) => a.localeCompare(b))
    
    files.value = rawFiles.map(nomeOriginale => {
      let nomeVis = nomeOriginale.replace(/\.[^/.]+$/, "").replace(/_/g, " ")
      nomeVis = nomeVis.charAt(0).toUpperCase() + nomeVis.slice(1)
      return {
        originalName: nomeOriginale,
        displayName: nomeVis,
        path: `/${CARTELLA_DOCS}/${nomeOriginale}`
      }
    })
  } catch (e) {
    error.value = "Errore: mappa_file.json non trovata.<br>Vai in Admin e clicca 'Forza Creazione Mappa'."
  } finally {
    loading.value = false
  }
}

const download = async (url, filename) => {
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    const urlBlob = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = urlBlob
    a.download = filename
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(urlBlob)
  } catch (e) {
    window.open(url, '_blank')
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.documenti-view {
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
}
.status-message {
  text-align: center;
  color: var(--text-muted);
  margin-top: 20px;
  padding: 20px;
  background: white;
  border-radius: var(--radius);
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
}
.error-text {
  color: var(--danger);
  border: 1px solid #f5c6cb;
  background-color: #f8d7da;
}
.file-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.file-row {
  display: flex;
  gap: 10px;
  width: 100%;
}
.file-btn {
  flex: 1;
  background-color: var(--primary);
  color: white;
  border: none;
  padding: 16px;
  font-size: 16px;
  border-radius: var(--radius);
  text-decoration: none;
  text-align: center;
  font-weight: 500;
  box-shadow: 0 4px 10px rgba(0, 86, 179, 0.2);
  transition: var(--transition);
}
.file-btn:active {
  transform: translateY(2px);
  box-shadow: 0 2px 5px rgba(0, 86, 179, 0.2);
}
.download-btn {
  background-color: white;
  border: 2px solid var(--primary);
  color: var(--primary);
  padding: 10px;
  border-radius: var(--radius);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 55px;
  font-size: 20px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.05);
  transition: var(--transition);
}
.download-btn:active {
  background-color: var(--primary);
  color: white;
}
</style>

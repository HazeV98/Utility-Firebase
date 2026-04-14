<template>
  <div class="orari-view">
    <AppHeader @openAuth="showAuth = true" @openProfile="showProfile = true" />

    <div class="content-area">
      <div v-if="loading" class="status-message">Caricamento indice file...</div>
      <div v-else-if="error" class="status-message error-text" v-html="error"></div>
      
      <!-- List of Folders -->
      <div v-else-if="currentDir === null">
        <div v-if="folders.length === 0" class="status-message">Nessuna cartella orari trovata nell'archivio.</div>
        
        <div v-else class="folders-list">
          <button v-for="folder in folders" :key="folder.path" class="folder-btn" @click="caricaFiles(folder.path)">
            Orari dal {{ folder.label }}
          </button>
        </div>
      </div>

      <!-- List of Files inside a Folder -->
      <div v-else>
        <button class="back-btn" @click="currentDir = null" v-if="folders.length > 1">
          ← Torna alle cartelle
        </button>
        
        <div class="file-list">
          <div v-for="file in activeFiles" :key="file.originalName" class="file-row">
            <a :href="file.path" target="_blank" class="file-btn">{{ file.displayName }}</a>
            <div class="download-btn" @click="download(file.path, file.originalName)">⬇️</div>
          </div>
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

const loading = ref(true)
const error = ref(null)
const mappaAlbero = ref([])
const folders = ref([])
const currentDir = ref(null)
const activeFiles = ref([])

const init = async () => {
  try {
    const ts = new Date().getTime()
    const res = await fetch(`/mappa_file.json?t=${ts}`)
    if (!res.ok) throw new Error()
    const data = await res.json()
    mappaAlbero.value = data.albero || []

    const dirsObj = new Set(
      mappaAlbero.value
        .filter(p => p.startsWith("orari_") && p.includes('/'))
        .map(p => p.split('/')[0])
    )
    
    let dirs = Array.from(dirsObj)
    dirs.sort((a,b) => b.localeCompare(a)) // Sort by newest (orari_YYYY-MM-DD)
    
    folders.value = dirs.map(d => {
      let label = d.replace("orari_", "").split("-").join("/")
      return { path: d, label }
    })

    if (folders.value.length === 1) {
      caricaFiles(folders.value[0].path)
    }

  } catch(e) {
    error.value = "Errore: mappa_file.json non trovata.<br>Vai in Admin e clicca 'Forza Creazione Mappa'."
  } finally {
    loading.value = false
  }
}

const caricaFiles = (dir) => {
  const pdfs = mappaAlbero.value
    .filter(p => p.startsWith(`${dir}/`) && p.toLowerCase().endsWith(".pdf"))
    .map(p => p.split('/')[1])

  pdfs.sort((a, b) => {
    if (a.includes("completo")) return -1
    return a.localeCompare(b, undefined, {numeric: true})
  })

  activeFiles.value = pdfs.map(nomeOrig => {
    let nomeVis = nomeOrig.replace(/\.pdf$/i, "").replace(/_/g, " ")
    if (nomeOrig.includes("completo")) {
      nomeVis = "📥 PDF Orari Completo"
    } else {
      nomeVis = nomeVis.split(/\s+dal\s+/i)[0]
      nomeVis = nomeVis.replace(/actv nav/i, "Orari").replace(/(\d+)b\b/gi, "$1/").trim()
      nomeVis = nomeVis.charAt(0).toUpperCase() + nomeVis.slice(1)
    }
    return {
      originalName: nomeOrig,
      displayName: nomeVis,
      path: `/${dir}/${nomeOrig}`
    }
  })
  
  currentDir.value = dir
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

onMounted(() => init())
</script>

<style scoped>
.orari-view {
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

.folders-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.folder-btn {
  background-color: var(--primary);
  color: white;
  border: none;
  padding: 16px;
  font-size: 16px;
  border-radius: var(--radius);
  cursor: pointer;
  text-align: center;
  font-weight: 500;
  box-shadow: 0 4px 10px rgba(0, 86, 179, 0.2);
}

.back-btn {
  background-color: var(--text-muted);
  color: white;
  border: none;
  padding: 12px;
  border-radius: var(--radius);
  cursor: pointer;
  margin-bottom: 20px;
  width: 100%;
  font-weight: bold;
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
  background-color: var(--secondary);
  color: var(--primary);
  border: none;
  padding: 16px;
  font-size: 15px;
  border-radius: var(--radius);
  text-decoration: none;
  text-align: left;
  font-weight: 600;
  box-shadow: 0 4px 10px rgba(0,0,0,0.05);
  display: flex;
  align-items: center;
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
}
</style>

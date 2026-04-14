<template>
  <div class="link-view">
    <AppHeader @openAuth="showAuth = true" @openProfile="showProfile = true" />

    <div class="content-area">
      <div v-if="loading" class="status-message">Caricamento link...</div>
      <div v-else-if="error" class="status-message error-text">File link.json non trovato o errore lettura.</div>
      <div v-else-if="categories.length === 0" class="status-message">Nessun link presente.</div>
      
      <div v-else class="categories">
        <div v-for="(cat, idx) in categories" :key="idx" class="category-block">
          <div class="category-title">{{ cat.categoria }}</div>
          
          <div v-for="(link, lIdx) in cat.elementi" :key="lIdx" class="link-row">
            <a :href="link.url" target="_blank" class="link-btn">
              <span>{{ link.nome }}</span>
              <span class="link-icon">🔗</span>
            </a>
            <div class="copy-btn" @click="copiaLink(link.url, idx, lIdx)" title="Copia URL">
              {{ copiedIndex === `${idx}-${lIdx}` ? '✅' : '📋' }}
            </div>
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

const categories = ref([])
const loading = ref(true)
const error = ref(false)
const copiedIndex = ref(null)

const init = async () => {
  try {
    const ts = new Date().getTime()
    const res = await fetch(`/link.json?v=${ts}`)
    if(!res.ok) throw new Error("not found")
    const data = await res.json()
    categories.value = data.link || []
  } catch (e) {
    error.value = true
  } finally {
    loading.value = false
  }
}

const copiaLink = (url, catIdx, linkIdx) => {
  navigator.clipboard.writeText(url).then(() => {
    copiedIndex.value = `${catIdx}-${linkIdx}`
    setTimeout(() => {
      if (copiedIndex.value === `${catIdx}-${linkIdx}`) {
        copiedIndex.value = null
      }
    }, 1500)
  }).catch(e => console.error(e))
}

onMounted(() => init())
</script>

<style scoped>
.link-view {
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

.category-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}
.category-title {
  font-size: 13px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 1px;
  border-bottom: 1px solid #e9ecef;
  padding-bottom: 5px;
  margin-top: 10px;
}

.link-row {
  display: flex;
  gap: 8px;
  width: 100%;
  align-items: stretch;
}
.link-btn {
  flex-grow: 1;
  background-color: white;
  color: var(--primary);
  border: 2px solid var(--primary);
  padding: 16px;
  font-size: 15px;
  font-weight: bold;
  border-radius: var(--radius);
  cursor: pointer;
  text-decoration: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  transition: var(--transition);
}
.link-btn:active {
  transform: translateY(2px);
  background-color: #f8f9fa;
}
.link-icon { font-size: 18px; }

.copy-btn {
  width: 55px;
  background-color: white;
  color: var(--text-muted);
  border: 2px solid #e9ecef;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 20px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  transition: var(--transition);
}
.copy-btn:active {
  background-color: #e9ecef;
}
</style>

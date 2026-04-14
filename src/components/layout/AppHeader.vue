<template>
  <header class="app-header">
    <div class="header-side left">
      <button v-if="!authStore.user" @click="emit('openAuth')" class="btn btn-login">
        ☁️ Login
      </button>
      <button v-else @click="emit('openProfile')" class="btn btn-profile">
        👤 Profilo
      </button>
    </div>
    
    <div class="header-center">
      <h2 class="main-title" @click="handleDevClick">Utility</h2>
      <div v-if="authStore.user" class="user-status">☁️ Online</div>
    </div>
    
    <div class="header-side right">
      <button v-if="showInstallBtn" @click="installPWA" class="btn btn-install">
        Installa
      </button>
      <div class="badge-icon" @click="goToBacheca">
        <span class="icon">📢</span>
        <div v-if="unreadMessages > 0" class="badge-count">{{ unreadMessages }}</div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/authStore'
import { collection, getDocs, db } from '../../firebase'

const emit = defineEmits(['openAuth', 'openProfile'])
const router = useRouter()
const authStore = useAuthStore()

const deferredPrompt = ref(null)
const showInstallBtn = ref(false)
const unreadMessages = ref(0)
let devTapCount = 0
let devTapTimer = null

onMounted(() => {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt.value = e
    showInstallBtn.value = true
  })
  
  checkBacheca()
})

const installPWA = async () => {
  if (deferredPrompt.value) {
    deferredPrompt.value.prompt()
    deferredPrompt.value = null
    showInstallBtn.value = false
  }
}

const goToBacheca = () => {
  router.push('/bacheca_utility')
}

const checkBacheca = async () => {
  try {
    const ultimoAccesso = parseInt(localStorage.getItem('ultimo_accesso_bacheca')) || 0
    const snap = await getDocs(collection(db, "bacheca_utility"))
    let count = 0
    snap.forEach(d => {
      if (d.data().timestamp > ultimoAccesso) count++
    })
    unreadMessages.value = count
  } catch(e) {
    console.error(e)
  }
}

const handleDevClick = () => {
  clearTimeout(devTapTimer)
  devTapCount++
  if (devTapCount === 5) {
    localStorage.setItem('dev_mode_active', 'true')
    alert("🛠️ Admin Sbloccato")
    location.reload()
  } else {
    devTapTimer = setTimeout(() => { devTapCount = 0 }, 500)
  }
}
</script>

<style scoped>
.app-header {
  width: 100%;
  max-width: 450px;
  margin: 0 auto;
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  box-sizing: border-box;
}

.header-side {
  flex: 1;
  display: flex;
  align-items: center;
}
.header-side.left { justify-content: flex-start; }
.header-side.right { justify-content: flex-end; gap: 15px; }
.header-center {
  flex: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.main-title {
  margin: 0;
  color: var(--primary);
  font-size: 28px;
  font-weight: 800;
  user-select: none;
  cursor: pointer;
  letter-spacing: -0.5px;
}

.user-status {
  font-size: 11px;
  color: var(--success);
  font-weight: bold;
  margin-top: 4px;
}

.btn-login {
  background-color: var(--danger);
  padding: 8px 12px;
  font-size: 12px;
  border-radius: 20px;
}

.btn-profile {
  background-color: var(--primary);
  padding: 8px 12px;
  font-size: 12px;
  border-radius: 20px;
}

.btn-install {
  background-color: var(--success);
  padding: 8px 14px;
  font-size: 13px;
  border-radius: 20px;
  animation: pulse 2s infinite;
}

.badge-icon {
  position: relative;
  cursor: pointer;
}
.icon {
  font-size: 26px;
}
.badge-count {
  position: absolute;
  top: -5px;
  right: -8px;
  background: var(--danger);
  color: white;
  border-radius: 50%;
  font-size: 11px;
  font-weight: bold;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

@keyframes pulse {
  0% { transform: scale(1); box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
  50% { transform: scale(1.05); box-shadow: 0 4px 10px rgba(40, 167, 69, 0.4); }
  100% { transform: scale(1); box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
}
</style>

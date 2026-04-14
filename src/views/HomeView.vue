<template>
  <div class="home-view">
    <AppHeader @openAuth="showAuth = true" @openProfile="showProfile = true" />

    <main class="menu-container">
      <router-link to="/calendario?oggi=true" class="menu-btn btn-oggi">
        <span class="btn-text">Turno di Oggi</span>
      </router-link>
      
      <router-link to="/calendario" class="menu-btn">📅 Calendario</router-link>
      <router-link to="/dati_calendario" class="menu-btn">📊 Statistiche</router-link>
      <router-link to="/turni" class="menu-btn">🔄 Turni</router-link>
      <router-link to="/bacheca_turni" class="menu-btn">🔄 Bacheca Turni</router-link>
      <router-link to="/rubrica" class="menu-btn">📞 Rubrica Colleghi</router-link>
      <router-link to="/rotazione_ferie" class="menu-btn">🌴 Rotazione Ferie</router-link>
      <router-link to="/orari" class="menu-btn">🕒 Orari Navigazione</router-link>
      
      <router-link v-if="showRotazioni" to="/rotazioni" class="menu-btn">👥 Rotazioni</router-link>

      <router-link to="/documenti" class="menu-btn">📄 Documenti</router-link>
      <router-link to="/link" class="menu-btn">🔗 Link</router-link>
      <router-link to="/contatti" class="menu-btn">📇 Contatti</router-link>
      <router-link to="/buoni" class="menu-btn">🍝 Buoni Pasto</router-link>
      <router-link to="/dds" class="menu-btn">📂 Archivio DDS</router-link>
      <router-link to="/guida" class="menu-btn btn-guida">📖 Guida</router-link>

      <router-link v-if="authStore.devModeActive" to="/admin" class="menu-btn btn-admin">🔒 Admin</router-link>
    </main>
    
    <AuthModal :show="showAuth" @close="showAuth = false" />
    <ProfileModal :show="showProfile" @close="showProfile = false" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import AppHeader from '../components/layout/AppHeader.vue'
import AuthModal from '../components/modals/AuthModal.vue'
import ProfileModal from '../components/modals/ProfileModal.vue'
import { useAuthStore } from '../stores/authStore'

const authStore = useAuthStore()
const showAuth = ref(false)
const showProfile = ref(false)
const showRotazioni = ref(false)

onMounted(() => {
  const appDataStr = localStorage.getItem('myTurniApp')
  if (appDataStr && appDataStr.toLowerCase().includes('nove')) {
    showRotazioni.value = true
  }
})
</script>

<style scoped>
.home-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.menu-container {
  display: grid;
  grid-template-columns: 1fr;
  gap: 15px;
  width: 100%;
  max-width: 400px;
  padding: 0 20px 40px 20px;
  box-sizing: border-box;
}

.menu-btn {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  color: var(--primary);
  border: 1px solid rgba(0, 86, 179, 0.1);
  padding: 18px 20px;
  font-size: 17px;
  border-radius: 16px;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  text-align: left;
  text-decoration: none;
  display: flex;
  align-items: center;
  font-weight: 600;
}

.menu-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(0, 86, 179, 0.15);
  background: white;
}

.menu-btn:active {
  transform: translateY(1px);
}

.btn-oggi {
  background: linear-gradient(135deg, var(--success) 0%, #20c997 100%);
  color: white;
  font-size: 20px;
  box-shadow: 0 8px 20px rgba(40, 167, 69, 0.3);
  border: none;
  justify-content: center;
  padding: 22px;
}

.btn-oggi:hover {
  background: linear-gradient(135deg, #218838 0%, #1e9974 100%);
}

.btn-guida {
  background-color: #6c757d;
  color: white;
  border: none;
}

.btn-admin {
  background-color: var(--danger);
  color: white;
  border: none;
}
</style>

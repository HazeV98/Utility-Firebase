<template>
  <div id="app-wrapper">
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>

    <!-- Modal Promemoria Globale all'avvio -->
    <div v-if="showReminders" class="modal global-modal">
      <div class="modal-content">
        <h3 style="color: #d39e00; margin-bottom: 20px;">🔔 Promemoria per Oggi</h3>
        
        <div class="reminders-list">
          <div v-for="rem in activeReminders" :key="rem.id" class="reminder-item">
            <div class="rem-title">{{ rem.titolo }}</div>
            <div v-if="rem.note" class="rem-note">{{ rem.note }}</div>
          </div>
        </div>

        <button class="btn-esegui warning-btn" @click="chiudiReminders">Ho Capito</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useAuthStore } from './stores/authStore'
import { useDdsStore } from './stores/ddsStore'
import { storeToRefs } from 'pinia'

const authStore = useAuthStore()
const ddsStore = useDdsStore()
const { activeReminders, isLoaded } = storeToRefs(ddsStore)

const showReminders = ref(false)
const remindersShownSession = ref(sessionStorage.getItem('reminders_shown') === 'true')

// Quando l'utente è loggato, carica le DDS in background
watch(() => authStore.isAuthReady, (ready) => {
  if (ready && authStore.user) {
    ddsStore.fetchDDS()
  }
}, { immediate: true })

// Se le DDS sono caricate e ci sono promemoria loggati oggi, mostrali
watch([isLoaded, activeReminders], ([loaded, rems]) => {
  if (loaded && rems.length > 0 && !remindersShownSession.value) {
    showReminders.value = true
  }
})

const chiudiReminders = () => {
  showReminders.value = false
  remindersShownSession.value = true
  sessionStorage.setItem('reminders_shown', 'true')
}
</script>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* Base Modal Styling for global */
.global-modal { display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.6); justify-content: center; align-items: center; z-index: 9999; padding: 20px; box-sizing: border-box; }
.global-modal .modal-content { background-color: white; padding: 25px; border-radius: 12px; width: 100%; max-width: 350px; text-align: left; box-shadow: 0 5px 20px rgba(0,0,0,0.5); }
.warning-btn { background-color: #ffc107; color: #333; }
.reminder-item { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin-bottom: 12px; border-radius: 6px; }
.rem-title { font-weight: bold; font-size: 16px; color: #856404; }
.rem-note { font-size: 13px; color: #555; margin-top: 5px; white-space: pre-wrap; font-style: italic; }
</style>

<template>
  <div style="display:flex; justify-content: space-between;">
      <div>
          <div style="font-weight:bold; color:var(--primary)">
              {{ utente.cognome }} {{ utente.nome }} <span v-if="utente.uid === authStore.user?.uid">(Tu)</span>
          </div>
          <div style="font-size:11px; color:#666">{{ utente.mansione }} | Mat: {{ utente.matricola || 'N/D' }}</div>
          
          <div style="margin-top: 6px;">
            <span class="badge-estivo">☀️ {{ periodoEstivo }}
              <span v-if="hasScambiatoEstivo" class="badge-scambiato">SCAMBIATO</span>
            </span><br>
            <span class="badge-invernale" style="margin-top: 4px;">❄️ {{ periodoInvernale }}
              <span v-if="hasScambiatoInvernale" class="badge-scambiato">SCAMBIATO</span>
            </span>
          </div>
      </div>
      <div class="contact-actions">
          <a v-if="utente.uid !== authStore.user?.uid && utente.telefono" :href="'https://wa.me/39' + pulisciTelefono(utente.telefono)" target="_blank" class="action-icon wa-icon">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="#25D366"><path d="M12.031 0C5.385 0 .018 5.366.018 12.012c0 2.125.553 4.197 1.603 6.012L.05 24l6.115-1.604c1.745.965 3.738 1.474 5.866 1.474 6.646 0 12.013-5.366 12.013-12.012S18.677 0 12.031 0zm-.018 21.84c-1.796 0-3.553-.483-5.093-1.396l-.365-.216-3.791.994.996-3.697-.238-.377a9.98 9.98 0 0 1-1.528-5.337C1.994 6.452 6.444 2.016 12.013 2.016c2.705 0 5.247 1.053 7.158 2.966 1.91 1.912 2.964 4.456 2.964 7.165 0 5.564-4.45 10.003-10.012 10.003l-.11-.31zm5.503-7.534c-.302-.151-1.785-.881-2.062-.981-.277-.101-.479-.151-.68.151-.202.302-.781.981-.957 1.182-.176.202-.353.226-.655.075-.302-.151-1.275-.47-2.428-1.503-.896-.803-1.501-1.794-1.677-2.096-.176-.302-.019-.465.132-.616.136-.136.302-.353.453-.53.151-.176.202-.302.302-.504.101-.202.05-.378-.025-.53-.075-.151-.68-1.64-.932-2.245-.245-.59-.495-.51-.68-.52-.176-.01-.378-.01-.58-.01-.202 0-.53.076-.807.378-.277.302-1.058 1.034-1.058 2.52 0 1.487 1.083 2.924 1.234 3.125.151.202 2.132 3.255 5.163 4.561 2.222.956 2.87.805 3.373.68.591-.148 1.785-.73 2.037-1.435.252-.705.252-1.31.176-1.435-.075-.126-.277-.202-.58-.353z"/></svg>
          </a>
      </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../../stores/authStore'

const props = defineProps({
  utente: Object,
  annoRicerca: Number,
  jsonFerie: Object
})
const authStore = useAuthStore()

const calc = (uData, type) => {
    const arr = type === 'estive' ? props.jsonFerie.estive : props.jsonFerie.invernali
    if(!arr || arr.length===0) return ""
    const baseP = type === 'estive' ? uData.periodo_estivo : uData.periodo_invernale
    if (props.annoRicerca === uData.anno_base) return type === 'estive' ? (uData.est_attuale || baseP) : (uData.inv_attuale || baseP)
    const idx = arr.findIndex(o => o.n === baseP)
    if (idx === -1) return "N/D"
    const diff = props.annoRicerca - uData.anno_base
    const ni = (((idx + diff) % arr.length) + arr.length) % arr.length
    return arr[ni].n
}

const periodoEstivo = computed(() => calc(props.utente, 'estive'))
const periodoInvernale = computed(() => calc(props.utente, 'invernali'))

const hasScambiatoEstivo = computed(() => props.annoRicerca === props.utente.anno_base && props.utente.est_attuale && props.utente.est_attuale !== props.utente.periodo_estivo)
const hasScambiatoInvernale = computed(() => props.annoRicerca === props.utente.anno_base && props.utente.inv_attuale && props.utente.inv_attuale !== props.utente.periodo_invernale)

const pulisciTelefono = (tel) => tel ? tel.replace(/\s+/g, '') : ''
</script>

<style scoped>
.badge-estivo { background: #ffeeba; color: #856404; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; display: inline-block; }
.badge-invernale { background: #cce5ff; color: #004085; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; display: inline-block; }
.badge-scambiato { background: #e2e3e5; color: #383d41; padding: 2px 6px; border-radius: 4px; font-size: 9px; margin-left: 5px; vertical-align: middle; display: inline-block; }
.contact-actions { display: flex; align-items: center; justify-content: flex-end; }
.action-icon { background: #e9ecef; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; text-decoration: none; cursor: pointer; }
.wa-icon { background: transparent; }
</style>

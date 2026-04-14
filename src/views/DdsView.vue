<template>
  <div class="dds-view">
    <AppHeader @openAuth="showAuth = true" @openProfile="showProfile = true" />

    <div class="content-area">
      <div style="display: flex; gap: 10px; width: 100%; margin-bottom: 5px;">
        <button class="btn-add-main" @click="apriModaleAggiungi">➕ DDS (PDF)</button>
        <button class="btn-add-main btn-warning" @click="apriModalePromemoria">🔔 Promemoria</button>
      </div>

      <div class="backup-group">
        <button class="btn-outline" @click="esportaDDS">⬇️ Esporta</button>
        <button class="btn-outline" @click="$refs.fileImport.click()">⬆️ Importa</button>
        <input type="file" ref="fileImport" style="display: none;" accept=".json" @change="importaDDS">
      </div>

      <div class="dds-list">
        <div v-if="ddsArray.length === 0" class="empty-state">
          Nessuna DDS o Promemoria archiviato.<br>Premi sui bottoni in alto per iniziare.
        </div>

        <div v-for="dds in ddsArray" :key="dds.id"
             :class="['dds-card', { 'promemoria-card': dds.isPromemoria }]">
          
          <div class="dds-title">
            <span v-if="dds.isPromemoria">🔔 </span>{{ dds.titolo }}
          </div>
          
          <div class="dds-date">Validità: <span v-html="formattaValidita(dds)"></span></div>

          <div v-if="dds.note" class="dds-note">📝 {{ dds.note }}</div>

          <div v-if="getRemTesto(dds)" class="dds-reminder-badge">
            {{ getRemTesto(dds) }}
          </div>

          <div class="btn-group">
            <button v-if="!dds.isPromemoria && dds.fileData"
                    class="btn-open"
                    @click="apriPDF(dds.id)">📄 Apri PDF</button>
            <button class="btn-delete"
                    :style="{ flex: (dds.isPromemoria || !dds.fileData) ? 1 : '' }"
                    @click="eliminaDDS(dds.id)">🗑️ Elimina</button>
          </div>
        </div>
      </div>
    </div>

    <!-- MODALE AGGIUNGI PDF -->
    <div v-if="modalAggiungi" class="modal">
      <div class="modal-content">
        <h3>Nuova DDS</h3>
        
        <div class="input-group">
          <label>Titolo</label>
          <input type="text" v-model="formDds.titolo" placeholder="Inserisci il titolo...">
        </div>

        <div class="input-group">
          <label>Giorni di validità (tocca per sceglierli)</label>
          <input type="text" ref="ddsDatePicker" placeholder="Seleziona le date..." readonly>
        </div>

        <div class="input-group">
          <label>File PDF</label>
          <input type="file" @change="onDdsFileChange" accept="application/pdf">
        </div>

        <div class="input-group">
          <label>Avvisi all'avvio:</label>
          <div class="checkbox-group">
            <label class="checkbox-label"><input type="checkbox" value="day_before" v-model="formDds.reminder"> Il giorno prima</label>
            <label class="checkbox-label"><input type="checkbox" value="first_day" v-model="formDds.reminder"> Il primo giorno</label>
            <label class="checkbox-label"><input type="checkbox" value="all_days" v-model="formDds.reminder"> Tutti i giorni</label>
          </div>
        </div>

        <button class="btn-esegui" @click="salvaDDS">💾 Salva DDS</button>
        <button class="btn-chiudi" @click="modalAggiungi = false">Annulla</button>
      </div>
    </div>

    <!-- MODALE PROMEMORIA -->
    <div v-if="modalPromemoria" class="modal">
      <div class="modal-content">
        <h3 style="color: #856404;">Nuovo Promemoria</h3>
        
        <div class="input-group">
          <label>Titolo (verrà mostrato nel calendario)</label>
          <input type="text" v-model="formPromemoria.titolo" placeholder="Titolo del promemoria">
        </div>

        <div class="input-group">
          <label>Giorni di validità (tocca per sceglierli)</label>
          <input type="text" ref="promemoriaDatePicker" placeholder="Seleziona le date..." readonly>
        </div>

        <div class="input-group">
          <label>Note / Descrizione (Opzionale)</label>
          <textarea v-model="formPromemoria.note" rows="3" placeholder="Aggiungi dettagli o note..."></textarea>
        </div>

        <div class="input-group">
          <label>Avvisi all'avvio:</label>
          <div class="checkbox-group">
            <label class="checkbox-label"><input type="checkbox" value="day_before" v-model="formPromemoria.reminder"> Il giorno prima</label>
            <label class="checkbox-label"><input type="checkbox" value="first_day" v-model="formPromemoria.reminder"> Il primo giorno</label>
            <label class="checkbox-label"><input type="checkbox" value="all_days" v-model="formPromemoria.reminder"> Tutti i giorni</label>
          </div>
        </div>

        <button class="btn-esegui btn-warning" @click="salvaPromemoria">💾 Salva Promemoria</button>
        <button class="btn-chiudi" @click="modalPromemoria = false">Annulla</button>
      </div>
    </div>

    <AuthModal :show="showAuth" @close="showAuth = false" />
    <ProfileModal :show="showProfile" @close="showProfile = false" />
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import AppHeader from '../components/layout/AppHeader.vue'
import AuthModal from '../components/modals/AuthModal.vue'
import ProfileModal from '../components/modals/ProfileModal.vue'
import { useDdsStore } from '../stores/ddsStore.js'
import { storeToRefs } from 'pinia'

const ddsStore = useDdsStore()
const { ddsList: ddsArray } = storeToRefs(ddsStore)

const showAuth = ref(false)
const showProfile = ref(false)

const modalAggiungi = ref(false)
const modalPromemoria = ref(false)

const formDds = ref({ titolo: '', fileParams: null, dateValidita: [], reminder: ['all_days'] })
const formPromemoria = ref({ titolo: '', note: '', dateValidita: [], reminder: ['all_days'] })

const ddsDatePicker = ref(null)
const promemoriaDatePicker = ref(null)

let fpDdsInstance = null
let fpPromInstance = null

const onDdsFileChange = (e) => {
  if (e.target.files.length) {
    formDds.value.fileParams = e.target.files[0]
  }
}

const apriModaleAggiungi = async () => {
  formDds.value = { titolo: '', fileParams: null, dateValidita: [], reminder: ['all_days'] }
  modalAggiungi.value = true
  await nextTick()
  if (window.flatpickr) {
    fpDdsInstance = window.flatpickr(ddsDatePicker.value, {
      mode: "multiple", dateFormat: "Y-m-d", locale: window.flatpickr.l10ns.it || "it",
      altInput: true, altFormat: "d/m/Y", conjunction: ", "
    })
  }
}

const apriModalePromemoria = async () => {
  formPromemoria.value = { titolo: '', note: '', dateValidita: [], reminder: ['all_days'] }
  modalPromemoria.value = true
  await nextTick()
  if (window.flatpickr) {
    fpPromInstance = window.flatpickr(promemoriaDatePicker.value, {
      mode: "multiple", dateFormat: "Y-m-d", locale: window.flatpickr.l10ns.it || "it",
      altInput: true, altFormat: "d/m/Y", conjunction: ", "
    })
  }
}

const salvaDDS = async () => {
  const titolo = formDds.value.titolo.trim()
  const dates = fpDdsInstance.selectedDates.map(d => {
    const o = d.getTimezoneOffset() * 60000; return new Date(d.getTime() - o).toISOString().split('T')[0]
  }).sort()
  const file = formDds.value.fileParams
  
  if (!titolo || dates.length === 0 || !file) {
    return alert("Compila il Titolo, le date e scegli un file PDF.")
  }
  if (file.size > 10 * 1024 * 1024) return alert("File PDF > 10MB.")

  const payload = {
    titolo, dateValidita: dates, reminder: formDds.value.reminder, fileName: file.name
  }

  const success = await ddsStore.addDDS(payload, file)
  if(success) {
    alert("✅ Salvato in Cloud!")
    modalAggiungi.value = false
  } else {
    alert("❌ Errore durante il salvataggio. Assicurati di aver fatto l'accesso.")
  }
}

const salvaPromemoria = async () => {
  const titolo = formPromemoria.value.titolo.trim()
  const dates = fpPromInstance.selectedDates.map(d => {
    const o = d.getTimezoneOffset() * 60000; return new Date(d.getTime() - o).toISOString().split('T')[0]
  }).sort()
  
  if (!titolo || dates.length === 0) return alert("Compila il Titolo e le date.")

  const payload = {
    titolo, note: formPromemoria.value.note.trim(),
    dateValidita: dates, reminder: formPromemoria.value.reminder, isPromemoria: true
  }

  const success = await ddsStore.addDDS(payload, null)
  if(success) {
    alert("✅ Promemoria salvato in Cloud!")
    modalPromemoria.value = false
  } else {
    alert("❌ Errore durante il salvataggio. Assicurati di aver fatto l'accesso.")
  }
}

const apriPDF = async (id) => {
  const url = await ddsStore.getDDSFileUrl(id)
  if (url) {
    window.open(url, '_blank')
    if (url.startsWith('blob:')) setTimeout(() => URL.revokeObjectURL(url), 2000)
  } else {
    alert("Errore nell'apertura del PDF. Non rintracciabile.")
  }
}

const eliminaDDS = async (id) => {
  if(confirm("Vuoi eliminare dal Cloud?")) {
    await ddsStore.deleteDDS(id)
  }
}

const formattaValidita = (dds) => {
  if (dds.dateValidita && dds.dateValidita.length > 0) {
    if (dds.dateValidita.length <= 3) {
      return dds.dateValidita.map(d => { let p=d.split('-'); return `${p[2]}/${p[1]}/${p[0]}` }).join(', ')
    } else {
      let ps = dds.dateValidita[0].split('-'), pe = dds.dateValidita[dds.dateValidita.length-1].split('-')
      return `<b>${dds.dateValidita.length} giorni totali</b> (dal ${ps[2]}/${ps[1]} al ${pe[2]}/${pe[1]})`
    }
  } else {
    const dDa = dds.dataDa || dds.dataEntrata, dA = dds.dataA || dds.dataEntrata
    if(dDa === dA) { let p=dDa.split('-'); return `${p[2]}/${p[1]}/${p[0]}` }
    let p1=dDa.split('-'), p2=dA.split('-'); return `Dal ${p1[2]}/${p1[1]} al ${p2[2]}/${p2[1]}`
  }
}

const getRemTesto = (dds) => {
  let rM = Array.isArray(dds.reminder) ? dds.reminder : [dds.reminder]
  let l = []
  if(rM.includes('day_before')) l.push("Giorno prima")
  if(rM.includes('first_day')) l.push("Primo giorno")
  if(rM.includes('all_days')) l.push("Giorni attivi")
  return l.length ? "🔔 " + l.join(" + ") : null
}

const esportaDDS = () => {
  if (!ddsArray.value.length) return alert("Archivio vuoto.")
  const b = new Blob([JSON.stringify(ddsArray.value)], {type:"application/json"})
  const a = document.createElement('a')
  a.href = URL.createObjectURL(b)
  a.download = `backup_archivio_dds.json`
  a.click(); URL.revokeObjectURL(a.href)
}

const importaDDS = (evt) => {
  const file = evt.target.files[0]
  if(!file) return
  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const arr = JSON.parse(e.target.result)
      if(!Array.isArray(arr)) throw new Error()
      if(!confirm(`Trovati ${arr.length} elementi. Importare in Cloud? (Potrebbe volerci tempo e banda)`)) { evt.target.value=''; return }
      
      const success = await ddsStore.importLegacyArray(arr)
      if (success) {
        alert("✅ Dati importati con successo!")
      } else {
        alert("❌ Errore upload (Login richiesto).")
      }
      evt.target.value=''
    } catch(err) { alert("❌ File JSON non valido."); evt.target.value=''}
  }
  reader.readAsText(file)
}

onMounted(() => {
  ddsStore.fetchDDS()

  if(!window.flatpickr) {
    const lnk = document.createElement('link')
    lnk.rel = "stylesheet"; lnk.href = "https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css"
    document.head.appendChild(lnk)
    const sc2 = document.createElement('script')
    sc2.src = "https://cdn.jsdelivr.net/npm/flatpickr"
    sc2.onload = () => {
         const sc3 = document.createElement('script')
         sc3.src = "https://npmcdn.com/flatpickr/dist/l10n/it.js"
         document.head.appendChild(sc3)
    }
    document.head.appendChild(sc2)
  }
})
</script>

<style scoped>
.dds-view {
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
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.btn-add-main {
  background-color: var(--success);
  color: white;
  border: none;
  padding: 14px;
  font-size: 15px;
  font-weight: bold;
  border-radius: 12px;
  cursor: pointer;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  transition: transform 0.2s;
}
.btn-add-main:active { transform: translateY(2px); }
.btn-warning { background-color: var(--warning); color: #333; }

.backup-group { display: flex; gap: 10px; width: 100%; margin-bottom: 5px; }
.btn-outline {
  background-color: white; color: var(--primary); border: 2px solid var(--primary);
  padding: 12px; font-size: 14px; font-weight: bold; border-radius: 10px; cursor: pointer; flex: 1; text-align: center;
}
.btn-outline:active { background-color: var(--primary); color: white; }

.empty-state { text-align: center; padding: 30px 10px; color: #888; font-size: 14px; }
.dds-list { display: flex; flex-direction: column; gap: 15px; }
.dds-card {
  background: white; padding: 15px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);
  display: flex; flex-direction: column; gap: 10px; border-left: 5px solid var(--primary);
}
.promemoria-card { border-left: 5px solid var(--warning); }
.dds-title { font-weight: bold; font-size: 16px; color: var(--primary); }
.promemoria-card .dds-title { color: #856404; }
.dds-date { font-size: 13px; color: #666; line-height: 1.4; }
.dds-note { font-size: 13px; color: #444; background: #f8f9fa; padding: 10px; border-radius: 8px; border-left: 3px solid #ccc; margin-top: 5px; font-style: italic; white-space: pre-wrap; line-height: 1.4; }
.dds-reminder-badge { display: inline-block; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; background-color: #eef2ff; color: var(--primary); align-self: flex-start; }

.btn-group { display: flex; gap: 10px; margin-top: 5px; }
.btn-open { background-color: var(--primary); color: white; border: none; padding: 10px; border-radius: 8px; font-weight: bold; flex: 1; cursor: pointer; }
.btn-delete { background-color: white; color: var(--danger); border: 1px solid var(--danger); padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; }

/* Modals */
.modal {
  display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); justify-content: center; align-items: center; z-index: 3000; padding: 15px; box-sizing: border-box;
}
.modal-content {
  background-color: white; padding: 25px; border-radius: 12px; width: 100%; max-width: 350px; text-align: left; box-shadow: 0 5px 15px rgba(0,0,0,0.3); max-height: 90vh; overflow-y: auto;
}
.input-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 15px; }
.input-group label { font-size: 14px; font-weight: bold; color: #555; }
.input-group input[type="text"], .input-group input[type="file"], .input-group textarea { padding: 12px; border: 2px solid #e9ecef; border-radius: 8px; font-size: 15px; width: 100%; box-sizing: border-box; font-family: inherit; }

.checkbox-group { display: flex; flex-direction: column; gap: 10px; background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #e9ecef; }
.checkbox-label { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: normal; color: #333; cursor: pointer; }
.checkbox-label input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; margin: 0; }

.btn-esegui { background-color: var(--success); color: white; border: none; padding: 14px; font-size: 16px; font-weight: bold; border-radius: 10px; cursor: pointer; width: 100%; margin-top: 10px; margin-bottom: 10px; }
.btn-chiudi { background-color: #6c757d; color: white; border: none; padding: 12px; font-size: 16px; font-weight: bold; border-radius: 10px; cursor: pointer; width: 100%; text-align: center; }

/* Flatpickr internal overrides */
:deep(.flatpickr-input) { background-color: #fff !important; cursor: pointer !important; }
</style>

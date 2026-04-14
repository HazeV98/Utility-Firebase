<template>
  <div class="bacheca-turni-view">
    <AppHeader @openAuth="showAuth = true" @openProfile="showProfile = true" />

    <div class="content-area">
      <!-- STATO NON LOGGATO O INCOMPLETO -->
      <div v-if="!authStore.user" class="card" style="text-align: center;">
        <h3 style="color: var(--danger);">Accesso Richiesto</h3>
        <p style="color: #666; font-size: 15px; line-height: 1.5;">Per accedere alla bacheca scambi devi effettuare il login tramite la Home page.</p>
        <button class="btn btn-action" @click="$router.push('/')" style="background-color: var(--primary);">Torna alla Home</button>
      </div>

      <div v-else-if="!isProfileComplete" class="card" style="text-align: center;">
        <h3 style="color: var(--danger);">Profilo Incompleto</h3>
        <p style="color: #666; font-size: 15px; line-height: 1.5;">Devi completare tutti i dati del tuo profilo (Nome, Mansione, ecc.) per visualizzare e inserire annunci.</p>
        <button class="btn btn-action" @click="showProfile = true" style="background-color: var(--primary);">Completa Profilo</button>
      </div>

      <!-- BACHECA PRINCIPALE -->
      <div v-else class="view-main">
        <button class="btn btn-action" style="margin-top: 0; margin-bottom: 10px;" @click="apriModaleAnnuncio">+ Nuovo Scambio</button>
        
        <div class="card filters-card">
          <div style="display: flex; gap: 10px;">
            <div style="flex: 1;">
              <label>Filtra Mansione:</label>
              <select v-model="filtroMansione" class="input-field" @change="caricaBacheca">
                <option value="Tutte">Tutte le mansioni</option>
                <option value="Marinaio">Marinaio</option>
                <option value="Preposto al comando">Preposto al comando</option>
                <option value="Comandante">Comandante</option>
                <option value="Timoniere">Timoniere</option>
                <option value="Marinaio polivalente">Marinaio polivalente</option>
                <option value="Direttore di macchina">Direttore di macchina</option>
              </select>
            </div>
            <div style="flex: 1;">
              <label>Filtra Data:</label>
              <input type="date" v-model="filtroData" class="input-field" @change="caricaBacheca">
            </div>
          </div>
        </div>

        <!-- LISTA SUGGERITI -->
        <div v-if="suggeritiCount > 0" class="suggeriti-container">
          <div class="suggested-header">✨ Suggeriti per te (Offrono ciò che cerchi)</div>
          <div v-for="a in annunciSuggeriti" :key="a.id" class="card-suggested">
             <AnnuncioCard :annuncio="a" :isAdmin="isAdmin" :isMe="a.uid === authStore.user.uid" 
                           @delete="cancellaAnnuncio" @openImage="apriImmagineTurno" />
          </div>
        </div>

        <!-- LISTA NORMALE -->
        <div v-if="loadingBacheca" style="text-align: center; color: #666;">Caricamento annunci in corso...</div>
        <div v-else class="lista-annunci">
          <div v-if="annunciNormali.length === 0" style="text-align: center; color: #666; padding: 20px;">
            Nessun annuncio trovato per i filtri selezionati.
          </div>
          <div v-for="a in annunciNormali" :key="a.id" class="card">
             <AnnuncioCard :annuncio="a" :isAdmin="isAdmin" :isMe="a.uid === authStore.user.uid" 
                           @delete="cancellaAnnuncio" @openImage="apriImmagineTurno" />
          </div>
        </div>
      </div>
    </div>

    <!-- MODALE CREAZIONE ANNUNCIO -->
    <div v-if="modalAnnuncio" class="modal-overlay" @click.self="chiudiModaleAnnuncio">
      <div class="modal-content">
        <span class="close-btn" @click="chiudiModaleAnnuncio">&times;</span>
        <h3 style="margin-top: 5px; color: #32325d;">Crea Annuncio</h3>
        
        <div class="tabs">
          <button class="tab-btn" :class="{active: adType === 'turno'}" @click="adType = 'turno'">Cambio Turno</button>
          <button class="tab-btn" :class="{active: adType === 'riposo'}" @click="adType = 'riposo'">Cambio Riposo</button>
        </div>

        <div v-if="adType === 'turno'">
          <label class="form-label">Data del cambio:</label>
          <input type="date" v-model="formAd.dataTurno" class="input-field" @change="verificaTurno">
          
          <div style="display: flex; gap: 10px;">
            <div style="flex: 1;">
              <label class="form-label">Cedo:</label>
              <select v-model="formAd.cedoTurno" class="input-field">
                <option value="primo">Primo</option><option value="mezzo">Mezzo</option><option value="terzo">Terzo</option>
              </select>
            </div>
            <div style="flex: 1;">
              <label class="form-label">Cerco:</label>
              <select v-model="formAd.cercoTurno" class="input-field">
                <option value="primo">Primo</option><option value="mezzo">Mezzo</option><option value="terzo">Terzo</option>
              </select>
            </div>
          </div>

          <hr style="border: 0; border-top: 1px dashed #ccc; margin: 15px 0;">
          
          <label class="form-label" style="color: var(--primary);">Codice Turno Ceduto:</label>
          <input type="text" v-model="formAd.codiceTurno" class="input-field text-uppercase" placeholder="es. 1C01, 1B01 ecc..." @input="verificaTurno">
          
          <label class="form-label">Info Turno (Facoltativo):</label>
          <div style="display: flex; gap: 10px;">
            <input type="time" v-model="formAd.oraInizio" class="input-field" placeholder="Ora Inizio" style="flex:1;">
            <input type="text" v-model="formAd.luogoInizio" class="input-field" placeholder="Luogo Inizio" style="flex:2;">
          </div>
          <div style="display: flex; gap: 10px;">
            <input type="time" v-model="formAd.oraFine" class="input-field" placeholder="Ora Fine" style="flex:1;">
            <input type="text" v-model="formAd.luogoFine" class="input-field" placeholder="Luogo Fine" style="flex:2;">
          </div>
        </div>

        <div v-else>
          <label class="form-label">Cerco Riposo il giorno:</label>
          <input type="date" v-model="formAd.dataRiposo" class="input-field">
          
          <label class="form-label">Giorni in cui posso restituirlo (Facoltativo):</label>
          <input type="date" v-model="formAd.dataRestituzione1" class="input-field" style="margin-bottom: 5px;">
          <input type="date" v-model="formAd.dataRestituzione2" class="input-field">
          <p style="font-size: 10px; color: #999; margin-top: 0;">Puoi lasciare vuoto se vuoi concordarlo in chat.</p>
        </div>

        <button class="btn btn-action" :disabled="pubblicando" @click="pubblicaAnnuncio">
          {{ pubblicando ? '⏳ Pubblicazione...' : 'Pubblica Annuncio' }}
        </button>
      </div>
    </div>

    <!-- MODALE IMMAGINE PANZOOM -->
    <div v-if="imageModal" class="modal-overlay image-modal-overlay" @click.self="chiudiImmagine">
      <div class="close-btn-img" @click="chiudiImmagine">&times;</div>
      <div id="imageFlexContainer" class="image-flex-container">
        <img ref="imgRiferimento" :src="currentImagePath" @error="onErrorImmagine" class="panzoom-img">
        <div class="image-banner">⚠️ Controllare sempre i turni ufficiali e la presenza di eventuali varianti.</div>
      </div>
      <button @click="scaricaImmagine" class="btn-scarica">📥 Scarica</button>
    </div>

    <AuthModal :show="showAuth" @close="showAuth = false" />
    <ProfileModal :show="showProfile" @close="showProfile = false" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick, watch } from 'vue'
import AppHeader from '../components/layout/AppHeader.vue'
import AuthModal from '../components/modals/AuthModal.vue'
import ProfileModal from '../components/modals/ProfileModal.vue'
import AnnuncioCard from '../components/bacheca/AnnuncioCard.vue' 
import { useAuthStore } from '../stores/authStore.js'
import { db } from '../firebase'
import { collection, getDocs, query, where, addDoc, deleteDoc, doc } from 'firebase/firestore'
import Panzoom from '@panzoom/panzoom'

const authStore = useAuthStore()
const isAdmin = computed(() => localStorage.getItem('dev_mode_active') === 'true')

const isProfileComplete = computed(() => {
  const p = authStore.userProfile
  return p && p.nome && p.cognome && p.matricola && p.mansione && p.telefono
})

const showAuth = ref(false)
const showProfile = ref(false)

const filtroMansione = ref("Tutte")
const filtroData = ref("")

const loadingBacheca = ref(false)
const tuttiAnnunci = ref([])
const myAnnunciAttivi = ref([])
const annunciSuggeriti = ref([])
const annunciNormali = ref([])
const suggeritiCount = computed(() => annunciSuggeriti.value.length)

// Info Turni Logic
const LISTA_FILE_INFO = ["info_turni_2026-03-02.json", "info_turni_2026-03-28.json"]
const localDbCache = {}
let dbInUso = null
let dataAttivaDb = ""

const precaricaTuttiDB = async () => {
  for (let file of LISTA_FILE_INFO) {
    const match = file.match(/\d{4}-\d{2}-\d{2}/)
    const dataInizio = match ? match[0] : null
    if (dataInizio) {
      try {
        const res = await fetch(`/${file}?v=` + new Date().getTime())
        if (res.ok) localDbCache[dataInizio] = await res.json()
      } catch(e) { console.warn("Impossibile caricare " + file) }
    }
  }
}

const getOggiLocale = () => {
  const d = new Date()
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0')
}

const stringToNum = (s) => {
  if(!s) return 0
  let p = s.split('-')
  return Math.floor(Date.UTC(p[0], p[1]-1, p[2]) / 86400000)
}

const baseCodForImage = (codiceBase, dbObj, dateStr) => {
  if (!dbObj || !codiceBase) return codiceBase
  let codiciDaCercare = [codiceBase]
  
  let matchB = codiceBase.match(/^([1-9])B(\d{2})$/)
  if (matchB) {
    let linea = matchB[1]; let finale = matchB[2]
    let letteraPilota = (linea === '1' || linea === '2') ? 'C' : 'P'
    let regex = new RegExp(`^${linea}[A-Z]${finale}$`)
    let trovati = Object.keys(dbObj).filter(k => regex.test(k))
    if (trovati.length > 0) codiciDaCercare.push(...trovati)
    else codiciDaCercare.push(`${linea}${letteraPilota}${finale}`)
  } else {
    let match50 = codiceBase.match(/^([A-Z0-9]+?)(\d{2})$/)
    if (match50) {
      let pref = match50[1]; let num = parseInt(match50[2], 10)
      if (num >= 50) codiciDaCercare.push(pref + String(num - 50).padStart(2, '0'))
    }
  }

  let p = dateStr.split('-'); let dTarget = new Date(p[0], p[1]-1, p[2], 12,0,0)
  let targetDay = dTarget.getDay()
  targetDay = targetDay === 0 ? 7 : targetDay
  const dayMap = { "LUN": 1, "MAR": 2, "MER": 3, "GIO": 4, "VEN": 5, "SAB": 6, "DOM": 7 }

  for (let codCercato of codiciDaCercare) {
    let keys = Object.keys(dbObj).filter(k => k === codCercato || k.startsWith(codCercato + "_"))
    let exactMatch = null; let genericMatch = null
    for (let k of keys) {
      if (k === codCercato) { genericMatch = k; continue }
      let suffix = k.substring(codCercato.length + 1)
      if (suffix.includes("-")) {
        let parts = suffix.split("-")
        if (parts.length === 2 && dayMap[parts[0]] && dayMap[parts[1]]) {
          let start = dayMap[parts[0]]; let end = dayMap[parts[1]]
          if (start <= end) { if (targetDay >= start && targetDay <= end) exactMatch = k }
          else { if (targetDay >= start || targetDay <= end) exactMatch = k }
        }
      } else {
        if (dayMap[suffix] && dayMap[suffix] === targetDay) exactMatch = k
      }
    }
    if (exactMatch) return exactMatch
    if (genericMatch) return genericMatch
  }
  return codiceBase
}

const caricaDbCorrenteSincrono = (dateStr) => {
  const dateChiavi = Object.keys(localDbCache).sort()
  if (dateChiavi.length === 0) return null
  
  const dSelezionata = stringToNum(dateStr)
  let dataTrovata = dateChiavi[0]
  let dbTrovato = localDbCache[dataTrovata]

  for (let i = dateChiavi.length - 1; i >= 0; i--) { 
    if (dSelezionata >= stringToNum(dateChiavi[i])) { 
      dataTrovata = dateChiavi[i]
      dbTrovato = localDbCache[dateChiavi[i]]
      break
    } 
  }
  dbInUso = dbTrovato
  dataAttivaDb = dataTrovata
  return { db: dbTrovato, dataDb: dataTrovata }
}

const caricaBacheca = async () => {
  if (!authStore.user || !isProfileComplete.value) return
  loadingBacheca.value = true
  try {
    const today = getOggiLocale()
    let qBase = collection(db, "bacheca_turni")
    if (filtroMansione.value !== "Tutte") qBase = query(qBase, where("mansione", "==", filtroMansione.value))
    
    const snap = await getDocs(qBase)
    const allAds = []
    snap.forEach(d => {
      const a = d.data(); a.id = d.id
      if (a.data_scambio >= today) allAds.push(a)
      else deleteDoc(doc(db, "bacheca_turni", a.id)).catch(()=>{})
    })

    if (filtroData.value) {
      tuttiAnnunci.value = allAds.filter(a => a.data_scambio === filtroData.value)
    } else {
      tuttiAnnunci.value = allAds
    }
    tuttiAnnunci.value.sort((a,b) => a.data_scambio.localeCompare(b.data_scambio))

    myAnnunciAttivi.value = allAds.filter(a => a.uid === authStore.user.uid)

    annunciSuggeriti.value = []
    annunciNormali.value = []

    tuttiAnnunci.value.forEach(a => {
      const isMe = a.uid === authStore.user.uid
      let isSuggested = false
      if (!isMe) {
        isSuggested = myAnnunciAttivi.value.some(mio => mio.data_scambio === a.data_scambio && mio.cerco === a.cedo)
      }
      if (isSuggested) annunciSuggeriti.value.push(a)
      else annunciNormali.value.push(a)
    })

  } catch(e) { console.error(e) }
  loadingBacheca.value = false
}

// Modale e nuovo annuncio
const modalAnnuncio = ref(false)
const adType = ref('turno')
const pubblicando = ref(false)

const formAd = reactive({
  dataTurno: '', cedoTurno: 'primo', cercoTurno: 'primo', codiceTurno: '',
  oraInizio: '', oraFine: '', luogoInizio: '', luogoFine: '', chiaveEsatta: '', dataAttivaDb: '',
  dataRiposo: '', dataRestituzione1: '', dataRestituzione2: ''
})

const apriModaleAnnuncio = () => {
  if (!authStore.userProfile) return
  filtroMansione.value = authStore.userProfile.mansione || "Tutte"
  adType.value = 'turno'
  formAd.dataTurno = getOggiLocale()
  formAd.codiceTurno = ''; formAd.dataRiposo = ''; formAd.dataRestituzione1 = ''; formAd.dataRestituzione2 = ''
  verificaTurno()
  modalAnnuncio.value = true
}

const chiudiModaleAnnuncio = () => { modalAnnuncio.value = false }

const verificaTurno = () => {
  let dateStr = formAd.dataTurno || getOggiLocale()
  caricaDbCorrenteSincrono(dateStr)

  const codBase = formAd.codiceTurno.toUpperCase().trim()
  if (!codBase || !dbInUso) {
    formAd.oraInizio=''; formAd.oraFine=''; formAd.luogoInizio=''; formAd.luogoFine=''; formAd.chiaveEsatta=''; return
  }

  const kTrovata = baseCodForImage(codBase, dbInUso, dateStr)
  const det = dbInUso[kTrovata]
  if (det) {
    formAd.oraInizio = det.inizio ? det.inizio.replace('.',':') : ''
    formAd.oraFine = det.fine ? det.fine.replace('.',':') : ''
    formAd.luogoInizio = det.luogoInizio || ''
    formAd.luogoFine = det.luogoFine || ''
    formAd.chiaveEsatta = kTrovata
    formAd.dataAttivaDb = dataAttivaDb
  } else {
    formAd.oraInizio=''; formAd.oraFine=''; formAd.luogoInizio=''; formAd.luogoFine=''; formAd.chiaveEsatta=''
  }
}

const pubblicaAnnuncio = async () => {
  if (!authStore.userProfile) return
  const payload = {
    uid: authStore.user.uid,
    nome: authStore.userProfile.nome, cognome: authStore.userProfile.cognome,
    mansione: authStore.userProfile.mansione, matricola: authStore.userProfile.matricola, telefono: authStore.userProfile.telefono,
    timestamp: Date.now(), tipo_annuncio: adType.value
  }

  if (adType.value === 'turno') {
    if (!formAd.dataTurno) return alert("Inserisci la data")
    if (!formAd.codiceTurno.trim()) return alert("Inserisci codice turno ceduto")
    payload.data_scambio = formAd.dataTurno
    payload.cerco = formAd.cercoTurno
    payload.cedo = formAd.cedoTurno
    payload.codice_turno = formAd.codiceTurno.toUpperCase().trim()
    payload.ora_inizio = formAd.oraInizio; payload.ora_fine = formAd.oraFine
    payload.luogo_inizio = formAd.luogoInizio; payload.luogo_fine = formAd.luogoFine
    payload.chiave_esatta = formAd.chiaveEsatta; payload.data_attiva_db = formAd.dataAttivaDb
  } else {
    if (!formAd.dataRiposo) return alert("Inserisci data riposo")
    payload.data_scambio = formAd.dataRiposo; payload.cerco = 'riposo'; payload.cedo = 'riposo'
    let res = []
    if (formAd.dataRestituzione1) res.push(formAd.dataRestituzione1)
    if (formAd.dataRestituzione2) res.push(formAd.dataRestituzione2)
    payload.restituzione = res
  }

  pubblicando.value = true
  try {
    await addDoc(collection(db, "bacheca_turni"), payload)
    chiudiModaleAnnuncio()
    caricaBacheca()
  } catch(e) { alert("Errore") } finally { pubblicando.value = false }
}

const cancellaAnnuncio = async (id) => {
  if(confirm("Vuoi eliminare questo annuncio?")) {
    await deleteDoc(doc(db, "bacheca_turni", id))
    caricaBacheca()
  }
}

// Immagine Viewer Panzoom
const imageModal = ref(false)
const imgRiferimento = ref(null)
const currentImagePath = ref('')
let imgBaseFallback = ''
let pzInstance = null

const apriImmagineTurno = async (codiceTurno, dataScambio) => {
  let codicePulito = codiceTurno.toUpperCase().trim()
  caricaDbCorrenteSincrono(dataScambio)

  let dataAttiva = dataAttivaDb || "2026-03-02"
  let chiaveTrovata = baseCodForImage(codicePulito, dbInUso, dataScambio)

  if (chiaveTrovata && chiaveTrovata !== codicePulito && dbInUso && dbInUso[chiaveTrovata]) { 
    currentImagePath.value = `/turni_${dataAttiva}/${chiaveTrovata}.jpg`
    imgBaseFallback = `/turni_${dataAttiva}/${codicePulito}.jpg`
  } else { 
    currentImagePath.value = `/turni_${dataAttiva}/${codicePulito}.jpg`
    imgBaseFallback = ""
  }
  
  imageModal.value = true
  await nextTick()
  if (!pzInstance && imgRiferimento.value) {
    pzInstance = Panzoom(imgRiferimento.value, { maxScale: 5, minScale: 1 })
    document.getElementById('imageFlexContainer').addEventListener('wheel', pzInstance.zoomWithWheel)
  } else if (pzInstance) {
    pzInstance.reset()
  }
}

const onErrorImmagine = () => {
  if (imgBaseFallback) {
    currentImagePath.value = imgBaseFallback
    imgBaseFallback = ''
  } else {
    alert("L'immagine del turno non è stata trovata.")
    chiudiImmagine()
  }
}

const chiudiImmagine = () => {
  imageModal.value = false
  currentImagePath.value = ''
  if(pzInstance) { pzInstance.reset() }
}
const scaricaImmagine = () => {
  if (!currentImagePath.value) return
  const a = document.createElement('a')
  a.href = currentImagePath.value
  a.download = currentImagePath.value.split('/').pop()
  a.click()
}

onMounted(async () => {
  await precaricaTuttiDB()
  if(authStore.userProfile) {
    filtroMansione.value = authStore.userProfile.mansione || "Tutte"
  }
  watch(() => authStore.userProfile, (nv) => {
    if(nv && filtroMansione.value === 'Tutte') filtroMansione.value = nv.mansione || 'Tutte'
    caricaBacheca()
  }, {immediate: true})
})
</script>

<style scoped>
.bacheca-turni-view { display: flex; flex-direction: column; align-items: center; width: 100%; }
.content-area { width: 100%; max-width: 400px; padding: 0 20px 40px 20px; box-sizing: border-box; }
.view-main { display: flex; flex-direction: column; gap: 15px; }

.card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); margin-bottom: 15px; }
.card-suggested { background: #fffff8; border: 2px solid var(--warning); padding: 15px; border-radius: 12px; margin-bottom: 15px; position: relative;}
.card-suggested::before { content: "✨ MATCH PERFETTO"; position: absolute; top: -10px; right: 15px; background: var(--warning); color: #fff; font-size: 10px; font-weight: bold; padding: 3px 8px; border-radius: 10px; }

.btn-action { background-color: var(--success); color: white; border: none; padding: 15px; font-size: 16px; font-weight: bold; border-radius: 10px; cursor: pointer; width: 100%; transition: opacity 0.2s; }
.filters-card { padding: 15px; }
.input-field { width: 100%; padding: 12px; margin-bottom: 10px; border: 2px solid #e9ecef; border-radius: 8px; box-sizing: border-box; font-size: 14px; font-family: inherit; background-color: white;}
.text-uppercase { text-transform: uppercase; }
.form-label { font-size: 11px; font-weight: bold; color: #666; margin-bottom: 4px; display: block; }
.suggested-header { font-size: 14px; font-weight: bold; color: #856404; margin-bottom: 10px;}

.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center; z-index: 5000; padding: 20px; box-sizing: border-box; backdrop-filter: blur(3px); }
.modal-content { background: white; padding: 25px; border-radius: 15px; width: 100%; max-width: 350px; position: relative; max-height: 90vh; overflow-y: auto;}
.close-btn { position: absolute; right: 15px; top: 10px; font-size: 28px; cursor: pointer; color: var(--text-muted); }

.tabs { display: flex; background: #e9ecef; border-radius: 10px; overflow: hidden; margin-bottom: 15px; margin-top: 15px;}
.tab-btn { flex: 1; padding: 12px; text-align: center; font-weight: bold; color: #666; cursor: pointer; background: transparent; border: none; }
.tab-btn.active { background: var(--primary); color: white; }

.image-modal-overlay { z-index: 10000; background: rgba(0,0,0,0.8); }
.close-btn-img { position: absolute; top: calc(20px + env(safe-area-inset-top)); right: 20px; font-size: 35px; color: white; cursor: pointer; z-index: 10001; }
.image-flex-container { display:flex; flex-direction: column; justify-content:center; align-items:center; height:100%; width: 100%; position: relative; }
.panzoom-img { max-width: 100%; max-height: 70vh; border-radius: 12px; object-fit: contain; }
.image-banner { position: relative; z-index: 10001; margin-top: 15px; background: rgba(0,0,0,0.7); color: #fff; padding: 10px 20px; border-radius: 12px; font-size: 13px; text-align: center; max-width: 90%; }
.btn-scarica { position: absolute; bottom: calc(30px + env(safe-area-inset-bottom)); background: #11cdef; color: white; border: none; padding: 12px 24px; border-radius: 20px; font-weight: bold; font-size: 16px; cursor: pointer; z-index: 10001; }
</style>

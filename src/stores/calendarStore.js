import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import { useAuthStore } from './authStore.js'
import { db, doc, setDoc, getDoc } from '../firebase/index.js'
import {
  calcolaTurni as engineCalcolaTurni,
  stringToNum, dateToLocalISO, creaDataSicura, estraiDataDaNome,
  isGiornoRiposo, isGiornoRiposoBase, getRotazionePerData,
  trovaDataCambioProssimo, trovaChiaveEsatta, getOptionsTurni as engineGetOptions,
  formattaData
} from '../utils/calendarEngine.js'

// --- CONFIGURATION CONSTANTS (loaded dynamically from JSON) ---
const VERSIONE_TURNI = "1.0.1"
const DATA_INIZIO_NUOVI_TURNI = "2026-03-28"

const LISTA_FILE_INFO = ["info_turni_2026-03-02.json", "info_turni_2026-03-28.json"]
const LISTA_FILE_ROTAZIONI = ["rotazioni_2026-03-02.json", "rotazioni_2026-03-28.json"]
const LISTA_FILE_DISP = ["turni_disp_2026-03-02.json", "turni_disp_2026-03-28.json"]

const RESET_DOPO_AGGIORNAMENTO = {
  rot_fnove: false, spez_fnove: false, rot_proma: true, spez_proma: false,
  rot_szaccaria: false, spez_szaccaria: false, rot_lido: false, spez_lido: false,
  rot_linea14: false, rot_linea14_mb: true, rot_linea13: false, rot_17sn: false,
  rot_17tr: false, rot_linea12: true, tc_spez_fnove: false, tc_spez_szaccaria: false,
  tc_spez_lido: false, tc_rot_17sn: false, tc_rot_17tr: false
}

function getDefaultState() {
  return {
    version: "0",
    variazioni: {},
    colori: {},
    nebbia: {},
    straordinario: {},
    sospesoRiposo: {},
    note: {},
    buonoPasto: {},
    permessoSP: {},
    setupStep: 0,
    dbCache: {},
    rotCache: {},
    dispCache: {},
    ferie: {},
    coloriRotazione: {},
    depositoAttivo: null,
    riposoStart: null,
    rotazioneStart: null,
    turnoIndex: null,
    tcPattern: null,
    history: null,
    futureConfig: null,
    baseDataFutura: null
  }
}

export const useCalendarStore = defineStore('calendar', () => {
  const authStore = useAuthStore()

  // --- STATE ---
  const state = reactive(getDefaultState())
  const isLoaded = ref(false)

  // Externally loaded data
  const ROT_FERIE_INV = ref([])
  const ROT_FERIE_EST = ref([])
  let VERSIONE_FERIE = "1.0.0"
  const variantiData = ref({})

  // --- COMPUTED ---
  const needsSetup = computed(() => !state.depositoAttivo)
  const needsUpdate = computed(() => state.depositoAttivo && state.version !== VERSIONE_TURNI)
  const isConfigured = computed(() => state.depositoAttivo && state.version === VERSIONE_TURNI && state.setupStep >= 3)

  // --- LOAD STATE ---
  function loadFromLocal() {
    const saved = JSON.parse(localStorage.getItem('myTurniApp'))
    if (saved) {
      Object.assign(state, getDefaultState(), saved)
    }
    // Ensure all sub-objects exist
    if (!state.colori) state.colori = {}
    if (!state.nebbia) state.nebbia = {}
    if (!state.straordinario) state.straordinario = {}
    if (!state.sospesoRiposo) state.sospesoRiposo = {}
    if (!state.note) state.note = {}
    if (!state.buonoPasto) state.buonoPasto = {}
    if (!state.permessoSP) state.permessoSP = {}
    if (!state.dispCache) state.dispCache = {}
    if (!state.coloriRotazione) state.coloriRotazione = {}
    if (!state.variazioni) state.variazioni = {}
    if (!state.ferie) state.ferie = {}
  }

  function salvaLocal() {
    state.lastUpdate = new Date().getTime()
    let copiaDati = JSON.parse(JSON.stringify(state))
    delete copiaDati.dbCache
    delete copiaDati.rotCache
    delete copiaDati.dispCache
    localStorage.setItem('myTurniApp', JSON.stringify(copiaDati))

    // Cloud sync
    syncToCloud(copiaDati)
  }

  async function syncToCloud(dati) {
    if (authStore.user) {
      try {
        await setDoc(doc(db, "utenti", authStore.user.uid), { ...(dati || {}), calendarState: true }, { merge: true })
      } catch (e) {
        console.log("Cloud sync failed (offline?):", e)
      }
    }
  }

  async function syncFromCloud() {
    if (!authStore.user) return
    try {
      const docRef = doc(db, "utenti", authStore.user.uid)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        let datiCloud = docSnap.data()
        let cloudTime = datiCloud.lastUpdate || 0
        let localTime = state.lastUpdate || 0

        if (cloudTime >= localTime) {
          // Cloud is newer
          const cacheBackup = { dbCache: state.dbCache, rotCache: state.rotCache, dispCache: state.dispCache }
          Object.assign(state, getDefaultState(), datiCloud, cacheBackup)
          localStorage.setItem('myTurniApp', JSON.stringify(state))
        } else {
          // Local is newer, push to cloud
          let copiaDati = JSON.parse(JSON.stringify(state))
          delete copiaDati.dbCache; delete copiaDati.rotCache; delete copiaDati.dispCache
          syncToCloud(copiaDati)
        }
      }
    } catch (e) { console.error("Cloud sync error:", e) }
  }

  // --- EXTERNAL DATA LOADING ---
  async function caricaDatiEsterni() {
    try {
      const nocache = "?v=" + new Date().getTime()

      // Load Ferie Programmate
      try {
        const resFerie = await fetch("rotazione_ferie.json" + nocache)
        if (resFerie.ok) {
          const datiFerie = await resFerie.json()
          if (datiFerie.versione) VERSIONE_FERIE = datiFerie.versione
          if (datiFerie.invernali) ROT_FERIE_INV.value = datiFerie.invernali
          if (datiFerie.estive) ROT_FERIE_EST.value = datiFerie.estive
        }
      } catch (e) { console.error("Error loading ferie json", e) }

      // Load Varianti
      try {
        const resVar = await fetch("presenza_varianti.json" + nocache)
        if (resVar.ok) variantiData.value = await resVar.json()
      } catch (e) {}

      // Load DISP cache
      state.dispCache = {}
      for (let file of LISTA_FILE_DISP) {
        const dataInizio = estraiDataDaNome(file)
        if (dataInizio) {
          try {
            const res = await fetch(file + nocache)
            if (res.ok) state.dispCache[dataInizio] = await res.json()
          } catch (e) {}
        }
      }

      // Load Rotazioni cache
      state.rotCache = {}
      for (let file of LISTA_FILE_ROTAZIONI) {
        const dataInizio = estraiDataDaNome(file)
        if (dataInizio) {
          try {
            const res = await fetch(file + nocache)
            if (res.ok) state.rotCache[dataInizio] = await res.json()
          } catch (e) {}
        }
      }

      // Load Info Turni cache (DB)
      state.dbCache = {}
      for (let file of LISTA_FILE_INFO) {
        const dataInizio = estraiDataDaNome(file)
        if (dataInizio) {
          try {
            const res = await fetch(file + nocache)
            if (res.ok) state.dbCache[dataInizio] = await res.json()
          } catch (e) {}
        }
      }

      salvaLocal()
    } catch (e) {
      console.error("Error loading external data", e)
    }
  }

  // --- INITIALIZATION ---
  async function initialize() {
    loadFromLocal()
    await caricaDatiEsterni()

    // Check ferie versioning
    if (!state.ferie) {
      state.ferie = { version: VERSIONE_FERIE, scambi: {} }
    } else if (state.ferie.version !== VERSIONE_FERIE) {
      let avevaConfigurato = state.ferie.baseAnno !== undefined
      state.ferie = { version: VERSIONE_FERIE, scambi: {} }
      salvaLocal()
      if (avevaConfigurato) {
        alert("⚠️ Aggiornamento Rotazione Ferie: Le sequenze delle ferie programmate sono state modificate. È necessario reinserire il gruppo base e gli eventuali scambi.")
      }
    }

    // Cloud sync
    await syncFromCloud()

    isLoaded.value = true
  }

  // --- ACTIONS ---
  function calcolaTurniAction() {
    return engineCalcolaTurni(state, ROT_FERIE_EST.value, ROT_FERIE_INV.value, DATA_INIZIO_NUOVI_TURNI)
  }

  function getOptionsForSelect(tempRotDate) {
    return engineGetOptions(state, tempRotDate)
  }

  function isRiposo(dStr) {
    return isGiornoRiposo(dStr, state, DATA_INIZIO_NUOVI_TURNI)
  }

  // --- SETUP WIZARD ---
  function setDepot(depot) {
    state.depositoAttivo = depot
    state.setupStep = 1
    state.version = VERSIONE_TURNI
    salvaLocal()
  }

  function confermaRotazione() {
    if (!state.depositoAttivo) return

    if (state.version !== VERSIONE_TURNI) {
      state.history = {
        riposoStart: state.riposoStart,
        rotazioneStart: state.turnoIndex,
        depositoAttivo: state.depositoAttivo,
        tcPattern: state.tcPattern
      }
    }

    state.version = VERSIONE_TURNI

    if (!state.riposoStart || state.setupStep < 3) {
      salvaLocal()
    }
  }

  function confermaRiposoStart(dateStr) {
    state.riposoStart = dateStr

    if (state.depositoAttivo.startsWith('disp_')) {
      state.setupStep = 3
      salvaLocal()
      return 'done'
    } else if (state.depositoAttivo.startsWith('tc_')) {
      return 'tc_pattern'
    } else {
      return 'select_shift'
    }
  }

  function impostaTcPattern(pattern) {
    state.tcPattern = pattern
    state.turnoIndex = 0

    let d = creaDataSicura(state.riposoStart)
    d.setDate(d.getDate() + 1)
    state.rotazioneStart = dateToLocalISO(d)

    let dataFutura = trovaDataCambioProssimo(state.rotazioneStart, state)
    if (dataFutura) {
      state.futureConfig = {
        dataInizio: dataFutura,
        turnoIndex: 0,
        tcPattern: pattern
      }
    }

    state.setupStep = 3
    salvaLocal()
  }

  function setTurnoIndex(valStr, tempRotDate) {
    let isSkipDay = false
    if (valStr === "RIPOSO") {
      isSkipDay = true
    } else {
      const val = parseInt(valStr)
      if (isNaN(val)) return null
      const currentRotRules = getRotazionePerData(tempRotDate, state)
      if (currentRotRules && currentRotRules[state.depositoAttivo]) {
        if (currentRotRules[state.depositoAttivo][val] && currentRotRules[state.depositoAttivo][val].toUpperCase() === "DISP") {
          isSkipDay = true
        }
      }
    }

    if (isSkipDay) {
      // Skip to next non-rest day
      let d = creaDataSicura(tempRotDate)
      d.setDate(d.getDate() + 1)
      let dStr = dateToLocalISO(d)
      while (isRiposo(dStr)) {
        d.setDate(d.getDate() + 1)
        dStr = dateToLocalISO(d)
      }
      return { action: 'skip', nextDate: dStr }
    }

    const val = parseInt(valStr)
    if (isNaN(val)) return null

    if (state.setupStep === 2) {
      state.turnoIndex = val
      state.rotazioneStart = tempRotDate
      let dataFutura = trovaDataCambioProssimo(tempRotDate, state)

      if (dataFutura) {
        state.setupStep = 4
        state.baseDataFutura = dataFutura
        let dFut = creaDataSicura(dataFutura)
        let dFutStr = dateToLocalISO(dFut)
        while (isRiposo(dFutStr)) {
          dFut.setDate(dFut.getDate() + 1)
          dFutStr = dateToLocalISO(dFut)
        }
        return { action: 'future', nextDate: dFutStr, dataFutura }
      }
    } else if (state.setupStep === 4) {
      state.futureConfig = { dataInizio: tempRotDate, turnoIndex: val }
    } else if (state.setupStep === 3) {
      state.turnoIndex = val
      state.rotazioneStart = tempRotDate
    }

    state.setupStep = 3
    salvaLocal()
    return { action: 'done' }
  }

  // --- DAY EDITING ---
  function salvaCambioSingolo(date, turno) {
    if (turno) state.variazioni[date] = turno
    salvaLocal()
  }

  function resetGiornoSingolo(date) {
    delete state.variazioni[date]
    delete state.colori[date]
    delete state.nebbia[date]
    delete state.straordinario[date]
    delete state.sospesoRiposo[date]
    delete state.note[date]
    delete state.buonoPasto[date]
    delete state.permessoSP[date]
    salvaLocal()
  }

  function salvaAltro(date, data) {
    if (data.sospesoRiposo) state.sospesoRiposo[date] = true; else delete state.sospesoRiposo[date]
    if (data.nebbia) state.nebbia[date] = true; else delete state.nebbia[date]
    if (data.buonoPasto) state.buonoPasto[date] = true; else delete state.buonoPasto[date]
    if (data.straordinario) state.straordinario[date] = data.straordinario; else delete state.straordinario[date]
    if (data.permessoSP) state.permessoSP[date] = data.permessoSP; else delete state.permessoSP[date]
    if (data.nota) state.note[date] = data.nota; else delete state.note[date]
    if (data.colore) state.colori[date] = data.colore; else delete state.colori[date]
    salvaLocal()
  }

  // --- MULTI EDIT ---
  function salvaModificaMultipla(startDate, endDate, turnoVal, escludiRiposi) {
    if (!startDate || !endDate) return false
    if (startDate > endDate) return false

    let currentDate = creaDataSicura(startDate)
    let endDateObj = creaDataSicura(endDate)

    while (currentDate <= endDateObj) {
      let dStr = dateToLocalISO(currentDate)
      let saltaGiorno = false
      if (escludiRiposi) {
        let varCorrente = state.variazioni[dStr]
        let eRiposoManual = (varCorrente === "RI" || varCorrente === "RIPOSO" || varCorrente === "AL")
        let eRiposoStrutturale = (!varCorrente && isRiposo(dStr))
        if (eRiposoManual || eRiposoStrutturale) saltaGiorno = true
      }
      if (!saltaGiorno) {
        if (!turnoVal) { delete state.variazioni[dStr] }
        else { state.variazioni[dStr] = turnoVal }
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }

    salvaLocal()
    return true
  }

  // --- COLORI ROTAZIONE ---
  function salvaColoriRotazione(coloriMap) {
    state.coloriRotazione = { ...coloriMap }
    salvaLocal()
  }

  // --- FERIE ---
  function salvaFerie(annoBase, baseEstiva, baseInvernale, annoScambio, scambioEstiva, scambioInvernale) {
    if (!state.ferie) state.ferie = { version: VERSIONE_FERIE, scambi: {} }
    state.ferie.version = VERSIONE_FERIE
    if (!annoBase) return false
    state.ferie.baseAnno = annoBase
    state.ferie.baseEstiva = baseEstiva
    state.ferie.baseInvernale = baseInvernale

    if (annoScambio) {
      let sEst = scambioEstiva
      let sInv = scambioInvernale
      if (sEst !== -1 || sInv !== -1) {
        if (!state.ferie.scambi) state.ferie.scambi = {}
        if (!state.ferie.scambi[annoScambio]) state.ferie.scambi[annoScambio] = {}
        if (sEst !== -1) state.ferie.scambi[annoScambio].estiva = sEst
        if (sInv !== -1) state.ferie.scambi[annoScambio].invernale = sInv
      }
    }

    salvaLocal()
    return true
  }

  function resetFerie() {
    state.ferie = { version: VERSIONE_FERIE, scambi: {} }
    salvaLocal()
  }

  // --- CAMBIO BIBBIA ---
  function confermaCambioBibbia() {
    state.depositoAttivo = null
    delete state.riposoStart
    delete state.rotazioneStart
    delete state.turnoIndex
    delete state.history
    delete state.futureConfig
    delete state.baseDataFutura
    delete state.tcPattern
    state.setupStep = 0
    salvaLocal()
  }

  // --- RESET ---
  function confermaReset() {
    localStorage.removeItem('myTurniApp')
    Object.assign(state, getDefaultState())
    salvaLocal()
  }

  // --- BACKUP ---
  function esportaBackup() {
    const data = localStorage.getItem('myTurniApp')
    if (!data) return
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `backup_turni_${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function importaBackup(fileContent) {
    try {
      let parsed = JSON.parse(fileContent)
      parsed.lastUpdate = new Date().getTime()
      localStorage.setItem('myTurniApp', JSON.stringify(parsed))
      loadFromLocal()
      salvaLocal()
      return true
    } catch (err) {
      return false
    }
  }

  // --- PDF BIBBIA SYNC ---
  function applicaModifichePdf(changes) {
    let applicate = 0
    changes.forEach(change => {
      if (change.checked) {
        state.variazioni[change.date] = change.newShift
        applicate++
      }
    })
    salvaLocal()
    return applicate
  }

  // --- HELPERS ---
  function getDbCorrentePerData(dateStr) {
    const dateChiavi = Object.keys(state.dbCache || {}).sort()
    let dbCorrente = {}
    let dataAttiva = dateChiavi[0] || "2026-03-02"
    const dSel = stringToNum(dateStr)
    for (let i = dateChiavi.length - 1; i >= 0; i--) {
      if (dSel >= stringToNum(dateChiavi[i])) {
        dbCorrente = state.dbCache[dateChiavi[i]]
        dataAttiva = dateChiavi[i]
        break
      }
    }
    return { dbCorrente, dataAttiva }
  }

  // Handle update flow upon version mismatch
  function getUpdateAction() {
    if (!state.depositoAttivo) return 'welcome'
    if (state.version !== VERSIONE_TURNI) {
      const deveResettare = RESET_DOPO_AGGIORNAMENTO[state.depositoAttivo] !== false
      if (state.depositoAttivo.startsWith('disp_') || !deveResettare) {
        state.version = VERSIONE_TURNI
        salvaLocal()
        return 'ready'
      } else {
        return 'update'
      }
    }
    return 'ready'
  }

  function getUpdateText() {
    const dataLimiteObj = new Date(DATA_INIZIO_NUOVI_TURNI)
    const dataMenoUnoObj = new Date(dataLimiteObj)
    dataMenoUnoObj.setDate(dataMenoUnoObj.getDate() - 1)
    return `Il calendario rimarrà invariato fino al ${formattaData(dataMenoUnoObj.toISOString().split('T')[0])}. Dal ${formattaData(DATA_INIZIO_NUOVI_TURNI)} inizierà la nuova rotazione.`
  }

  return {
    state,
    isLoaded,
    ROT_FERIE_INV,
    ROT_FERIE_EST,
    variantiData,
    needsSetup,
    needsUpdate,
    isConfigured,
    DATA_INIZIO_NUOVI_TURNI,
    VERSIONE_TURNI,

    initialize,
    calcolaTurniAction,
    getOptionsForSelect,
    isRiposo,

    setDepot,
    confermaRotazione,
    confermaRiposoStart,
    impostaTcPattern,
    setTurnoIndex,

    salvaCambioSingolo,
    resetGiornoSingolo,
    salvaAltro,
    salvaModificaMultipla,
    salvaColoriRotazione,
    salvaFerie,
    resetFerie,
    confermaCambioBibbia,
    confermaReset,
    esportaBackup,
    importaBackup,
    applicaModifichePdf,
    getDbCorrentePerData,
    getUpdateAction,
    getUpdateText,
    salvaLocal
  }
})

<template>
  <div class="buoni-view">
    <AppHeader @openAuth="showAuth = true" @openProfile="showProfile = true" />

    <div class="content-area">
      <!-- COUNTER -->
      <div class="counter-container">
        <button class="btn-counter btn-minus" @click="modificaBuoni(-1)">-</button>
        <div class="count-display">{{ buoniAttuali }}</div>
        <button class="btn-counter btn-plus" @click="modificaBuoni(1)">+</button>
      </div>

      <!-- QUICK ACTIONS -->
      <div class="quick-actions">
        <button class="btn-quick" @click="modificaBuoni(-quickVals[0])">-{{ quickVals[0] }}</button>
        <button class="btn-quick" @click="modificaBuoni(-quickVals[1])">-{{ quickVals[1] }}</button>
        <button class="btn-quick" @click="modificaBuoni(-quickVals[2])">-{{ quickVals[2] }}</button>
        <button class="settings-btn" @click="apriImpostazioni">⚙️</button>
      </div>

      <!-- INTEGRATION TOGGLE -->
      <div class="integration-box">
        <div style="text-align: left; flex-grow: 1;">
          <div style="font-weight: bold; color: var(--primary); font-size: 16px;">Integrazione Calendario</div>
          <div style="font-size: 12px; color: #666; margin-top: 4px;">Calcola i buoni in automatico</div>
        </div>
        <label class="switch">
          <input type="checkbox" v-model="integrazioneAttiva" @change="gestisciToggleIntegrazione">
          <span class="slider"></span>
        </label>
      </div>

      <!-- INFO BANNER -->
      <div class="info-banner">
        ℹ️ <strong>Nota Bene:</strong> I buoni pasto non maturano in presenza di Riposi (<strong>RI, AL</strong>), Ferie (<strong>FER, FEP, FES</strong>), Malattia (<strong>KMAL</strong>) o permessi vari (<strong>PRT, KNOP, AVIS, KINF</strong>).
      </div>

      <button class="btn-calc-main" @click="apriCalcolatore(false)">Calcolatore Buoni</button>

      <div class="disclaimer-banner">
        ⚠️ La responsabilità dell'inserimento e della verifica dei dati è unicamente dell'utente.
      </div>
    </div>

    <!-- MODALE IMPOSTAZIONI -->
    <div v-if="modalSettings" class="modal">
      <div class="modal-content">
        <h3>⚙️ Impostazioni Pulsanti</h3>
        <p class="instruction-text">Personalizza i valori da sottrarre con i 3 tondini rapidi.</p>
        <div class="input-group" style="flex-direction: row; gap: 10px;">
          <div style="flex: 1; text-align: center;">
            <label>Tasto 1</label>
            <input type="number" v-model.number="tempQuickVals[0]" style="text-align: center; font-weight: bold; color: var(--danger);">
          </div>
          <div style="flex: 1; text-align: center;">
            <label>Tasto 2</label>
            <input type="number" v-model.number="tempQuickVals[1]" style="text-align: center; font-weight: bold; color: var(--danger);">
          </div>
          <div style="flex: 1; text-align: center;">
            <label>Tasto 3</label>
            <input type="number" v-model.number="tempQuickVals[2]" style="text-align: center; font-weight: bold; color: var(--danger);">
          </div>
        </div>
        <button class="btn-esegui" @click="salvaImpostazioni">Salva Impostazioni</button>
        <button class="btn-chiudi" @click="modalSettings = false">Chiudi</button>
      </div>
    </div>

    <!-- MODALE WIZARD 1 -->
    <div v-if="wizardStep === 1" class="modal">
      <div class="modal-content">
        <h3>⚠️ Attenzione</h3>
        <p class="instruction-text">
          Attivando l'integrazione, l'app aggiungerà <b>automaticamente</b> i buoni pasto in base ai turni presenti nel tuo calendario.<br><br>
          Assicurati di aggiornare sempre il calendario inserendo <b>Ferie, Malattie, Sospesi Riposo, ecc.</b><br>Sei pronto per iniziare?
        </p>
        <button class="btn-esegui" @click="wizardStep = 2">Sì, continua</button>
        <button class="btn-chiudi" @click="chiudiWizard">Annulla</button>
      </div>
    </div>

    <!-- MODALE WIZARD 2 -->
    <div v-if="wizardStep === 2" class="modal">
      <div class="modal-content">
        <h3>Saldo Attuale</h3>
        <p class="instruction-text">Conosci già quanti buoni pasto hai a disposizione o vuoi calcolarlo ora?</p>
        
        <div v-if="!showInputSaldo">
          <button class="btn-esegui" @click="showInputSaldo = true">Sì, inserisco il numero</button>
          <button class="btn-outline" @click="passaACalcolatore">No, calcoliamolo</button>
        </div>
        <div v-else>
          <div class="input-group">
            <label>Inserisci i buoni a tua disposizione:</label>
            <input type="number" v-model.number="wizardBuoniManuali" style="font-size: 20px; text-align: center; font-weight: bold; color: var(--primary);">
          </div>
          <button class="btn-esegui" @click="salvaSaldoEAttiva">Salva e Attiva Integrazione</button>
        </div>
        <button class="btn-chiudi" @click="chiudiWizard">Annulla</button>
      </div>
    </div>

    <!-- MODALE CALCOLATORE -->
    <div v-if="modalCalcolatore" class="modal">
      <div class="modal-content">
        <h3>Calcolatore Buoni</h3>
        <button class="btn-outline" @click="precompilaDaCalendario" style="font-size: 14px; padding: 10px; margin-bottom: 20px;">🪄 Precompila con dati Calendario</button>
        
        <div class="input-group">
          <label>Presenze mese corrente</label>
          <input type="number" v-model.number="calcPresCorrente">
          <label>Presenze mese passato</label>
          <input type="number" v-model.number="calcPresPassato">
          <label>Buoni caricati sulla tessera</label>
          <input type="number" v-model.number="calcBuoniTessera">
        </div>

        <button class="btn-esegui" @click="eseguiCalcolo">Calcola Risultato</button>
        
        <div v-if="calcolatoreDaWizard && calcRisultato !== null" style="margin-top: 10px;">
          <button class="btn-esegui" style="background-color: var(--primary);" @click="salvaCalcoloEAttiva">Salva e Attiva Integrazione</button>
        </div>
        
        <button class="btn-chiudi" @click="modalCalcolatore = false">Chiudi</button>
        <div class="risultato" v-if="calcRisultato !== null">Saldo: {{ calcRisultato }}</div>
      </div>
    </div>

    <AuthModal :show="showAuth" @close="showAuth = false" />
    <ProfileModal :show="showProfile" @close="showProfile = false" />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import AppHeader from '../components/layout/AppHeader.vue'
import AuthModal from '../components/modals/AuthModal.vue'
import ProfileModal from '../components/modals/ProfileModal.vue'
import { useAuthStore } from '../stores/authStore.js'
import { updateDoc, doc } from 'firebase/firestore'
import { db } from '../firebase'

const authStore = useAuthStore()

const showAuth = ref(false)
const showProfile = ref(false)

const DATA_INIZIO_NUOVI_TURNI = "2026-03-02"
const TURNI_ESCLUSI_FISSI = ["RI", "RIPOSO", "AL", "FER", "FEP", "FES", "FERIE", "PRT", "MAL", "MALATTIA", "KMAL", "KNOP", "AVIS", "KINF"]

let rotFerieInv = []
let rotFerieEst = []

// State
const buoniAttuali = ref(parseInt(localStorage.getItem('buoni_salvati')) || 0)
// For v-model we temporarily bind a local var, but the actual truth is managed intentionally
const integrazioneAttiva = ref(localStorage.getItem('buoni_integrazione_attiva') === 'true')
const quickVals = ref(JSON.parse(localStorage.getItem('buoni_quick_vals')) || [2, 5, 10])

// Modals State
const modalSettings = ref(false)
const tempQuickVals = ref([...quickVals.value])

const wizardStep = ref(0)
const showInputSaldo = ref(false)
const wizardBuoniManuali = ref(buoniAttuali.value)

const modalCalcolatore = ref(false)
const calcolatoreDaWizard = ref(false)
const calcPresCorrente = ref(0)
const calcPresPassato = ref(0)
const calcBuoniTessera = ref(0)
const calcRisultato = ref(null)

// Utilities
const formatStr = (d) => {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0')
}
const stringToNum = (s) => {
  if(!s) return 0;
  let p = s.split('-')
  return Math.floor(new Date(p[0], p[1]-1, p[2], 12, 0, 0).getTime() / 86400000)
}
const isDateInRange = (dStr, startStr, endStr, year) => {
  let d = new Date(year, parseInt(dStr.split('-')[1])-1, parseInt(dStr.split('-')[2]))
  let s = new Date(year, parseInt(startStr.split('-')[0])-1, parseInt(startStr.split('-')[1]))
  let e = new Date(year, parseInt(endStr.split('-')[0])-1, parseInt(endStr.split('-')[1]))
  return d >= s && d <= e
}

const getFerieGiorno = (dStr, state) => {
  if(!state.ferie || !state.ferie.baseAnno) return null
  let year = parseInt(dStr.split('-')[0])
  let r = []

  let iEst = state.ferie.baseEstiva
  if (iEst !== -1 && iEst !== null && iEst !== undefined && rotFerieEst.length > 0) {
    let idxEst = (iEst + (year - state.ferie.baseAnno)) % rotFerieEst.length
    if(idxEst < 0) idxEst += rotFerieEst.length
    if(state.ferie.scambi && state.ferie.scambi[year] && state.ferie.scambi[year].estiva !== undefined) {
      idxEst = state.ferie.scambi[year].estiva
    }
    let pEst = rotFerieEst[idxEst]
    if(pEst && isDateInRange(dStr, pEst.s, pEst.e, year)) r.push("FEP")
  }

  let iInv = state.ferie.baseInvernale
  if (iInv !== -1 && iInv !== null && iInv !== undefined && rotFerieInv.length > 0) {
    let idxInv = (iInv + (year - state.ferie.baseAnno)) % rotFerieInv.length
    if(idxInv < 0) idxInv += rotFerieInv.length
    if(state.ferie.scambi && state.ferie.scambi[year] && state.ferie.scambi[year].invernale !== undefined) {
      idxInv = state.ferie.scambi[year].invernale
    }
    let pInv = rotFerieInv[idxInv]
    if(pInv && isDateInRange(dStr, pInv.s, pInv.e, year)) r.push("FEP")
  }
  return r.length > 0 ? "FEP" : null
}

const isGiornoRiposoBase = (curr, cfg) => {
  if (!cfg || !cfg.riposoStart) return false
  let ref = stringToNum(cfg.riposoStart)
  if (cfg.depositoAttivo === 'disp_det') return (((curr - ref) % 6 + 6) % 6 === 0)
  let pos = ((curr - ref + 6) % 15 + 15) % 15
  return (pos === 6 || pos === 13 || pos === 14)
}

const isBuonoMaturato = (dStr, state, esclusiArray, ignoraUso = false) => {
  let isSospeso = state.sospesoRiposo && state.sospesoRiposo[dStr]
  let isBuonoUsato = state.buonoPasto && state.buonoPasto[dStr]
  if (!ignoraUso && isBuonoUsato) return false
  
  let turnoVal = (state.variazioni && state.variazioni[dStr]) ? state.variazioni[dStr].toUpperCase() : ""
  if (!turnoVal) {
    let ferieProg = getFerieGiorno(dStr, state)
    if (ferieProg) turnoVal = ferieProg
  }

  if (turnoVal) {
    if (esclusiArray.includes(turnoVal)) {
      if (isSospeso && (turnoVal === "RI" || turnoVal === "RIPOSO" || turnoVal === "AL" || turnoVal === "FER" || turnoVal === "FEP")) return true
      return false
    }
    return true
  }

  let cfg = (state.history && stringToNum(dStr) < stringToNum(DATA_INIZIO_NUOVI_TURNI)) ? state.history : state
  if (isGiornoRiposoBase(stringToNum(dStr), cfg)) {
    if (isSospeso) return true
    return false
  }
  return true
}

const syncToCloud = async () => {
  if (authStore.user) {
    try {
      const docRef = doc(db, 'utenti', authStore.user.uid)
      await updateDoc(docRef, {
        buoni_pasto_totali: buoniAttuali.value,
        buoni_integrazione: integrazioneAttiva.value
      })
    } catch(e) {
      console.warn("Could not sync to cloud, may not exist", e)
    }
  }
}

// Watch user profile to restore cloud synced variables!
watch(() => authStore.profile, (curr) => {
  if (curr && curr.buoni_pasto_totali !== undefined) {
    buoniAttuali.value = parseInt(curr.buoni_pasto_totali)
    integrazioneAttiva.value = curr.buoni_integrazione === true
    localStorage.setItem('buoni_salvati', buoniAttuali.value)
    localStorage.setItem('buoni_integrazione_attiva', integrazioneAttiva.value ? 'true' : 'false')
  } else {
    // Force sync local to cloud upon login if missing in cloud
    if (authStore.user && localStorage.getItem('buoni_salvati')) syncToCloud()
  }
}, { immediate: true })

const impostaSaldoDaInput = (inputValore) => {
  let state = JSON.parse(localStorage.getItem('myTurniApp')) || { variazioni: {} }
  let oggi = new Date()
  oggi.setHours(0,0,0,0)
  
  let thirtyDaysAgo = new Date(oggi)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  let thirtyDaysAgoStr = formatStr(thirtyDaysAgo)
  
  let maturatiUltimi30 = 0
  let d = new Date(thirtyDaysAgo)
  d.setDate(d.getDate() + 1)
  while(d <= oggi) {
    if (isBuonoMaturato(formatStr(d), state, TURNI_ESCLUSI_FISSI)) maturatiUltimi30++
    d.setDate(d.getDate() + 1)
  }
  
  let baseSaldo = inputValore - maturatiUltimi30
  localStorage.setItem('buoni_base_saldo', baseSaldo)
  localStorage.setItem('buoni_base_data', thirtyDaysAgoStr)
  localStorage.setItem('buoni_salvati', inputValore)
  
  buoniAttuali.value = inputValore
}

const sincronizzaBuoni = () => {
  let state = JSON.parse(localStorage.getItem('myTurniApp')) || { variazioni: {} }
  let oggi = new Date()
  oggi.setHours(0,0,0,0)
  
  let baseDataStr = localStorage.getItem('buoni_base_data')
  let baseSaldo = parseInt(localStorage.getItem('buoni_base_saldo'))
  
  if (!baseDataStr || isNaN(baseSaldo)) {
    impostaSaldoDaInput(buoniAttuali.value)
    baseDataStr = localStorage.getItem('buoni_base_data')
    baseSaldo = parseInt(localStorage.getItem('buoni_base_saldo'))
  }
  
  let p = baseDataStr.split('-')
  let baseDateObj = new Date(p[0], p[1]-1, p[2], 0,0,0)
  
  let thirtyDaysAgo = new Date(oggi)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  while (baseDateObj < thirtyDaysAgo) {
    baseDateObj.setDate(baseDateObj.getDate() + 1)
    if (isBuonoMaturato(formatStr(baseDateObj), state, TURNI_ESCLUSI_FISSI)) {
      baseSaldo++
    }
  }
  
  localStorage.setItem('buoni_base_data', formatStr(baseDateObj))
  localStorage.setItem('buoni_base_saldo', baseSaldo)
  
  let dinamici = 0
  let calcDate = new Date(baseDateObj)
  calcDate.setDate(calcDate.getDate() + 1)
  while (calcDate <= oggi) {
    if (isBuonoMaturato(formatStr(calcDate), state, TURNI_ESCLUSI_FISSI)) dinamici++
    calcDate.setDate(calcDate.getDate() + 1)
  }
  
  let tot = baseSaldo + dinamici
  buoniAttuali.value = tot < 0 ? 0 : tot
  localStorage.setItem('buoni_salvati', buoniAttuali.value)
  syncToCloud()
}

// Interaction Methods
const modificaBuoni = (valore) => {
  let tot = buoniAttuali.value + valore
  buoniAttuali.value = tot < 0 ? 0 : tot
  localStorage.setItem('buoni_salvati', buoniAttuali.value)
  if (integrazioneAttiva.value) impostaSaldoDaInput(buoniAttuali.value)
  syncToCloud()
}

const apriImpostazioni = () => {
  tempQuickVals.value = [...quickVals.value]
  modalSettings.value = true
}
const salvaImpostazioni = () => {
  quickVals.value = tempQuickVals.value.map(v => Math.abs(v) || 1)
  localStorage.setItem('buoni_quick_vals', JSON.stringify(quickVals.value))
  modalSettings.value = false
}

const gestisciToggleIntegrazione = () => {
  if (integrazioneAttiva.value) { // Use model turned it ON
    integrazioneAttiva.value = false // Revert till wizard completes
    wizardStep.value = 1
  } else {
    localStorage.setItem('buoni_integrazione_attiva', 'false')
    syncToCloud()
  }
}

const chiudiWizard = () => {
  wizardStep.value = 0
  showInputSaldo.value = false
  integrazioneAttiva.value = false
}

const salvaSaldoEAttiva = () => {
  if (!isNaN(wizardBuoniManuali.value) && wizardBuoniManuali.value >= 0) {
    impostaSaldoDaInput(wizardBuoniManuali.value)
    integrazioneAttiva.value = true
    localStorage.setItem('buoni_integrazione_attiva', 'true')
    syncToCloud()
    chiudiWizard()
  } else {
    alert("Inserisci un numero valido.")
  }
}

const passaACalcolatore = () => {
  chiudiWizard()
  apriCalcolatore(true)
}

const apriCalcolatore = (daWizard = false) => {
  calcolatoreDaWizard.value = daWizard
  calcRisultato.value = null
  modalCalcolatore.value = true
}

const eseguiCalcolo = () => {
  let res = calcPresCorrente.value + calcPresPassato.value + calcBuoniTessera.value - 62
  calcRisultato.value = res < 0 ? 0 : res
  buoniAttuali.value = calcRisultato.value
  if (!calcolatoreDaWizard.value) impostaSaldoDaInput(buoniAttuali.value)
}

const salvaCalcoloEAttiva = () => {
  impostaSaldoDaInput(buoniAttuali.value)
  integrazioneAttiva.value = true
  localStorage.setItem('buoni_integrazione_attiva', 'true')
  syncToCloud()
  modalCalcolatore.value = false
}

const precompilaDaCalendario = () => {
  let state = JSON.parse(localStorage.getItem('myTurniApp')) || { variazioni: {} }
  let oggi = new Date()
  let mCurr = oggi.getMonth(), yCurr = oggi.getFullYear()
  let mPast = mCurr - 1, yPast = yCurr
  if(mPast < 0) { mPast = 11; yPast-- }

  calcPresCorrente.value = calcolaPresenzeInMese(1, oggi.getDate(), mCurr, yCurr, state)
  let ultimiGiorniPassato = new Date(yPast, mPast+1, 0).getDate()
  calcPresPassato.value = calcolaPresenzeInMese(1, ultimiGiorniPassato, mPast, yPast, state)
  alert("Dati precompilati in base al calendario!")
}

const calcolaPresenzeInMese = (start, end, m, y, state) => {
  let count = 0
  for(let i=start; i<=end; i++) {
    let dStr = formatStr(new Date(y,m,i,0,0,0))
    if (isBuonoMaturato(dStr, state, TURNI_ESCLUSI_FISSI, true)) count++
  }
  return count
}

onMounted(async () => {
  try {
    const res = await fetch(`/rotazione_ferie.json?v=${new Date().getTime()}`)
    if(res.ok) {
      const data = await res.json()
      if(data.invernali) rotFerieInv = data.invernali
      if(data.estive) rotFerieEst = data.estive
    }
  } catch(e) { console.error(e) }
  
  if (integrazioneAttiva.value) {
    sincronizzaBuoni()
  }
})

</script>

<style scoped>
.buoni-view {
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
  align-items: center;
}
.counter-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 5px;
  width: 100%;
}
.btn-counter {
  background-color: var(--primary);
  color: white;
  border: none;
  font-size: 30px;
  font-weight: bold;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 6px rgba(0,0,0,0.2);
  transition: transform 0.2s;
}
.btn-counter:active { transform: scale(0.95); }
.count-display {
  font-size: 60px;
  font-weight: bold;
  color: var(--primary);
  min-width: 80px;
  text-align: center;
}
.quick-actions {
  display: flex;
  gap: 15px;
  width: 100%;
  justify-content: center;
  align-items: center;
  position: relative;
}
.btn-quick {
  background-color: white;
  color: var(--danger);
  border: 2px solid var(--danger);
  width: 55px; height: 55px;
  border-radius: 50%;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  box-shadow: 0 4px 6px rgba(0,0,0,0.08);
}
.btn-quick:active {
  background-color: var(--danger);
  color: white;
  transform: scale(0.90);
}
.settings-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #888;
  position: absolute;
  right: 10px;
  transition: transform 0.2s;
}
.settings-btn:active { transform: rotate(45deg); }

/* Switch style */
.integration-box {
  background: white;
  padding: 15px 20px;
  border-radius: var(--radius);
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  box-sizing: border-box;
}
.switch { position: relative; display: inline-block; width: 50px; height: 28px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 34px; }
.slider:before { position: absolute; content: ""; height: 20px; width: 20px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; }
input:checked + .slider { background-color: var(--success); }
input:checked + .slider:before { transform: translateX(22px); }

/* Banners */
.info-banner, .disclaimer-banner {
  padding: 12px 15px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.4;
  width: 100%;
  box-sizing: border-box;
}
.info-banner {
  background-color: #e9ecef;
  border-left: 4px solid var(--primary);
  color: #495057;
}
.disclaimer-banner {
  background-color: #fff3cd;
  border: 1px solid #ffeeba;
  color: #856404;
  text-align: center;
  border-radius: 12px;
}

.btn-calc-main {
  background-color: var(--primary);
  color: white;
  border: none;
  padding: 16px;
  font-size: 18px;
  font-weight: bold;
  border-radius: 12px;
  cursor: pointer;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  width: 100%;
}

/* Modals */
.modal {
  display: flex;
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background-color: rgba(0,0,0,0.5);
  justify-content: center; align-items: center;
  z-index: 3000; padding: 15px; box-sizing: border-box;
}
.modal-content {
  background-color: white;
  padding: 25px;
  border-radius: 12px;
  width: 100%; max-width: 350px;
  text-align: center;
  box-shadow: 0 5px 15px rgba(0,0,0,0.3);
  max-height: 90vh; overflow-y: auto;
}
.modal-content h3 { margin-top: 0; color: var(--primary); }
.instruction-text { font-size: 14px; color: #555; margin-bottom: 20px; line-height: 1.5; }
.input-group { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; text-align: left; }
.input-group label { font-size: 14px; font-weight: bold; color: #555; }
.input-group input { padding: 12px; border: 2px solid #e9ecef; border-radius: 8px; font-size: 16px; width: 100%; box-sizing: border-box; font-family: inherit; }

.btn-esegui { background-color: var(--success); color: white; border: none; padding: 14px; font-size: 16px; font-weight: bold; border-radius: 10px; cursor: pointer; width: 100%; margin-bottom: 10px; }
.btn-chiudi { background-color: #6c757d; color: white; border: none; padding: 12px; font-size: 16px; font-weight: bold; border-radius: 10px; cursor: pointer; width: 100%; margin-bottom: 10px;}
.btn-outline { background-color: white; color: var(--primary); border: 2px solid var(--primary); padding: 12px; font-size: 16px; font-weight: bold; border-radius: 10px; cursor: pointer; width: 100%; margin-bottom: 10px; }
.risultato { margin-top: 15px; font-size: 20px; font-weight: bold; color: var(--primary); }
</style>

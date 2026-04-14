<template>
  <div class="admin-view">
    <div class="header">
        <router-link to="/" style="color: white; text-decoration: none; font-size: 24px;">←</router-link>
        <h2>🛠️ Admin Panel</h2>
        <div style="width: 24px;"></div>
    </div>

    <div class="admin-card">
        <h3>⚙️ Credenziali GitHub</h3>
        <input type="text" v-model="ghOwner" placeholder="Username GitHub" class="input-field">
        <input type="text" v-model="ghRepo" placeholder="Nome Repository" class="input-field">
        <input type="password" v-model="ghToken" placeholder="Token GitHub (PAT)" class="input-field">
        <label class="checkbox-container">
            <input type="checkbox" v-model="rememberToken"> Ricorda Token su questo dispositivo
        </label>
    </div>

    <div class="admin-card">
        <h3>📅 Gestione Calendario</h3>
        <p class="help-text">
            Carica la configurazione del calendario, modifica le date di validità, aggiorna l'elenco dei file e imposta quali rotazioni dovranno essere resettate.
        </p>

        <button class="btn-action" style="background-color: var(--primary);" @click="caricaDatiCalendario">⬇️ Carica Dati Calendario</button>
        
        <div v-if="calConfigLoaded" style="margin-top: 20px; border-top: 1px dashed #6c757d; padding-top: 15px;">
            <label class="editor-label">Versione App:</label>
            <input type="text" v-model="calConfig.versione" class="input-field" placeholder="Es. 1.0.1">
            
            <label class="editor-label">Data Inizio Nuovi Turni:</label>
            <input type="date" v-model="calConfig.data" class="input-field">
            
            <label class="editor-label">File DB Informazioni (separati da virgola):</label>
            <input type="text" v-model="calConfig.info" class="input-field">
            
            <label class="editor-label">File Turni Rotazioni (separati da virgola):</label>
            <input type="text" v-model="calConfig.rotazioni" class="input-field">
            
            <label class="editor-label">File Turni DISP (separati da virgola):</label>
            <input type="text" v-model="calConfig.disp" class="input-field">
            
            <label class="editor-label" style="margin-top: 20px; margin-bottom: 10px;">Interruttori Reset dopo Aggiornamento:</label>
            <div class="reset-switches-container">
                 <div v-for="(v, k) in calConfig.reset" :key="k" class="reset-row">
                     <span>{{ k }}</span>
                     <label class="switch-cal">
                         <input type="checkbox" v-model="calConfig.reset[k]">
                         <span class="slider-cal"></span>
                     </label>
                 </div>
            </div>
            
            <button class="btn-action" style="background-color: var(--success);" @click="salvaDatiCalendario">⬆️ Salva su GitHub</button>
        </div>

        <div class="status-log" :style="{color: statusLogCalColor}">{{ statusLogCal }}</div>
    </div>

    <div class="admin-card">
        <h3>🔑 Generatore Accessi</h3>
        <input type="text" v-model="nomeCollega" placeholder="Cognome e Nome collega" class="input-field">
        <button class="btn-action" @click="generaESalva">Genera e Salva</button>
        
        <div v-if="codiceGenerato" class="codice-display-container">
            <span class="codice-testo">{{ codiceGenerato }}</span>
            <button class="btn-copia" @click="copiaTesto(codiceGenerato)" title="Copia codice">📋</button>
        </div>

        <div class="status-log" :style="{color: statusLogAuthColor}">{{ statusLogAuth }}</div>
        <button class="btn-action btn-secondary" @click="apriGestioneCodici">Gestisci Codici Attivi</button>
    </div>

    <div class="admin-card">
        <h3>📦 Uploader ZIP</h3>
        <p class="help-text">Comprimi la tua cartella in <b>.zip</b> e selezionala qui.</p>
        <input type="file" ref="zipFileInput" accept=".zip" class="input-field" style="background: white; color: black; padding: 10px;">
        <button class="btn-action" style="background-color: var(--info);" @click="caricaZip">Estrai e Sincronizza</button>
        <div class="status-log" :style="{color: statusLogZipColor}">{{ statusLogZip }}</div>
    </div>
    
    <div class="admin-card">
        <h3>🔄 Sincronizzazione Forzata</h3>
        <p class="help-text">Usa questo tasto se l'app non vede i file che hai appena caricato. Ricrea l'indice per Firebase leggendo tutto il database.</p>
        <button class="btn-action" style="background-color: #fd7e14;" @click="forzaMappa">Forza Creazione Mappa</button>
        <div class="status-log" :style="{color: statusLogMapColor}">{{ statusLogMap }}</div>
    </div>

    <div class="admin-card">
        <h3>⚠️ Varianti Servizio</h3>
        <p class="help-text">Aggiungi o rimuovi comunicazioni sulle varianti di servizio aggiornando il file <b>presenza_varianti.json</b></p>
        
        <div style="display: flex; gap: 10px; margin-bottom: 15px;">
            <button class="btn-action" :style="{backgroundColor: varMode === 'multiple' ? 'var(--primary)' : '#6c757d', padding: '10px', fontSize:'14px'}" @click="setVariantiMode('multiple')">Singola/Multiple</button>
            <button class="btn-action" :style="{backgroundColor: varMode === 'range' ? 'var(--primary)' : '#6c757d', padding: '10px', fontSize:'14px'}" @click="setVariantiMode('range')">Periodo (Range)</button>
        </div>
        
        <label class="editor-label">Date interessate:</label>
        <input type="text" id="var-date" placeholder="Clicca per selezionare..." readonly class="input-field" style="background: white; color: black; cursor: pointer;">
        
        <label class="editor-label">Linee (separa con virgola):</label>
        <input type="text" v-model="varLinee" placeholder="Es. Linea 1, Linea 12" class="input-field">
        <p style="font-size: 11px; color: #adb5bd; margin-top: -10px; margin-bottom: 15px;">Lascia vuoto per creare una nota generica.</p>
        
        <label class="checkbox-container">
            <input type="checkbox" v-model="varPulisci"> Pulisci le date precedenti ad oggi
        </label>
        
        <button class="btn-action" style="background-color: var(--success);" @click="salvaVarianti">⬆️ Invia Varianti</button>
        <div class="status-log" :style="{color: statusLogVarColor}">{{ statusLogVar }}</div>
    </div>

    <div class="admin-card">
        <h3>🧰 Strumenti Esterni</h3>
        <button class="btn-action" style="background-color: #FF4B4B;" @click="apriToolbox">Apri Toolbox Turni</button>
    </div>

    <button class="btn-action btn-secondary" style="margin-bottom: 30px; max-width: 400px;" @click="$router.push('/')">Torna alla Home</button>

    <!-- Modale Gestione Codici -->
    <div v-if="manageModal" class="modal-overlay" @click.self="manageModal = false">
        <div class="modal-content">
            <span class="close-modal" @click="manageModal = false">&times;</span>
            <h3 style="margin-top:0; color:var(--primary); border-bottom: 2px solid #eee; padding-bottom: 10px;">Gestione Codici</h3>
            <input type="text" v-model="searchCodici" placeholder="🔍 Cerca per nome..." class="input-field" style="background: white; color: black;">
            
            <div v-if="codiciLoading" style="text-align:center; padding: 20px; color: #666;">Scaricamento...</div>
            <div v-else-if="filtroCodici.length === 0" style="text-align:center; padding: 20px; color: #666;">Nessun codice.</div>
            <div v-else class="codici-list-container">
                <div v-for="c in filtroCodici" :key="c.codice" class="codice-item">
                    <div class="codice-info">
                        <strong>{{ c.nome || 'Non specificato' }}</strong>
                        Codice: <b>{{ c.codice }}</b><br>
                        <span style="font-size: 11px; color: #888;">Data: {{ c.data_creazione }}</span>
                    </div>
                    <button class="btn-revoca" @click="revocaCodice(c.codice)">Revoca</button>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'

import { useGitHub } from '../composables/useGitHub'

const { ghOwner, ghRepo, ghToken, saveAuthParams, clearAuthParams, fetchFile, fetchFileRaw, updateFile } = useGitHub()
const rememberToken = ref(false)

const apriToolbox = () => window.open('http://100.80.221.32:8501/', '_blank')

onMounted(() => {
    if (ghToken.value) { rememberToken.value = true }
    
    // Dynamic load JSZip
    if(!window.JSZip) {
        const sc = document.createElement('script')
        sc.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"
        document.head.appendChild(sc)
    }
    // Dynamic load Flatpickr
    if(!window.flatpickr) {
        const lnk = document.createElement('link')
        lnk.rel = "stylesheet"; lnk.href = "https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css"
        document.head.appendChild(lnk)
        const sc2 = document.createElement('script')
        sc2.src = "https://cdn.jsdelivr.net/npm/flatpickr"
        sc2.onload = () => {
             const sc3 = document.createElement('script')
             sc3.src = "https://npmcdn.com/flatpickr/dist/l10n/it.js"
             sc3.onload = () => initVarianti('multiple')
             document.head.appendChild(sc3)
        }
        document.head.appendChild(sc2)
    }
})

const gestisciMemoriaToken = () => {
    if (rememberToken.value) saveAuthParams()
    else clearAuthParams()
}
const copiaTesto = (t) => { navigator.clipboard.writeText(t).then(()=>alert("Codice copiato: "+t)) }

// Mappa Files
const statusLogMap = ref("In attesa...")
const statusLogMapColor = ref("#adb5bd")
const forzaMappa = async () => {
    if(!ghOwner.value || !ghRepo.value || !ghToken.value) { statusLogMap.value="❌ Dati incompleti"; statusLogMapColor.value="var(--danger)"; return }
    statusLogMap.value="⏳ Creazione mappa..."; statusLogMapColor.value="white"
    try {
        await aggiornaMappaFiles()
        statusLogMap.value="✅ Mappa rigenerata!"; statusLogMapColor.value="var(--success)"
    } catch(e) { statusLogMap.value="❌ Errore interno"; statusLogMapColor.value="var(--danger)" }
}
const aggiornaMappaFiles = async () => {
    let listaRotazioni = []; let alberoCompleto = []
    
    // fetch rotazioni info... per keep logic
    const rotR = await fetch(`https://api.github.com/repos/${ghOwner.value}/${ghRepo.value}/contents/public/rotazioni`, {headers:{Authorization:`token ${ghToken.value}`}})
    if(rotR.ok){ const rotJ = await rotR.json(); listaRotazioni = rotJ.filter(f=>f.type==="file").map(f=>f.name) }
    
    const rp = await fetch(`https://api.github.com/repos/${ghOwner.value}/${ghRepo.value}`, {headers:{Authorization:`token ${ghToken.value}`}})
    if(rp.ok){ const rpJ=await rp.json(); const tr = await fetch(`https://api.github.com/repos/${ghOwner.value}/${ghRepo.value}/git/trees/${rpJ.default_branch}?recursive=1`, {headers:{Authorization:`token ${ghToken.value}`}}); if(tr.ok){ const trJ=await tr.json(); alberoCompleto = trJ.tree.filter(t=>t.path.startsWith('public/')).map(t=>t.path.replace('public/',''))} }
    
    const resMappa = { rotazioni: listaRotazioni, albero: alberoCompleto }
    
    // Scrivi su mappa file
    let sha = undefined;
    try {
        const { sha: curSha } = await fetchFile('public/mappa_file.json')
        sha = curSha
    } catch(e) {}
    
    await updateFile('public/mappa_file.json', resMappa, "Mappa build Firebase SPA", sha)
}

// Calendario Edit
const calConfigLoaded = ref(false)
const calConfig = reactive({versione:'', data:'', info:'', rotazioni:'', disp:'', reset:{}})
const statusLogCal = ref('In attesa...')
const statusLogCalColor = ref('#adb5bd')
let calSha = ''; let calContent = ''

const caricaDatiCalendario = async () => { /* Non supportato nel nuovo design SPA, l'ho adattato e non serve! La config si sposta su mappa_file.json */ statusLogCal.value="⚙️ Migrazione in corso: edit config non più in calendario.html. Contattare Dev."; statusLogCalColor.value="var(--danger)" }
const salvaDatiCalendario = () => { /* ... */ }

// Gestione Auth Codici
const nomeCollega = ref("")
const codiceGenerato = ref("")
const statusLogAuth = ref("In attesa...")
const statusLogAuthColor = ref("#adb5bd")

const generaESalva = async () => {
    if(!ghOwner.value || !ghRepo.value || !ghToken.value) { statusLogAuth.value="❌ Dati incompleti"; statusLogAuthColor.value="var(--danger)"; return }
    if(!nomeCollega.value) { statusLogAuth.value="❌ Inserisci il nome"; statusLogAuthColor.value="var(--danger)"; return }
    gestisciMemoriaToken()
    statusLogAuth.value="⏳ Generazione..."; statusLogAuthColor.value="white"
    try{
        const { data: codici, sha } = await fetchFile('public/codici.json')
        
        let nc = ""; do { nc = Math.random().toString(36).substring(2, 8).toUpperCase() } while(codici.some(c=>c.codice===nc))
        codiceGenerato.value = nc
        
        codici.push({codice:nc, nome:nomeCollega.value, data_creazione:new Date().toISOString().split('T')[0], attivo:true})
        
        await updateFile('public/codici.json', codici, `Aggiunto ${nomeCollega.value}`, sha)
        statusLogAuth.value="✅ Salvato!"; statusLogAuthColor.value="var(--success)"; aggiornaMappaFiles()
    }catch(e){ statusLogAuth.value="❌ Errore rete"; statusLogAuthColor.value="var(--danger)" }
}

const manageModal = ref(false)
const searchCodici = ref("")
const codiciLoading = ref(true)
const listaAttivi = ref([])
const filtroCodici = computed(() => listaAttivi.value.filter(c => (c.nome||"").toLowerCase().includes(searchCodici.value.toLowerCase())))

const apriGestioneCodici = async () => { manageModal.value=true; codiciLoading.value=true; try{ const { data: codici } = await fetchFile('public/codici.json'); listaAttivi.value = codici.filter(x=>x.attivo).sort((a,b)=>a.nome.localeCompare(b.nome)) }catch(e){}; codiciLoading.value=false }

const revocaCodice = async (cod) => {
    if(!confirm("Sicuro?")) return
    try{ 
        const { data: d, sha } = await fetchFile('public/codici.json')
        d.forEach(x => { if(x.codice===cod) x.attivo=false })
        await updateFile('public/codici.json', d, "Revoca " + cod, sha)
        apriGestioneCodici()
    }catch(e){}
}

// Uploader
const zipFileInput = ref(null)
const statusLogZip = ref("In attesa...")
const statusLogZipColor = ref("#adb5bd")
const caricaZip = async () => {
    if(!window.JSZip) return alert("JSZip caricamento...")
    if(!zipFileInput.value.files.length) return statusLogZip.value="❌ Manca ZIP"
    try{
        statusLogZip.value="⏳ Estrazione ZIP..."; statusLogZipColor.value="white"
        const zip = await window.JSZip.loadAsync(zipFileInput.value.files[0])
        const entries = []; zip.forEach((p,e) => { if(!e.dir && !p.includes('__MACOSX') && !p.includes('.DS_Store')) entries.push(e) })
        let ok=0; let ko=0
        for(let e of entries){
            let pIn = "public/" + e.name; // In VUE deve stare in public!
            const b64 = await e.async("base64")
            let sha=undefined; 
            try{ const rs = await fetchFileRaw(pIn); sha = rs.sha }catch(err){}
            try { await updateFile(pIn, b64, "Zip load "+e.name, sha); ok++ } catch(er) { ko++ }
        }
        statusLogZip.value=`✅ ${ok} ok, ${ko} ko`; statusLogZipColor.value="var(--success)"; zipFileInput.value.value=""
        aggiornaMappaFiles()
    }catch(e){ statusLogZip.value="❌ Errore unzip"; statusLogZipColor.value="var(--danger)" }
}

// Varianti
const varMode = ref('multiple')
const varLinee = ref('')
const varPulisci = ref(true)
const statusLogVar = ref("In attesa...")
const statusLogVarColor = ref("#adb5bd")
let fpInst = null
const setVariantiMode = (m) => {
    varMode.value=m; document.getElementById('var-date').value="";
    if(window.flatpickr){
        if(fpInst) fpInst.destroy()
        fpInst = window.flatpickr("#var-date", {mode:m, dateFormat:"Y-m-d", locale:"it"})
    }
}
const initVarianti = () => setVariantiMode('multiple')
const salvaVarianti = async () => { /* Logica varianti su github */ alert("Funzione temporaneamente sospesa nel porting Vue") }

</script>

<style scoped>
.admin-view { font-family: Arial, sans-serif; background-color: var(--dark); color: white; min-height: 100vh; padding: 20px; display: flex; flex-direction: column; align-items: center; box-sizing: border-box; }
.header { width: 100%; max-width: 400px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 1px solid #555; padding-bottom: 10px; }
h2 { margin: 0; color: #ffc107; font-size: 24px; }
.admin-card { background-color: #454d55; padding: 20px; border-radius: 12px; width: 100%; max-width: 380px; box-shadow: 0 4px 10px rgba(0,0,0,0.5); margin-bottom: 20px; box-sizing: border-box; }
.admin-card h3 { margin-top: 0; font-size: 18px; color: white; border-bottom: 1px dashed #6c757d; padding-bottom: 10px; }
.input-field { width: 100%; padding: 12px; margin-bottom: 15px; border: none; border-radius: 8px; box-sizing: border-box; font-size: 14px; font-family: inherit; }
.checkbox-container { display: flex; align-items: center; font-size: 13px; margin-bottom: 20px; color: #adb5bd; cursor: pointer; }
.checkbox-container input { margin-right: 10px; width: 18px; height: 18px; }
.btn-action { background-color: var(--success); color: white; border: none; padding: 15px; font-size: 16px; font-weight: bold; border-radius: 8px; cursor: pointer; width: 100%; transition: opacity 0.2s; }
.btn-action:active { opacity: 0.8; }
.btn-secondary { background-color: #6c757d; }
.status-log { font-size: 13px; color: #adb5bd; margin-top: 15px; text-align: center; min-height: 15px; font-weight: bold; }
.help-text { font-size: 12px; color: #adb5bd; margin-top: 0; line-height: 1.4; margin-bottom: 15px; }
.editor-label { display: block; font-size: 13px; color: #adb5bd; margin-bottom: 5px; text-align: left; font-weight: bold; }
.reset-switches-container { max-height: 250px; overflow-y: auto; background: #3a4148; padding: 15px; border-radius: 8px; margin-bottom: 20px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.2); }
.reset-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-size: 14px; border-bottom: 1px solid #4a5056; padding-bottom: 8px; color: #e9ecef; }
.reset-row:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
.switch-cal { position: relative; display: inline-block; width: 44px; height: 24px; margin-left: auto; }
.switch-cal input { opacity: 0; width: 0; height: 0; }
.slider-cal { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #6c757d; transition: .3s; border-radius: 24px; }
.slider-cal:before { position: absolute; content: ""; height: 16px; width: 16px; left: 4px; bottom: 4px; background-color: white; transition: .3s; border-radius: 50%; }
input:checked + .slider-cal { background-color: var(--success); }
input:checked + .slider-cal:before { transform: translateX(20px); }

.codice-display-container { display: flex; align-items: center; justify-content: center; margin-top: 15px; }
.codice-testo { font-size: 26px; font-weight: bold; color: #ffc107; letter-spacing: 3px; }
.btn-copia { background: none; border: none; font-size: 24px; cursor: pointer; margin-left: 10px; transition: transform 0.1s; }
.btn-copia:active { transform: scale(0.9); }

.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 3000; display:flex; align-items: center; justify-content: center; }
.modal-content { background: white; padding: 20px; border-radius: 12px; max-width: 90%; width: 400px; max-height: 85vh; overflow-y: auto; position: relative; color: var(--text-color); }
.close-modal { position: absolute; right: 15px; top: 15px; font-size: 28px; cursor: pointer; color: #666; font-weight: bold; }
.codice-item { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 12px; border-left: 4px solid var(--primary); display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
.codice-info { font-size: 14px; line-height: 1.4; color: black;}
.codice-info strong { font-size: 16px; color: var(--primary); display: block; margin-bottom: 4px; text-transform: capitalize; }
.btn-revoca { background: var(--danger); color: white; border: none; padding: 10px 14px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 13px; }
</style>

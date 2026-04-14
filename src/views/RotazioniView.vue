<template>
  <div class="rotazioni-view">
    <AppHeader />

    <div v-if="!isAuth" class="auth-section card">
      <p>Area riservata. Inserisci il codice di accesso per visualizzare le rotazioni</p>
      <input type="text" v-model="accessCode" placeholder="Codice di accesso" maxlength="6" autocomplete="off" class="input-field text-center text-uppercase">
      <button class="btn btn-action" @click="verificaCodice" :disabled="authLoading">Accedi</button>
      <div class="error-msg" v-if="authError">{{ authError }}</div>

      <div class="support-section">
        <p style="font-size: 14px; margin-bottom: 5px;">Se non hai un codice di accesso contatta un amministratore tramite Telegram</p>
        <a href="http://t.me/MattiaB1058" target="_blank" class="telegram-icon">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="#0088cc"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.45c.538-.196 1.006.128.832.941z"/></svg>
        </a>
      </div>
    </div>

    <div v-else class="content-area">
      <div v-if="loading" class="status-message">Scansione rotazioni in corso...</div>
      <div v-else-if="rotazioniGroups.length === 0" class="status-message">Nessun documento trovato.</div>
      
      <div v-else>
         <div v-for="g in rotazioniGroups" :key="g.base" class="month-card">
            <h3>{{ pulisciNome(g.base) }}</h3>
            <div class="btn-grid">
               <div v-for="(data, rotName) in g.jsonData" :key="rotName" class="rot-container">
                  <h4>{{ rotName }}</h4>
                  <button class="file-btn btn-table" @click="apriTabella(rotName, data)">📅 Visualizza Tabella</button>
                  <button class="file-btn btn-search" @click="apriRicerca(rotName, data)">🔍 Cerca Colleghi e Cambi</button>
                  <button class="file-btn btn-search" @click="apriRicercaFutura(g.base, rotName, data)">🔮 Ricerca mesi successivi</button>
               </div>
               
               <button v-if="g.excel && !g.json" class="file-btn btn-search">🔍 Cerca (Solo su vecchie app)</button>
               <a v-if="g.pdf" :href="`/rotazioni/${g.pdf}`" target="_blank" class="file-btn btn-pdf">📄 Apri PDF Originale</a>
            </div>
         </div>
      </div>
    </div>

    <!-- Modale Ricerca (corrente) -->
    <div v-if="searchModal" class="modal-overlay" @click.self="searchModal = false">
       <div class="modal-content">
          <span class="close-btn" @click="searchModal = false">&times;</span>
          <h3 style="margin-top:0; color:var(--primary);">Ricerca Turni: {{ currentRotName }}</h3>
          
          <div class="modulo-ricerca">
              <h4>Cerca chi fa un turno</h4>
              <input type="number" v-model="cercaTurnoObj.giorno" min="1" max="31" placeholder="Giorno (Es. 15)" class="input-field">
              <input type="text" v-model="cercaTurnoObj.codice" placeholder="Turno (es. 1C01, 4P01...)" class="input-field text-uppercase">
              <button class="btn btn-action" @click="eseguiCercaTurno">Cerca</button>
              <div v-if="cercaTurnoRes" class="risultato-box" v-html="cercaTurnoRes"></div>
          </div>

          <div class="modulo-ricerca">
              <h4>Trova cambi turno (Riposi/Fasi)</h4>
              <input type="number" v-model="cercaCambioObj.giorno" min="1" max="31" placeholder="Giorno del mese (1-31)" class="input-field">
              <select v-model="cercaCambioObj.fase" class="input-field">
                  <option value="Terzo">Di Terzo</option>
                  <option value="Mezzo">Di Mezzo</option>
                  <option value="Primo">Di Primo</option>
                  <option value="Riposo">Di Riposo</option>
              </select>
              <button class="btn btn-action" @click="eseguiCercaCambio">Cerca</button>
              <div v-if="cercaCambioRes" class="risultato-box" v-html="cercaCambioRes"></div>
          </div>
       </div>
    </div>

    <!-- Modale Ricerca Futura -->
    <div v-if="futureModal" class="modal-overlay" @click.self="futureModal = false">
       <div class="modal-content">
          <span class="close-btn" @click="futureModal = false">&times;</span>
          <h3 style="margin-top:0; color:var(--primary);">Ricerca Mesi Successivi: {{ currentRotName }}</h3>
          
          <div class="modulo-ricerca">
              <label>Data:</label>
              <input type="date" v-model="futureForm.data" class="input-field">
              
              <label>Trova:</label>
              <select v-model="futureForm.fase" class="input-field">
                  <option value="Terzo">Di Terzo (1° o 2° Giorno)</option>
                  <option value="Mezzo">Di Mezzo (3° o 4° Giorno)</option>
                  <option value="Primo">Di Primo (5° o 6° Giorno)</option>
                  <option value="Riposo">Di Riposo (Singolo o Doppio)</option>
              </select>
              
              <button class="btn btn-action" @click="eseguiRicercaFutura" style="background-color: var(--success);">Cerca</button>
              <div v-if="futureRes" class="risultato-box" v-html="futureRes"></div>
          </div>
       </div>
    </div>

    <!-- Modale Tabella -->
    <div v-if="tableModal" class="modal-overlay" @click.self="tableModal = false">
       <div class="modal-content modal-table-content">
          <span class="close-btn" @click="tableModal = false">&times;</span>
          <h3 style="margin-top:0; color:var(--primary); padding-right: 30px;">{{ currentRotName }}</h3>
          
          <div class="table-responsive">
            <table class="rotazioni-table">
               <thead><tr><th>Colleghi</th><th v-for="i in 31" :key="i">{{ i }}</th></tr></thead>
               <tbody>
                  <tr v-for="c in currentTableData" :key="c.nome">
                     <td v-html="c.nomeFormattato"></td>
                     <td v-for="(t, i) in c.turni" :key="i" :class="getClassForTurno(t)">{{ t }}</td>
                  </tr>
               </tbody>
            </table>
          </div>
       </div>
    </div>
    
    <!-- Modale Immagine Turno -->
    <div v-if="imageModal" class="modal-overlay image-modal-overlay" @click.self="chiudiImmagine">
      <div class="close-btn-img" @click="chiudiImmagine">&times;</div>
      <div id="imageFlexContainer" class="image-flex-container">
        <img ref="imgRiferimento" :src="currentImagePath" @error="onErrorImmagine" class="panzoom-img">
        <div class="image-banner">⚠️ Controllare per eventuali varianti ai turni.</div>
      </div>
      <button @click="scaricaImmagine" class="btn-scarica">📥 Scarica</button>
    </div>

  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import AppHeader from '../components/layout/AppHeader.vue'
import Panzoom from '@panzoom/panzoom'

const isAuth = ref(false)
const accessCode = ref('')
const authLoading = ref(false)
const authError = ref('')

const loading = ref(true)
const rotazioniGroups = ref([])

let globalShiftData = {}
let currentImgList = []

onMounted(() => {
    const code = localStorage.getItem('auth_rotazioni')
    if(code) { accessCode.value = code; verificaCodice(true) }
})

const verificaCodice = async (isAuto = false) => {
    if(!accessCode.value) return authError.value = "Inserisci codice valido"
    authLoading.value = true; authError.value = "Verifica..."
    try {
        const r = await fetch('/codici.json?t=' + Date.now())
        if(r.ok){
            const codici = await r.json()
            const found = codici.find(c => c.codice === accessCode.value.toUpperCase() && c.attivo)
            if(found) {
                isAuth.value = true; localStorage.setItem('auth_rotazioni', found.codice)
                await caricaDatiTurniSilenzioso()
                await caricaRotazioni()
            } else {
                if(isAuto) { localStorage.removeItem('auth_rotazioni'); isAuth.value = false; accessCode.value = ''; authError.value = '' }
                else { authError.value = "❌ Codice errato o inattivo." }
            }
        }
    }catch(e){ authError.value = "Errore di rete" }
    authLoading.value = false
}

const caricaDatiTurniSilenzioso = async () => {
    try {
        const res = await fetch('/mappa_file.json?t=' + Date.now())
        if(!res.ok) return
        const map = await res.json()
        
        let dirs = map.albero.filter(f => f.startsWith("turni_pdf_")).map(p => p.split('/')[0])
        let d = new Set(dirs)
        const arr = Array.from(d).sort((a,b)=>b.localeCompare(a))
        if(arr.length > 0) {
            let imgDir = arr[0].replace("turni_pdf_", "turni_")
            currentImgList = map.albero.filter(p => p.startsWith(imgDir+"/") && (p.toLowerCase().endsWith(".jpg")||p.toLowerCase().endsWith(".png"))).map(p => ({name: p.split('/')[1], dir: imgDir}))
        }
        
        let jsons = map.albero.filter(f => f.split('/').length===1 && f.startsWith("info_turni_") && f.endsWith(".json"))
        for(let jf of jsons) {
            fetch("/"+jf).then(r=>r.json()).then(jd => { globalShiftData = {...globalShiftData, ...jd} })
        }
    }catch(e){}
}

const caricaRotazioni = async () => {
    loading.value = true
    try {
        const res = await fetch('/mappa_file.json?t=' + Date.now())
        const map = await res.json()
        const files = map.rotazioni || map.albero.filter(p=>p.startsWith("rotazioni/")).map(p=>p.split('/')[1]) || []
        
        let groups = {}
        files.forEach(f => {
            let ext = f.substring(f.lastIndexOf('.')).toLowerCase()
            let base = f.substring(0, f.lastIndexOf('.'))
            if(!groups[base]) groups[base] = { pdf: null, excel: null, json: null, base, jsonData: null}
            if(ext==='.pdf') groups[base].pdf = f
            if(ext==='.xlsx'||ext==='.xls') groups[base].excel = f
            if(ext==='.json') groups[base].json = f
        })
        
        let arr = []
        for(let base in groups) {
            let g = groups[base]
            if(g.json) {
                try{
                    let jd = await fetch(`/rotazioni/${g.json}`).then(r=>r.json())
                    g.jsonData = jd
                }catch(e){}
            }
            arr.push(g)
        }
        // ordine alfabetico inverso
        arr.sort((a,b)=>b.base.localeCompare(a.base))
        rotazioniGroups.value = arr
    }catch(e){}
    loading.value = false
}

const pulisciNome = (n) => { let p = n.replace(/\.[^/.]+$/, "").replace(/_/g, " "); return p.charAt(0).toUpperCase() + p.slice(1) }

// Tabella Modal
const tableModal = ref(false)
const currentRotName = ref('')
const currentTableData = ref([])
const paroleSaltare = ["GENNAIO", "FEBBRAIO", "MARZO", "APRILE", "MAGGIO", "GIUGNO", "LUGLIO", "AGOSTO", "SETTEMBRE", "OTTOBRE", "NOVEMBRE", "DICEMBRE", "MESE", "AGENTI"]

const getClassForTurno = (turno) => {
    let t = turno.toUpperCase().replace(/\s+/g, '')
    if(t==='AL') return 'cell-al'
    if(t==='RI') return 'cell-ri'
    if(t==='DISP'||t==='DI') return 'cell-disp'
    if(t==='ESPE') return 'cell-espe'
    if(t==='FER'||t==='FEP'||t==='FES') return 'cell-fer'
    return ''
}

const apriTabella = (rotName, data) => {
    currentRotName.value = rotName
    let dArr = []
    let dip = data[rotName]
    for(let nome in dip) {
        if(paroleSaltare.some(p => nome.toUpperCase().includes(p)) || !nome.trim()) continue
        let td = []
        for(let i=1; i<=31; i++) {
            let v = dip[nome][i.toString()] || ""
            td.push(v)
        }
        dArr.push({ nome: nome, nomeFormattato: nome.split(' - ').join('<br>'), turni: td })
    }
    currentTableData.value = dArr
    tableModal.value = true
}

// Ricerca Corrente Modal
const searchModal = ref(false)
const dbTurni = ref([])
const cercaTurnoObj = reactive({giorno:'', codice:''})
const cercaCambioObj = reactive({giorno:'', fase:'Terzo'})
const cercaTurnoRes = ref(''); const cercaCambioRes = ref('')

const apriRicerca = (rotName, data) => {
    currentRotName.value = rotName
    let arr = []
    let dip = data[rotName]
    for(let nome in dip) {
        if(paroleSaltare.some(p => nome.toUpperCase().includes(p)) || !nome.trim()) continue
        let td = []
        for(let i=1; i<=31; i++) {
            let v = dip[nome][i.toString()] || ""
            if(v.toUpperCase().replace(/\s+/g,'')==='DI') v="DISP"
            td.push(v.toUpperCase().replace(/\s+/g,''))
        }
        arr.push({ nome: nome.split(' - ').join(' e '), turni: td })
    }
    dbTurni.value = arr
    cercaTurnoObj.giorno=''; cercaTurnoObj.codice=''
    cercaTurnoRes.value=''; cercaCambioRes.value=''
    searchModal.value = true
}

// Appesa window logic for dynamically generated innerHTML buttons
window.apriImgDaRotazioni = (codice) => {
    let match = currentImgList.find(f => f.name.replace(/\.[^/.]+$/, '').toUpperCase().includes(codice.toUpperCase()))
    if(match) apriImmagineTurno(match.name)
    else alert("Immagine turno non trovata!")
}

const eseguiCercaTurno = () => {
    if(!cercaTurnoObj.giorno || !cercaTurnoObj.codice) return cercaTurnoRes.value = "Compila tutti i campi"
    let idDay = cercaTurnoObj.giorno - 1
    let c = cercaTurnoObj.codice.toUpperCase().trim()
    let found = dbTurni.value.filter(d => d.turni[idDay] === c).map(d => d.nome)
    
    if(found.length>0) {
        let xtra = ''; let bd = globalShiftData[c]
        if(bd && bd.length>0) xtra= `<br>Inizio: ${bd[0].partenza_luogo} (${bd[0].partenza_ora})<br>Fine: ${bd[bd.length-1].arrivo_luogo} (${bd[bd.length-1].arrivo_ora})`
        
        cercaTurnoRes.value = `<strong>Trovati il giorno ${cercaTurnoObj.giorno} a fare ${c}:</strong><ul><li>${found.join('</li><li>')}</li></ul>
            <div class="turn-details-box" style="margin-top:10px;">${xtra}<button class="file-btn btn-search" style="margin-top:8px;" onclick="window.apriImgDaRotazioni('${c}')">🖼️ Mostra Immagine</button></div>`
    }else cercaTurnoRes.value = "Nessuno trovato."
}

// Fasi logic legacy
const analizzaCiclo = (turni, idDay) => {
    let tA = turni[idDay]
    if(["AL","RI",""].includes(tA)) return {fase:"Riposo", gE:0, m:tA==="AL"?"AL":"RI"}
    let gL=1; let riposoPassato=false
    for (let i = idDay - 1; i >= 0; i--) { if (["AL","RI",""].includes(turni[i])) {riposoPassato=true; break;} gL++ }
    if(riposoPassato) return {fase: gL<=2?"Terzo":gL<=4?"Mezzo":gL<=6?"Primo":"Oltre 6", gE: gL}
    let alProssimo = 0
    for(let i=idDay+1; i<turni.length; i++) { if(["AL","RI",""].includes(turni[i])) break; alProssimo++ }
    let gS = 6 - alProssimo; let gEff = gS>0?gS:gL
    return {fase: gEff<=2?"Terzo":gEff<=4?"Mezzo":gEff<=6?"Primo":"Oltre 6", gE: gEff}
}

const eseguiCercaCambio = () => {
    if(!cercaCambioObj.giorno) return cercaCambioRes.value = "Inserisci giorno."
    let idDay = cercaCambioObj.giorno-1
    let arr = []
    dbTurni.value.forEach(d => {
        let an = analizzaCiclo(d.turni, idDay)
        if(an.fase === cercaCambioObj.fase) {
            let tc = d.turni[idDay]
            if(cercaCambioObj.fase==="Riposo") arr.push(`<strong>${d.nome}</strong> - <span style="color:var(--danger)">[Riposo]</span>`)
            else {
                let isRip = ["AL","RI","DISP","ESPE","DI",""].includes(tc)
                if(!isRip) arr.push(`<strong>${d.nome}</strong> (G. Lav: ${an.gE}) <br> <div class="turn-details-box"><strong style="color:var(--primary)">Turno: ${tc}</strong><button class="file-btn btn-search" style="padding:8px" onclick="window.apriImgDaRotazioni('${tc}')">🖼️ Immagine</button></div>`)
                else arr.push(`<strong>${d.nome}</strong> (G. Lav: ${an.gE}) - [${tc}]`)
            }
        }
    })
    if(arr.length>0) cercaCambioRes.value = `<strong>Colleghi ${cercaCambioObj.fase}:</strong><ul><li>` + arr.join('</li><li style="margin-top:10px;">') + '</li></ul>'
    else cercaCambioRes.value = "Nessuno trovato."
}


// Ricerca Futura
const futureModal = ref(false)
const futureForm = reactive({data:'', fase:'Terzo'})
const futureRes = ref('')
const currentBaseName = ref('')

const apriRicercaFutura = (baseName, rotName, data) => {
    currentRotName.value = rotName
    currentBaseName.value = baseName
    let arr = []
    let dip = data[rotName]
    for(let nome in dip) {
        if(paroleSaltare.some(p => nome.toUpperCase().includes(p)) || !nome.trim()) continue
        let td = []
        for(let i=1; i<=31; i++) td.push(dip[nome][i.toString()] || "")
        arr.push({ nome: nome.split(' - ').join(' e '), turni: td })
    }
    dbTurni.value = arr
    futureForm.data = new Date().toISOString().split('T')[0]
    futureRes.value = ""
    futureModal.value = true
}

const stringToNum = (s) => Math.floor(new Date(s.split('-')[0], s.split('-')[1]-1, s.split('-')[2], 12).getTime() / 86400000)

const eseguiRicercaFutura = () => {
    if(!futureForm.data) return futureRes.value="Inserisci data"
    let p = currentBaseName.value.split('_'); let bm = p[1]; let by = p[2]
    const mMap = { "gennaio":"01", "febbraio":"02", "marzo":"03", "aprile":"04", "maggio":"05", "giugno":"06", "luglio":"07", "agosto":"08", "settembre":"09", "ottobre":"10", "novembre":"11", "dicembre":"12" }
    let mNum = mMap[bm.toLowerCase()]
    
    let dbPred = []
    dbTurni.value.forEach(d => {
        let refL = null; let tA = d.turni
        let idxAL = tA.findIndex(t=>t==="AL")
        if(idxAL!==-1) refL = stringToNum(`${by}-${mNum}-${idxAL+1}`) - 7
        else {
            for(let i=0; i<tA.length; i++) {
                if(tA[i]==="RI") {
                    let prev = (i-1>=0 && ["AL","RI"].includes(tA[i-1]))
                    let nxt = (i+1<tA.length && tA[i+1]==="RI")
                    let n = stringToNum(`${by}-${mNum}-${i+1}`)
                    refL = prev ? n-8 : nxt ? n-7 : n; break
                }
            }
        }
        if(refL!==null) dbPred.push({nome:d.nome, ref:refL})
    })
    
    let targetNum = stringToNum(futureForm.data)
    let resArr = []
    
    dbPred.forEach(pred => {
        let diff = targetNum - pred.ref
        let rem = ((diff % 8) + 8) % 8
        let faseCalc = ''; let m=''
        if(rem===0) { faseCalc="Riposo"; m="Singolo/Inizio Doppio" }
        else if(rem===1 || rem===2) faseCalc="Terzo"
        else if(rem===3 || rem===4) faseCalc="Mezzo"
        else if(rem===5 || rem===6) faseCalc="Primo"
        else if(rem===7) { faseCalc="Riposo"; m="Doppio Lungo/Singolo L" }
        
        if(faseCalc===futureForm.fase) resArr.push(`<strong>${pred.nome}</strong> (Stima)`)
    })
    
    if(resArr.length>0) futureRes.value = `Risultati Stimati Matematicamente:<br><ul><li>${resArr.join('</li><li>')}</li></ul>`
    else futureRes.value = "Nessuno stimato."
}

// Immagine Modal Generica
const imageModal = ref(false)
const imgRiferimento = ref(null)
const currentImagePath = ref('')
let pzInstance = null

const apriImmagineTurno = async (nomeFile) => {
    let d = currentImgList.find(f => f.name === nomeFile)
    if(!d) return
    currentImagePath.value = `/${d.dir}/${nomeFile}`
    imageModal.value = true
    await nextTick()
    if (!pzInstance && imgRiferimento.value) {
        pzInstance = Panzoom(imgRiferimento.value, { maxScale: 5, minScale: 1 })
        document.getElementById('imageFlexContainer').addEventListener('wheel', pzInstance.zoomWithWheel)
    } else if(pzInstance) pzInstance.reset()
}

const chiudiImmagine = () => { imageModal.value = false; currentImagePath.value = ''; if(pzInstance)pzInstance.reset() }
const onErrorImmagine = () => { alert("Immagine non trovata"); chiudiImmagine() }
const scaricaImmagine = () => { const a=document.createElement('a'); a.href=currentImagePath.value; a.download=currentImagePath.value.split('/').pop(); document.body.appendChild(a); a.click(); document.body.removeChild(a); }

</script>

<style scoped>
.rotazioni-view { display: flex; flex-direction: column; align-items: center; width: 100%; }
.auth-section, .content-area { width: 100%; max-width: 400px; padding: 20px; box-sizing: border-box; }

.card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); margin-bottom: 20px; text-align: center;}
.input-field { width: 100%; padding: 15px; margin-bottom: 10px; border: 2px solid #ccc; border-radius: 8px; font-size: 16px; box-sizing: border-box; }
.btn-action { background-color: var(--primary); color: white; width: 100%; padding: 15px; font-weight: bold; border-radius: 8px; border: none; font-size: 16px;}
.error-msg { color: var(--danger); margin-top: 10px; font-weight: bold; }
.support-section { margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;}

.status-message { text-align: center; color: #666; font-size: 16px; padding: 20px; background: white; border-radius: 10px; }
.month-card { background: white; border-radius: 12px; padding: 18px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
.month-card h3 { margin-top: 0; color: var(--primary); text-align: center; border-bottom: 2px solid #eee; padding-bottom: 10px; text-transform: capitalize;}

.btn-grid { display: flex; flex-direction: column; gap: 10px; }
.rot-container { background: #fafafa; border: 1px solid #ddd; padding: 12px; border-radius: 10px; }
.rot-container h4 { margin: 0 0 10px 0; color: var(--primary); font-size: 16px; }

.file-btn { width: 100%; color: white; border: none; padding: 14px 10px; font-size: 16px; border-radius: 10px; font-weight: bold; margin-bottom: 8px; cursor: pointer; text-decoration: none; display:block; text-align:center;}
.btn-table { background: var(--info); }
.btn-search { background: var(--success); }
.btn-pdf { background: #6c757d; }

.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 5000; padding: 20px; box-sizing: border-box;}
.modal-content { background: white; padding: 20px; border-radius: 12px; width: 100%; max-width: 400px; position: relative; max-height: 85vh; overflow-y: auto;}
.modal-table-content { max-width: 1200px; padding: 15px; }

.close-btn { position: absolute; right: 15px; top: 15px; font-size: 24px; cursor: pointer; color: #666; background: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.2); z-index: 10;}

.modulo-ricerca { background: #fafafa; border: 1px solid #eee; padding: 15px; border-radius: 8px; margin-top: 15px; }
.modulo-ricerca h4 { margin-top: 0; color: var(--primary); margin-bottom: 10px;}
.risultato-box { background: #e9ecef; border-left: 4px solid var(--primary); padding: 15px; margin-top: 10px; font-size: 14px; border-radius: 0 8px 8px 0;}
.turn-details-box { background: white; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px;}

.table-responsive { width: 100%; max-height: 70vh; overflow: auto; border: 1px solid #ddd; border-radius: 8px; position: relative; margin-top: 10px; }
.rotazioni-table { border-collapse: separate; border-spacing: 0; width: max-content; background: white; font-size: 14px; text-align: center; }
.rotazioni-table th, .rotazioni-table td { border-bottom: 1px solid #ddd; border-right: 1px solid #ddd; padding: 10px; white-space: nowrap; }
.rotazioni-table th { background-color: var(--primary); color: white; position: sticky; top: 0; z-index: 2; }
.rotazioni-table td:first-child, .rotazioni-table th:first-child { position: sticky; left: 0; min-width: 100px; max-width: 140px; white-space: normal; line-height: 1.3; }
.rotazioni-table td:first-child { background-color: #f9f9f9; font-weight: bold; text-align: left; border-right: 2px solid #aaa; color: var(--primary); font-size: 13px; z-index: 3; }
.rotazioni-table th:first-child { z-index: 4; }

.cell-al { background-color: #28a745; color: white; font-weight: bold; }
.cell-ri { background-color: #5cb85c; color: white; }
.cell-disp { background-color: #ffc107; color: black; font-weight: bold;}
.cell-espe { background-color: #6f42c1; color: white; }
.cell-fer { background-color: #20c997; color: white; font-size: 12px; font-weight: bold; }

.image-modal-overlay { z-index: 10000; background: rgba(0,0,0,0.8); }
.close-btn-img { position: absolute; top: calc(20px + env(safe-area-inset-top)); right: 20px; font-size: 35px; color: white; cursor: pointer; z-index: 10001; }
.image-flex-container { display:flex; flex-direction: column; justify-content:center; align-items:center; height:100%; width: 100%; position: relative; }
.panzoom-img { max-width: 100%; max-height: 70vh; border-radius: 12px; object-fit: contain; }
.image-banner { position: relative; z-index: 10001; margin-top: 15px; background: rgba(0,0,0,0.7); color: #fff; padding: 10px 20px; border-radius: 12px; font-size: 13px; text-align: center; max-width: 90%; }
.btn-scarica { position: absolute; bottom: calc(30px + env(safe-area-inset-bottom)); background: #11cdef; color: white; border: none; padding: 12px 24px; border-radius: 20px; font-weight: bold; font-size: 16px; cursor: pointer; z-index: 10001; }
</style>

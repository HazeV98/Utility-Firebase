<template>
  <div class="turni-view">
    <AppHeader @openAuth="showAuth = true" @openProfile="showProfile = true" />

    <div class="content-area">
      <div v-if="loading" class="status-message">Caricamento cartelle...</div>
      
      <div v-else-if="!currentDir" class="folders-container">
         <button v-for="d in dirs" :key="d" class="folder-btn" @click="caricaFiles(d)">
            {{ formattaNomeCartella(d) }}
         </button>
      </div>

      <div v-else class="files-container">
         <button class="back-btn" @click="currentDir = null" v-if="dirs.length > 1">← Indietro</button>

         <div class="search-container" v-if="currentImgList.length > 0">
            <input type="text" v-model="searchQuery" placeholder="Cerca turno" class="input-field" @input="showSuggestions = true" @focus="showSuggestions = true">
            <div v-if="showSuggestions && searchQuery" class="suggestions-box">
                <div v-if="visualizedSuggestions.length === 0" style="padding: 14px; color: #888;">Nessun turno trovato.</div>
                <div v-for="m in visualizedSuggestions" :key="m.name" class="suggestion-item" @click="apriImmagineTurno(m.name)">
                    <span>Turno {{ m.name.replace(/\.[^/.]+$/, '').toUpperCase() }}</span> <span>🖼️</span>
                </div>
            </div>
         </div>

         <div v-for="f in currentPdfs" :key="f.name" class="file-row" :style="{ marginBottom: f.name.includes('libro') ? '10px' : '0' }">
             <a :href="`/${currentDir}/${f.name}`" target="_blank" class="file-btn">{{ formattaNomePdf(f.name) }}</a>
             <div class="download-btn" @click="downloadForzato(`/${currentDir}/${f.name}`, f.name)">⬇️</div>
             <button v-if="hasJson(f.name)" class="file-btn btn-search-xs" @click="apriRicercaCorse(f.name)">🔍</button>
         </div>
      </div>
    </div>

    <!-- Modale Immagine Turno -->
    <div v-if="imageModal" class="modal-overlay image-modal-overlay" @click.self="chiudiImmagine">
      <div class="close-btn-img" @click="chiudiImmagine">&times;</div>
      <div id="imageFlexContainer" class="image-flex-container">
        <img ref="imgRiferimento" :src="currentImagePath" @error="onErrorImmagine" class="panzoom-img">
        <div class="image-banner">⚠️ Controllare sempre la presenza di eventuali varianti ai turni.</div>
      </div>
      <button @click="scaricaImmagine" class="btn-scarica">📥 Scarica</button>
    </div>

    <!-- Modale Ricerca Corse (JSON) -->
    <div v-if="searchModal" class="modal-overlay" @click.self="searchModal = false">
      <div class="modal-content">
         <span class="close-btn" @click="searchModal = false">&times;</span>
         <h3 style="margin-top:0; color:var(--primary); border-bottom: 2px solid #eee; padding-bottom: 10px;">Cerca Corsa</h3>
         
         <div v-if="loadingSearch" class="status-message" style="padding:10px; font-size:14px;">Caricamento dati in corso...</div>
         
         <div v-else>
            <div class="tipo-toggle-container">
               <button class="btn-tipo" :class="{active: searchForm.tipo === 'partenza'}" @click="selezionaTipo('partenza')">🛫 Partenza</button>
               <button class="btn-tipo" :class="{active: searchForm.tipo === 'arrivo'}" @click="selezionaTipo('arrivo')">🛬 Arrivo</button>
            </div>

            <div :class="{ unlocked: searchForm.tipo }" class="sc-rest-form">
               <div class="sc-form-group">
                   <label>{{ searchForm.tipo === 'arrivo' ? 'Luogo di arrivo:' : 'Luogo di partenza:' }}</label>
                   <select v-model="searchForm.luogo" class="input-field">
                       <option value="">-- Seleziona Luogo --</option>
                       <option v-for="l in searchLuoghiDisponibili" :key="l" :value="l">{{ l }}</option>
                   </select>
               </div>
               
               <div class="sc-form-group">
                   <label>Giorno (opzionale per Rotazioni):</label>
                   <input type="date" v-model="searchForm.giorno" class="input-field">
               </div>
               
               <div class="sc-form-group" style="position: relative;">
                   <label>{{ searchForm.tipo === 'arrivo' ? 'Orario di arrivo:' : 'Orario di partenza:' }}</label>
                   <input type="text" v-model="searchForm.orario" inputmode="numeric" placeholder="es. 07.30" class="input-field" @input="formattaOrario" @focus="showOrarioSugg=true">
                   <div v-if="showOrarioSugg && searchOrariFiltrati.length > 0" class="sc-suggestions">
                       <div v-for="o in searchOrariFiltrati" :key="o" class="sc-suggestion-item" @click="selezionaOrario(o)">{{ o }}</div>
                   </div>
               </div>
               
               <button class="btn btn-action" @click="eseguiRicercaCorsa">Trova Turno</button>
            </div>

            <div v-if="searchResult" class="risultato-box" v-html="searchResult"></div>
         </div>
      </div>
    </div>

    <AuthModal :show="showAuth" @close="showAuth = false" />
    <ProfileModal :show="showProfile" @close="showProfile = false" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import AppHeader from '../components/layout/AppHeader.vue'
import AuthModal from '../components/modals/AuthModal.vue'
import ProfileModal from '../components/modals/ProfileModal.vue'
import Panzoom from '@panzoom/panzoom'

const showAuth = ref(false)
const showProfile = ref(false)

const loading = ref(true)
const mappaAlbero = ref([])
const dirs = ref([])
const currentDir = ref(null)

const currentImgList = ref([])
const currentPdfs = ref([])
const currentJsons = ref([])

onMounted(async () => {
    try {
        const res = await fetch('/mappa_file.json?t=' + Date.now())
        if(res.ok) {
            const data = await res.json()
            mappaAlbero.value = data.albero || []
            
            // Trova cartelle turni
            const dSet = new Set(mappaAlbero.value.filter(p => p.startsWith("turni_pdf_") || p.startsWith("turni_varianti_")).map(p => p.split('/')[0]))
            dirs.value = Array.from(dSet).sort((a,b) => b.localeCompare(a))
            
            if(dirs.value.length === 1) caricaFiles(dirs.value[0])
        }
    }catch(e){}
    loading.value = false
})

const formattaNomeCartella = (d) => {
    if(d.includes("varianti")) return d.replace("turni_varianti_", "").replace(/_/g, " ")
    let label = d.replace("turni_pdf_", "").split("-").reverse().join("-")
    return "Turni dal " + label
}

const formattaNomePdf = (nomeOrig) => {
    if (nomeOrig.includes("libro_turni_completo")) return "Libro turni completo"
    let n = nomeOrig.replace(/\.pdf$/i, "").replace(/_/g, " ")
    n = n.split(/\s+dal\s+/i)[0]
    n = n.replace(/\s+pdf$/i, "").trim()
    n = n.replace(/\blinea\b/gi, "linea")
    return n.charAt(0).toUpperCase() + n.slice(1)
}

const hasJson = (pdfName) => {
    const baseName = pdfName.substring(0, pdfName.lastIndexOf('.'))
    return currentJsons.value.some(j => j.name.substring(0, j.name.lastIndexOf('.')) === baseName)
}

const scaricaTestoCartella = async (d) => {
    try {
        const r = await fetch(`/${d}/nome.txt`)
        if(r.ok) return await r.text()
    }catch(e){}
    return null
}

const caricaFiles = (dir) => {
    currentDir.value = dir
    let imgDir = dir.startsWith("turni_pdf_") ? dir.replace("turni_pdf_", "turni_") : dir.replace("turni_varianti_", "turni_jpg_varianti_")
    
    currentImgList.value = mappaAlbero.value.filter(p => p.startsWith(imgDir + "/") && (p.toLowerCase().endsWith(".jpg") || p.toLowerCase().endsWith(".png"))).map(p => ({name: p.split('/')[1], dir: imgDir}))
    
    let filesInDir = mappaAlbero.value.filter(p => p.startsWith(dir + "/") && p.split('/').length === 2).map(p => p.split('/')[1])
    
    let pLista = filesInDir.filter(f => f.toLowerCase().endsWith(".pdf")).map(name => ({name}))
    pLista.sort((a, b) => {
        if(a.name.includes("libro_turni_completo")) return -1
        if(b.name.includes("libro_turni_completo")) return 1
        return a.name.localeCompare(b.name, undefined, {numeric: true})
    })
    currentPdfs.value = pLista
    currentJsons.value = filesInDir.filter(f => f.toLowerCase().endsWith(".json")).map(name => ({name}))
}

const downloadForzato = (url, name) => {
    const a = document.createElement('a')
    a.href = url; a.download = name; a.target = "_blank"
    a.click()
}

// Search turni immagini
const searchQuery = ref("")
const showSuggestions = ref(false)
const visualizedSuggestions = computed(() => {
    if(!searchQuery.value) return []
    const q = searchQuery.value.toUpperCase().trim()
    return currentImgList.value.filter(f => f.name.toUpperCase().includes(q))
})

// Immagine Modal
const imageModal = ref(false)
const imgRiferimento = ref(null)
const currentImagePath = ref('')
let pzInstance = null

const apriImmagineTurno = async (nomeFile) => {
    const d = currentImgList.value.find(f => f.name === nomeFile)
    if(!d) return
    currentImagePath.value = `/${d.dir}/${nomeFile}`
    imageModal.value = true
    showSuggestions.value = false
    await nextTick()
    if (!pzInstance && imgRiferimento.value) {
        pzInstance = Panzoom(imgRiferimento.value, { maxScale: 5, minScale: 1 })
        document.getElementById('imageFlexContainer').addEventListener('wheel', pzInstance.zoomWithWheel)
    } else if(pzInstance) pzInstance.reset()
}

const chiudiImmagine = () => { imageModal.value = false; currentImagePath.value = ''; if(pzInstance)pzInstance.reset() }
const onErrorImmagine = () => { alert("Immagine non trovata"); chiudiImmagine() }
const scaricaImmagine = () => { downloadForzato(currentImagePath.value, currentImagePath.value.split('/').pop()) }

// Search Modal (JSON Corse)
const searchModal = ref(false)
const loadingSearch = ref(false)
const searchData = ref(null)

const searchForm = reactive({ tipo: '', luogo: '', giorno: '', orario: '' })
const searchResult = ref("")

const showOrarioSugg = ref(false)

const apriRicercaCorse = async (pdfName) => {
    searchModal.value = true
    loadingSearch.value = true
    searchResult.value = ""
    searchForm.tipo = ''; searchForm.luogo = ''; searchForm.orario = ''
    searchForm.giorno = new Date().toISOString().split('T')[0]
    
    const baseName = pdfName.substring(0, pdfName.lastIndexOf('.'))
    try {
        const r = await fetch(`/${currentDir.value}/${baseName}.json?t=` + Date.now())
        if(r.ok) searchData.value = await r.json()
    }catch(e){}
    loadingSearch.value = false
}

const selezionaTipo = (t) => { searchForm.tipo = t; searchForm.luogo = ''; searchForm.orario = ''; searchResult.value = "" }

const searchLuoghiDisponibili = computed(() => {
    if(!searchData.value || !searchForm.tipo) return []
    let l = new Set()
    for(let turno in searchData.value) {
        searchData.value[turno].forEach(c => {
            let target = searchForm.tipo === 'partenza' ? c.partenza_luogo : c.arrivo_luogo
            if(target) l.add(target.trim())
        })
    }
    return Array.from(l).sort()
})

const formattaOrario = () => {
    let v = searchForm.orario.replace(/\D/g, '')
    if(v.length > 4) v = v.substring(0,4)
    if(v.length > 2) v = v.substring(0,2) + '.' + v.substring(2)
    searchForm.orario = v
}

const searchOrariFiltrati = computed(() => {
    if(!searchData.value || !searchForm.tipo || !searchForm.luogo || searchForm.orario.length === 0) return []
    let oSet = new Set()
    for(let turno in searchData.value) {
        searchData.value[turno].forEach(c => {
            let tL = searchForm.tipo === 'partenza' ? c.partenza_luogo : c.arrivo_luogo
            let tO = searchForm.tipo === 'partenza' ? c.partenza_ora : c.arrivo_ora
            if(tL && tL.trim() === searchForm.luogo && tO) oSet.add(tO.trim())
        })
    }
    return Array.from(oSet).map(o => {
        let p = o.replace('.',':').split(':'); if(p.length<2)return '';
        return `${p[0].padStart(2,'0')}.${p[1].padStart(2,'0')}`
    }).filter(o => o.startsWith(searchForm.orario)).sort()
})

const selezionaOrario = (o) => { searchForm.orario = o; showOrarioSugg.value = false }

const eseguiRicercaCorsa = async () => {
    if(!searchForm.luogo || searchForm.orario.length < 5) return searchResult.value = "<span style='color:var(--danger)'>Seleziona luogo e orario (es. 07.30)</span>"
    
    let p = searchForm.orario.split('.')
    let t1 = `${parseInt(p[0])}:${p[1]}`; let t2 = `${parseInt(p[0])}.${p[1]}`; let t3 = `${p[0]}:${p[1]}`
    
    let turniFound = []
    for(let turno in searchData.value) {
        searchData.value[turno].forEach(c => {
            let tL = searchForm.tipo === 'partenza' ? c.partenza_luogo : c.arrivo_luogo
            let tO = searchForm.tipo === 'partenza' ? c.partenza_ora : c.arrivo_ora
            if(tL && tL.trim() === searchForm.luogo && tO) {
                let ot = tO.trim()
                if(ot === t1 || ot === t2 || ot === t3) {
                    let mp = turno.match(/\d[A-Z0-9]{3}/i)
                    let n = mp ? mp[0].toUpperCase() : turno.toUpperCase()
                    if(!turniFound.includes(n)) turniFound.push(n)
                }
            }
        })
    }
    
    if(turniFound.length===0) return searchResult.value = "Nessun turno trovato."
    
    // Rotazioni Logic
    let rotazioniHtml = ""
    if(localStorage.getItem('auth_rotazioni') && searchForm.giorno) {
        try{
            let d = new Date(searchForm.giorno)
            let mNames = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"]
            let rotUrl = `/rotazioni/rotazioni_${mNames[d.getMonth()]}_${d.getFullYear()}.json?t=`+Date.now()
            let rr = await fetch(rotUrl)
            if(rr.ok) {
                let rd = await rr.json()
                let coll = []
                for(let rn in rd) {
                    for(let nome in rd[rn]) {
                        let tAss = rd[rn][nome][d.getDate().toString()]
                        if(tAss) {
                            let tc = tAss.toUpperCase().replace(/\s+/g,'')
                            turniFound.forEach(tf => {
                                if(tf.toUpperCase() === tc) coll.push(`<strong>${tf}:</strong> ${nome.split(" - ").join(" e ")}`)
                            })
                        }
                    }
                }
                if(coll.length>0) rotazioniHtml = `<div style="margin-top:15px; border-top:1px dashed #ccc; padding-top:10px;"><strong style="color:var(--primary)">👥 Assegnazione:</strong><br>${coll.join('<br>')}</div>`
            }
        }catch(e){}
    }
    
    window.apriImgExt = (t) => {
        let m = currentImgList.value.find(f => f.name.toUpperCase().includes(t.toUpperCase()))
        if(m) apriImmagineTurno(m.name)
        else alert("Immagine non trovata per " + t)
    }

    let btns = turniFound.map(t => `<button class="file-btn" style="display:inline-flex; width:auto; margin: 5px 5px 0 0; padding: 10px 15px; font-size: 14px;" onclick="window.apriImgExt('${t}')">🖼️ ${t}</button>`).join('')
    
    searchResult.value = `<strong>${searchForm.tipo === 'partenza' ? 'Partenza da' : 'Arrivo a'}:</strong> ${searchForm.luogo} alle ${searchForm.orario}<br>
                           <div style="margin-top:15px;"><strong>Turni:</strong><br>${btns}</div>${rotazioniHtml}`
}
</script>

<style scoped>
.turni-view { display: flex; flex-direction: column; align-items: center; width: 100%; }
.content-area { width: 100%; max-width: 400px; padding: 0 20px 40px 20px; box-sizing: border-box; }

.status-message { text-align: center; color: #666; font-size: 16px; padding: 20px; background: white; border-radius: 10px; }
.folders-container { display: flex; flex-direction: column; gap: 15px; }
.folder-btn { background-color: white; color: var(--primary); border: 2px solid var(--primary); padding: 18px; font-size: 18px; font-weight: bold; border-radius: 12px; cursor: pointer; text-align: center; }

.files-container { display: flex; flex-direction: column; gap: 15px; }
.back-btn { background-color: #6c757d; color: white; border: none; padding: 12px; border-radius: 10px; cursor: pointer; width: 100%; font-weight: bold; font-size: 16px; margin-bottom: 5px; }

.search-container { position: relative; width: 100%; margin-bottom: 5px; }
.input-field { width: 100%; padding: 15px; border: 2px solid var(--primary); border-radius: 10px; font-size: 16px; box-sizing: border-box; outline: none; font-family: inherit; background: white;}
.suggestions-box { position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #ddd; border-radius: 8px; max-height: 250px; overflow-y: auto; z-index: 1000; box-shadow: 0 4px 10px rgba(0,0,0,0.15); margin-top: 5px; }
.suggestion-item { padding: 14px 15px; border-bottom: 1px solid #eee; cursor: pointer; color: var(--text-color); display: flex; justify-content: space-between; align-items: center; font-weight: bold; }
.suggestion-item:hover { background-color: #f4f7f6; color: var(--primary); }

.file-row { display: flex; gap: 8px; width: 100%; align-items: stretch; }
.file-btn { flex-grow: 1; background-color: var(--primary); color: white; border: none; padding: 16px; font-size: 16px; border-radius: 10px; cursor: pointer; text-decoration: none; display: flex; align-items: center; justify-content: center; font-weight: bold; }
.download-btn { width: 55px; background-color: white; color: var(--primary); border: 2px solid var(--primary); border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 20px; }
.btn-search-xs { background: var(--success); flex-grow: 0; width: 50px; font-size: 20px; padding: 0; }

.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center; z-index: 5000; padding: 20px; box-sizing: border-box; backdrop-filter: blur(3px); }
.modal-content { background: white; padding: 20px; border-radius: 12px; width: 100%; max-width: 400px; position: relative; max-height: 85vh; overflow-y: auto;}
.close-btn { position: absolute; right: 15px; top: 10px; font-size: 28px; cursor: pointer; color: #666; }

.image-modal-overlay { z-index: 10000; background: rgba(0,0,0,0.8); }
.close-btn-img { position: absolute; top: calc(20px + env(safe-area-inset-top)); right: 20px; font-size: 35px; color: white; cursor: pointer; z-index: 10001; }
.image-flex-container { display:flex; flex-direction: column; justify-content:center; align-items:center; height:100%; width: 100%; position: relative; }
.panzoom-img { max-width: 100%; max-height: 70vh; border-radius: 12px; object-fit: contain; }
.image-banner { position: relative; z-index: 10001; margin-top: 15px; background: rgba(0,0,0,0.7); color: #fff; padding: 10px 20px; border-radius: 12px; font-size: 13px; text-align: center; max-width: 90%; }
.btn-scarica { position: absolute; bottom: calc(30px + env(safe-area-inset-bottom)); background: #11cdef; color: white; border: none; padding: 12px 24px; border-radius: 20px; font-weight: bold; font-size: 16px; cursor: pointer; z-index: 10001; }

.tipo-toggle-container { display: flex; gap: 10px; margin-bottom: 20px; margin-top: 5px; }
.btn-tipo { flex: 1; padding: 14px; border: 2px solid #ccc; background: white; color: #555; font-size: 16px; font-weight: bold; border-radius: 8px; cursor: pointer;}
.btn-tipo.active { border-color: var(--primary); background: var(--primary); color: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
.sc-rest-form { opacity: 0.3; pointer-events: none; transition: opacity 0.3s; }
.sc-rest-form.unlocked { opacity: 1; pointer-events: auto; }
.sc-form-group { margin-bottom: 15px; display: flex; flex-direction: column; }
.sc-form-group label { font-size: 14px; font-weight: bold; color: #555; margin-bottom: 5px; }
.risultato-box { background: #e9ecef; border-left: 4px solid var(--primary); padding: 15px; margin-top: 15px; font-size: 15px; line-height: 1.5; border-radius: 0 8px 8px 0; }
.btn-action { width: 100%; margin-top: 5px; }
.sc-suggestions { position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #ccc; border-radius: 0 0 8px 8px; max-height: 150px; overflow-y: auto; z-index: 10; margin-top: -2px;}
.sc-suggestion-item { padding: 12px; border-bottom: 1px solid #eee; cursor: pointer; font-size: 16px; font-weight: bold; }
.sc-suggestion-item:hover { background: #f4f7f6; color: var(--primary); }
</style>

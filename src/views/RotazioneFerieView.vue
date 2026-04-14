<template>
  <div class="rotazione-ferie-view">
    <AppHeader @openAuth="showAuth = true" @openProfile="showProfile = true" />

    <div class="content-area">
      <!-- Manca Auth -->
      <div v-if="!authStore.user" class="card" style="text-align: center;">
        <h3 style="color: var(--danger);">Accesso Richiesto</h3>
        <p style="color: #666; font-size: 15px;">Effettua il login tramite l'icona in alto a destra per accedere.</p>
        <button class="btn btn-action" @click="showAuth = true" style="background-color: var(--primary);">Accedi</button>
      </div>

      <!-- Accesso Bloccato (Revoche) -->
      <div v-else-if="strikeCount >= 3 && !authStore.devModeActive" class="card" style="text-align: center;">
        <h3 style="color: var(--danger); margin-top: 0;">🚫 Accesso Bloccato</h3>
        <p style="color: #666; font-size: 15px;">Hai superato il limite di revoche. L'accesso alle ferie è stato disabilitato.</p>
        <button class="btn btn-action" style="background-color: #6c757d;" @click="$router.push('/')">Home</button>
      </div>

      <!-- Non ha condiviso -->
      <div v-else-if="!hasCondiviso" class="card" style="text-align: center;">
        <h3 style="color: var(--primary); margin-top: 0;">🤝 Condividi per accedere</h3>
        <p style="color: #666; font-size: 14px;">Solo chi condivide le proprie ferie può cercare e proporre scambi.</p>
        <div class="warning-box">
            ⚠️ <b>Regola Anti-Furbetti:</b> Se revochi ripetutamente la condivisione l'accesso alle ferie sarà bloccato permanentemente.
        </div>
        <button class="btn-action" @click="apriModaleCondivisione">Inserisci le tue ferie</button>
      </div>

      <!-- Main View: Ha condiviso -->
      <div v-else class="view-main">
        <div class="top-actions">
          <button class="btn-top" style="background: var(--primary);" @click="apriModaleCondivisione">✏️ Modifica Dati</button>
          <button class="btn-top" style="background: var(--danger);" @click="revocaCondivisione">🚫 Annulla Condivisione</button>
        </div>

        <div class="tabs">
          <button class="tab-btn" :class="{active: currentTab === 'cerca'}" @click="currentTab = 'cerca'">🔍 Cerca</button>
          <button class="tab-btn" :class="{active: currentTab === 'bacheca'}" @click="currentTab = 'bacheca'">📌 Bacheca</button>
        </div>

        <!-- TAB CERCA -->
        <div v-if="currentTab === 'cerca'">
          <div class="card" style="padding: 15px;">
            <label style="font-size: 11px; font-weight: bold; color: #666;">Anno Ricerca:</label>
            <input type="number" v-model="filtriRicerca.anno" class="input-field" @change="eseguiRicerca">
            
            <select v-model="filtriRicerca.mansione" class="input-field" @change="eseguiRicerca">
              <option value="Tutte">Tutte le mansioni</option>
              <option value="Marinaio">Marinaio</option>
              <option value="Preposto al comando">Preposto al comando</option>
              <option value="Comandante">Comandante</option>
              <option value="Timoniere">Timoniere</option>
              <option value="Marinaio polivalente">Marinaio polivalente</option>
              <option value="Direttore di macchina">Direttore di macchina</option>
            </select>

            <select v-model="filtriRicerca.periodo" class="input-field" @change="eseguiRicerca">
              <option value="">Tutti i periodi</option>
              <optgroup label="Estive">
                <option v-for="e in jsonFerie.estive" :key="e.n" :value="e.n">{{ e.n }}</option>
              </optgroup>
              <optgroup label="Invernali">
                <option v-for="i in jsonFerie.invernali" :key="i.n" :value="i.n">{{ i.n }}</option>
              </optgroup>
            </select>
          </div>
          
          <div v-if="ricercaLoading" style="text-align: center;">Cerco...</div>
          <div v-else>
            <div v-if="suggeritiRicerca.length > 0" style="margin-bottom: 15px;">
              <h4 style="color:var(--warning)">✨ Match Perfetti</h4>
              <div v-for="u in suggeritiRicerca" :key="u.uid" class="card-suggested">
                 <UtenteFerieCard :utente="u" :annoRicerca="filtriRicerca.anno" :jsonFerie="jsonFerie" />
              </div>
            </div>
            
            <div v-if="risultatiRicerca.length === 0" style="text-align: center; color: #666;">Nessun collega trovato con questi filtri.</div>
            <div v-for="u in risultatiRicerca" :key="u.uid" class="card" style="margin-bottom: 10px; padding: 15px;">
              <UtenteFerieCard :utente="u" :annoRicerca="filtriRicerca.anno" :jsonFerie="jsonFerie" />
            </div>
          </div>
        </div>

        <!-- TAB BACHECA -->
        <div v-if="currentTab === 'bacheca'">
          <button class="btn btn-action" style="margin-top: 0; margin-bottom: 15px;" @click="apriModaleAnnuncio">+ Inserisci Annuncio</button>
          
          <div class="card" style="padding: 15px; margin-bottom: 15px;">
            <label style="font-size: 12px; font-weight: bold; color: #666;">Filtro Mansione:</label>
            <select v-model="filtroMansioneBacheca" class="input-field" @change="caricaBacheca" style="margin-bottom: 0;">
              <option value="Tutte">Tutte le mansioni</option>
              <option value="Marinaio">Marinaio</option>
              <option value="Preposto al comando">Preposto al comando</option>
              <option value="Comandante">Comandante</option>
              <option value="Timoniere">Timoniere</option>
              <option value="Marinaio polivalente">Marinaio polivalente</option>
              <option value="Direttore di macchina">Direttore di macchina</option>
            </select>
          </div>

          <div v-if="bachecaLoading" style="text-align: center;">Cerco...</div>
          <div v-else>
             <div v-if="suggeritiBacheca.length > 0" style="margin-bottom: 15px;">
                <h4 style="color:var(--warning)">✨ Scambi Ideali per te</h4>
                <div v-for="a in suggeritiBacheca" :key="a.id" class="card-suggested">
                   <AnnuncioFerieCard :annuncio="a" :isAdmin="authStore.devModeActive" :isMe="a.uid === authStore.user.uid" @delete="cancellaAnnuncio" />
                </div>
             </div>
             
             <div v-if="annunciNormali.length === 0" style="text-align: center; color: #666;">Nessun annuncio in bacheca.</div>
             <div v-for="a in annunciNormali" :key="a.id" class="card" style="margin-bottom: 10px; padding: 15px; border-left: 4px solid var(--primary);">
                <AnnuncioFerieCard :annuncio="a" :isAdmin="authStore.devModeActive" :isMe="a.uid === authStore.user.uid" @delete="cancellaAnnuncio" />
             </div>
          </div>
        </div>

      </div>
    </div>

    <!-- Modale Condivisione / Profilo Ferie -->
    <div v-if="modalCondivisione" class="modal-overlay" @click.self="modalCondivisione = false">
      <div class="modal-content">
        <span class="close-btn" @click="modalCondivisione = false">&times;</span>
        <h3 style="text-align: center; margin-top: 5px;">Le mie Ferie</h3>

        <div class="section-title">Dati Profilo</div>
        <p style="font-size: 12px; color:#666;">Questi campi aggiorneranno anche il tuo profilo globale.</p>
        <input type="text" v-model="formProfilo.nome" class="input-field" placeholder="Nome">
        <input type="text" v-model="formProfilo.cognome" class="input-field" placeholder="Cognome">
        <input type="text" v-model="formProfilo.matricola" class="input-field" placeholder="Matricola">
        <input type="tel" v-model="formProfilo.telefono" class="input-field" placeholder="Telefono">
        <select v-model="formProfilo.mansione" class="input-field">
            <option value="Marinaio">Marinaio</option>
            <option value="Preposto al comando">Preposto al comando</option>
            <option value="Comandante">Comandante</option>
            <option value="Timoniere">Timoniere</option>
            <option value="Marinaio polivalente">Marinaio polivalente</option>
            <option value="Direttore di macchina">Direttore di macchina</option>
        </select>

        <div class="section-title">Ferie assegnate</div>
        <input type="number" v-model="formFerie.anno_base" class="input-field" placeholder="Anno Riferimento">
        <div style="display: flex; gap: 5px;">
            <div style="flex: 1;"><label style="font-size: 10px;">Estiva Base:</label>
                <select v-model="formFerie.periodo_estivo" class="input-field">
                   <option v-for="e in jsonFerie.estive" :key="e.n" :value="e.n">{{e.n}}</option>
                </select>
            </div>
            <div style="flex: 1;"><label style="font-size: 10px;">Invernale Base:</label>
                <select v-model="formFerie.periodo_invernale" class="input-field">
                   <option v-for="i in jsonFerie.invernali" :key="i.n" :value="i.n">{{i.n}}</option>
                </select>
            </div>
        </div>

        <div class="section-title">Ferie attuali cambiate (Opzionale se hai scambiato con qualcuno già)</div>
        <div style="display: flex; gap: 5px;">
            <div style="flex: 1;"><label style="font-size: 10px;">Estiva Oggi:</label>
                <select v-model="formFerie.est_attuale" class="input-field">
                   <option v-for="e in jsonFerie.estive" :key="e.n" :value="e.n">{{e.n}}</option>
                </select>
            </div>
            <div style="flex: 1;"><label style="font-size: 10px;">Invernale Oggi:</label>
                <select v-model="formFerie.inv_attuale" class="input-field">
                   <option v-for="i in jsonFerie.invernali" :key="i.n" :value="i.n">{{i.n}}</option>
                </select>
            </div>
        </div>

        <button class="btn btn-action" @click="salvaDatiCondivisi" :disabled="salvandoFerie">
           {{ salvandoFerie ? '⏳ Salvataggio...' : 'Salva Dati' }}
        </button>
      </div>
    </div>

    <!-- Modale Nuovo Annuncio -->
    <div v-if="modalAnnuncio" class="modal-overlay" @click.self="modalAnnuncio = false">
      <div class="modal-content">
        <span class="close-btn" @click="modalAnnuncio = false">&times;</span>
        <h3>Nuovo Annuncio</h3>
        
        <label>Seleziona stagione:</label>
        <select v-model="formAd.tipoTurno" class="input-field" @change="cambioTipoFerie">
            <option value="estive">Estive</option>
            <option value="invernali">Invernali</option>
        </select>
        
        <label style="font-size: 11px; font-weight: bold;">Cedo il periodo:</label>
        <select v-model="formAd.periodoOfferto" class="input-field">
            <option v-for="p in attualiPeriodiOfferta" :key="p.n" :value="p.n">{{ p.n }}</option>
        </select>
        
        <label style="font-size: 11px; font-weight: bold;">Cerco:</label>
        <select v-model="formAd.cercoTipo" class="input-field">
            <option value="mesi">Mesi Generici (es. Qualunque cosa di Luglio)</option>
            <option value="periodo">Periodo Specifico (es. ES2)</option>
        </select>
        
        <div v-if="formAd.cercoTipo === 'mesi'">
            <div class="checkbox-grid">
               <label class="checkbox-label" v-for="m in attualiMesiScelta" :key="m">
                   <input type="checkbox" :value="m" v-model="formAd.cercoMesiValori"> {{ m }}
               </label>
            </div>
        </div>
        <div v-if="formAd.cercoTipo === 'periodo'">
            <select v-model="formAd.cercoPeriodoValore" class="input-field">
                 <option v-for="p in attualiPeriodiScelta" :key="p.n" :value="p.n">{{ p.n }}</option>
            </select>
        </div>
        
        <button class="btn btn-action" @click="pubblicaAnnuncio" :disabled="salvandoAd">
            {{ salvandoAd ? '⏳...' : 'Pubblica Annuncio' }}
        </button>
      </div>
    </div>

    <AuthModal :show="showAuth" @close="showAuth = false" />
    <ProfileModal :show="showProfile" @close="showProfile = false" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import AppHeader from '../components/layout/AppHeader.vue'
import AuthModal from '../components/modals/AuthModal.vue'
import ProfileModal from '../components/modals/ProfileModal.vue'
import UtenteFerieCard from '../components/bacheca/UtenteFerieCard.vue'
import AnnuncioFerieCard from '../components/bacheca/AnnuncioFerieCard.vue'
import { useAuthStore } from '../stores/authStore.js'
import { db } from '../firebase'
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, where, addDoc } from 'firebase/firestore'

const authStore = useAuthStore()

const showAuth = ref(false)
const showProfile = ref(false)
const strikeCount = computed(() => authStore.userProfile?.revoche_ferie || 0)

const hasCondiviso = ref(false)
const myFerieData = ref(null)

const currentTab = ref('cerca')
const jsonFerie = ref({ estive: [], invernali: [] })

const loading = ref(true)

// Modale Condivisione
const modalCondivisione = ref(false)
const salvandoFerie = ref(false)
const formProfilo = reactive({ nome: '', cognome: '', matricola: '', telefono: '', mansione: '' })
const formFerie = reactive({ anno_base: new Date().getFullYear(), periodo_estivo: '', periodo_invernale: '', est_attuale: '', inv_attuale: '' })

// Cerca State
const filtriRicerca = reactive({ anno: new Date().getFullYear(), mansione: 'Tutte', periodo: '' })
const ricercaLoading = ref(false)
const risultatiRicerca = ref([])
const suggeritiRicerca = ref([])
const myAnnunciAttivi = ref([]) // Serve per il match

// Bacheca State
const filtroMansioneBacheca = ref('Tutte')
const bachecaLoading = ref(false)
const annunciNormali = ref([])
const suggeritiBacheca = ref([])

onMounted(async () => {
    try {
        const res = await fetch('/rotazione_ferie.json')
        if(res.ok) jsonFerie.value = await res.json()
    } catch(e) { console.error("Missing rotazione_ferie.json") }
    
    if (authStore.user) await checkStato()
    
    watch(() => authStore.user, async (nv) => {
        if(nv) await checkStato()
        else { hasCondiviso.value = false; myFerieData.value = null; }
    })
})

const apriModaleCondivisione = () => {
    const prof = authStore.userProfile || {}
    formProfilo.nome = prof.nome || ''
    formProfilo.cognome = prof.cognome || ''
    formProfilo.matricola = prof.matricola || ''
    formProfilo.telefono = prof.telefono || ''
    formProfilo.mansione = prof.mansione || 'Marinaio'
    
    if(myFerieData.value) {
        formFerie.anno_base = myFerieData.value.anno_base
        formFerie.periodo_estivo = myFerieData.value.periodo_estivo
        formFerie.periodo_invernale = myFerieData.value.periodo_invernale
        formFerie.est_attuale = myFerieData.value.est_attuale || myFerieData.value.periodo_estivo
        formFerie.inv_attuale = myFerieData.value.inv_attuale || myFerieData.value.periodo_invernale
    }
    modalCondivisione.value = true
}

const checkStato = async () => {
    if (!authStore.user) return
    if (strikeCount.value >= 3 && !authStore.devModeActive) return // Bloccato

    const ferieRef = doc(db, "ferie_condivise", authStore.user.uid)
    const ferieSnap = await getDoc(ferieRef)
    
    if (ferieSnap.exists()) {
        hasCondiviso.value = true
        myFerieData.value = ferieSnap.data()
        
        filtriRicerca.mansione = myFerieData.value.mansione
        filtroMansioneBacheca.value = myFerieData.value.mansione
        
        // Pulizia db e load miei annunci (come legacy)
        let qCleanup = authStore.devModeActive ? collection(db, "bacheca_ferie") : query(collection(db, "bacheca_ferie"), where("uid", "==", authStore.user.uid))
        const adsSnap = await getDocs(qCleanup)
        const oggi = new Date()
        myAnnunciAttivi.value = []
        
        adsSnap.forEach(d => {
            const a = d.data(); a.id = d.id; let scaduto = false; const dataPub = new Date(a.timestamp); const mesePub = dataPub.getMonth()
            // Cleanup Logic Legacy
             if (a.tipo_ferie === 'estive') { 
                 let aT = dataPub.getFullYear(); if(mesePub > 8) aT++; 
                 if(oggi > new Date(aT, 9, 1)) scaduto = true;
             } else {
                 let aT = dataPub.getFullYear(); if(mesePub > 4) aT++; 
                 if(oggi > new Date(aT, 5, 1)) scaduto = true;
             }
             if(!scaduto) {
                 if (a.uid === authStore.user.uid) myAnnunciAttivi.value.push(a)
             } else { deleteDoc(doc(db, "bacheca_ferie", d.id)).catch(()=>{}) }
        })
        
        eseguiRicerca()
        caricaBacheca()
    } else {
        hasCondiviso.value = false
    }
}

const salvaDatiCondivisi = async () => {
    if(!formProfilo.nome || !formFerie.periodo_estivo || !formFerie.periodo_invernale || !formFerie.anno_base) {
        return alert("Compila i campi ferie e profilo!")
    }
    salvandoFerie.value = true
    try {
        await authStore.updateProfile({ ...formProfilo }) // Aggiorna doc utente globale store!
        const payload = {
            uid: authStore.user.uid,
            nome: formProfilo.nome, cognome: formProfilo.cognome, 
            mansione: formProfilo.mansione, matricola: formProfilo.matricola, telefono: formProfilo.telefono,
            anno_base: formFerie.anno_base, periodo_estivo: formFerie.periodo_estivo, periodo_invernale: formFerie.periodo_invernale,
            est_attuale: formFerie.est_attuale || formFerie.periodo_estivo, inv_attuale: formFerie.inv_attuale || formFerie.periodo_invernale
        }
        await setDoc(doc(db, "ferie_condivise", authStore.user.uid), payload)
        modalCondivisione.value = false
        await checkStato()
    } catch(e) {
        alert("Errore salvataggio")
    } finally { salvandoFerie.value = false }
}

const revocaCondivisione = async () => {
    if (authStore.devModeActive) {
        await deleteDoc(doc(db, "ferie_condivise", authStore.user.uid))
        await checkStato()
        return
    }
    const r = strikeCount.value
    if(confirm(`Attenzione! Ti rimangono ${2-r} tentativi prima del blocco.`)) {
        await deleteDoc(doc(db, "ferie_condivise", authStore.user.uid))
        await authStore.updateProfile({ revoche_ferie: r + 1})
        await checkStato()
    }
}

const calcFerie = (uData, type, targetAnno) => {
    const arr = type === 'estive' ? jsonFerie.value.estive : jsonFerie.value.invernali
    if(!arr || arr.length===0) return ""
    const baseP = type === 'estive' ? uData.periodo_estivo : uData.periodo_invernale
    if (targetAnno === uData.anno_base) return type === 'estive' ? (uData.est_attuale || baseP) : (uData.inv_attuale || baseP)
    const idx = arr.findIndex(o => o.n === baseP)
    if (idx === -1) return "N/D"
    const diff = targetAnno - uData.anno_base
    const ni = (((idx + diff) % arr.length) + arr.length) % arr.length
    return arr[ni].n
}

const eseguiRicerca = async () => {
    if(!hasCondiviso.value) return
    ricercaLoading.value = true
    try {
        const snap = await getDocs(collection(db, "ferie_condivise"))
        const targetAnno = filtriRicerca.anno || new Date().getFullYear()
        
        risultatiRicerca.value = []
        suggeritiRicerca.value = []
        
        snap.forEach(d => {
            const u = d.data()
            if (filtriRicerca.mansione !== "Tutte" && u.mansione !== filtriRicerca.mansione) return
            
            const ec = calcFerie(u, 'estive', targetAnno)
            const ic = calcFerie(u, 'invernali', targetAnno)
            if (filtriRicerca.periodo && ec !== filtriRicerca.periodo && ic !== filtriRicerca.periodo) return
            
            // Match Suggestion Logic Legacy
            const checkMatch = (p, t) => {
                return myAnnunciAttivi.value.some(a => a.tipo_ferie === t && (a.cerco_tipo === 'periodo' ? a.cerco_valori[0] === p : a.cerco_valori.some(m => p.toLowerCase().includes(m.toLowerCase()))))
            }
            const isMatch = u.uid !== authStore.user.uid && (checkMatch(ec, 'estive') || checkMatch(ic, 'invernali'))
            
            if (isMatch) suggeritiRicerca.value.push(u)
            else risultatiRicerca.value.push(u)
        })
    }catch(e){}
    ricercaLoading.value = false
}

// Bacheca Logic
const modalAnnuncio = ref(false)
const salvandoAd = ref(false)
const formAd = reactive({ tipoTurno: 'estive', periodoOfferto: '', cercoTipo: 'mesi', cercoMesiValori: [], cercoPeriodoValore: '' })

const attualiPeriodiScelta = computed(() => jsonFerie.value[formAd.tipoTurno] || [])
const attualiMesiScelta = computed(() => formAd.tipoTurno === 'estive' ? ['Giugno','Luglio','Agosto','Settembre'] : ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Ottobre','Novembre','Dicembre'] )
const attualiPeriodiOfferta = computed(() => jsonFerie.value[formAd.tipoTurno] || [])

const apriModaleAnnuncio = () => {
    formAd.tipoTurno = 'estive'
    cambioTipoFerie()
    modalAnnuncio.value = true
}

const cambioTipoFerie = () => {
    formAd.cercoMesiValori = []
    if (myFerieData.value) {
        formAd.periodoOfferto = formAd.tipoTurno === 'estive' ? (myFerieData.value.est_attuale || myFerieData.value.periodo_estivo) : (myFerieData.value.inv_attuale || myFerieData.value.periodo_invernale)
    }
}

const pubblicaAnnuncio = async () => {
    const isMesi = formAd.cercoTipo === 'mesi'
    if(!formAd.periodoOfferto || (isMesi && formAd.cercoMesiValori.length===0) || (!isMesi && !formAd.cercoPeriodoValore)) {
        return alert("Completa i dati dell'annuncio.")
    }
    salvandoAd.value = true
    try {
        const payload = { 
                uid: authStore.user.uid, nome: myFerieData.value.nome, cognome: myFerieData.value.cognome, 
                telefono: myFerieData.value.telefono, mansione: myFerieData.value.mansione, matricola: myFerieData.value.matricola, 
                timestamp: Date.now(), tipo_ferie: formAd.tipoTurno, periodo_offerto: formAd.periodoOfferto, 
                cerco_tipo: formAd.cercoTipo, cerco_valori: isMesi ? formAd.cercoMesiValori : [formAd.cercoPeriodoValore] 
        }
        await addDoc(collection(db, "bacheca_ferie"), payload)
        modalAnnuncio.value = false
        await checkStato() // Ricarica filtri attivi e ricalcola
    }catch(e){alert("Errore")}finally{salvandoAd.value = false}
}

const caricaBacheca = async () => {
    if(!hasCondiviso.value) return
    bachecaLoading.value = true
    try{
        let q = filtroMansioneBacheca.value === "Tutte" ? collection(db, "bacheca_ferie") : query(collection(db, "bacheca_ferie"), where("mansione", "==", filtroMansioneBacheca.value))
        const ads = await getDocs(q)
        annunciNormali.value = []
        suggeritiBacheca.value = []
        
        ads.forEach(d => {
            const a = d.data(); a.id = d.id;
            const isMe = a.uid === authStore.user.uid
            
            let isMatch = false
            if (!isMe) {
               isMatch = myAnnunciAttivi.value.some(m => m.tipo_ferie === a.tipo_ferie && (m.cerco_tipo === 'periodo' ? m.cerco_valori[0] === a.periodo_offerto : m.cerco_valori.some(mes => a.periodo_offerto.toLowerCase().includes(mes.toLowerCase()))))
            }
            if(isMatch) suggeritiBacheca.value.push(a)
            else annunciNormali.value.push(a)
        })
    }catch(e){}
    bachecaLoading.value = false
}

const cancellaAnnuncio = async (id) => {
    if(confirm("Vuoi cancellare questo annuncio?")) {
        await deleteDoc(doc(db, "bacheca_ferie", id))
        await checkStato()
    }
}
</script>

<style scoped>
.rotazione-ferie-view { display: flex; flex-direction: column; align-items: center; width: 100%; }
.content-area { width: 100%; max-width: 400px; padding: 0 20px 40px 20px; box-sizing: border-box; }

.card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); margin-bottom: 15px; }
.card-suggested { background: #fffff8; border: 2px solid var(--warning); padding: 15px; border-radius: 12px; margin-bottom: 15px; position: relative;}
.card-suggested::before { content: "✨ MATCH PERFETTO"; position: absolute; top: -10px; right: 15px; background: var(--warning); color: #fff; font-size: 10px; font-weight: bold; padding: 3px 8px; border-radius: 10px; }

.top-actions { display: flex; gap: 10px; margin-bottom: 15px; }
.btn-top { flex: 1; padding: 10px; font-size: 13px; font-weight: bold; border-radius: 8px; border: none; cursor: pointer; color: white; }
.btn-action { background-color: var(--success); color: white; border: none; padding: 15px; font-size: 16px; font-weight: bold; border-radius: 10px; cursor: pointer; width: 100%; transition: opacity 0.2s; margin-top: 10px;}

.tabs { display: flex; background: #e9ecef; border-radius: 10px; overflow: hidden; margin-bottom: 15px; width: 100%; }
.tab-btn { flex: 1; padding: 12px; text-align: center; font-weight: bold; color: #666; cursor: pointer; background: transparent; border: none; }
.tab-btn.active { background: var(--primary); color: white; }

.input-field { width: 100%; padding: 12px; margin-bottom: 10px; border: 2px solid #e9ecef; border-radius: 8px; box-sizing: border-box; font-size: 14px; background-color: white; font-family: inherit;}
.warning-box { background: #fff3cd; color: #856404; padding: 12px; border-radius: 8px; font-size: 13px; text-align: left; margin-bottom: 15px; border: 1px solid #ffeeba; }
.section-title { font-size: 12px; font-weight: bold; color: var(--primary); text-transform: uppercase; margin: 15px 0 8px 0; border-bottom: 1px solid #eee; padding-bottom: 3px; }

.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center; z-index: 5000; padding: 20px; box-sizing: border-box; backdrop-filter: blur(3px); }
.modal-content { background: white; padding: 25px; border-radius: 15px; width: 100%; max-width: 350px; position: relative; max-height: 90vh; overflow-y: auto;}
.close-btn { position: absolute; right: 15px; top: 10px; font-size: 28px; cursor: pointer; color: var(--text-muted); }

.checkbox-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; }
.checkbox-label { display: flex; align-items: center; gap: 8px; font-size: 13px; background: #f8f9fa; padding: 8px; border-radius: 6px; border: 1px solid #ddd;}
</style>

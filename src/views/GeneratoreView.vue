<template>
  <div class="generatore-view">
    <div class="header">
        <router-link to="/" style="color: white; text-decoration: none; font-size: 24px;">←</router-link>
        <h2>🔑 Generatore</h2>
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
        <h3>🔑 Crea Nuovo Accesso</h3>
        <input type="text" v-model="nomeCollega" placeholder="Cognome e Nome collega" class="input-field">
        <button class="btn-action" @click="generaESalva">Genera e Salva</button>
        
        <div v-if="codiceGenerato" class="codice-display-container">
            <span class="codice-testo">{{ codiceGenerato }}</span>
            <button class="btn-copia" @click="copiaTesto(codiceGenerato)" title="Copia codice">📋</button>
        </div>

        <div class="status-log" :style="{color: statusLogAuthColor}">{{ statusLogAuth }}</div>
        <button class="btn-action btn-secondary" @click="apriGestioneCodici" style="margin-top: 20px;">Gestisci Codici Attivi</button>
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

const { ghOwner, ghRepo, ghToken, saveAuthParams, clearAuthParams, fetchFile, updateFile } = useGitHub()
const rememberToken = ref(false)

onMounted(() => {
    if (ghToken.value) { rememberToken.value = true }
})

const gestisciMemoriaToken = () => {
    if (rememberToken.value) saveAuthParams()
    else clearAuthParams()
}

const copiaTesto = (t) => { navigator.clipboard.writeText(t).then(()=>alert("Codice copiato: "+t)) }

// Gestione Auth Codici (Stessa logica di AdminView)
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
        statusLogAuth.value="✅ Salvato!"; statusLogAuthColor.value="var(--success)";
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
</script>

<style scoped>
.generatore-view { font-family: Arial, sans-serif; background-color: var(--dark); color: white; min-height: 100vh; padding: 20px; display: flex; flex-direction: column; align-items: center; box-sizing: border-box; }
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

.codice-display-container { display: flex; align-items: center; justify-content: center; margin-top: 15px; }
.codice-testo { font-size: 26px; font-weight: bold; color: #ffc107; letter-spacing: 3px; }
.btn-copia { background: none; border: none; font-size: 24px; cursor: pointer; margin-left: 10px; transition: transform 0.1s; }
.btn-copia:active { transform: scale(0.9); }

.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 3000; display:flex; align-items: center; justify-content: center; }
.modal-content { background: white; padding: 20px; border-radius: 12px; max-width: 90%; width: 400px; max-height: 85vh; overflow-y: auto; position: relative; color: var(--text-color); }
.close-modal { position: absolute; right: 15px; top: 15px; font-size: 28px; cursor: pointer; color: #666; font-weight: bold; }
.codice-item { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 12px; border-left: 4px solid var(--primary); display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
.codice-info { font-size: 14px; line-height: 1.4; color: black; }
.codice-info strong { font-size: 16px; color: var(--primary); display: block; margin-bottom: 4px; text-transform: capitalize; }
.btn-revoca { background: var(--danger); color: white; border: none; padding: 10px 14px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 13px; }
</style>

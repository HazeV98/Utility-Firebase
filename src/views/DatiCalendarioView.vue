<template>
  <div class="dati-calendario-view">
    <AppHeader />

    <div class="content-area">
        <div class="input-group">
            <label>Da (Inizio):</label>
            <input type="date" v-model="dateStart" class="input-field">
            
            <label>A (Fine):</label>
            <input type="date" v-model="dateEnd" class="input-field">
            
            <div class="input-help">Lascia vuoti i campi per calcolare i dati totali registrati.</div>
        </div>

        <button class="btn-calc" @click="calcolaStatistiche">Calcola Statistiche</button>

        <div v-if="showResults" class="results-container">
            <h3 class="results-title">{{ isTotal ? 'Risultati Totali Registrati' : 'Risultati del periodo' }}</h3>
            
            <div class="stat-row">
                <div class="stat-label">🏖️ Ferie (FER)</div>
                <div class="stat-value">{{ stats.ferie }}</div>
            </div>
            <div class="stat-row">
                <div class="stat-label">🍼 Congedi Parentali (KNOP)</div>
                <div class="stat-value parental">{{ stats.parentali }}</div>
            </div>
            <div class="stat-row">
                <div class="stat-label">🔴 Sospesi Riposo</div>
                <div class="stat-value highlight">{{ stats.sospesi }}</div>
            </div>
            <div class="stat-row">
                <div class="stat-label">🌫️ Indennità Nebbia</div>
                <div class="stat-value nebbia">{{ stats.nebbia }}</div>
            </div>
            <div class="stat-row">
                <div class="stat-label">⚕️ Malattia (KMAL)</div>
                <div class="stat-value">{{ stats.malattia }}</div>
            </div>
            <div class="stat-row">
                <div class="stat-label">🩸 Donazione Sangue</div>
                <div class="stat-value">{{ stats.sangue }}</div>
            </div>
            <div class="stat-row">
                <div class="stat-label">⏱️ Ore Straordinario</div>
                <div class="stat-value">{{ formattOre(stats.straordMinutiTotali) }}</div>
            </div>
            <div class="stat-row">
                <div class="stat-label">💸 Permesso Senza Paga</div>
                <div class="stat-value highlight">{{ formattOre(stats.permessoSPMinutiTotali) }}</div>
            </div>
        </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import AppHeader from '../components/layout/AppHeader.vue'

const dateStart = ref('')
const dateEnd = ref('')
const showResults = ref(false)
const isTotal = ref(true)

const stats = reactive({
    ferie: 0,
    parentali: 0,
    sospesi: 0,
    nebbia: 0,
    malattia: 0,
    sangue: 0,
    straordMinutiTotali: 0,
    permessoSPMinutiTotali: 0
})

const resetStats = () => {
    Object.keys(stats).forEach(k => stats[k] = 0)
}

const formattOre = (totMin) => {
    return `${Math.floor(totMin / 60)}h ${totMin % 60}m`
}

const calcolaStatistiche = () => {
    const startStr = dateStart.value
    const endStr = dateEnd.value

    if ((startStr && !endStr) || (!startStr && endStr)) {
        return alert("Seleziona entrambe le date, oppure lasciale entrambe vuote per i dati totali.")
    }

    if (startStr && endStr && startStr > endStr) {
        return alert("La data d'inizio deve essere precedente alla fine!")
    }

    let state = JSON.parse(localStorage.getItem('myTurniApp')) || {}
    resetStats()

    let dateArray = []
    
    if (!startStr && !endStr) {
        isTotal.value = true
        let allDates = new Set([
            ...Object.keys(state.variazioni || {}),
            ...Object.keys(state.sospesoRiposo || {}),
            ...Object.keys(state.straordinario || {}),
            ...Object.keys(state.nebbia || {}),
            ...Object.keys(state.permessoSP || {})
        ])
        dateArray = Array.from(allDates)
        if (dateArray.length === 0) alert("Nessun dato registrato nel calendario.")
    } else {
        isTotal.value = false
        let currentDate = new Date(startStr)
        let endDate = new Date(endStr)
        while (currentDate <= endDate) {
            let dStr = currentDate.getFullYear() + "-" + String(currentDate.getMonth() + 1).padStart(2, '0') + "-" + String(currentDate.getDate()).padStart(2, '0')
            dateArray.push(dStr)
            currentDate.setDate(currentDate.getDate() + 1)
        }
    }

    dateArray.forEach(dStr => {
        let varTurno = state.variazioni && state.variazioni[dStr] ? state.variazioni[dStr].toUpperCase() : ""

        let isSospesoSpuntato = state.sospesoRiposo && state.sospesoRiposo[dStr]
        let isSospesoTesto = (varTurno === "SOSPESO" || varTurno === "SOR")
        if (isSospesoSpuntato || isSospesoTesto) stats.sospesi++
        
        if (state.nebbia && state.nebbia[dStr]) stats.nebbia++
        if (varTurno === "KNOP" || varTurno.includes("KNOP")) stats.parentali++
        if (varTurno.includes("FER") || varTurno === "FERIE") stats.ferie++
        if (varTurno.includes("KMAL") || varTurno === "MALATTIA") stats.malattia++
        if (varTurno.includes("AVIS") || varTurno === "AVIS") stats.sangue++

        if (state.straordinario && state.straordinario[dStr]) {
            let h = parseInt(state.straordinario[dStr].ore) || 0
            let m = parseInt(state.straordinario[dStr].minuti) || 0
            stats.straordMinutiTotali += (h * 60) + m
        }
        if (state.permessoSP && state.permessoSP[dStr]) {
            let hSP = parseInt(state.permessoSP[dStr].ore) || 0
            let mSP = parseInt(state.permessoSP[dStr].minuti) || 0
            stats.permessoSPMinutiTotali += (hSP * 60) + mSP
        }
    })

    showResults.value = true
}

onMounted(() => {
    calcolaStatistiche()
})
</script>

<style scoped>
.dati-calendario-view { display: flex; flex-direction: column; align-items: center; width: 100%; }
.content-area { width: 100%; max-width: 400px; padding: 0 20px 40px 20px; box-sizing: border-box; display: flex; flex-direction: column; gap: 15px; }

.input-group { background: white; padding: 15px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); display: flex; flex-direction: column; gap: 10px; }
.input-group label { font-size: 14px; font-weight: bold; color: #555; }
.input-field { padding: 12px; border: 2px solid #e9ecef; border-radius: 8px; font-size: 16px; font-family: inherit; width: 100%; box-sizing: border-box; }
.input-help { font-size: 12px; color: #888; margin-top: -5px; }

.btn-calc { background-color: var(--primary); color: white; border: none; padding: 16px; font-size: 18px; font-weight: bold; border-radius: 12px; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: transform 0.2s; width: 100%;}
.btn-calc:active { transform: translateY(2px); }

.results-container { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-top: 10px; }
.results-title { color: var(--primary); font-size: 18px; margin-top: 0; margin-bottom: 15px; border-bottom: 2px solid #eee; padding-bottom: 10px; }

.stat-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f4f7f6; }
.stat-row:last-child { border-bottom: none; }
.stat-label { font-size: 16px; color: #555; display: flex; align-items: center; gap: 8px; }
.stat-value { font-size: 18px; font-weight: bold; color: var(--primary); }
.stat-value.highlight { color: #f5365c; }
.stat-value.parental { color: #8965e0; }
.stat-value.nebbia { color: #5e72e4; }
</style>

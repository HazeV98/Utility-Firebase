<template>
  <div class="calendar-view">
    <!-- SIDEBAR OVERLAY -->
    <div v-if="sidebarOpen || rightSidebarOpen" class="sidebar-overlay" @click="sidebarOpen=false; rightSidebarOpen=false"></div>

    <!-- LEFT SIDEBAR (Navigation) -->
    <div class="sidebar" :class="{open: sidebarOpen}">
      <div class="sidebar-header">
        <h3 style="margin:0; color:white;">Menu</h3>
        <button style="background:none; border:none; color:white; font-size:24px; cursor:pointer;" @click="sidebarOpen=false">✕</button>
      </div>
      <router-link to="/" class="sidebar-link">🏠 Home Page</router-link>
      <router-link to="/calendario" class="sidebar-link" style="background-color: #f4f7f6; color: var(--turno,#5e72e4); font-weight: bold;">📅 Calendario</router-link>
      <router-link to="/dati_calendario" class="sidebar-link">📊 Statistiche Calendario</router-link>
      <router-link to="/turni" class="sidebar-link">🔄 Turni</router-link>
      <router-link to="/bacheca_turni" class="sidebar-link">🔄 Bacheca Turni</router-link>
      <router-link to="/rubrica" class="sidebar-link">📞 Rubrica Colleghi</router-link>
      <router-link to="/rotazione_ferie" class="sidebar-link">🌴 Rotazione Ferie</router-link>
      <router-link to="/orari" class="sidebar-link">🕒 Orari</router-link>
      <router-link to="/documenti" class="sidebar-link">📄 Documenti</router-link>
      <router-link to="/link" class="sidebar-link">🔗 Link</router-link>
      <router-link to="/contatti" class="sidebar-link">📇 Contatti</router-link>
      <router-link to="/buoni" class="sidebar-link">🍝 Buoni Pasto</router-link>
      <router-link to="/dds" class="sidebar-link">📂 Archivio DDS</router-link>
      <router-link to="/guida" class="sidebar-link">📖 Guida</router-link>
    </div>

    <!-- RIGHT SIDEBAR (Actions) -->
    <div class="right-sidebar" :class="{open: rightSidebarOpen}">
      <div class="sidebar-header" style="background-color: #32325d;">
        <h3 style="margin:0; color:white;">Azioni</h3>
        <button style="background:none; border:none; color:white; font-size:24px; cursor:pointer;" @click="rightSidebarOpen=false">✕</button>
      </div>
      <div style="padding: 20px; display: flex; flex-direction: column; gap: 15px;">
        <button class="btn btn-reset" style="background: #2dce89;" @click="apriMultiEdit()">✏️ Modifica Multipla</button>
        <button class="btn btn-reset" style="background: #11cdef;" @click="apriColoriRotazione()">🎨 Colori Rotazione</button>
        <hr style="width: 100%; border: 0; border-top: 1px solid #eee;">
        <button class="btn btn-reset" style="background: #5e72e4;" @click="scaricaPDF()">📄 Esporta PDF (Tipo 1)</button>
        <button class="btn btn-reset" style="background: #5e72e4;" @click="showPdfTipo2=true; rightSidebarOpen=false">📄 Esporta PDF (Tipo 2)</button>
        <button class="btn btn-reset" style="background: #5e72e4;" @click="showIcs=true; rightSidebarOpen=false">📅 Esporta ICS</button>
        <hr style="width: 100%; border: 0; border-top: 1px solid #eee;">
        <button class="btn btn-reset" style="background: #20c997;" @click="showFerie=true; rightSidebarOpen=false">🌴 Ferie Programmate</button>
        <input type="file" ref="pdfBibbiaInput" style="display:none" accept=".pdf" @change="elaboraPdfBibbia">
        <button class="btn btn-reset" style="background: #e83e8c;" @click="rightSidebarOpen=false; $refs.pdfBibbiaInput.click()">📄 Importa Bibbia</button>
        <button class="btn btn-reset" style="background: #f1c40f; color: #32325d;" @click="showCambioBibbia=true; rightSidebarOpen=false">🔄 Cambio Bibbia</button>
        <button class="btn btn-reset" style="background: #adb5bd;" @click="showBackup=true; rightSidebarOpen=false">💾 Backup Dati</button>
        <button class="btn btn-reset" style="background: #f5365c;" @click="showReset=true; rightSidebarOpen=false">🗑️ Reset Totale</button>
      </div>
    </div>

    <!-- TOP BAR -->
    <div class="top-bar">
      <div style="display: flex; align-items: center;">
        <button class="hamburger-btn" @click="sidebarOpen=true">☰</button>
        <div>
          <h2 style="margin:0; font-size: 18px;">Gestione Turni</h2>
          <span class="deposito-tag">{{ store.state.depositoAttivo || 'Configurazione' }}</span>
        </div>
      </div>
      <button class="hamburger-btn" style="margin-right: 0;" @click="rightSidebarOpen=true">⋮</button>
    </div>

    <!-- CALENDAR -->
    <div id="calendar-el" ref="calendarEl" style="background: white; padding: 2px; border-radius: 15px; margin: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);"></div>

    <div class="disclaimer-banner">
      ⚠️ Questo è uno strumento non ufficiale che può presentare errori. L'ordine dei turni cambia periodicamente, I turni a lungo termine vanno quindi considerati indicativi.
    </div>

    <!-- =========================================================== -->
    <!-- MODALS -->
    <!-- =========================================================== -->

    <!-- WELCOME MODAL -->
    <div v-if="showWelcome" class="modal">
      <div class="modal-content">
        <h3 :style="{color: 'var(--turno,#5e72e4)', marginTop: 0}">{{ welcomeTitle }}</h3>
        <p class="instruction-text">{{ welcomeDesc }}</p>
        <select v-if="showDepotSelect" v-model="selectedDepot" @change="depotSelected=true">
          <option value="" disabled>Scegli...</option>
          <optgroup label="Disponibili">
            <option value="disp_indet">Disponibile 6-2-6-1</option>
            <option value="disp_det">Disponibile 5-1</option>
          </optgroup>
          <optgroup label="Rotazioni">
            <option value="rot_fnove">Rotazione F.Nove</option>
            <option value="spez_fnove">Spezzati F.Nove</option>
            <option value="tc_spez_fnove">T.C. Spezzati F.Nove</option>
            <option value="rot_proma">Rotazione P.Roma</option>
            <option value="spez_proma">Spezzati P.Roma</option>
            <option value="rot_szaccaria">Rotazione S.Zaccaria</option>
            <option value="spez_szaccaria">Spezzati S.Zaccaria</option>
            <option value="tc_spez_szaccaria">T.C. Spezzati S.Zaccaria</option>
            <option value="rot_lido">Rotazione Lido</option>
            <option value="spez_lido">Spezzati Lido</option>
            <option value="tc_spez_lido">T.C. Spezzati Lido</option>
            <option value="rot_linea12">Rotazione Linea 12</option>
            <option value="rot_linea13">Rotazione Linea 13</option>
            <option value="rot_linea14">Rotazione Linea 14 M/N</option>
            <option value="rot_linea14_mb">Rotazione Linea 14 M/B</option>
            <option value="rot_17sn">Rotazione Linea 17 S. Nicolò</option>
            <option value="tc_rot_17sn">T.C. Rotazione 17 S. Nicolò</option>
            <option value="rot_17tr">Rotazione Linea 17 Tron.</option>
            <option value="tc_rot_17tr">T.C. Rotazione Linea 17 Tronc.</option>
          </optgroup>
        </select>
        <button class="btn" :style="{background: depotSelected ? 'var(--turno,#5e72e4)' : '#adb5bd'}" :disabled="!depotSelected" @click="onConfermaRotazione">{{ welcomeBtnText }}</button>
      </div>
    </div>

    <!-- STEP MODAL (Setup Wizard) -->
    <div v-if="showStep" class="modal">
      <div class="modal-content">
        <h3 :style="{color:'var(--turno,#5e72e4)', marginTop:0}">{{ stepTitle }}</h3>
        <span v-if="stepDateDisplay" style="font-weight:bold; color:var(--turno,#5e72e4); display:block; margin-bottom:10px;">{{ stepDateDisplay }}</span>
        <p class="instruction-text" v-html="stepDesc"></p>
        <div v-if="stepShowSelect" v-html="stepSelectHtml" style="margin-bottom: 10px;"></div>
        <div v-if="stepShowTcButtons" style="display: flex; flex-direction: column; gap: 10px;">
          <button class="btn" style="background: var(--turno,#5e72e4);" @click="onTcPattern('doppio')">Turni Doppi (es. Turno, Turno)</button>
          <button class="btn" style="background: var(--disp,#feb236); color: #32325d;" @click="onTcPattern('disp')">{{ tcAltText }}</button>
        </div>
        <button v-if="stepShowConfirmDate" class="btn" style="background: var(--riposo,#1e8449);" @click="onProcediConfigurazione()">Sì, conferma data</button>
        <button v-if="stepShowConfirmFinal" class="btn" style="background: var(--riposo,#1e8449);" @click="onAttivaRotazioneFinale()">Conferma e Attiva</button>
        <button v-if="stepShowBack" class="btn" style="background: #adb5bd;" @click="onTornaRotazione()">Indietro (Cambia Rotazione)</button>
        <button class="btn" style="background: #f8f9fa; color: #525f7f; margin-top: 15px;" @click="showStep=false">{{ stepCloseText }}</button>
      </div>
    </div>

    <!-- EDIT MODAL (Day Click) -->
    <div v-if="showEdit" class="modal" @click.self="showEdit=false">
      <div class="modal-content">
        <h3 style="margin-top:0;">{{ editModalDate }}</h3>
        <div v-if="editVariantiHtml" style="background-color: #fff3cd; border: 1px solid #ffeeba; border-radius: 10px; color: #856404; padding: 12px; margin-bottom: 15px; font-size: 14px; font-weight: bold; line-height: 1.4; text-align: left;" v-html="editVariantiHtml"></div>
        <div v-if="editInfoHtml" style="font-size:0.9em; margin-bottom:15px; padding:10px; background:#f8f9fa; border-radius:10px; text-align:left; color:#525f7f;" v-html="editInfoHtml"></div>
        <button v-if="editShowImgBtn" class="btn" style="background: #2dce89; margin-bottom: 15px;" @click="apriImmagineTurno()">Mostra Immagine Turno</button>
        <input type="text" v-model="editTurnoInput" placeholder="Inserisci il turno" @input="editTurnoInput = editTurnoInput.toUpperCase()" @keydown.enter="onSalvaCambioSingolo" style="width: 100%; box-sizing: border-box; margin: 15px 0; padding: 15px; border: 2px solid #e9ecef; border-radius: 12px; font-size: 16px;">
        <button class="btn" style="background: #32325d" @click="onSalvaCambioSingolo" :disabled="!editTurnoInput">Salva Cambio</button>
        <button class="btn" style="background: #adb5bd;" @click="onResetGiorno">Ripristina Originale</button>
        <button class="btn" style="background: #11cdef;" @click="apriAltroModal()">Altro (Note, Nebbia, Straord, Buoni, Sospesi...)</button>
        <button class="btn" style="background: #f8f9fa; color: #525f7f; margin-top: 15px;" @click="showEdit=false">Chiudi</button>
      </div>
    </div>

    <!-- ALTRO MODAL -->
    <div v-if="showAltro" class="modal" @click.self="chiudiAltroModal()">
      <div class="modal-content">
        <h3 style="margin-top:0; color: var(--text,#32325d);">Altre Opzioni</h3>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 12px; margin-bottom: 15px; text-align: left; border: 2px solid #e9ecef;">
          <label class="chk-label"><input type="checkbox" v-model="altroSospeso" style="width: 22px; height: 22px; margin-right: 10px; accent-color: #f5365c;"> Sospeso Riposo</label>
          <label class="chk-label"><input type="checkbox" v-model="altroNebbia" style="width: 22px; height: 22px; margin-right: 10px; accent-color: #5e72e4;"> 🌫️ Indennità Nebbia</label>
          <label class="chk-label"><input type="checkbox" v-model="altroBuono" style="width: 22px; height: 22px; margin-right: 10px; accent-color: #f1c40f;"> 🍝 Buono Pasto Utilizzato</label>
          <label class="chk-label"><input type="checkbox" v-model="altroStraord" style="width: 22px; height: 22px; margin-right: 10px; accent-color: #5e72e4;" @change="altroStraordChanged"> ⏱️ Straordinario</label>
          <div v-if="altroStraord" style="display: flex; margin-top: 10px; gap: 10px;">
            <input type="number" v-model="altroStraordOre" placeholder="Ore" min="0" style="flex: 1; padding: 12px; border: 2px solid #e9ecef; border-radius: 10px; font-size: 15px;">
            <input type="number" v-model="altroStraordMin" placeholder="Minuti" min="0" max="59" style="flex: 1; padding: 12px; border: 2px solid #e9ecef; border-radius: 10px; font-size: 15px;">
          </div>
          <label class="chk-label" style="margin-top: 15px;"><input type="checkbox" v-model="altroPermesso" style="width: 22px; height: 22px; margin-right: 10px; accent-color: #f5365c;"> 💸 Permesso Senza Paga</label>
          <div v-if="altroPermesso" style="display: flex; margin-top: 10px; gap: 10px;">
            <input type="number" v-model="altroPermessoOre" placeholder="Ore" min="0" style="flex: 1; padding: 12px; border: 2px solid #e9ecef; border-radius: 10px; font-size: 15px;">
            <input type="number" v-model="altroPermessoMin" placeholder="Minuti" min="0" max="59" style="flex: 1; padding: 12px; border: 2px solid #e9ecef; border-radius: 10px; font-size: 15px;">
          </div>
          <hr style="border: 0; border-top: 1px solid #e9ecef; margin: 15px 0;">
          <label style="display: block; font-size: 15px; color: #525f7f; margin-bottom: 8px; font-weight: bold;">📝 Note:</label>
          <textarea v-model="altroNota" placeholder="Scrivi una nota..." style="width: 100%; box-sizing: border-box; padding: 10px; border: 2px solid #e9ecef; border-radius: 10px; font-size: 14px; font-family: inherit; resize: vertical; min-height: 70px;"></textarea>
        </div>
        <div style="text-align: left; margin-bottom: 10px; color: #525f7f; font-weight: bold; font-size: 15px;">Colore Sfondo:</div>
        <div style="display: flex; justify-content: center; flex-wrap: wrap; margin-bottom: 15px;">
          <div v-for="c in colorOptions" :key="c" class="color-circle" :style="{background: c}" :class="{selected: altroColore===c}" @click="altroColore=c"></div>
        </div>
        <button class="btn" style="background: #e9ecef; color: #32325d; padding: 10px; font-size: 14px;" @click="altroColore=''">Rimuovi Colore</button>
        <button class="btn" style="background: #32325d; margin-top: 20px;" @click="onSalvaAltro">Salva</button>
        <button class="btn" style="background: #f8f9fa; color: #525f7f; margin-top: 10px;" @click="chiudiAltroModal">Annulla</button>
      </div>
    </div>

    <!-- MULTI EDIT -->
    <div v-if="showMultiEdit" class="modal">
      <div class="modal-content">
        <h3 style="color: #2dce89; margin-top: 0;">Modifica Multipla</h3>
        <p class="instruction-text" style="font-size: 14px;">Applica lo stesso turno a più giorni consecutivi (es. FERIE).</p>
        <label class="edit-label">Da (Inizio):</label>
        <input type="date" v-model="multiStart">
        <label class="edit-label">A (Fine):</label>
        <input type="date" v-model="multiEnd">
        <label class="edit-label">Turno da inserire:</label>
        <input type="text" v-model="multiTurno" placeholder="Es. FER, KMAL..." @input="multiTurno=multiTurno.toUpperCase()">
        <label class="chk-label" style="margin-top: 15px;"><input type="checkbox" v-model="multiEscludiRiposi" style="width: 20px; height: 20px; margin-right: 10px; accent-color: #2dce89;"> Escludi i Riposi (RI / AL)</label>
        <button class="btn" style="background: #2dce89; margin-top: 20px;" @click="onSalvaMultiEdit">Salva Modifiche</button>
        <button class="btn" style="background: #f8f9fa; color: #525f7f; margin-top: 15px;" @click="showMultiEdit=false">Annulla</button>
      </div>
    </div>

    <!-- COLORI ROTAZIONE -->
    <div v-if="showColoriRotazione" class="modal">
      <div class="modal-content" style="padding: 20px;">
        <h3 style="color: #11cdef; margin-top: 0;">🎨 Colori Rotazione</h3>
        <p class="instruction-text" style="font-size: 14px; margin-bottom: 20px;">Assegna un colore per ogni giorno lavorativo della tua rotazione (dal 1° al 6° dopo il riposo).</p>
        <div v-for="day in coloriDays" :key="day.key" style="margin-bottom: 12px; text-align: left;">
          <div style="font-weight: bold; font-size: 14px; margin-bottom: 5px;" :style="{color: day.key==='riposo' ? 'var(--riposo,#1e8449)' : '#525f7f'}">{{ day.label }}:</div>
          <div style="display: flex; flex-wrap: wrap;">
            <div class="color-circle" style="background: #e9ecef; display:flex; align-items:center; justify-content:center; font-size:12px; color: #32325d;" :class="{selected: tempColoriRot[day.key]===''||!tempColoriRot[day.key]}" @click="tempColoriRot[day.key]=''">✕</div>
            <div v-for="c in colorOptions" :key="c" class="color-circle" :style="{background: c}" :class="{selected: tempColoriRot[day.key]===c}" @click="tempColoriRot[day.key]=c"></div>
          </div>
        </div>
        <button class="btn" style="background: #11cdef; margin-top: 15px;" @click="onSalvaColoriRotazione">Salva Modifiche</button>
        <button class="btn" style="background: #f8f9fa; color: #525f7f; margin-top: 10px;" @click="showColoriRotazione=false">Annulla</button>
      </div>
    </div>

    <!-- FERIE MODAL -->
    <div v-if="showFerie" class="modal">
      <div class="modal-content" style="padding: 20px;">
        <h3 style="color: #20c997; margin-top: 0;">🌴 Ferie Programmate</h3>
        <div style="display: flex; margin-bottom: 20px; border-radius: 10px; overflow: hidden; border: 1px solid #20c997;">
          <button :style="{flex:1, padding:'10px', border:'none', background: ferieTab==='base'?'#20c997':'white', color: ferieTab==='base'?'white':'#20c997', fontWeight:'bold', cursor:'pointer'}" @click="ferieTab='base'">Impostazioni Base</button>
          <button :style="{flex:1, padding:'10px', border:'none', background: ferieTab==='scambio'?'#20c997':'white', color: ferieTab==='scambio'?'white':'#20c997', fontWeight:'bold', cursor:'pointer'}" @click="ferieTab='scambio'">Scambio Ferie</button>
        </div>
        <div v-if="ferieTab==='base'" style="text-align: left; margin-bottom: 15px;">
          <p class="instruction-text" style="font-size: 14px; margin-bottom: 15px;">Imposta il tuo gruppo base. Gli anni successivi verranno calcolati in automatico.</p>
          <label class="edit-label">Anno di partenza (Base):</label>
          <input type="number" v-model.number="ferieAnnoBase" placeholder="Es. 2026">
          <label class="edit-label">Periodo Estivo Base:</label>
          <select v-model.number="ferieEstBase"><option :value="-1">Nessuna / Non lo so</option><option v-for="(f,i) in store.ROT_FERIE_EST" :key="i" :value="i">{{ f.n }}</option></select>
          <label class="edit-label">Periodo Invernale Base:</label>
          <select v-model.number="ferieInvBase"><option :value="-1">Nessuna / Non lo so</option><option v-for="(f,i) in store.ROT_FERIE_INV" :key="i" :value="i">{{ f.n }}</option></select>
        </div>
        <div v-if="ferieTab==='scambio'" style="text-align: left; margin-bottom: 15px;">
          <p style="font-size: 13px; color: #888; margin-bottom: 15px;">Sostituisci il periodo calcolato per un singolo anno (es. scambio con collega).</p>
          <label class="edit-label">Anno dello scambio:</label>
          <input type="number" v-model.number="ferieScambioAnno" placeholder="Es. 2026">
          <label class="edit-label">Nuovo Periodo Estivo:</label>
          <select v-model.number="ferieEstScambio"><option :value="-1">Mantieni Automatico</option><option v-for="(f,i) in store.ROT_FERIE_EST" :key="i" :value="i">{{ f.n }}</option></select>
          <label class="edit-label">Nuovo Periodo Invernale:</label>
          <select v-model.number="ferieInvScambio"><option :value="-1">Mantieni Automatico</option><option v-for="(f,i) in store.ROT_FERIE_INV" :key="i" :value="i">{{ f.n }}</option></select>
        </div>
        <button class="btn" style="background: #20c997; margin-top: 10px;" @click="onSalvaFerie">Salva Configurazioni</button>
        <button class="btn" style="background: #f5365c; margin-top: 10px;" @click="onResetFerie">Reset Dati Ferie</button>
        <button class="btn" style="background: #f8f9fa; color: #525f7f; margin-top: 10px;" @click="showFerie=false">Chiudi</button>
      </div>
    </div>

    <!-- PDF TIPO 2 -->
    <div v-if="showPdfTipo2" class="modal">
      <div class="modal-content">
        <h3 style="color: #5e72e4; margin-top: 0;">Esporta PDF (Tipo 2)</h3>
        <p class="instruction-text" style="font-size: 14px;">Seleziona mese e anno per esportare la lista dei turni.</p>
        <div style="display: flex; gap: 10px; margin-bottom: 10px;">
          <select v-model="pdfMese" style="flex: 1;"><option v-for="m in 12" :key="m" :value="String(m).padStart(2,'0')">{{ mesiNomi[m-1] }}</option></select>
          <input type="number" v-model.number="pdfAnno" style="flex: 1; padding: 15px; border: 2px solid #e9ecef; border-radius: 12px; font-size: 16px;">
        </div>
        <button class="btn" style="background: #5e72e4;" @click="generaPdfTipo2">📄 Scarica PDF</button>
        <button class="btn" style="background: #f8f9fa; color: #525f7f; margin-top: 15px;" @click="showPdfTipo2=false">Annulla</button>
      </div>
    </div>

    <!-- ICS MODAL -->
    <div v-if="showIcs" class="modal">
      <div class="modal-content">
        <h3 style="color: #5e72e4; margin-top: 0;">Esporta in ICS</h3>
        <p class="instruction-text" style="font-size: 14px;">Seleziona il periodo da esportare.</p>
        <label class="edit-label">Da:</label>
        <input type="date" v-model="icsStart">
        <label class="edit-label">A:</label>
        <input type="date" v-model="icsEnd">
        <button class="btn" style="background: #5e72e4;" @click="esportaICS">Scarica .ics</button>
        <button class="btn" style="background: #f8f9fa; color: #525f7f; margin-top: 15px;" @click="showIcs=false">Chiudi</button>
      </div>
    </div>

    <!-- JUMP MODAL -->
    <div v-if="showJump" class="modal">
      <div class="modal-content">
        <h3 style="color: var(--turno,#5e72e4); margin-top: 0;">Vai alla data</h3>
        <div style="display: flex; gap: 10px;">
          <select v-model="jumpMonth" style="flex: 1;"><option v-for="m in 12" :key="m" :value="String(m).padStart(2,'0')">{{ mesiNomi[m-1] }}</option></select>
          <select v-model="jumpYear" style="flex: 1;"><option v-for="y in jumpYears" :key="y" :value="y">{{ y }}</option></select>
        </div>
        <button class="btn" style="background: var(--turno,#5e72e4);" @click="eseguiSalto">Vai</button>
        <button class="btn" style="background: #f8f9fa; color: #525f7f; margin-top: 15px;" @click="showJump=false">Annulla</button>
      </div>
    </div>

    <!-- CAMBIO BIBBIA -->
    <div v-if="showCambioBibbia" class="modal">
      <div class="modal-content">
        <h3 style="color: #f1c40f; margin-top: 0;">Cambio Bibbia</h3>
        <p class="instruction-text">Vuoi configurare una nuova rotazione? <b>I tuoi turni manuali, straordinari, colori e note verranno mantenuti.</b></p>
        <button class="btn" style="background: #f1c40f; color: #32325d;" @click="onCambioBibbia">Sì, configura nuova ruota</button>
        <button class="btn" style="background: #f8f9fa; color: #525f7f; margin-top: 15px;" @click="showCambioBibbia=false">Annulla</button>
      </div>
    </div>

    <!-- RESET -->
    <div v-if="showReset" class="modal">
      <div class="modal-content">
        <h3 style="color: #f5365c; margin-top: 0;">Attenzione!</h3>
        <p class="instruction-text">Vuoi cancellare DEFINITIVAMENTE tutti i dati e i turni salvati?</p>
        <button class="btn" style="background: #f5365c;" @click="onReset">Sì, cancella tutto</button>
        <button class="btn" style="background: #f8f9fa; color: #525f7f; margin-top: 15px;" @click="showReset=false">Annulla</button>
      </div>
    </div>

    <!-- BACKUP -->
    <div v-if="showBackup" class="modal">
      <div class="modal-content">
        <h3 style="color: var(--turno,#5e72e4); margin-top: 0;">Backup Dati</h3>
        <p class="instruction-text" style="font-size: 14px;">Gestisci i tuoi dati tramite file per non perdere i tuoi turni.</p>
        <input type="file" ref="backupFileInput" style="display:none" accept=".json" @change="onImportaBackup">
        <button class="btn" style="background: var(--turno,#5e72e4);" @click="store.esportaBackup()">Scarica Backup (Esporta)</button>
        <button class="btn" style="background: var(--riposo,#1e8449);" @click="$refs.backupFileInput.click()">Carica Backup (Importa)</button>
        <button class="btn" style="background: #f8f9fa; color: #525f7f; margin-top: 15px;" @click="showBackup=false">Chiudi</button>
      </div>
    </div>

    <!-- IMAGE MODAL -->
    <div v-if="showImage" class="modal" style="z-index: 10000; overflow: hidden;" @click.self="showImage=false">
      <div style="position: absolute; top: 20px; right: 20px; font-size: 35px; color: white; cursor: pointer; text-shadow: 0 2px 4px rgba(0,0,0,0.5); z-index: 10001;" @click="showImage=false">&times;</div>
      <div style="display:flex; flex-direction: column; justify-content:center; align-items:center; height:100%; padding:20px; padding-bottom: 80px;">
        <img :src="currentImagePath" style="max-width: 100%; max-height: 70vh; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); object-fit: contain;" @error="onImageError">
        <div style="margin-top: 15px; background: rgba(0,0,0,0.7); color: #fff; padding: 10px 20px; border-radius: 12px; font-size: 13px; text-align: center; max-width: 90%;">
          ⚠️ Controllare sempre i turni ufficiali e la presenza di eventuali varianti ai turni.
        </div>
      </div>
      <button @click="scaricaImmagineTurno" style="position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); background: #11cdef; color: white; border: none; padding: 12px 24px; border-radius: 20px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); cursor: pointer; z-index: 10001;">📥 Scarica</button>
    </div>

    <!-- PDF SYNC MODAL -->
    <div v-if="showPdfSync" class="modal">
      <div class="modal-content" style="max-height: 85vh; display: flex; flex-direction: column;">
        <h3 style="color: #e83e8c; margin-top: 0;">📄 Sincronizzazione PDF</h3>
        <p class="instruction-text" style="font-size: 14px;">Seleziona i turni da aggiornare:</p>
        <div style="text-align: left; overflow-y: auto; flex: 1; border: 1px solid #e9ecef; border-radius: 10px; padding: 10px; margin-bottom: 15px;">
          <label v-for="(ch, idx) in pdfSyncChanges" :key="idx" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 5px; border-bottom: 1px solid #eee; cursor: pointer;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <input type="checkbox" v-model="ch.checked" style="width: 20px; height: 20px; accent-color: #e83e8c;">
              <span style="font-size: 15px; color: #32325d; font-weight: bold; text-transform: capitalize;">{{ ch.giornoTesto }}</span>
            </div>
            <div style="font-size: 14px; color: #525f7f; text-align: right;">
              <span style="text-decoration: line-through; color: #adb5bd; margin-right: 5px;">{{ ch.oldShift }}</span>
              <span style="font-weight: bold; color: #5e72e4;">➔ {{ ch.newShift }}</span>
            </div>
          </label>
        </div>
        <button class="btn" style="background: #2dce89; margin-top: auto;" @click="onApplicaPdfSync">Applica Modifiche</button>
        <button class="btn" style="background: #f8f9fa; color: #525f7f; margin-top: 10px;" @click="showPdfSync=false; pdfSyncChanges=[]">Annulla</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick, watch } from 'vue'
import { useCalendarStore } from '../stores/calendarStore.js'
import { formattaData, stringToNum, dateToLocalISO, creaDataSicura, trovaChiaveEsatta } from '../utils/calendarEngine.js'

const store = useCalendarStore()

// Sidebar state
const sidebarOpen = ref(false)
const rightSidebarOpen = ref(false)

// Calendar
const calendarEl = ref(null)
let calendarInstance = null

// Modal visibility
const showWelcome = ref(false)
const showStep = ref(false)
const showEdit = ref(false)
const showAltro = ref(false)
const showMultiEdit = ref(false)
const showColoriRotazione = ref(false)
const showFerie = ref(false)
const showPdfTipo2 = ref(false)
const showIcs = ref(false)
const showJump = ref(false)
const showCambioBibbia = ref(false)
const showReset = ref(false)
const showBackup = ref(false)
const showImage = ref(false)
const showPdfSync = ref(false)

// Welcome modal
const welcomeTitle = ref('Benvenuto')
const welcomeDesc = ref('Scegli la tua rotazione:')
const welcomeBtnText = ref('Prosegui')
const showDepotSelect = ref(true)
const selectedDepot = ref('')
const depotSelected = ref(false)

// Step modal
const stepTitle = ref('')
const stepDateDisplay = ref('')
const stepDesc = ref('')
const stepSelectHtml = ref('')
const stepShowSelect = ref(false)
const stepShowTcButtons = ref(false)
const stepShowConfirmDate = ref(false)
const stepShowConfirmFinal = ref(false)
const stepShowBack = ref(false)
const stepCloseText = ref('Chiudi')
const tcAltText = ref('')
let tempRotDate = ''

// Edit modal
const selectedDate = ref('')
const editModalDate = ref('')
const editInfoHtml = ref('')
const editVariantiHtml = ref('')
const editShowImgBtn = ref(false)
const editTurnoInput = ref('')
let currentImagePath = ref('')
let imgBaseFallback = ''

// Altro modal
const altroSospeso = ref(false)
const altroNebbia = ref(false)
const altroBuono = ref(false)
const altroStraord = ref(false)
const altroStraordOre = ref('')
const altroStraordMin = ref('')
const altroPermesso = ref(false)
const altroPermessoOre = ref('')
const altroPermessoMin = ref('')
const altroNota = ref('')
const altroColore = ref('')
const colorOptions = ['#f1c40f','#fd7e14','#f5365c','#e83e8c','#8965e0','#5e72e4','#11cdef','#2dce89']

// Multi edit
const multiStart = ref('')
const multiEnd = ref('')
const multiTurno = ref('')
const multiEscludiRiposi = ref(true)

// Colori rotazione
const coloriDays = [
  {key:'riposo', label:'Giorno di Riposo (RI / AL)'},
  {key:1, label:'1° Giorno'},{key:2, label:'2° Giorno'},{key:3, label:'3° Giorno'},
  {key:4, label:'4° Giorno'},{key:5, label:'5° Giorno'},{key:6, label:'6° Giorno'}
]
const tempColoriRot = reactive({})

// Ferie
const ferieTab = ref('base')
const ferieAnnoBase = ref(new Date().getFullYear())
const ferieEstBase = ref(-1)
const ferieInvBase = ref(-1)
const ferieScambioAnno = ref(new Date().getFullYear())
const ferieEstScambio = ref(-1)
const ferieInvScambio = ref(-1)

// PDF Tipo 2
const mesiNomi = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const pdfMese = ref(String(new Date().getMonth()+1).padStart(2,'0'))
const pdfAnno = ref(new Date().getFullYear())

// ICS
const icsStart = ref('')
const icsEnd = ref('')

// Jump
const jumpMonth = ref(String(new Date().getMonth()+1).padStart(2,'0'))
const jumpYear = ref(new Date().getFullYear())
const jumpYears = Array.from({length:8}, (_,i) => new Date().getFullYear() - 2 + i)

// PDF Sync
const pdfSyncChanges = ref([])

// ----- INITIALIZATION -----
onMounted(async () => {
  // Dynamically load FullCalendar CDN (lighter than npm bundle for this page)
  if (!window.FullCalendar) {
    await loadScript('https://cdn.jsdelivr.net/npm/fullcalendar@6.1.8/index.global.min.js')
  }
  // Load html2pdf
  if (!window.html2pdf) {
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js')
  }
  // Load pdf.js
  if (!window.pdfjsLib) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js')
    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
    }
  }

  await store.initialize()

  const action = store.getUpdateAction()
  if (action === 'welcome') {
    showWelcome.value = true
  } else if (action === 'update') {
    welcomeTitle.value = "Aggiornamento Turni"
    welcomeDesc.value = store.getUpdateText()
    showDepotSelect.value = false
    depotSelected.value = true
    welcomeBtnText.value = "Avvia Aggiornamento"
    showWelcome.value = true
  } else {
    inizializzaCalendario()
    if (store.state.setupStep === 1) checkGuida()
  }
})

function loadScript(url) {
  return new Promise((resolve) => {
    const sc = document.createElement('script')
    sc.src = url
    sc.onload = () => resolve()
    sc.onerror = () => resolve()
    document.head.appendChild(sc)
  })
}

function inizializzaCalendario() {
  if (!window.FullCalendar || !calendarEl.value) return
  calendarInstance = new window.FullCalendar.Calendar(calendarEl.value, {
    initialView: 'dayGridMonth',
    locale: 'it',
    firstDay: 1,
    height: 'auto',
    eventOrder: 'myOrder',
    buttonText: { today: 'Oggi' },
    customButtons: { btnSalto: { text: '🔍', click: () => { showJump.value = true } } },
    headerToolbar: { left: 'prev,next', center: 'title', right: 'btnSalto today' },
    dateClick: (i) => gestisciInterazione(i.dateStr),
    eventClick: (info) => gestisciInterazione(info.event.startStr),
    events: (i, success) => success(store.calcolaTurniAction())
  })
  calendarInstance.render()
}

function refreshCalendar() {
  if (calendarInstance) calendarInstance.refetchEvents()
}

// ----- WELCOME / SETUP -----
function onConfermaRotazione() {
  if (!store.state.depositoAttivo && selectedDepot.value) {
    store.setDepot(selectedDepot.value)
  } else {
    store.confermaRotazione()
  }
  showWelcome.value = false
  inizializzaCalendario()
  if (store.state.setupStep === 1) checkGuida()
}

function checkGuida() {
  stepTitle.value = "Passo 2"
  stepDesc.value = "Seleziona nel calendario uno dei tuoi riposi singoli"
  stepShowConfirmDate.value = false
  stepShowConfirmFinal.value = false
  stepShowSelect.value = false
  stepShowTcButtons.value = false
  stepShowBack.value = true
  stepCloseText.value = "Seleziona"
  showStep.value = true
}

function gestisciInterazione(date) {
  selectedDate.value = date
  if (store.state.setupStep === 1) {
    stepDateDisplay.value = formattaData(date)
    stepDesc.value = "È un tuo giorno di riposo?"
    stepShowConfirmDate.value = true
    stepShowBack.value = false
    stepCloseText.value = "Chiudi"
    showStep.value = true
  } else {
    apriEditModal(date)
  }
}

function onProcediConfigurazione() {
  const result = store.confermaRiposoStart(selectedDate.value)
  if (result === 'done') {
    showStep.value = false
    refreshCalendar()
  } else if (result === 'tc_pattern') {
    stepTitle.value = "Settimana Successiva"
    stepDateDisplay.value = ""
    stepDesc.value = "Nei 6 giorni successivi a questo riposo singolo, fai i turni doppi o quelli alternati con i DISP?"
    tcAltText.value = store.state.depositoAttivo === 'tc_spez_lido' ? 'Alternati (es. DISP, Turno)' : 'Alternati (es. Turno, DISP)'
    stepShowConfirmDate.value = false
    stepShowTcButtons.value = true
    stepShowBack.value = false
  } else {
    avviaSelezioneTurnoIniziale()
  }
}

function onTcPattern(pattern) {
  store.impostaTcPattern(pattern)
  showStep.value = false
  refreshCalendar()
}

function avviaSelezioneTurnoIniziale() {
  store.state.setupStep = 2
  let d = creaDataSicura(selectedDate.value)
  d.setDate(d.getDate() + 1)
  tempRotDate = dateToLocalISO(d)

  stepTitle.value = "Passo 3"
  stepDateDisplay.value = ""
  stepDesc.value = `Che turno hai il giorno <strong style="color: var(--turno,#5e72e4);">${formattaData(tempRotDate)}</strong>?`
  stepSelectHtml.value = `<select id="tSel">${store.getOptionsForSelect(tempRotDate)}</select>`
  stepShowSelect.value = true
  stepShowConfirmDate.value = false
  stepShowTcButtons.value = false
  stepShowConfirmFinal.value = true
  stepShowBack.value = false
  stepCloseText.value = "Chiudi"
  showStep.value = true
}

function onAttivaRotazioneFinale() {
  const sel = document.getElementById('tSel')
  if (!sel || !sel.value) return
  const result = store.setTurnoIndex(sel.value, tempRotDate)
  if (!result) return
  if (result.action === 'skip') {
    tempRotDate = result.nextDate
    stepDesc.value = `Che turno avrai il <strong style="color: var(--turno,#5e72e4);">${formattaData(tempRotDate)}</strong>?`
    stepSelectHtml.value = `<select id="tSel">${store.getOptionsForSelect(tempRotDate)}</select>`
  } else if (result.action === 'future') {
    tempRotDate = result.nextDate
    stepTitle.value = "Passo 4 (Cambio Turni)"
    stepDesc.value = `Dal <strong>${formattaData(result.dataFutura)}</strong> entra in vigore una nuova rotazione. Che turno avrai il <strong style="color: var(--turno,#5e72e4);">${formattaData(tempRotDate)}</strong>?`
    stepSelectHtml.value = `<select id="tSel">${store.getOptionsForSelect(tempRotDate)}</select>`
  } else {
    showStep.value = false
    refreshCalendar()
  }
}

function onTornaRotazione() {
  store.state.setupStep = 0
  store.state.depositoAttivo = null
  store.salvaLocal()
  showStep.value = false
  showWelcome.value = true
  showDepotSelect.value = true
  depotSelected.value = false
}

// ----- EDIT MODAL -----
function apriEditModal(date) {
  editModalDate.value = formattaData(date)
  editTurnoInput.value = ''
  editVariantiHtml.value = ''
  editShowImgBtn.value = false

  // Varianti check
  if (store.variantiData[date] !== undefined) {
    let lineeData = store.variantiData[date]
    let isEmpty = (Array.isArray(lineeData) && lineeData.length === 0) || (typeof lineeData === 'string' && lineeData.trim() === '') || !lineeData
    if (isEmpty) editVariantiHtml.value = "⚠️ Attenzione: nella data selezionata sono presenti varianti per il servizio, verificare le DDS su spriss."
    else { let linee = Array.isArray(lineeData) ? lineeData.join(", ") : lineeData; editVariantiHtml.value = "⚠️ Attenzione: nella data selezionata sono presenti varianti per le linee: " + linee }
  }

  // Build info area
  let turniCalc = store.calcolaTurniAction()
  let turnoObj = turniCalc.find(e => e.start === date && !e.title.includes('FERIE') && e.title !== 'FEP')
  let nomePulito = turnoObj ? turnoObj.title.replace(/ 🌫️| ⏱️| 📝|\(Sospeso\)| 🍝| 💸/g, '').trim() : "Nessun turno"
  let codiceBase = nomePulito.toUpperCase()

  let html = `<strong>Turno attuale:</strong> ${nomePulito} ${store.state.variazioni[date] ? '(Modificato)' : ''}`

  if (store.state.variazioni[date]) {
    let tempVar = store.state.variazioni[date]
    delete store.state.variazioni[date]
    let turniSenza = store.calcolaTurniAction()
    let turnoOrig = turniSenza.find(e => e.start === date && !e.title.includes('FERIE') && e.title !== 'FEP')
    let origPulito = turnoOrig ? turnoOrig.title.replace(/ 🌫️| ⏱️| 📝|\(Sospeso\)| 🍝| 💸/g, '').trim() : "Nessun turno"
    html += `<br><span style="font-size: 0.9em; color: #8898aa;"><b>Turno originale:</b> ${origPulito}</span>`
    store.state.variazioni[date] = tempVar
  }

  const { dbCorrente, dataAttiva } = store.getDbCorrentePerData(date)
  let chiaveTrovata = trovaChiaveEsatta(dbCorrente, codiceBase, date)
  let dettagli = dbCorrente[chiaveTrovata]

  if (dettagli) {
    html += `<hr style="margin:10px 0; border:0; border-top:1px solid #eee;">`
    html += `<b>Inizio:</b> ${dettagli.inizio} (${dettagli.luogoInizio})<br><b>Fine:</b> ${dettagli.fine} (${dettagli.luogoFine})`
  }

  if (store.state.nebbia[date] || store.state.straordinario[date] || store.state.sospesoRiposo[date] || store.state.note[date] || store.state.buonoPasto[date] || store.state.permessoSP[date]) {
    html += `<hr style="margin:10px 0; border:0; border-top:1px solid #eee;">`
    if (store.state.sospesoRiposo[date]) html += `<div style="margin-bottom: 5px;"><b>Riposo:</b> Sospeso</div>`
    if (store.state.nebbia[date]) html += `<div style="margin-bottom: 5px;">🌫️ <b>Indennità Nebbia:</b> Presente</div>`
    if (store.state.buonoPasto[date]) html += `<div style="margin-bottom: 5px;">🍝 <b>Buono Pasto:</b> Utilizzato</div>`
    if (store.state.straordinario[date]) html += `<div style="margin-bottom: 5px;">⏱️ <b>Straordinario:</b> ${store.state.straordinario[date].ore}h ${store.state.straordinario[date].minuti}m</div>`
    if (store.state.permessoSP[date]) html += `<div style="margin-bottom: 5px;">💸 <b>Perm. Senza Paga:</b> ${store.state.permessoSP[date].ore}h ${store.state.permessoSP[date].minuti}m</div>`
    if (store.state.note[date]) html += `<div style="margin-top: 5px; white-space: pre-wrap;">📝 <b>Note:</b><br>${store.state.note[date]}</div>`
  }

  editInfoHtml.value = html

  // Image button
  let isRiposo = (codiceBase === 'RI' || codiceBase === 'RIPOSO' || codiceBase === 'AL')
  if (!isRiposo && codiceBase !== 'DISP' && codiceBase !== 'NESSUN TURNO') {
    if (chiaveTrovata !== codiceBase && dbCorrente[chiaveTrovata]) {
      currentImagePath.value = `turni_${dataAttiva}/${chiaveTrovata}.jpg`
      imgBaseFallback = `turni_${dataAttiva}/${codiceBase}.jpg`
    } else {
      currentImagePath.value = `turni_${dataAttiva}/${codiceBase}.jpg`
      imgBaseFallback = ""
    }
    editShowImgBtn.value = true
  } else {
    currentImagePath.value = ""
    editShowImgBtn.value = false
  }

  showEdit.value = true
}

function onSalvaCambioSingolo() {
  if (!editTurnoInput.value) return
  store.salvaCambioSingolo(selectedDate.value, editTurnoInput.value.trim().toUpperCase())
  showEdit.value = false
  refreshCalendar()
}

function onResetGiorno() {
  store.resetGiornoSingolo(selectedDate.value)
  showEdit.value = false
  refreshCalendar()
}

// ----- ALTRO MODAL -----
function apriAltroModal() {
  showEdit.value = false
  const d = selectedDate.value
  altroSospeso.value = !!store.state.sospesoRiposo[d]
  altroNebbia.value = !!store.state.nebbia[d]
  altroBuono.value = !!store.state.buonoPasto[d]
  altroStraord.value = !!store.state.straordinario[d]
  altroStraordOre.value = store.state.straordinario[d]?.ore || ''
  altroStraordMin.value = store.state.straordinario[d]?.minuti || ''
  altroPermesso.value = !!store.state.permessoSP[d]
  altroPermessoOre.value = store.state.permessoSP[d]?.ore || ''
  altroPermessoMin.value = store.state.permessoSP[d]?.minuti || ''
  altroNota.value = store.state.note[d] || ''
  altroColore.value = store.state.colori[d] || ''
  showAltro.value = true
}

function chiudiAltroModal() { showAltro.value = false; showEdit.value = true }

function onSalvaAltro() {
  store.salvaAltro(selectedDate.value, {
    sospesoRiposo: altroSospeso.value,
    nebbia: altroNebbia.value,
    buonoPasto: altroBuono.value,
    straordinario: altroStraord.value ? { ore: altroStraordOre.value || "0", minuti: altroStraordMin.value || "0" } : null,
    permessoSP: altroPermesso.value ? { ore: altroPermessoOre.value || "0", minuti: altroPermessoMin.value || "0" } : null,
    nota: altroNota.value.trim() || null,
    colore: altroColore.value || null
  })
  showAltro.value = false
  refreshCalendar()
}

// ----- MULTI EDIT -----
function apriMultiEdit() { rightSidebarOpen.value = false; showMultiEdit.value = true }
function onSalvaMultiEdit() {
  if (!multiStart.value || !multiEnd.value) { alert("Seleziona entrambe le date."); return }
  if (multiStart.value > multiEnd.value) { alert("La data di inizio deve essere precedente."); return }
  if (!multiTurno.value && !confirm("Campo vuoto: ripristinare i turni base per questo periodo?")) return
  store.salvaModificaMultipla(multiStart.value, multiEnd.value, multiTurno.value, multiEscludiRiposi.value)
  showMultiEdit.value = false
  refreshCalendar()
}

// ----- COLORI ROTAZIONE -----
function apriColoriRotazione() {
  rightSidebarOpen.value = false
  Object.assign(tempColoriRot, store.state.coloriRotazione || {})
  showColoriRotazione.value = true
}
function onSalvaColoriRotazione() {
  let clean = {}
  for (let k of Object.keys(tempColoriRot)) { if (tempColoriRot[k]) clean[k] = tempColoriRot[k] }
  store.salvaColoriRotazione(clean)
  showColoriRotazione.value = false
  refreshCalendar()
}

// ----- FERIE -----
function onSalvaFerie() {
  if (!ferieAnnoBase.value) { alert("Inserisci un anno di base valido."); return }
  store.salvaFerie(ferieAnnoBase.value, ferieEstBase.value, ferieInvBase.value, ferieScambioAnno.value, ferieEstScambio.value, ferieInvScambio.value)
  showFerie.value = false
  refreshCalendar()
}
function onResetFerie() {
  if (confirm("Vuoi cancellare tutte le configurazioni delle Ferie Programmate?")) { store.resetFerie(); showFerie.value = false; refreshCalendar() }
}

// ----- JUMP -----
function eseguiSalto() {
  if (calendarInstance) calendarInstance.gotoDate(jumpYear.value + '-' + jumpMonth.value + '-01')
  showJump.value = false
}

// ----- CAMBIO BIBBIA / RESET -----
function onCambioBibbia() { store.confermaCambioBibbia(); showCambioBibbia.value = false; showWelcome.value = true; showDepotSelect.value = true; depotSelected.value = false; refreshCalendar() }
function onReset() { store.confermaReset(); showReset.value = false; showWelcome.value = true; showDepotSelect.value = true; depotSelected.value = false; if(calendarInstance){ calendarInstance.destroy(); calendarInstance = null } }

// ----- BACKUP -----
function onImportaBackup(evt) {
  const file = evt.target.files[0]; if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    if (store.importaBackup(e.target.result)) { alert("Backup ripristinato!"); refreshCalendar() }
    else alert("Errore: file non valido.")
    evt.target.value = ''
  }
  reader.readAsText(file)
}

// ----- IMAGE -----
function apriImmagineTurno() { if (currentImagePath.value) showImage.value = true }
function onImageError() { if (imgBaseFallback) { currentImagePath.value = imgBaseFallback; imgBaseFallback = '' } else { alert("Immagine non trovata."); showImage.value = false } }
function scaricaImmagineTurno() { if (!currentImagePath.value) return; const a=document.createElement('a'); a.href=currentImagePath.value; a.download=currentImagePath.value.split('/').pop(); document.body.appendChild(a); a.click(); document.body.removeChild(a) }

// ----- PDF TYPE 1 -----
function scaricaPDF() {
  rightSidebarOpen.value = false
  if (!window.html2pdf || !calendarEl.value) { alert("Caricamento in corso..."); return }
  const el = calendarEl.value
  const titleEl = el.querySelector('.fc-toolbar-title')
  const meseTesto = titleEl ? titleEl.innerText.replace(/ /g, "_") : "Calendario"
  const opt = { margin: [10,5,10,5], filename: `Turni_${meseTesto}.pdf`, image:{type:'jpeg',quality:0.98}, html2canvas:{scale:2,useCORS:true,windowWidth:800}, jsPDF:{unit:'mm',format:'a4',orientation:'portrait'} }
  const btns = el.querySelectorAll('.fc-button'); btns.forEach(b=>b.style.display='none')
  el.style.width = '700px'
  if(calendarInstance) { calendarInstance.setOption('height',960); calendarInstance.updateSize() }
  setTimeout(()=>{
    window.html2pdf().set(opt).from(el).save().then(()=>{
      btns.forEach(b=>b.style.display='')
      el.style.width = ''
      if(calendarInstance){ calendarInstance.setOption('height','auto'); calendarInstance.updateSize() }
    })
  }, 300)
}

// ----- PDF TIPO 2 -----
function generaPdfTipo2() {
  if (!window.html2pdf) { alert("Caricamento in corso..."); return }
  const mese = pdfMese.value, anno = pdfAnno.value
  let meseNome = mesiNomi[parseInt(mese)-1]
  const turni = store.calcolaTurniAction()
  const dateChiavi = Object.keys(store.state.dbCache || {}).sort()
  const giorniInMese = new Date(anno, mese, 0).getDate()
  const giorniSettimana = ["Dom","Lun","Mar","Mer","Gio","Ven","Sab"]

  let html = `<div style="font-family: Arial; font-size: 12px; padding: 10px; color: #000; background: white;"><h2 style="text-align: center;">${meseNome} ${anno}</h2><table style="width:100%; border-collapse:collapse;"><thead><tr style="border-bottom:2px solid #000; background:#f8f9fa;"><th style="padding:6px 8px;">Data</th><th style="padding:6px 8px;">Turno</th><th style="padding:6px 8px;">Loc. Monta</th><th style="padding:6px 8px;">Dalle</th><th style="padding:6px 8px;">Alle</th><th style="padding:6px 8px;">Note</th></tr></thead><tbody>`

  for (let d = 1; d <= giorniInMese; d++) {
    let dStr = `${anno}-${mese}-${String(d).padStart(2,'0')}`
    let dObj = new Date(anno,parseInt(mese)-1,d)
    let ev = turni.find(t => t.start === dStr && !t.title.includes('FERIE') && t.title !== 'FEP')
    let titolo = ev ? ev.title.replace(/ 🌫️| ⏱️| 📝|\(Sospeso\)| 🍝| 💸/g, '').trim() : ""
    let codiceBase = titolo.toUpperCase()
    let locMonta="",dalle="",alle="",note=""
    if (store.state.note[dStr]) note = store.state.note[dStr].substring(0,30)
    if (codiceBase && codiceBase!=="RI" && codiceBase!=="AL" && codiceBase!=="DISP") {
      const { dbCorrente } = store.getDbCorrentePerData(dStr)
      let chiave = trovaChiaveEsatta(dbCorrente, codiceBase, dStr)
      let det = dbCorrente[chiave]
      if (det) { locMonta=det.luogoInizio||""; dalle=det.inizio||""; alle=det.fine||"" }
    }
    let bg = dObj.getDay()===0 ? "background-color:#f9f9f9;" : ""
    html += `<tr style="border-bottom:1px solid #ddd; ${bg}"><td style="padding:5px 8px;">${String(d).padStart(2,'0')} ${giorniSettimana[dObj.getDay()]}</td><td style="padding:5px 8px; font-weight:bold;">${titolo}</td><td style="padding:5px 8px;">${locMonta}</td><td style="padding:5px 8px;">${dalle}</td><td style="padding:5px 8px;">${alle}</td><td style="padding:5px 8px; font-size:10px;">${note}</td></tr>`
  }
  html += `</tbody></table></div>`
  let wrapper = document.createElement('div'); wrapper.innerHTML = html
  showPdfTipo2.value = false
  window.html2pdf().set({margin:10, filename:`Bibbia_${meseNome}_${anno}.pdf`, image:{type:'jpeg',quality:0.98}, html2canvas:{scale:2}, jsPDF:{unit:'mm',format:'a4',orientation:'portrait'}}).from(wrapper).save()
}

// ----- ICS -----
function esportaICS() {
  if (!icsStart.value || !icsEnd.value) { alert("Seleziona entrambe le date."); return }
  const turni = store.calcolaTurniAction()
  const filtrati = turni.filter(t => t.start >= icsStart.value && t.start <= icsEnd.value)
  if (!filtrati.length) { alert("Nessun turno nel periodo."); return }
  const dateChiavi = Object.keys(store.state.dbCache || {}).sort()
  let ics = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//MyTurniApp//IT\r\nCALSCALE:GREGORIAN\r\n"
  filtrati.forEach(t => {
    const dp = t.start.split('-'); const icsDate = dp[0]+dp[1]+dp[2]
    let d = creaDataSicura(t.start); d.setDate(d.getDate()+1)
    const nd = dateToLocalISO(d); const ndp = nd.split('-'); const icsNext = ndp[0]+ndp[1]+ndp[2]
    let pulito = t.title.replace(/ 🌫️| ⏱️| 📝|\(Sospeso\)| 🍝| 💸/g, '').trim()
    const uid = t.start+"-"+pulito.replace(/\s+/g,'')+"@myturniapp"
    const now = new Date().toISOString().replace(/[-:]/g,'').split('.')[0]+"Z"
    const { dbCorrente } = store.getDbCorrentePerData(t.start)
    let chiave = trovaChiaveEsatta(dbCorrente, pulito.toUpperCase(), t.start)
    let det = dbCorrente[chiave]
    let orari="", desc="", loc=""
    if (det && det.inizio && det.fine) { orari=` (${det.inizio} - ${det.fine})`; desc=`Inizio: ${det.inizio} (${det.luogoInizio})\\nFine: ${det.fine} (${det.luogoFine})`; loc=det.luogoInizio }
    ics += `BEGIN:VEVENT\r\nUID:${uid}\r\nDTSTAMP:${now}\r\nDTSTART;VALUE=DATE:${icsDate}\r\nDTEND;VALUE=DATE:${icsNext}\r\nSUMMARY:${pulito}${orari}\r\n${desc?'DESCRIPTION:'+desc+'\r\n':''}${loc?'LOCATION:'+loc+'\r\n':''}END:VEVENT\r\n`
  })
  ics += "END:VCALENDAR"
  const blob = new Blob([ics], {type:'text/calendar;charset=utf-8'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=`turni_${icsStart.value}_al_${icsEnd.value}.ics`; document.body.appendChild(a); a.click(); URL.revokeObjectURL(url); document.body.removeChild(a); showIcs.value=false
}

// ----- PDF BIBBIA SYNC -----
async function elaboraPdfBibbia(event) {
  const file = event.target.files[0]; if(!file) return
  try {
    const ab = await file.arrayBuffer()
    const pdf = await window.pdfjsLib.getDocument(ab).promise
    let fullText = ""; let righeTesto = []
    for (let i=1; i<=pdf.numPages; i++) {
      const page = await pdf.getPage(i); const tc = await page.getTextContent()
      let righeY = {}
      tc.items.forEach(item => { fullText += item.str+" "; let y=Math.round(item.transform[5]); if(!righeY[y])righeY[y]=[]; righeY[y].push(item.str.trim()) })
      Object.keys(righeY).sort((a,b)=>b-a).forEach(y => righeTesto.push(righeY[y].join(" ")))
    }
    const mesiMap = {"gennaio":1,"febbraio":2,"marzo":3,"aprile":4,"maggio":5,"giugno":6,"luglio":7,"agosto":8,"settembre":9,"ottobre":10,"novembre":11,"dicembre":12}
    let mm = fullText.match(/mese di ([a-z]+) (\d{4})/i)
    if(!mm) { alert("Impossibile trovare mese/anno nel PDF."); event.target.value=""; return }
    let mese = mesiMap[mm[1].toLowerCase()], anno = parseInt(mm[2])
    let knownShifts = new Set(["DISP","RI","AL","FER","FEP","FES","MAL","PERM","KMAL"])
    Object.values(store.state.dbCache||{}).forEach(db=>{ Object.keys(db).forEach(k=>knownShifts.add(k.split('_')[0])) })
    let sorted = Array.from(knownShifts).sort((a,b)=>b.length-a.length)
    let turniLetti = {}
    righeTesto.forEach(riga => {
      let mg = riga.match(/(?:^|\s)(\d{2})\s(?:lun|mar|mer|gio|ven|sab|dom)(?:\s|$)/i)
      if(mg) { let gn=mg[1]; let dStr=`${anno}-${String(mese).padStart(2,'0')}-${gn}`; for(let code of sorted){ if(new RegExp(`\\b${code}\\b`,'i').test(riga)){ turniLetti[dStr]=code.toUpperCase(); break } } }
    })
    let turniAttuali = store.calcolaTurniAction()
    let changes = []
    for(let dStr in turniLetti) {
      let tLetto = turniLetti[dStr]
      let [dA,dM,dG] = dStr.split('-'); if(parseInt(dA)!==anno||parseInt(dM)!==mese) continue
      let evObj = turniAttuali.find(e=>e.start===dStr && !e.title.includes('FERIE') && e.title!=='FEP')
      let tPulito = evObj ? evObj.title.replace(/ 🌫️| ⏱️| 📝|\(Sospeso\)| 🍝| 💸/g,'').trim().toUpperCase() : ""
      if(tPulito!==tLetto) changes.push({date:dStr, giornoTesto:`${parseInt(dG)} ${mm[1].toLowerCase()}`, oldShift:tPulito||"Nessuno", newShift:tLetto, checked:true})
    }
    event.target.value=""
    if(!changes.length) { alert(`Nessuna modifica necessaria per ${mm[1].toUpperCase()} ${anno}.`); return }
    pdfSyncChanges.value = changes
    showPdfSync.value = true
  } catch(e) { console.error(e); alert("Errore lettura PDF."); event.target.value="" }
}

function onApplicaPdfSync() {
  let n = store.applicaModifichePdf(pdfSyncChanges.value)
  showPdfSync.value = false; pdfSyncChanges.value = []
  alert(`Sincronizzazione applicata! Modifiche: ${n}`)
  refreshCalendar()
}

// Watch auth changes for cloud sync
watch(() => store.isLoaded, (loaded) => {
  if (loaded && calendarInstance) refreshCalendar()
})
</script>

<style scoped>
:root { --riposo: #1e8449; --disp: #feb236; --turno: #5e72e4; --bg: #f7f9fe; --text: #32325d; }

.calendar-view { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; background: var(--bg,#f7f9fe); color: var(--text,#32325d); min-height: 100vh; -webkit-tap-highlight-color: transparent; }

.top-bar { padding: 20px; display: flex; justify-content: space-between; align-items: center; background: white; box-shadow: 0 2px 10px rgba(0,0,0,0.05); position: sticky; top: 0; z-index: 100; }
.hamburger-btn { background: none; border: none; font-size: 28px; color: var(--text,#32325d); cursor: pointer; padding: 0; margin-right: 15px; }
.deposito-tag { font-size: 10px; background: #eef2ff; color: var(--turno,#5e72e4); padding: 4px 8px; border-radius: 5px; font-weight: bold; }

.sidebar-overlay { display: block; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); z-index: 2000; }
.sidebar { position: fixed; top: 0; left: -280px; width: 250px; height: 100%; background-color: white; box-shadow: 2px 0 5px rgba(0,0,0,0.2); z-index: 2001; transition: left 0.3s ease; display: flex; flex-direction: column; overflow-y: auto; }
.sidebar.open { left: 0; }
.sidebar-header { display: flex; justify-content: space-between; align-items: center; padding: 20px; background-color: var(--turno,#5e72e4); color: white; }
.sidebar-link { padding: 15px 20px; text-decoration: none; color: #333; font-size: 18px; border-bottom: 1px solid #eee; display: block; }
.sidebar-link:active, .sidebar-link:hover { background-color: #f4f7f6; color: var(--turno,#5e72e4); font-weight: bold; }

.right-sidebar { position: fixed; top: 0; right: -280px; width: 250px; height: 100%; background-color: white; box-shadow: -2px 0 5px rgba(0,0,0,0.2); z-index: 2001; transition: right 0.3s ease; display: flex; flex-direction: column; overflow-y: auto; }
.right-sidebar.open { right: 0; }

.disclaimer-banner { margin: 15px 10px; padding: 15px; background-color: #fff3cd; border: 1px solid #ffeeba; border-radius: 12px; color: #856404; font-size: 13px; text-align: center; line-height: 1.4; }

.modal { display: flex; position: fixed; z-index: 9999; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); backdrop-filter: blur(5px); justify-content: center; align-items: center; }
.modal-content { background: white; padding: 25px; width: 85%; max-width: 400px; border-radius: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); text-align: center; max-height: 80vh; overflow-y: auto; }

select, input[type="text"], input[type="date"], input[type="number"] { width: 100%; box-sizing: border-box; margin: 15px 0; padding: 15px; border: 2px solid #e9ecef; border-radius: 12px; font-size: 16px; background: white; -webkit-appearance: none; }
.btn { padding: 16px; border: none; border-radius: 14px; color: white; cursor: pointer; width: 100%; margin-top: 10px; font-weight: bold; font-size: 15px; }
.btn-reset { padding: 12px 15px; width: 100%; font-size: 14px; border: none; border-radius: 14px; color: white; cursor: pointer; font-weight: bold; margin: 0; }
.instruction-text { font-size: 15px; line-height: 1.6; color: #525f7f; margin-bottom: 10px; }
.edit-label { font-size: 14px; color: #525f7f; text-align: left; display: block; margin-top: 10px; font-weight: bold; }
.chk-label { display: flex; align-items: center; font-size: 15px; color: #525f7f; margin-bottom: 10px; font-weight: bold; cursor: pointer; }

.color-circle { width: 30px; height: 30px; border-radius: 50%; display: inline-block; margin: 4px; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: transform 0.2s, border 0.2s; }
.color-circle.selected { border: 3px solid #32325d; transform: scale(1.15); box-shadow: 0 6px 12px rgba(0,0,0,0.2); }

/* FullCalendar overrides */
:deep(.fc .fc-toolbar-title) { font-size: 1.2em !important; text-transform: capitalize; }
:deep(.fc .fc-button) { padding: 5px 10px !important; font-size: 0.9em !important; }
:deep(.fc .fc-btnSalto-button) { background-color: white !important; border-color: #e9ecef !important; color: #32325d !important; box-shadow: 0 2px 4px rgba(0,0,0,0.05) !important; }
:deep(.fc .fc-daygrid-day-frame) { min-height: 80px !important; cursor: pointer; }
:deep(.fc-event) { border: none !important; padding: 6px 4px !important; margin: 2px 0 !important; border-radius: 6px !important; font-weight: 700 !important; font-size: 0.85em !important; text-align: center; cursor: pointer !important; }
:deep(.bg-riposo) { background-color: #1e8449 !important; }
:deep(.bg-disp) { background-color: #feb236 !important; }
:deep(.bg-turno) { background-color: #5e72e4 !important; }
:deep(.bg-modificato) { background-color: #f5365c !important; }
:deep(.bg-ferie) { background-color: #20c997 !important; color: white !important; font-size: 0.75em !important; padding: 2px !important; margin-bottom: 4px !important; }

@media (max-width: 400px) {
  :deep(.fc-event) { font-size: 0.75em !important; padding: 4px 2px !important; }
  .modal-content { padding: 20px; }
}
</style>

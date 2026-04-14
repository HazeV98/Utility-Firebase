<template>
  <div class="annuncio-card-content">
    <div style="display:flex; justify-content: space-between;">
      <div style="flex: 1;">
        <div class="user-name">{{ annuncio.cognome }} {{ annuncio.nome }}</div>
        <div class="user-info">{{ annuncio.mansione }} | Mat: {{ annuncio.matricola }} | Tel: {{ annuncio.telefono }}</div>
        
        <div v-if="annuncio.tipo_annuncio === 'turno'">
          <div class="date-header">📅 {{ formattaData(annuncio.data_scambio) }}</div>
          <div><span class="badge" :class="'badge-' + annuncio.cerco">CERCA: {{ annuncio.cerco.toUpperCase() }}</span></div>
          <div style="margin-top: 4px;"><span class="badge" :class="'badge-' + annuncio.cedo">CEDE: {{ annuncio.cedo.toUpperCase() }} {{ annuncio.codice_turno ? '('+annuncio.codice_turno+')' : '' }}</span></div>
          
          <div v-if="annuncio.ora_inizio || annuncio.luogo_inizio" class="info-turno-box">
            <div class="info-row">
              <span><b>Inizio:</b> {{ annuncio.ora_inizio || '--:--' }}</span>
              <span><b>Fine:</b> {{ annuncio.ora_fine || '--:--' }}</span>
            </div>
            <div class="info-row">
              <span><b>Da:</b> {{ annuncio.luogo_inizio || '--' }}</span>
              <span><b>A:</b> {{ annuncio.luogo_fine || '--' }}</span>
            </div>
          </div>
          
          <div class="btn-image-wrapper" v-if="mostraPulsanteImmagine(annuncio)">
             <button @click="$emit('openImage', annuncio.codice_turno, annuncio.data_scambio)" class="btn-image">
               📷 Mostra Immagine Turno
             </button>
          </div>
        </div>

        <div v-else>
          <div class="date-header">📅 CERCA RIPOSO IL: {{ formattaData(annuncio.data_scambio) }}</div>
          <div style="margin-top: 4px;"><span class="badge badge-riposo">RESTITUISCE: {{ formattaRestituzione(annuncio.restituzione) }}</span></div>
        </div>
      </div>
      
      <div class="contact-actions">
        <a v-if="!isMe && annuncio.telefono" :href="'https://wa.me/39' + pulisciTelefono(annuncio.telefono) + '?text=' + encodeURIComponent('Ciao! Ho visto in bacheca il tuo annuncio per il ' + formattaData(annuncio.data_scambio) + '. Ne parliamo?')" target="_blank" class="action-icon wa-icon">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="#25D366"><path d="M12.031 0C5.385 0 .018 5.366.018 12.012c0 2.125.553 4.197 1.603 6.012L.05 24l6.115-1.604c1.745.965 3.738 1.474 5.866 1.474 6.646 0 12.013-5.366 12.013-12.012S18.677 0 12.031 0zm-.018 21.84c-1.796 0-3.553-.483-5.093-1.396l-.365-.216-3.791.994.996-3.697-.238-.377a9.98 9.98 0 0 1-1.528-5.337C1.994 6.452 6.444 2.016 12.013 2.016c2.705 0 5.247 1.053 7.158 2.966 1.91 1.912 2.964 4.456 2.964 7.165 0 5.564-4.45 10.003-10.012 10.003l-.11-.31zm5.503-7.534c-.302-.151-1.785-.881-2.062-.981-.277-.101-.479-.151-.68.151-.202.302-.781.981-.957 1.182-.176.202-.353.226-.655.075-.302-.151-1.275-.47-2.428-1.503-.896-.803-1.501-1.794-1.677-2.096-.176-.302-.019-.465.132-.616.136-.136.302-.353.453-.53.151-.176.202-.302.302-.504.101-.202.05-.378-.025-.53-.075-.151-.68-1.64-.932-2.245-.245-.59-.495-.51-.68-.52-.176-.01-.378-.01-.58-.01-.202 0-.53.076-.807.378-.277.302-1.058 1.034-1.058 2.52 0 1.487 1.083 2.924 1.234 3.125.151.202 2.132 3.255 5.163 4.561 2.222.956 2.87.805 3.373.68.591-.148 1.785-.73 2.037-1.435.252-.705.252-1.31.176-1.435-.075-.126-.277-.202-.58-.353z"/></svg>
        </a>
        <button v-if="isMe || isAdmin" @click="$emit('delete', annuncio.id)" class="action-icon btn-delete">🗑️</button>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  annuncio: Object,
  isAdmin: Boolean,
  isMe: Boolean
})

const formattaData = (isoStr) => {
  if (!isoStr) return ""
  const d = new Date(isoStr)
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const formattaRestituzione = (arr) => {
  if (!arr || arr.length === 0) return "Da concordare"
  return arr.map(formattaData).join(' o ')
}

const pulisciTelefono = (tel) => tel ? tel.replace(/\s+/g, '') : ''

const mostraPulsanteImmagine = (a) => {
  if (!a.codice_turno) return false
  const codBase = a.codice_turno.toUpperCase()
  return !(codBase === 'RI' || codBase === 'RIPOSO' || codBase === 'AL' || codBase === 'DISP' || codBase === 'NESSUN TURNO')
}
</script>

<style scoped>
.user-name { font-weight: bold; color: var(--text-color); margin-bottom: 2px; }
.user-info { font-size: 11px; color: #666; margin-bottom: 8px; }
.date-header { font-size: 13px; font-weight: bold; margin-bottom: 5px; }

.badge { display: inline-block; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; margin-bottom: 4px; }
.badge-primo { background: #cce5ff; color: #004085; }
.badge-mezzo { background: #d4edda; color: #155724; }
.badge-terzo { background: #f8d7da; color: #721c24; }
.badge-riposo { background: #e2e3e5; color: #383d41; }

.info-turno-box {
  font-size: 11px; color: #555; margin-top: 8px; padding: 8px; 
  background: #f8f9fa; border-radius: 6px; border-left: 3px solid var(--primary);
}
.info-row { display: flex; justify-content: space-between; margin-bottom: 4px; }

.btn-image-wrapper { margin-top: 10px; }
.btn-image {
  background: transparent; border: 1px solid var(--primary); color: var(--primary);
  padding: 6px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;
  cursor: pointer; display: flex; align-items: center; gap: 5px; width: 100%; justify-content: center;
}

.contact-actions { display: flex; gap: 10px; align-items: center; justify-content: flex-end; margin-top: 10px; }
.action-icon {
  background: #e9ecef; border-radius: 50%; width: 40px; height: 40px; 
  display: flex; align-items: center; justify-content: center; text-decoration: none; cursor: pointer;
}
.wa-icon { background: transparent; }
.btn-delete { background: var(--danger); color: white; border: none; font-size: 16px; }
</style>

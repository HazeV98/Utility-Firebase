import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const dbName = "UtilityDB"
const storeName = "archivio_dds"
let dbRecord = null

const openDB = () => {
  return new Promise((resolve, reject) => {
    if (dbRecord) return resolve(dbRecord)
    const request = indexedDB.open(dbName, 3)
    request.onupgradeneeded = (e) => {
      const targetDb = e.target.result
      if (!targetDb.objectStoreNames.contains(storeName)) {
        targetDb.createObjectStore(storeName, { keyPath: "id", autoIncrement: true })
      }
    }
    request.onsuccess = (e) => {
      dbRecord = e.target.result
      resolve(dbRecord)
    }
    request.onerror = (e) => reject(e)
  })
}

export const useDdsStore = defineStore('dds', () => {
  const ddsList = ref([])
  const isLoaded = ref(false)

  const activeReminders = computed(() => {
    if (!ddsList.value.length) return []
    const rx = new Date()
    const oggiStr = rx.getFullYear() + "-" + String(rx.getMonth()+1).padStart(2,'0') + "-" + String(rx.getDate()).padStart(2,'0')
    const domaniDate = new Date(rx)
    domaniDate.setDate(domaniDate.getDate() + 1)
    const domaniStr = domaniDate.getFullYear() + "-" + String(domaniDate.getMonth()+1).padStart(2,'0') + "-" + String(domaniDate.getDate()).padStart(2,'0')

    return ddsList.value.filter(d => {
      if (!d.dateValidita || d.dateValidita.length === 0) return false
      const firstDay = d.dateValidita[0]
      const lastDay = d.dateValidita[d.dateValidita.length - 1]
      
      if (lastDay < oggiStr) return false

      let showToday = false
      let rems = Array.isArray(d.reminder) ? d.reminder : [d.reminder]

      if (rems.includes('day_before') && firstDay === domaniStr) showToday = true
      if (rems.includes('first_day') && firstDay === oggiStr) showToday = true
      if (rems.includes('all_days') && d.dateValidita.includes(oggiStr)) showToday = true

      return showToday
    })
  })

  async function fetchDDS() {
    try {
      const db = await openDB()
      const tx = db.transaction(storeName, "readonly")
      tx.objectStore(storeName).getAll().onsuccess = (e) => {
        let arr = e.target.result
        
        // Pulizia scaduti
        const rx = new Date()
        const oggi = rx.getFullYear() + "-" + String(rx.getMonth()+1).padStart(2,'0') + "-" + String(rx.getDate()).padStart(2,'0')
        const daElim = []

        arr = arr.filter(d => {
          if (d.isPromemoria && d.dateValidita?.length > 0) {
            if (d.dateValidita[d.dateValidita.length - 1] < oggi) {
              daElim.push(d.id)
              return false
            }
          }
          return true
        })

        if (daElim.length) {
          const tDel = db.transaction(storeName, "readwrite")
          daElim.forEach(id => tDel.objectStore(storeName).delete(id))
        }

        arr.sort((a,b) => {
          let d1 = a.dateValidita ? a.dateValidita[0] : (a.dataDa || a.dataEntrata)
          let d2 = b.dateValidita ? b.dateValidita[0] : (b.dataDa || b.dataEntrata)
          return new Date(d2) - new Date(d1)
        })

        ddsList.value = arr
        isLoaded.value = true
      }
    } catch(e) {
      console.error(e)
      isLoaded.value = true
    }
  }

  async function addDDS(payload, fileObj) {
    return new Promise(async (resolve) => {
      const db = await openDB()
      
      if (fileObj && !payload.isPromemoria) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const docData = { ...payload, fileData: e.target.result }
          const tx = db.transaction(storeName, "readwrite")
          tx.objectStore(storeName).add(docData).onsuccess = () => {
            fetchDDS()
            resolve(true)
          }
        }
        reader.readAsDataURL(fileObj)
      } else {
        const tx = db.transaction(storeName, "readwrite")
        tx.objectStore(storeName).add(payload).onsuccess = () => {
          fetchDDS()
          resolve(true)
        }
      }
    })
  }

  async function deleteDDS(id) {
    const db = await openDB()
    return new Promise((resolve) => {
      db.transaction(storeName, "readwrite").objectStore(storeName).delete(id).onsuccess = () => {
        fetchDDS()
        resolve(true)
      }
    })
  }

  async function getDDSFileUrl(id) {
    const d = ddsList.value.find(x => x.id === id)
    if (d && d.fileData) {
      const parts = d.fileData.split(',')
      const byteChar = atob(parts[1])
      const byteNum = new Array(byteChar.length)
      for(let i=0; i<byteChar.length; i++) byteNum[i] = byteChar.charCodeAt(i)
      const blob = new Blob([new Uint8Array(byteNum)], {type: 'application/pdf'})
      return URL.createObjectURL(blob)
    }
    return null
  }

  async function importLegacyArray(arr) {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(storeName, "readwrite")
      arr.forEach(i => { delete i.id; tx.objectStore(storeName).add(i) })
      tx.oncomplete = () => {
        fetchDDS()
        resolve(true)
      }
    })
  }

  return { ddsList, isLoaded, activeReminders, fetchDDS, addDDS, deleteDDS, getDDSFileUrl, importLegacyArray }
})

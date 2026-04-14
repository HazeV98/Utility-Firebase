// ============================================================
// calendarEngine.js — Pure shift computation functions
// Extracted from legacy calendario.html (~2800 lines)
// ============================================================

/**
 * Convert a "YYYY-MM-DD" string to a day-number (days since epoch, noon UTC).
 */
export function stringToNum(s) {
  if (!s) return 0
  let p = s.split('-')
  return Math.floor(Date.UTC(p[0], p[1] - 1, p[2]) / 86400000)
}

/**
 * Format a Date object to "YYYY-MM-DD" local string.
 */
export function dateToLocalISO(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0')
}

/**
 * Create a timezone-safe Date from "YYYY-MM-DD" string (noon).
 */
export function creaDataSicura(dataStr) {
  if (!dataStr) return new Date()
  let p = dataStr.split('-')
  return new Date(p[0], p[1] - 1, p[2], 12, 0, 0)
}

/**
 * Format a "YYYY-MM-DD" to human-readable Italian date (e.g., "28 Marzo").
 */
export function formattaData(d) {
  let dataObj = new Date(d)
  let mese = dataObj.toLocaleDateString('it-IT', { month: 'long' })
  return dataObj.getDate() + ' ' + mese.charAt(0).toUpperCase() + mese.slice(1)
}

/**
 * Extract "YYYY-MM-DD" from a filename like "info_turni_2026-03-28.json".
 */
export function estraiDataDaNome(nome) {
  const match = nome.match(/\d{4}-\d{2}-\d{2}/)
  return match ? match[0] : null
}

/**
 * Check if dateStr falls within a range [startStr, endStr] within a given year.
 * startStr/endStr are "MM-DD" format.
 */
export function isDateInRange(dStr, startStr, endStr, year) {
  let d = new Date(year, parseInt(dStr.split('-')[1]) - 1, parseInt(dStr.split('-')[2]))
  let s = new Date(year, parseInt(startStr.split('-')[0]) - 1, parseInt(startStr.split('-')[1]))
  let e = new Date(year, parseInt(endStr.split('-')[0]) - 1, parseInt(endStr.split('-')[1]))
  return d >= s && d <= e
}

/**
 * Check if a given date is a structural rest day for a specific configuration.
 * Supports two patterns:
 *   - disp_det: 5-1 (rest every 6th day)
 *   - all others: 6-2-6-1 (rest on positions 6, 13, 14 in a 15-day cycle)
 */
export function isGiornoRiposoBase(curr, cfg) {
  if (!cfg.riposoStart) return false
  let ref = stringToNum(cfg.riposoStart)
  if (cfg.depositoAttivo === 'disp_det') return (((curr - ref) % 6 + 6) % 6 === 0)
  let pos = ((curr - ref + 6) % 15 + 15) % 15
  return (pos === 6 || pos === 13 || pos === 14)
}

/**
 * Full rest-day check including manual overrides (variazioni).
 */
export function isGiornoRiposo(dStr, state, DATA_INIZIO_NUOVI_TURNI) {
  if (state.variazioni[dStr] === "RI" || state.variazioni[dStr] === "RIPOSO" || state.variazioni[dStr] === "AL") return true
  let cfg = (state.history && stringToNum(dStr) < stringToNum(DATA_INIZIO_NUOVI_TURNI)) ? state.history : state
  return isGiornoRiposoBase(stringToNum(dStr), cfg)
}

/**
 * Get the rotation rules for a given date from the rotCache.
 */
export function getRotazionePerData(dateStr, state) {
  const dSelezionata = stringToNum(dateStr)
  const dateChiavi = Object.keys(state.rotCache || {}).sort()
  if (dateChiavi.length === 0) return null
  let rotCorrente = state.rotCache[dateChiavi[0]]
  for (let i = dateChiavi.length - 1; i >= 0; i--) {
    if (dSelezionata >= stringToNum(dateChiavi[i])) {
      rotCorrente = state.rotCache[dateChiavi[i]]
      break
    }
  }
  return rotCorrente
}

/**
 * Get the DISP rules for a given date from the dispCache.
 */
export function getDispPerData(dateStr, state) {
  const dSelezionata = stringToNum(dateStr)
  const dateChiavi = Object.keys(state.dispCache || {}).sort()
  if (dateChiavi.length === 0) return null
  let dispCorrente = state.dispCache[dateChiavi[0]]
  for (let i = dateChiavi.length - 1; i >= 0; i--) {
    if (dSelezionata >= stringToNum(dateChiavi[i])) {
      dispCorrente = state.dispCache[dateChiavi[i]]
      break
    }
  }
  return dispCorrente
}

/**
 * Find the next rotation-change date after a given reference date.
 */
export function trovaDataCambioProssimo(dataRifStr, state) {
  const rif = stringToNum(dataRifStr)
  const dateChiavi = Object.keys(state.rotCache || {}).sort()
  const futura = dateChiavi.find(d => stringToNum(d) > rif)
  return futura || null
}

/**
 * Resolve the exact DB key for a shift code, handling:
 *   - B-rule: lines 1-9 with B suffix (e.g., 1B01 → 1C01 or 1P01)
 *   - +50 rule: numeric suffix ≥50 maps to suffix-50 (e.g., 1251 → 1201)
 *   - Day-of-week suffixes (e.g., 1201_LUN, 1201_LUN-VEN)
 */
export function trovaChiaveEsatta(db, codiceBase, dateStr) {
  if (!db || !codiceBase) return codiceBase

  let codiciDaCercare = [codiceBase]

  // Rule 1: Lines 1-9 with B (e.g., 1B01, 4B01)
  let matchB = codiceBase.match(/^([1-9])B(\d{2})$/)
  if (matchB) {
    let linea = matchB[1]
    let finale = matchB[2]
    let letteraPilota = (linea === '1' || linea === '2') ? 'C' : 'P'
    let regex = new RegExp(`^${linea}[A-Z]${finale}$`)
    let trovati = Object.keys(db).filter(k => regex.test(k))
    if (trovati.length > 0) {
      codiciDaCercare.push(...trovati)
    } else {
      codiciDaCercare.push(`${linea}${letteraPilota}${finale}`)
    }
  } else {
    // Rule 2: +50 rule (e.g., 1251 → 1201, M254 → M204)
    let match50 = codiceBase.match(/^([A-Z0-9]+?)(\d{2})$/)
    if (match50) {
      let pref = match50[1]
      let num = parseInt(match50[2], 10)
      if (num >= 50) {
        let numPilota = String(num - 50).padStart(2, '0')
        codiciDaCercare.push(pref + numPilota)
      }
    }
  }

  let giornoIdx = creaDataSicura(dateStr).getDay()
  let targetDay = giornoIdx === 0 ? 7 : giornoIdx
  const dayMap = { "LUN": 1, "MAR": 2, "MER": 3, "GIO": 4, "VEN": 5, "SAB": 6, "DOM": 7 }

  for (let codCercato of codiciDaCercare) {
    let keys = Object.keys(db).filter(k => k === codCercato || k.startsWith(codCercato + "_"))

    let exactMatch = null
    let genericMatch = null

    for (let k of keys) {
      if (k === codCercato) {
        genericMatch = k
        continue
      }
      let suffix = k.substring(codCercato.length + 1)
      if (suffix.includes("-")) {
        let parts = suffix.split("-")
        if (parts.length === 2 && dayMap[parts[0]] && dayMap[parts[1]]) {
          let start = dayMap[parts[0]]
          let end = dayMap[parts[1]]
          if (start <= end) {
            if (targetDay >= start && targetDay <= end) exactMatch = k
          } else {
            if (targetDay >= start || targetDay <= end) exactMatch = k
          }
        }
      } else {
        if (dayMap[suffix] && dayMap[suffix] === targetDay) {
          exactMatch = k
        }
      }
    }
    if (exactMatch) return exactMatch
    if (genericMatch) return genericMatch
  }

  return codiceBase
}

/**
 * Get holiday assignment for a given date based on the rotation ferie configuration.
 */
export function getFerieGiorno(dStr, state, ROT_FERIE_EST, ROT_FERIE_INV) {
  if (!state.ferie || !state.ferie.baseAnno) return null
  let year = parseInt(dStr.split('-')[0])
  let r = []

  // Check Estiva
  let iEst = state.ferie.baseEstiva
  if (iEst !== -1 && iEst !== null && iEst !== undefined && ROT_FERIE_EST.length > 0) {
    let idxEst = (iEst + (year - state.ferie.baseAnno)) % ROT_FERIE_EST.length
    if (idxEst < 0) idxEst += ROT_FERIE_EST.length
    if (state.ferie.scambi && state.ferie.scambi[year] && state.ferie.scambi[year].estiva !== undefined) {
      idxEst = state.ferie.scambi[year].estiva
    }
    let pEst = ROT_FERIE_EST[idxEst]
    if (pEst && isDateInRange(dStr, pEst.s, pEst.e, year)) r.push("FEP")
  }

  // Check Invernale
  let iInv = state.ferie.baseInvernale
  if (iInv !== -1 && iInv !== null && iInv !== undefined && ROT_FERIE_INV.length > 0) {
    let idxInv = (iInv + (year - state.ferie.baseAnno)) % ROT_FERIE_INV.length
    if (idxInv < 0) idxInv += ROT_FERIE_INV.length
    if (state.ferie.scambi && state.ferie.scambi[year] && state.ferie.scambi[year].invernale !== undefined) {
      idxInv = state.ferie.scambi[year].invernale
    }
    let pInv = ROT_FERIE_INV[idxInv]
    if (pInv && isDateInRange(dStr, pInv.s, pInv.e, year)) r.push("FEP")
  }

  let uniqueR = [...new Set(r)]
  return uniqueR.length > 0 ? uniqueR.join(" + ") : null
}

/**
 * Generate HTML options for shift selection dropdowns.
 */
export function getOptionsTurni(state, tempRotDate) {
  let d = new Date()
  d.setHours(12, 0, 0, 0)
  let referenceDate = tempRotDate || dateToLocalISO(d)
  const rot = getRotazionePerData(referenceDate, state)

  if (!rot || !rot[state.depositoAttivo]) return ""

  let htmlDisp = "", htmlTurni = "", dispAggiunto = false
  let htmlRiposo = `<option value="RIPOSO" style="font-weight:bold; color:var(--riposo);">RIPOSO</option>`

  rot[state.depositoAttivo].map((n, i) => ({ n: n.toUpperCase(), i: i }))
    .sort((a, b) => a.n.localeCompare(b.n, undefined, { numeric: true }))
    .forEach(item => {
      if (item.n === "DISP") {
        if (!dispAggiunto) {
          htmlDisp = `<option value="${item.i}">DISP</option>`
          dispAggiunto = true
        }
      } else {
        htmlTurni += `<option value="${item.i}">${item.n}</option>`
      }
    })

  return htmlRiposo + htmlDisp + htmlTurni
}

/**
 * The main shift computation engine.
 * Returns an array of FullCalendar event objects.
 */
export function calcolaTurni(state, ROT_FERIE_EST, ROT_FERIE_INV, DATA_INIZIO_NUOVI_TURNI) {
  if (!state.riposoStart) return []
  let evs = []
  let today = new Date()
  today.setHours(12, 0, 0, 0)

  let limitTurni = 365
  let limitRiposi = 1825
  let todayNum = stringToNum(dateToLocalISO(today))

  if (state.rotazioneStart) {
    let distDaOggi = Math.abs(todayNum - stringToNum(state.rotazioneStart))
    limitTurni = distDaOggi + 365
    limitRiposi = distDaOggi + 1825
  }

  if (state.futureConfig && state.futureConfig.dataInizio) {
    let distFutura = Math.abs(todayNum - stringToNum(state.futureConfig.dataInizio))
    if (distFutura + 365 > limitTurni) limitTurni = distFutura + 365
    if (distFutura + 1825 > limitRiposi) limitRiposi = distFutura + 1825
  }

  let processati = new Set()

  for (let i = -60; i < limitRiposi; i++) {
    let dObj = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i, 12, 0, 0)
    let dStr = dateToLocalISO(dObj)
    let curr = stringToNum(dStr)
    processati.add(dStr)

    // Ferie Programmate
    let ferieAssegnate = getFerieGiorno(dStr, state, ROT_FERIE_EST, ROT_FERIE_INV)
    if (ferieAssegnate) {
      evs.push({ title: ferieAssegnate, start: dStr, allDay: true, className: 'bg-ferie', myOrder: 1 })
    }

    let customColor = (state.colori && state.colori[dStr]) ? state.colori[dStr] : null
    let isPastUpdate = (state.history && curr < stringToNum(DATA_INIZIO_NUOVI_TURNI))
    let cfgBase = isPastUpdate ? state.history : state

    if (!customColor && state.coloriRotazione) {
      let isManualManual = (state.variazioni[dStr] === "RI" || state.variazioni[dStr] === "RIPOSO" || state.variazioni[dStr] === "AL")
      let isStrutturaleRest = isGiornoRiposoBase(curr, cfgBase)

      if (isManualManual || isStrutturaleRest) {
        if (state.coloriRotazione['riposo']) customColor = state.coloriRotazione['riposo']
      } else {
        let indiceGiornata = 1
        for (let k = curr - 1; k >= curr - 10; k--) {
          if (isGiornoRiposoBase(k, cfgBase)) break
          indiceGiornata++
        }
        if (indiceGiornata <= 6 && state.coloriRotazione[indiceGiornata]) {
          customColor = state.coloriRotazione[indiceGiornata]
        }
      }
    }

    let tColor = (customColor === '#f1c40f') ? '#32325d' : '#ffffff'
    let titleAddon = ""

    if (state.nebbia[dStr]) titleAddon += " 🌫️"
    if (state.straordinario[dStr]) titleAddon += " ⏱️"
    if (state.buonoPasto[dStr]) titleAddon += " 🍝"
    if (state.sospesoRiposo[dStr]) titleAddon += " (Sospeso)"
    if (state.permessoSP[dStr]) titleAddon += " 💸"
    if (state.note[dStr]) titleAddon += " 📝"

    if (state.variazioni[dStr]) {
      let ev = { title: state.variazioni[dStr] + titleAddon, start: dStr, allDay: true, myOrder: 2 }
      if (customColor) {
        ev.backgroundColor = customColor
        ev.textColor = tColor
      } else {
        ev.className = (state.variazioni[dStr] === 'RI' || state.variazioni[dStr] === 'RIPOSO' || state.variazioni[dStr] === 'AL') ? 'bg-riposo' : 'bg-modificato'
      }
      evs.push(ev)
      continue
    }

    if (isGiornoRiposo(dStr, state, DATA_INIZIO_NUOVI_TURNI)) {
      let tituloRiposo = 'RI'
      if (cfgBase.riposoStart && cfgBase.depositoAttivo !== 'disp_det') {
        let ref = stringToNum(cfgBase.riposoStart)
        let pos = ((curr - ref + 6) % 15 + 15) % 15
        if (pos === 13) tituloRiposo = 'AL'
      }

      let ev = { title: tituloRiposo + titleAddon, start: dStr, allDay: true, myOrder: 2 }
      if (customColor) {
        ev.backgroundColor = customColor
        ev.textColor = tColor
      } else {
        ev.className = 'bg-riposo'
      }
      evs.push(ev)

    } else if (i < limitTurni) {
      const currentRotRules = getRotazionePerData(dStr, state)
      let t = ""

      if (cfgBase.depositoAttivo.startsWith('disp_')) {
        t = "DISP"
      } else if (cfgBase.rotazioneStart) {
        let activeCfg = (state.futureConfig && curr >= stringToNum(state.futureConfig.dataInizio))
          ? { start: state.futureConfig.dataInizio, idx: state.futureConfig.turnoIndex, tcPattern: state.futureConfig.tcPattern }
          : { start: cfgBase.rotazioneStart, idx: cfgBase.turnoIndex, tcPattern: cfgBase.tcPattern }
        let refRot = stringToNum(activeCfg.start), w = 0

        if (curr >= refRot) {
          for (let j = refRot; j < curr; j++) {
            if (!isGiornoRiposoBase(j, cfgBase)) w++
          }
        } else {
          for (let j = refRot; j > curr; j--) {
            if (!isGiornoRiposoBase(j, cfgBase)) w--
          }
        }

        let refRip = stringToNum(cfgBase.riposoStart)
        let startPos = ((refRot - refRip + 6) % 15 + 15) % 15
        let offset = [1, 3, 5, 8, 10, 12].includes(startPos) ? 1 : 0

        const rotList = (currentRotRules && currentRotRules[cfgBase.depositoAttivo]) ? currentRotRules[cfgBase.depositoAttivo] : []

        if (rotList.length > 0) {
          if (cfgBase.depositoAttivo.startsWith('tc_')) {
            let currPos = ((curr - refRip + 6) % 15 + 15) % 15
            let isBlock2 = (currPos >= 7 && currPos <= 12)
            let k = isBlock2 ? (currPos - 7) : currPos
            let patternDopoSingolo = activeCfg.tcPattern || cfgBase.tcPattern || 'doppio'
            let isAlternato = (patternDopoSingolo === 'disp') ? isBlock2 : !isBlock2
            let idx = Math.floor(k / 2)

            if (idx >= rotList.length) idx = rotList.length - 1
            t = rotList[idx].toUpperCase()

            if (isAlternato) {
              let dispOnEven = (cfgBase.depositoAttivo === 'tc_spez_lido')
              if (dispOnEven && k % 2 === 0) t = "DISP"
              if (!dispOnEven && k % 2 !== 0) t = "DISP"
            }
          } else {
            let expandedRotList = []
            let originalToExpanded = []

            for (let j = 0; j < rotList.length; j++) {
              originalToExpanded[j] = expandedRotList.length
              let currentTurn = rotList[j].toUpperCase()

              if (currentTurn.includes('+')) {
                let parts = currentTurn.split('+')
                expandedRotList.push(parts[0].trim())
                if (parts.length > 1) {
                  expandedRotList.push(parts[1].trim())
                }
              } else {
                expandedRotList.push(currentTurn)
                expandedRotList.push(currentTurn)
              }
            }

            let L_exp = expandedRotList.length
            let baseExpIdx = originalToExpanded[activeCfg.idx]
            let blockStartIdx = baseExpIdx - (baseExpIdx % 2)
            let idxExp = (blockStartIdx + w + offset) % L_exp

            if (idxExp < 0) idxExp += L_exp
            t = expandedRotList[idxExp]
          }

          let currentDispRules = getDispPerData(dStr, state)
          if (currentDispRules) {
            const mapG = ["DOMENICA", "LUNEDI", "MARTEDI", "MERCOLEDI", "GIOVEDI", "VENERDI", "SABATO"]
            let nomeG = mapG[dObj.getDay()]
            let rGiorno = currentDispRules[nomeG] || currentDispRules[nomeG.toLowerCase()] || currentDispRules[nomeG.charAt(0) + nomeG.slice(1).toLowerCase()] || currentDispRules[dObj.getDay().toString()]

            if (rGiorno && Array.isArray(rGiorno)) {
              if (rGiorno.map(x => x.toUpperCase()).includes(t)) {
                t = "DISP"
              }
            }
          }
        }
      }

      if (t !== "") {
        let ev = { title: t + titleAddon, start: dStr, allDay: true, myOrder: 2 }
        if (customColor) {
          ev.backgroundColor = customColor
          ev.textColor = tColor
        } else {
          ev.className = (t === 'DISP' ? 'bg-disp' : 'bg-turno')
        }
        evs.push(ev)
      }
    }
  }

  // Process dates outside the main loop that have manual modifications
  let chiaviModificate = new Set([
    ...Object.keys(state.variazioni || {}),
    ...Object.keys(state.nebbia || {}),
    ...Object.keys(state.straordinario || {}),
    ...Object.keys(state.sospesoRiposo || {}),
    ...Object.keys(state.colori || {}),
    ...Object.keys(state.note || {}),
    ...Object.keys(state.buonoPasto || {}),
    ...Object.keys(state.permessoSP || {})
  ])

  chiaviModificate.forEach(dStr => {
    if (!processati.has(dStr)) {
      let ferieAssegnate = getFerieGiorno(dStr, state, ROT_FERIE_EST, ROT_FERIE_INV)
      if (ferieAssegnate) {
        evs.push({ title: ferieAssegnate, start: dStr, allDay: true, className: 'bg-ferie', myOrder: 1 })
      }

      let customColor = (state.colori && state.colori[dStr]) ? state.colori[dStr] : null
      let currMod = stringToNum(dStr)
      let isPastUpdateMod = (state.history && currMod < stringToNum(DATA_INIZIO_NUOVI_TURNI))
      let cfgBaseMod = isPastUpdateMod ? state.history : state

      if (!customColor && state.coloriRotazione) {
        let isManualManual = (state.variazioni[dStr] === "RI" || state.variazioni[dStr] === "RIPOSO" || state.variazioni[dStr] === "AL")
        let isStrutturaleRest = isGiornoRiposoBase(currMod, cfgBaseMod)

        if (isManualManual || isStrutturaleRest) {
          if (state.coloriRotazione['riposo']) customColor = state.coloriRotazione['riposo']
        } else {
          let indiceGiornata = 1
          for (let k = currMod - 1; k >= currMod - 10; k--) {
            if (isGiornoRiposoBase(k, cfgBaseMod)) break
            indiceGiornata++
          }
          if (indiceGiornata <= 6 && state.coloriRotazione[indiceGiornata]) {
            customColor = state.coloriRotazione[indiceGiornata]
          }
        }
      }

      let tColor = (customColor === '#f1c40f') ? '#32325d' : '#ffffff'
      let titleAddon = ""
      if (state.nebbia[dStr]) titleAddon += " 🌫️"
      if (state.straordinario[dStr]) titleAddon += " ⏱️"
      if (state.buonoPasto[dStr]) titleAddon += " 🍝"
      if (state.sospesoRiposo[dStr]) titleAddon += " (Sospeso)"
      if (state.permessoSP[dStr]) titleAddon += " 💸"
      if (state.note[dStr]) titleAddon += " 📝"

      let titleTxt = state.variazioni[dStr] ? state.variazioni[dStr] : "NOTA"
      let ev = { title: titleTxt + titleAddon, start: dStr, allDay: true, myOrder: 2 }

      if (customColor) {
        ev.backgroundColor = customColor
        ev.textColor = tColor
      } else {
        ev.className = (titleTxt === 'RI' || titleTxt === 'RIPOSO' || titleTxt === 'AL') ? 'bg-riposo' : 'bg-modificato'
      }
      evs.push(ev)
    }
  })
  return evs
}

export const formatStr = (d) => {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0')
}

export const stringToNum = (s) => {
  if(!s) return 0;
  let p = s.split('-')
  return Math.floor(new Date(p[0], p[1]-1, p[2], 12, 0, 0).getTime() / 86400000)
}

export const isDateInRange = (dStr, startStr, endStr, year) => {
  if(!dStr || !startStr || !endStr) return false
  let d = new Date(year, parseInt(dStr.split('-')[1])-1, parseInt(dStr.split('-')[2]))
  let s = new Date(year, parseInt(startStr.split('-')[0])-1, parseInt(startStr.split('-')[1]))
  let e = new Date(year, parseInt(endStr.split('-')[0])-1, parseInt(endStr.split('-')[1]))
  return d >= s && d <= e
}

export const calcolaPresenze = (giornoInizio, giornoFine, mese, anno, state, functionMaturato, esclusi) => {
  let conteggio = 0
  for(let i=giornoInizio; i<=giornoFine; i++) {
    let dStr = formatStr(new Date(anno, mese, i, 0, 0, 0))
    if (functionMaturato(dStr, state, esclusi, true)) conteggio++
  }
  return conteggio
}

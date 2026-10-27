export const ZONA = 'America/Mexico_City'

export function desdeMexicoInput(valor) {
  if (!valor) return null
  const [fecha, hora = '00:00'] = String(valor).split('T')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null
  const [hh = '00', mm = '00'] = hora.split(':')
  const iso = `${fecha}T${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:00-06:00`
  const fechaDate = new Date(iso)
  if (Number.isNaN(fechaDate.getTime())) return null
  return fechaDate.toISOString()
}

export function aMexicoInput(iso) {
  if (!iso) return ''
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return ''
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(fecha)
  const mapa = Object.fromEntries(partes.filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]))
  let hora = mapa.hour
  if (hora === '24') hora = '00'
  return `${mapa.year}-${mapa.month}-${mapa.day}T${String(hora).padStart(2, '0')}:${mapa.minute}`
}

export function hoyMexico(ahora = new Date()) {
  return aMexicoInput(ahora.toISOString()).slice(0, 10)
}

export function diaMexico(valor) {
  if (!valor) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor
  return aMexicoInput(valor).slice(0, 10)
}

export function formatearFecha(valor, conHora = false) {
  const dia = diaMexico(valor)
  if (!dia) return '—'
  const [anio, mes, dd] = dia.split('-')
  const base = `${dd}/${mes}/${anio}`
  if (!conHora || /^\d{4}-\d{2}-\d{2}$/.test(valor)) return base
  const hora = aMexicoInput(valor).slice(11, 16)
  return `${base} ${hora}`
}

export function formatearHora(valor) {
  if (!valor) return '—'
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return '—'
  return aMexicoInput(valor).slice(11, 16)
}

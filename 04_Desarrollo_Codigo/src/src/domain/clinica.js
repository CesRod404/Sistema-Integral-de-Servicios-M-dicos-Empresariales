export function cambiarAsistencia(cita, nuevoEstado, rol) {
  if (rol !== 'administrador') {
    return { ok: false, mensaje: 'Solo el administrador puede registrar la asistencia.' }
  }
  if (!['presente', 'ausente'].includes(nuevoEstado)) {
    return { ok: false, mensaje: 'El estado de asistencia debe ser presente o ausente.' }
  }
  if (['cerrada', 'cancelada'].includes(cita?.estadoAsistencia)) {
    return { ok: false, mensaje: 'La cita ya no admite cambio de asistencia.' }
  }
  return { ok: true, estado: nuevoEstado }
}

export function cancelarCita(cita, rol) {
  if (rol !== 'administrador') {
    return { ok: false, mensaje: 'Solo el administrador puede cancelar la cita.' }
  }
  if (cita?.estadoAsistencia === 'cerrada') {
    return { ok: false, mensaje: 'No se puede cancelar una cita ya atendida.' }
  }
  if (cita?.estadoAsistencia === 'cancelada') {
    return { ok: false, mensaje: 'La cita ya está cancelada.' }
  }
  return { ok: true, estado: 'cancelada' }
}

export function validarCierre({ fechaAtencion, diagnostico, estadoAsistencia, estadoExpediente }) {
  if (estadoExpediente === 'cerrado') return { ok: false, mensaje: 'El expediente ya está cerrado.' }
  if (estadoAsistencia !== 'presente') {
    return { ok: false, mensaje: 'Solo se puede cerrar la atención de un paciente presente.' }
  }
  if (!fechaAtencion) return { ok: false, mensaje: 'No se puede cerrar el expediente: falta la fecha de atención.' }
  if (!String(diagnostico || '').trim()) {
    return { ok: false, mensaje: 'No se puede cerrar el expediente: falta el diagnóstico.' }
  }
  return { ok: true }
}

export function columnaKanban({ estadoAsistencia, estadoExpediente }) {
  if (estadoAsistencia === 'ausente') return 'ausentes'
  if (estadoAsistencia === 'cancelada') return null
  if (estadoExpediente === 'cerrado' || estadoAsistencia === 'cerrada') return 'finalizado'
  if (estadoExpediente === 'abierto') return 'en_proceso'
  if (estadoAsistencia === 'presente' || estadoAsistencia === 'programada') return 'pendientes'
  return null
}

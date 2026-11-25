// S7-T08: datos editables del paciente (empleado) en los formularios de alta y
// consulta. La edad es opcional; se valida con normalizarEdad al guardar.
// S7-T09: el alta del administrador puede ir acompañada de una cita opcional.
export function formularioPaciente(paciente) {
  return {
    id: paciente.id,
    nombre: paciente.nombre || '',
    empresaId: paciente.empresaId || '',
    estado: paciente.estado,
    edad: paciente.edad ?? ''
  }
}

const PATRON_CITA_LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/

// Si no hay fecha, el paciente se registra sin cita (decisión del 30/10/2026).
// Si hay fecha, se devuelve el payload que usa api.guardarCita.
export function prepararCitaDeAlta({ fechaHoraLocal, motivo } = {}) {
  const fecha = String(fechaHoraLocal || '').trim()
  const motivoTexto = String(motivo || '').trim()
  if (!fecha) return { ok: true, cita: null }
  if (!PATRON_CITA_LOCAL.test(fecha)) {
    return { ok: false, mensaje: 'Indique una fecha y hora de cita válidas.', cita: null }
  }
  return {
    ok: true,
    cita: {
      fechaHoraLocal: fecha.slice(0, 16),
      motivo: motivoTexto
    }
  }
}

// S7-T20: el administrador edita la fecha, la hora y el motivo de una cita del
// paciente desde su ficha. Solo citas programadas, presentes o ausentes; las
// cerradas o canceladas ya no se reprograman (misma regla que programar_cita).
const ESTADOS_CITA_EDITABLE = ['programada', 'presente', 'ausente']

export function citaEditable(visita, rol) {
  return rol === 'administrador' && ESTADOS_CITA_EDITABLE.includes(visita?.estadoAsistencia)
}

export function formularioEdicionCita(visita, aInput) {
  return {
    citaId: visita.citaId,
    fechaHoraLocal: aInput(visita.fechaHora),
    motivo: visita.motivo || ''
  }
}

// Devuelve el payload de api.guardarCita (con id, reprograma la cita existente).
export function prepararEdicionCita({ citaId, empleadoId, fechaHoraLocal, motivo } = {}) {
  if (!citaId) return { ok: false, mensaje: 'Seleccione la cita que quiere editar.', cita: null }
  if (!empleadoId) return { ok: false, mensaje: 'Seleccione un empleado ya registrado.', cita: null }
  const fecha = String(fechaHoraLocal || '').trim()
  if (!fecha) return { ok: false, mensaje: 'Indique la fecha y la hora de la cita.', cita: null }
  if (!PATRON_CITA_LOCAL.test(fecha)) return { ok: false, mensaje: 'Indique una fecha y hora de cita válidas.', cita: null }
  return {
    ok: true,
    cita: { id: citaId, empleadoId, fechaHoraLocal: fecha.slice(0, 16), motivo: String(motivo || '').trim() }
  }
}

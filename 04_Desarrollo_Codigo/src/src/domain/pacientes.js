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

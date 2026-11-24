// S7-T10: los campos de la plantilla vigente de la empresa se muestran y
// editan en la atención del doctor. Reutiliza las reglas de tipo y
// obligatoriedad de la importación (RF-21) sobre los datos del empleado.
import { infoCampoBase, ordenarColumnas, plantillaPredeterminada } from './plantillaEmpresa.js'
import { validarValorTipo } from './importacionPlantilla.js'
import { validarCurp, validarCorreo, normalizarCorreo, normalizarTelefono, normalizarEdad } from './validadores.js'

function vacio(valor) {
  return valor == null || String(valor).trim() === ''
}

export function resolverPlantilla(plantilla, empresaId) {
  if (plantilla && Array.isArray(plantilla.columnas) && plantilla.columnas.length) {
    return { ...plantilla, columnas: ordenarColumnas(plantilla.columnas) }
  }
  return plantillaPredeterminada(empresaId)
}

export function valorPacienteParaCampo(paciente, columna) {
  const base = infoCampoBase(columna.clave)
  if (base) {
    const valor = paciente?.[base.campo]
    return valor == null ? '' : valor
  }
  const extra = paciente?.datosExtra || {}
  const valor = extra[columna.clave]
  return valor == null ? '' : valor
}

export function valoresDesdePaciente(plantilla, paciente) {
  const valores = {}
  for (const columna of ordenarColumnas(plantilla?.columnas)) {
    valores[columna.clave] = valorPacienteParaCampo(paciente, columna)
  }
  return valores
}

export function inputDeCampo(columna) {
  if (columna.tipo === 'numero') return { type: 'number', step: 'any' }
  if (columna.tipo === 'fecha') return { type: 'date' }
  if (columna.tipo === 'email') return { type: 'email' }
  return { type: 'text' }
}

function valorBase(columna, crudo) {
  const campo = infoCampoBase(columna.clave)?.campo
  if (campo === 'nombre') return { campo, valor: String(crudo || '').trim() }
  if (campo === 'curp') {
    const revisado = validarCurp(crudo)
    if (revisado.error) return { campo, error: revisado.error }
    return { campo, valor: revisado.valor }
  }
  if (campo === 'claveEmpleado') return { campo, valor: vacio(crudo) ? null : String(crudo).trim() }
  if (campo === 'email') {
    if (vacio(crudo)) return { campo, valor: null }
    const texto = String(crudo).trim()
    if (!validarCorreo(texto)) return { campo, error: 'El correo electrónico no es válido.' }
    return { campo, valor: normalizarCorreo(texto) }
  }
  if (campo === 'telefono') {
    const revisado = normalizarTelefono(crudo)
    if (revisado.error) return { campo, error: revisado.error }
    return { campo, valor: revisado.valor }
  }
  if (campo === 'edad') {
    const revisado = normalizarEdad(crudo)
    if (revisado.error) return { campo, error: revisado.error }
    return { campo, valor: revisado.valor }
  }
  return { campo, valor: crudo }
}

export function payloadGuardarPaciente({ paciente, plantilla, valores } = {}) {
  if (!paciente?.id || !paciente?.empresaId) {
    return { ok: false, mensaje: 'No se pudieron cargar los datos del paciente.', payload: null }
  }
  const columnas = ordenarColumnas(resolverPlantilla(plantilla, paciente.empresaId).columnas)
  const payload = {
    id: paciente.id,
    empresaId: paciente.empresaId,
    estado: paciente.estado,
    nombre: paciente.nombre,
    datosExtra: { ...(paciente.datosExtra || {}) }
  }
  const errores = []

  for (const columna of columnas) {
    const crudo = valores?.[columna.clave]
    const base = infoCampoBase(columna.clave)
    if (columna.obligatorio && vacio(crudo)) {
      errores.push(`El campo «${columna.etiqueta}» es obligatorio.`)
      continue
    }
    if (base) {
      const revisado = valorBase(columna, crudo)
      if (revisado.error) errores.push(`${columna.etiqueta}: ${revisado.error}`)
      else payload[revisado.campo] = revisado.valor
      continue
    }
    if (vacio(crudo)) {
      delete payload.datosExtra[columna.clave]
      continue
    }
    const revisado = validarValorTipo(columna.tipo, crudo)
    if (revisado.error) errores.push(`${columna.etiqueta}: ${revisado.error}`)
    else payload.datosExtra[columna.clave] = revisado.valor
  }

  if (errores.length) return { ok: false, mensaje: errores[0], errores, payload: null }
  if (!String(payload.nombre || '').trim()) {
    return { ok: false, mensaje: 'El nombre completo es obligatorio.', payload: null }
  }
  return { ok: true, mensaje: null, errores: [], payload }
}

export function pacienteDeFila(empleado = {}) {
  return {
    id: empleado.id,
    nombre: empleado.nombre,
    edad: empleado.edad,
    curp: empleado.curp,
    claveEmpleado: empleado.claveEmpleado ?? empleado.clave_empleado ?? null,
    email: empleado.email,
    telefono: empleado.telefono,
    estado: empleado.estado,
    empresaId: empleado.empresaId ?? empleado.empresa_id ?? null,
    datosExtra: empleado.datosExtra && typeof empleado.datosExtra === 'object' && !Array.isArray(empleado.datosExtra)
      ? empleado.datosExtra
      : (empleado.datos_extra && typeof empleado.datos_extra === 'object' && !Array.isArray(empleado.datos_extra) ? empleado.datos_extra : {})
  }
}

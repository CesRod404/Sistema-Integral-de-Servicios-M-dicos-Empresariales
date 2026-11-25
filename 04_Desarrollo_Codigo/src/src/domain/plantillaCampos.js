// S7-T11: campos de la plantilla vigente de la empresa en el alta de pacientes.
// Las mismas reglas de tipo y obligatoriedad de la importación (RF-21).
// S7-T13: reutiliza las reglas de atencionPlantilla.js (antes era una copia),
// para que la corrección de la CURP aplique igual en el alta y en la atención.
import { payloadGuardarPaciente, resolverPlantilla, valorPacienteParaCampo } from './atencionPlantilla.js'
import { esCampoBase, ordenarColumnas } from './plantillaEmpresa.js'
import { normalizarEdad } from './validadores.js'

export {
  inputDeCampo,
  pacienteDeFila,
  payloadGuardarPaciente,
  resolverPlantilla,
  valorPacienteParaCampo,
  valoresDesdePaciente
} from './atencionPlantilla.js'
export { plantillaPredeterminada } from './plantillaEmpresa.js'

// Alta de paciente: mismas reglas de la plantilla, sin identificador previo.
export function payloadAltaPaciente({ empresaId, estado, valores, plantilla } = {}) {
  if (!empresaId) {
    return { ok: false, mensaje: 'Seleccione la empresa del paciente.', payload: null }
  }
  const resultado = payloadGuardarPaciente({
    paciente: {
      id: 'alta',
      empresaId,
      estado: estado || 'provisional',
      nombre: valores?.nombre_completo || '',
      datosExtra: {}
    },
    plantilla,
    valores
  })
  if (!resultado.ok) return resultado
  const { id, ...payload } = resultado.payload
  return { ...resultado, payload }
}

// S7-T14: al editar al paciente y cambiarlo de empresa, los campos se
// reconstruyen con la plantilla vigente de la empresa nueva.
// Regla (DECISIONES.md, 25/11/2026):
//   - Se conservan los valores de las columnas con la misma clave interna en
//     las dos plantillas (los campos base, como CURP o Edad, y las columnas
//     personalizadas que se llamen igual).
//   - Las columnas personalizadas de la empresa anterior que no existen en la
//     nueva se quitan al guardar; el formulario las lista antes de guardar.
//   - Los campos base que la empresa nueva no usa no se borran: siguen en el
//     registro del paciente, solo no se muestran.
function columnasDe(plantilla) {
  return ordenarColumnas(plantilla?.columnas)
}

export function cambiarEmpresaPaciente({ valoresActuales = {}, plantillaAnterior = null, plantillaNueva = null, paciente = {} } = {}) {
  const nuevas = columnasDe(plantillaNueva)
  const claves = new Set(nuevas.map((columna) => columna.clave))
  const valores = {}
  for (const columna of nuevas) {
    valores[columna.clave] = columna.clave in valoresActuales
      ? valoresActuales[columna.clave]
      : valorPacienteParaCampo(paciente, columna)
  }
  const descartados = columnasDe(plantillaAnterior)
    .filter((columna) => !esCampoBase(columna.clave) && !claves.has(columna.clave))
    .filter((columna) => String(valoresActuales[columna.clave] ?? '').trim() !== '')
    .map((columna) => columna.etiqueta)
  return { valores, descartados }
}

export function payloadEdicionPaciente({ paciente, nombre, empresaId, estado, edad, plantilla, valores } = {}) {
  if (!paciente?.id) return { ok: false, mensaje: 'No se pudieron cargar los datos del paciente.', payload: null }
  if (!empresaId) return { ok: false, mensaje: 'Seleccione la empresa del paciente.', payload: null }
  const vigente = resolverPlantilla(plantilla, empresaId)
  const columnas = columnasDe(vigente)
  const resultado = payloadGuardarPaciente({
    paciente: { ...paciente, nombre: nombre ?? paciente.nombre, empresaId, estado: estado || paciente.estado },
    plantilla: vigente,
    valores: { ...(valores || {}), nombre_completo: nombre ?? paciente.nombre }
  })
  if (!resultado.ok) return resultado
  const payload = { ...resultado.payload }
  // La edad se sigue pudiendo editar aunque la plantilla no tenga la columna.
  if (!columnas.some((columna) => columna.clave === 'edad') && edad !== undefined) {
    const revisada = normalizarEdad(edad)
    if (revisada.error) return { ok: false, mensaje: revisada.error, errores: [revisada.error], payload: null }
    payload.edad = revisada.valor
  }
  if (paciente.empresaId && paciente.empresaId !== empresaId) {
    const personalizadas = new Set(columnas.filter((columna) => !esCampoBase(columna.clave)).map((columna) => columna.clave))
    payload.datosExtra = Object.fromEntries(Object.entries(payload.datosExtra || {}).filter(([clave]) => personalizadas.has(clave)))
  }
  return { ...resultado, payload }
}

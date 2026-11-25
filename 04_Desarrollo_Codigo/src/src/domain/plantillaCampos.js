// S7-T11: campos de la plantilla vigente de la empresa en el alta de pacientes.
// Las mismas reglas de tipo y obligatoriedad de la importación (RF-21).
// S7-T13: reutiliza las reglas de atencionPlantilla.js (antes era una copia),
// para que la corrección de la CURP aplique igual en el alta y en la atención.
import { payloadGuardarPaciente } from './atencionPlantilla.js'

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

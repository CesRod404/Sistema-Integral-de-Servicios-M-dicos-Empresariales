// S7-T08: datos editables del paciente (empleado) en los formularios de alta y
// consulta. La edad es opcional; se valida con normalizarEdad al guardar.
export function formularioPaciente(paciente) {
  return {
    id: paciente.id,
    nombre: paciente.nombre || '',
    empresaId: paciente.empresaId || '',
    estado: paciente.estado,
    edad: paciente.edad ?? ''
  }
}

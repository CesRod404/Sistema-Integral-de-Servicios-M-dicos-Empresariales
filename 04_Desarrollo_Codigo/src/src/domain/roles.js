export const ROLES = ['administrador', 'doctor']

export const ETIQUETA_ROL = {
  administrador: 'Administrador',
  doctor: 'Doctor'
}

export const MODULOS = [
  { id: 'inicio', ruta: '/app/inicio', roles: ['administrador', 'doctor'], etiqueta: 'Inicio' },
  { id: 'pacientes', ruta: '/app/pacientes', roles: ['administrador', 'doctor'], etiqueta: 'Pacientes' },
  { id: 'citas', ruta: '/app/citas', roles: ['administrador', 'doctor'], etiqueta: 'Citas' },
  { id: 'empresas', ruta: '/app/empresas', roles: ['administrador'], etiqueta: 'Empresas' },
  { id: 'importacion', ruta: '/app/importacion', roles: ['administrador'], etiqueta: 'Importación' },
  { id: 'cobranza', ruta: '/app/cobranza', roles: ['administrador'], etiqueta: 'Cobranza' }
]

const RUTAS_AUSENTES = ['/app/reportes', '/app/configuracion']

export function esRolValido(rol) {
  return ROLES.includes(rol)
}

export function modulosPara(rol) {
  return MODULOS.filter((modulo) => modulo.roles.includes(rol))
}

export function puedeVerPrecios(rol) {
  return rol === 'administrador'
}

export function puedeVerCobranza(rol) {
  return rol === 'administrador'
}

export function puedeVerDiagnostico(rol) {
  return rol === 'doctor'
}

export function puedeRegistrarAsistencia(rol) {
  return rol === 'administrador'
}

export function puedeAcceder(rol, ruta) {
  if (!esRolValido(rol)) return false
  const path = String(ruta || '').split('?')[0].replace(/\/$/, '') || '/'
  if (RUTAS_AUSENTES.some((prohibida) => path === prohibida || path.startsWith(`${prohibida}/`))) return false
  if (!path.startsWith('/app')) return false
  if (rol === 'doctor') {
    if (['/app/cobranza', '/app/empresas', '/app/importacion', '/app/catalogo'].some((prefijo) => path === prefijo || path.startsWith(`${prefijo}/`))) {
      return false
    }
    return true
  }
  if (path === '/app/atencion' || path.startsWith('/app/atencion/')) return false
  return true
}

export function vistaEstudio(estudio, rol) {
  if (rol !== 'administrador') {
    return { id: estudio.id, nombre: estudio.nombre, vigente: estudio.vigente }
  }
  return {
    id: estudio.id,
    nombre: estudio.nombre,
    precio: Number(estudio.precio),
    vigente: estudio.vigente
  }
}

export function vistaExpediente(expediente, rol) {
  if (!expediente) return null
  if (rol === 'doctor') return expediente
  const estudios = (expediente.estudios || []).map((estudio) => ({ id: estudio.id, nombre: estudio.nombre }))
  return {
    id: expediente.id,
    citaId: expediente.citaId,
    estadoExpediente: expediente.estadoExpediente,
    fechaAtencion: expediente.fechaAtencion,
    estudios
  }
}

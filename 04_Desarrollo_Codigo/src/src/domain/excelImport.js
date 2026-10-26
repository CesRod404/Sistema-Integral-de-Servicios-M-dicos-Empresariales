import { normalizarCurp, normalizarCorreo, normalizarEdad, normalizarTelefono, validarCorreo, validarCurp } from './validadores.js'

export const CAMPOS_IMPORTACION = [
  { id: 'nombre', etiqueta: 'Nombre completo', obligatorio: true },
  { id: 'curp', etiqueta: 'CURP', obligatorio: false },
  { id: 'claveEmpleado', etiqueta: 'Clave de empleado', obligatorio: false },
  { id: 'email', etiqueta: 'Correo electrónico', obligatorio: false },
  { id: 'telefono', etiqueta: 'Teléfono', obligatorio: false },
  { id: 'edad', etiqueta: 'Edad', obligatorio: false }
]

const ALIAS = {
  nombre: ['nombre', 'nombrecompleto', 'empleado', 'paciente'],
  curp: ['curp'],
  claveEmpleado: ['clave', 'claveempleado', 'noempleado', 'numeroempleado', 'numerodeempleado'],
  email: ['email', 'correo', 'correoelectronico'],
  telefono: ['telefono', 'tel', 'celular'],
  edad: ['edad']
}

export const MENSAJES_IMPORTACION = {
  VACIO: 'El archivo no contiene registros para importar.',
  FALTA_COLUMNA_NOMBRE: 'Falta mapear la columna de nombre completo.',
  INCOMPLETO: 'Hay registros incompletos. Corrija o excluya esas filas antes de confirmar.',
  FORMATO: 'Hay datos con formato inválido. Corrija o excluya esas filas antes de confirmar.',
  DUPLICADO_SIN_DECISION: 'Hay registros duplicados. Elija descartarlos o actualizarlos antes de confirmar.',
  SOBRESCRITURA_NO_CONFIRMADA: 'La actualización de registros existentes requiere su confirmación explícita.',
  DUPLICADO_ARCHIVO: 'Hay duplicados dentro del archivo. Conserve un solo registro de cada grupo y descarte el resto.',
  ACTUALIZACION_INVALIDA: 'Solo se puede actualizar un registro que ya existe en el sistema.',
  EXTENSION: 'El archivo debe estar en formato .xlsx.'
}

export function quitarAcentos(valor) {
  return String(valor || '').normalize('NFD').replace(/\p{M}/gu, '')
}

export function normalizarClave(valor) {
  return quitarAcentos(valor).toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function normalizarNombre(valor) {
  return quitarAcentos(valor).toLowerCase().replace(/\s+/g, ' ').trim()
}

export function validarExtension(nombre) {
  return String(nombre || '').toLowerCase().endsWith('.xlsx') ? null : MENSAJES_IMPORTACION.EXTENSION
}

export function sugerirMapa(encabezados) {
  const mapa = { nombre: '', curp: '', claveEmpleado: '', email: '', telefono: '', edad: '' }
  const usados = new Set()
  for (const campo of Object.keys(ALIAS)) {
    const indice = encabezados.findIndex((encabezado, posicion) => {
      if (usados.has(posicion)) return false
      return ALIAS[campo].includes(normalizarClave(encabezado))
    })
    if (indice >= 0) {
      mapa[campo] = encabezados[indice]
      usados.add(indice)
    }
  }
  return mapa
}

export function aplicarMapa(registros, mapa) {
  return registros.map((registro) => ({
    nombre: mapa.nombre ? registro[mapa.nombre] : '',
    curp: mapa.curp ? registro[mapa.curp] : '',
    claveEmpleado: mapa.claveEmpleado ? registro[mapa.claveEmpleado] : '',
    email: mapa.email ? registro[mapa.email] : '',
    telefono: mapa.telefono ? registro[mapa.telefono] : '',
    edad: mapa.edad ? registro[mapa.edad] : ''
  }))
}

function resumenExistente(existente) {
  return { id: existente.id, nombre: existente.nombre, empresaId: existente.empresaId }
}

export function buscarDuplicado(fila, existentes) {
  if (fila.curp) {
    const porCurp = existentes.find((item) => item.curp && item.curp === fila.curp)
    if (porCurp) return resumenExistente(porCurp)
  }
  if (fila.claveEmpleado) {
    const porClave = existentes.find((item) => {
      if (item.empresaId !== fila.empresaId || !item.claveEmpleado) return false
      if (item.claveEmpleado !== fila.claveEmpleado) return false
      if (item.curp && fila.curp && item.curp !== fila.curp) return false
      return true
    })
    if (porClave) return resumenExistente(porClave)
  }
  if (fila.nombre) {
    const nombre = normalizarNombre(fila.nombre)
    const porNombre = existentes.find((item) => {
      if (item.empresaId !== fila.empresaId) return false
      if (normalizarNombre(item.nombre) !== nombre) return false
      if (item.curp && fila.curp && item.curp !== fila.curp) return false
      return true
    })
    if (porNombre) return resumenExistente(porNombre)
  }
  return null
}

function claveDe(fila) {
  if (fila.curp) return `curp:${fila.curp}`
  if (fila.claveEmpleado) return `clave:${fila.claveEmpleado}`
  if (fila.nombre) return `nombre:${normalizarNombre(fila.nombre)}`
  return null
}

export function clasificarFilas(valores, existentes, empresaId) {
  const preliminares = valores.map((valor, indice) => {
    const errores = []
    const nombre = String(valor.nombre || '').trim()
    const curp = validarCurp(valor.curp)
    const telefono = normalizarTelefono(valor.telefono)
    const edad = normalizarEdad(valor.edad)
    const emailTexto = String(valor.email || '').trim()
    if (curp.error) errores.push({ campo: 'curp', mensaje: curp.error })
    if (telefono.error) errores.push({ campo: 'telefono', mensaje: telefono.error })
    if (edad.error) errores.push({ campo: 'edad', mensaje: edad.error })
    if (emailTexto && !validarCorreo(emailTexto)) errores.push({ campo: 'email', mensaje: 'El correo electrónico no es válido.' })
    const normalizada = {
      nombre,
      curp: curp.valor,
      claveEmpleado: String(valor.claveEmpleado || '').trim() || null,
      email: emailTexto ? normalizarCorreo(emailTexto) : null,
      telefono: telefono.valor,
      edad: edad.valor,
      empresaId
    }
    return {
      indice,
      valores: normalizada,
      errores,
      incompleta: !nombre,
      clave: claveDe(normalizada),
      duplicadoBd: null,
      duplicadoArchivo: false
    }
  })
  const conteo = new Map()
  for (const fila of preliminares) {
    if (!fila.clave) continue
    conteo.set(fila.clave, (conteo.get(fila.clave) || 0) + 1)
  }
  return preliminares.map((fila) => ({
    ...fila,
    duplicadoArchivo: fila.clave ? conteo.get(fila.clave) > 1 : false,
    duplicadoBd: fila.valores.nombre || fila.valores.curp || fila.valores.claveEmpleado
      ? buscarDuplicado(fila.valores, existentes)
      : null
  }))
}

function operacion(fila, accion) {
  return {
    indice: fila.indice,
    accion,
    clave: fila.clave,
    destinoId: fila.duplicadoBd?.id || null,
    valores: fila.valores
  }
}

export function evaluarConfirmacion(filas, decisiones = {}, opciones = {}) {
  if (!filas.length) {
    return { ok: false, errores: [{ codigo: 'VACIO' }], codigos: ['VACIO'], mensajes: [MENSAJES_IMPORTACION.VACIO], operaciones: [] }
  }
  const sobrescribir = Boolean(opciones.sobrescribir)
  const errores = []
  const operaciones = []
  for (const fila of filas) {
    const decision = decisiones[fila.indice] || null
    if (decision === 'descartar') {
      operaciones.push(operacion(fila, 'descartar'))
      continue
    }
    if (!fila.valores.nombre) {
      errores.push({ indice: fila.indice, codigo: 'INCOMPLETO' })
      continue
    }
    if (fila.errores.length) {
      errores.push({ indice: fila.indice, codigo: 'FORMATO' })
      continue
    }
    const esDuplicado = fila.duplicadoArchivo || fila.duplicadoBd
    if (esDuplicado && !decision) {
      errores.push({ indice: fila.indice, codigo: 'DUPLICADO_SIN_DECISION' })
      continue
    }
    if (decision === 'actualizar') {
      if (!fila.duplicadoBd) {
        errores.push({ indice: fila.indice, codigo: 'ACTUALIZACION_INVALIDA' })
        continue
      }
      if (!sobrescribir) {
        errores.push({ indice: fila.indice, codigo: 'SOBRESCRITURA_NO_CONFIRMADA' })
        continue
      }
      operaciones.push(operacion(fila, 'actualizar'))
      continue
    }
    if (fila.duplicadoBd) {
      errores.push({ indice: fila.indice, codigo: 'DUPLICADO_SIN_DECISION' })
      continue
    }
    operaciones.push(operacion(fila, 'insertar'))
  }

  const grupos = new Map()
  for (const item of operaciones) {
    if (item.accion === 'descartar' || !item.clave) continue
    const lista = grupos.get(item.clave) || []
    lista.push(item.indice)
    grupos.set(item.clave, lista)
  }
  for (const [, lista] of grupos) {
    if (lista.length > 1) errores.push({ codigo: 'DUPLICADO_ARCHIVO', indices: lista })
  }

  const codigos = [...new Set(errores.map((error) => error.codigo))]
  return {
    ok: errores.length === 0,
    errores,
    codigos,
    mensajes: codigos.map((codigo) => MENSAJES_IMPORTACION[codigo]),
    operaciones: errores.length ? [] : operaciones
  }
}


// CRQ-004 · US-IMP-07 / RF-21: plantilla Excel de empleados configurable por empresa.
// Reglas puras (sin React ni Supabase) para configurar, versionar y describir la
// plantilla. Las usa C-03 ExcelIngestionValidator al importar y la descarga .xlsx.
import { quitarAcentos } from './excelImport.js'

export const TIPOS_CAMPO = ['texto', 'numero', 'fecha', 'email']

export const ETIQUETA_TIPO = {
  texto: 'Texto',
  numero: 'Número',
  fecha: 'Fecha',
  email: 'Correo electrónico'
}

export const MAX_COLUMNAS = 30
export const MAX_ETIQUETA = 60
export const MAX_TEXTO = 250

// Campos base: columnas reales de la tabla empleados. `campo` es la propiedad
// que usa la importación (excelImport.js). `fijo` = no se puede quitar ni dejar
// de ser obligatorio (identidad, RN-05). `identificador` = RN-06 lo usa para
// detectar duplicados (CURP / clave): S7-T13 permite quitar uno de los dos,
// pero la plantilla debe conservar al menos uno.
export const CAMPOS_BASE = [
  { clave: 'nombre_completo', campo: 'nombre', etiqueta: 'Nombre completo', tipo: 'texto', fijo: true, requeridoEnPlantilla: true, identificador: false },
  { clave: 'curp', campo: 'curp', etiqueta: 'CURP', tipo: 'texto', fijo: false, requeridoEnPlantilla: false, identificador: true },
  { clave: 'clave_empleado', campo: 'claveEmpleado', etiqueta: 'Clave de empleado', tipo: 'texto', fijo: false, requeridoEnPlantilla: false, identificador: true },
  { clave: 'email', campo: 'email', etiqueta: 'Correo electrónico', tipo: 'email', fijo: false, requeridoEnPlantilla: false, identificador: false },
  { clave: 'telefono', campo: 'telefono', etiqueta: 'Teléfono', tipo: 'texto', fijo: false, requeridoEnPlantilla: false, identificador: false },
  { clave: 'edad', campo: 'edad', etiqueta: 'Edad', tipo: 'numero', fijo: false, requeridoEnPlantilla: false, identificador: false }
]

const BASE_POR_CLAVE = new Map(CAMPOS_BASE.map((campo) => [campo.clave, campo]))
const PATRON_CLAVE = /^[a-z][a-z0-9_]{0,39}$/

export const MENSAJES_PLANTILLA = {
  SIN_COLUMNAS: 'La plantilla debe tener al menos una columna.',
  DEMASIADAS: `La plantilla admite como máximo ${MAX_COLUMNAS} columnas.`,
  NOMBRE_OBLIGATORIO: 'La columna «Nombre completo» siempre va en la plantilla y es obligatoria.',
  IDENTIFICADOR: 'La plantilla debe conservar al menos «CURP» o «Clave de empleado»: se usan para detectar duplicados.',
  CURP_REUTILIZADA: 'La columna «CURP» solo guarda la CURP (18 caracteres) y su nombre debe mencionarla. Para otro dato, quite la CURP y agregue una columna personalizada.',
  ETIQUETA_VACIA: 'Cada columna necesita un nombre visible.',
  ETIQUETA_LARGA: `El nombre de la columna no debe pasar de ${MAX_ETIQUETA} caracteres.`,
  ETIQUETA_REPETIDA: 'Hay dos columnas con el mismo nombre visible.',
  CLAVE_INVALIDA: 'La clave interna de una columna no es válida.',
  CLAVE_REPETIDA: 'Hay dos columnas con la misma clave interna.',
  TIPO_INVALIDO: 'El tipo de dato de una columna no es válido.',
  TIPO_BASE: 'No se puede cambiar el tipo de dato de un campo base del empleado.',
  BASE_NO_PERSONALIZADO: 'Un campo base del empleado no puede marcarse como personalizado.',
  PERMISO: 'Solo el Administrador puede configurar la plantilla de una empresa.'
}

export function claveDesdeEtiqueta(etiqueta) {
  const base = quitarAcentos(etiqueta)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  const conLetra = /^[a-z]/.test(base) ? base : `campo_${base}`
  return conLetra.slice(0, 40).replace(/_+$/g, '') || 'campo'
}

function claveUnica(etiqueta, columnas) {
  const usadas = new Set([...columnas.map((columna) => columna.clave), ...CAMPOS_BASE.map((campo) => campo.clave)])
  const base = claveDesdeEtiqueta(etiqueta)
  if (!usadas.has(base)) return base
  let n = 2
  while (usadas.has(`${base.slice(0, 36)}_${n}`)) n += 1
  return `${base.slice(0, 36)}_${n}`
}

export function columnaBase(clave, cambios = {}) {
  const campo = BASE_POR_CLAVE.get(clave)
  if (!campo) return null
  return {
    clave: campo.clave,
    etiqueta: cambios.etiqueta ?? campo.etiqueta,
    tipo: campo.tipo,
    obligatorio: campo.fijo ? true : Boolean(cambios.obligatorio),
    orden: cambios.orden ?? 0,
    personalizado: false
  }
}

// Plantilla predeterminada (la de siempre): se usa cuando la empresa aún no
// tiene una propia. Versión 0 = sin configuración guardada.
export function plantillaPredeterminada(empresaId = null) {
  return {
    id: null,
    empresaId,
    version: 0,
    predeterminada: true,
    columnas: CAMPOS_BASE.map((campo, indice) => columnaBase(campo.clave, { orden: indice + 1 }))
  }
}

export function esCampoBase(clave) {
  return BASE_POR_CLAVE.has(clave)
}

export function infoCampoBase(clave) {
  return BASE_POR_CLAVE.get(clave) || null
}

// S7-T13: «CURP» o «Clave de empleado» se pueden quitar mientras quede el otro.
export function puedeQuitarse(columna, columnas = null) {
  const base = BASE_POR_CLAVE.get(columna?.clave)
  if (!base) return true
  if (base.requeridoEnPlantilla) return false
  if (!base.identificador) return true
  if (!Array.isArray(columnas)) return false
  return columnas.some((otra) => otra.clave !== columna.clave && BASE_POR_CLAVE.get(otra.clave)?.identificador)
}

// S7-T13 (bug «Mina a la que va»): la clave interna «curp» siempre se valida
// como CURP (18 caracteres) y se guarda en empleados.curp. Si el administrador
// le cambia el nombre a otro dato, deja de ser CURP: se convierte en una
// columna personalizada de texto con clave propia (misma regla que la migración
// 202611250001_curp_reutilizada_plantilla.sql).
export function etiquetaEsCurp(etiqueta) {
  const texto = quitarAcentos(String(etiqueta || '')).toLowerCase()
  return /curp/.test(texto) || /clave unica de registro/.test(texto)
}

export function esCurpReutilizada(columna) {
  return columna?.clave === 'curp' && Boolean(String(columna?.etiqueta || '').trim()) && !etiquetaEsCurp(columna.etiqueta)
}

export function convertirCurpReutilizada(columnas) {
  const lista = Array.isArray(columnas) ? columnas : []
  // Con dos columnas «curp» no se convierte nada: validarPlantilla reporta la clave repetida.
  const reutilizada = lista.filter((columna) => columna?.clave === 'curp').length === 1 ? lista.find(esCurpReutilizada) : null
  if (!reutilizada) return { columnas: lista, convertida: null }
  const resto = lista.filter((columna) => columna !== reutilizada)
  const etiqueta = String(reutilizada.etiqueta).replace(/\s+/g, ' ').trim()
  const nueva = {
    clave: claveUnica(etiqueta, resto),
    etiqueta,
    tipo: 'texto',
    obligatorio: Boolean(reutilizada.obligatorio),
    orden: reutilizada.orden,
    personalizado: true
  }
  return { columnas: lista.map((columna) => (columna === reutilizada ? nueva : columna)), convertida: nueva }
}

export function puedeCambiarObligatorio(columna) {
  const base = BASE_POR_CLAVE.get(columna?.clave)
  return !base || !base.fijo
}

export function ordenarColumnas(columnas) {
  return [...(columnas || [])]
    .map((columna, indice) => ({ columna, indice }))
    .sort((a, b) => (Number(a.columna.orden) || 0) - (Number(b.columna.orden) || 0) || a.indice - b.indice)
    .map(({ columna }, indice) => ({ ...columna, orden: indice + 1 }))
}

function normalizarColumna(columna) {
  const clave = String(columna?.clave || '').trim()
  const base = BASE_POR_CLAVE.get(clave)
  return {
    clave,
    etiqueta: String(columna?.etiqueta || '').replace(/\s+/g, ' ').trim(),
    tipo: base ? base.tipo : String(columna?.tipo || '').trim(),
    tipoRecibido: String(columna?.tipo || '').trim(),
    obligatorio: Boolean(columna?.obligatorio),
    orden: Number(columna?.orden) || 0,
    personalizado: Boolean(columna?.personalizado)
  }
}

// Valida la configuración completa antes de guardarla. Devuelve las columnas
// normalizadas (orden 1..n) o la lista de mensajes de error.
export function validarPlantilla(columnas) {
  const errores = new Set()
  const { columnas: revisadas, convertida } = convertirCurpReutilizada(Array.isArray(columnas) ? columnas : [])
  const lista = Array.isArray(columnas) ? revisadas.map(normalizarColumna) : []
  if (!lista.length) errores.add(MENSAJES_PLANTILLA.SIN_COLUMNAS)
  if (lista.length > MAX_COLUMNAS) errores.add(MENSAJES_PLANTILLA.DEMASIADAS)

  const nombre = lista.find((columna) => columna.clave === 'nombre_completo')
  if (!nombre || !nombre.obligatorio) errores.add(MENSAJES_PLANTILLA.NOMBRE_OBLIGATORIO)
  if (!lista.some((columna) => columna.clave === 'curp' || columna.clave === 'clave_empleado')) {
    errores.add(MENSAJES_PLANTILLA.IDENTIFICADOR)
  }

  const claves = new Set()
  const etiquetas = new Set()
  for (const columna of lista) {
    const base = BASE_POR_CLAVE.get(columna.clave)
    if (!PATRON_CLAVE.test(columna.clave)) errores.add(MENSAJES_PLANTILLA.CLAVE_INVALIDA)
    if (claves.has(columna.clave)) errores.add(MENSAJES_PLANTILLA.CLAVE_REPETIDA)
    claves.add(columna.clave)
    if (!columna.etiqueta) errores.add(MENSAJES_PLANTILLA.ETIQUETA_VACIA)
    if (columna.etiqueta.length > MAX_ETIQUETA) errores.add(MENSAJES_PLANTILLA.ETIQUETA_LARGA)
    const etiquetaNormal = quitarAcentos(columna.etiqueta).toLowerCase()
    if (columna.etiqueta && etiquetas.has(etiquetaNormal)) errores.add(MENSAJES_PLANTILLA.ETIQUETA_REPETIDA)
    etiquetas.add(etiquetaNormal)
    if (base) {
      if (columna.personalizado) errores.add(MENSAJES_PLANTILLA.BASE_NO_PERSONALIZADO)
      if (columna.tipoRecibido && columna.tipoRecibido !== base.tipo) errores.add(MENSAJES_PLANTILLA.TIPO_BASE)
    } else if (!TIPOS_CAMPO.includes(columna.tipo)) {
      errores.add(MENSAJES_PLANTILLA.TIPO_INVALIDO)
    }
  }

  const avisos = convertida
    ? [`«${convertida.etiqueta}» ya no es CURP: se guardará como columna personalizada de texto (clave ${convertida.clave}) y no se validará como CURP.`]
    : []
  if (errores.size) return { ok: false, errores: [...errores], avisos, columnas: [] }
  const normalizadas = ordenarColumnas(lista).map(({ tipoRecibido, ...columna }) => ({
    ...columna,
    personalizado: !BASE_POR_CLAVE.has(columna.clave)
  }))
  return { ok: true, errores: [], avisos, columnas: normalizadas }
}

// Operaciones de edición (pantalla de configuración). Todas devuelven una lista nueva.
export function agregarCampo(columnas, { etiqueta, tipo = 'texto', obligatorio = false } = {}) {
  const lista = ordenarColumnas(columnas)
  const texto = String(etiqueta || '').replace(/\s+/g, ' ').trim()
  const nueva = {
    clave: claveUnica(texto, lista),
    etiqueta: texto,
    tipo,
    obligatorio: Boolean(obligatorio),
    orden: lista.length + 1,
    personalizado: true
  }
  return [...lista, nueva]
}

export function agregarCampoBase(columnas, clave) {
  const lista = ordenarColumnas(columnas)
  if (lista.some((columna) => columna.clave === clave)) return lista
  const columna = columnaBase(clave, { orden: lista.length + 1 })
  return columna ? [...lista, columna] : lista
}

export function editarCampo(columnas, clave, cambios = {}) {
  return ordenarColumnas(columnas).map((columna) => {
    if (columna.clave !== clave) return columna
    const base = BASE_POR_CLAVE.get(clave)
    const siguiente = { ...columna }
    if ('etiqueta' in cambios) siguiente.etiqueta = String(cambios.etiqueta ?? '')
    if ('obligatorio' in cambios && (!base || !base.fijo)) siguiente.obligatorio = Boolean(cambios.obligatorio)
    if ('tipo' in cambios && !base) siguiente.tipo = cambios.tipo
    return siguiente
  })
}

export function quitarCampo(columnas, clave) {
  const lista = ordenarColumnas(columnas)
  const columna = lista.find((item) => item.clave === clave)
  if (!columna || !puedeQuitarse(columna, lista)) return lista
  return ordenarColumnas(lista.filter((item) => item.clave !== clave))
}

export function moverCampo(columnas, clave, desplazamiento) {
  const lista = ordenarColumnas(columnas)
  const desde = lista.findIndex((columna) => columna.clave === clave)
  const hasta = desde + desplazamiento
  if (desde < 0 || hasta < 0 || hasta >= lista.length) return lista
  const copia = [...lista]
  const [movida] = copia.splice(desde, 1)
  copia.splice(hasta, 0, movida)
  return copia.map((columna, indice) => ({ ...columna, orden: indice + 1 }))
}

export function camposBaseDisponibles(columnas) {
  const usadas = new Set((columnas || []).map((columna) => columna.clave))
  return CAMPOS_BASE.filter((campo) => !usadas.has(campo.clave))
}

// Regla de versión: cada guardado crea la versión siguiente (1, 2, 3...).
// La versión 0 es la plantilla predeterminada (sin configuración propia).
export function siguienteVersion(actual) {
  return (Number(actual?.version) || 0) + 1
}

// S7-T15: marcador de la versión de plantilla con la que se capturó al paciente.
// 0 = plantilla predeterminada; null = sin dato (registro anterior a la versión).
export function marcadorPlantilla({ plantillaVersion, plantillaVersionVigente } = {}) {
  const tiene = plantillaVersion !== null && plantillaVersion !== undefined && plantillaVersion !== ''
  const version = tiene ? Number(plantillaVersion) : null
  const vigente = Number(plantillaVersionVigente) || 0
  if (version === null || !Number.isFinite(version)) {
    return { texto: 'Sin versión', tono: 'neutro', desactualizada: false, detalle: 'No se registró con qué plantilla se capturó.' }
  }
  const texto = version === 0 ? 'Predeterminada' : `Plantilla v${version}`
  const desactualizada = version < vigente
  return {
    texto: desactualizada ? `${texto} · vigente v${vigente}` : texto,
    tono: desactualizada ? 'ambar' : (version === 0 ? 'neutro' : 'azul'),
    desactualizada,
    detalle: desactualizada
      ? `Capturado con ${version === 0 ? 'la plantilla predeterminada' : `la versión ${version}`}; la plantilla vigente de la empresa es la versión ${vigente}. Al editar y guardar se actualiza.`
      : (version === 0 ? 'Capturado con la plantilla predeterminada.' : `Capturado con la versión vigente (${version}).`)
  }
}

export function encabezadoDe(columna) {
  return columna.obligatorio ? `${columna.etiqueta} *` : columna.etiqueta
}

export function nombreArchivoPlantilla(empresa, plantilla) {
  const nombre = claveDesdeEtiqueta(empresa?.nombre || 'empresa')
  const version = Number(plantilla?.version) || 0
  return version ? `plantilla_${nombre}_v${version}.xlsx` : `plantilla_${nombre}.xlsx`
}

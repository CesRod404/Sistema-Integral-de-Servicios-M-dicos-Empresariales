// CRQ-004 · importación con la plantilla de la empresa (US-IMP-07 / RF-21,
// RF-07, RF-10, RF-11). Valida que el archivo corresponda a la empresa y a la
// versión vigente de su plantilla, que traiga sus columnas y que los valores
// cumplan obligatoriedad y tipo. La usa C-03 ExcelIngestionValidator.
import { normalizarClave } from './excelImport.js'
import { validarCorreo, normalizarCorreo } from './validadores.js'
import { MAX_TEXTO, infoCampoBase, ordenarColumnas } from './plantillaEmpresa.js'

export const MENSAJES_PLANTILLA_IMPORTACION = {
  SIN_IDENTIFICADOR: 'El archivo no es la plantilla de esta empresa. Descargue la plantilla vigente desde SISME y vuelva a cargarla.',
  OTRA_EMPRESA: 'El archivo corresponde a la plantilla de otra empresa. Seleccione la empresa correcta o descargue la plantilla de esta empresa.',
  VERSION_INVALIDA: 'La versión de plantilla del archivo no existe para esta empresa. Descargue la plantilla vigente.',
  OBLIGATORIO: 'Campo obligatorio vacío.',
  NUMERO: 'Debe ser un número.',
  FECHA: 'Debe ser una fecha válida (AAAA-MM-DD o DD/MM/AAAA).',
  EMAIL: 'El correo electrónico no es válido.',
  TEXTO_LARGO: `El texto no debe pasar de ${MAX_TEXTO} caracteres.`
}

export function mensajeDesactualizada(versionArchivo, versionVigente) {
  return `El archivo usa la versión ${versionArchivo} de la plantilla y la vigente es la ${versionVigente}. Descargue la plantilla vigente y vuelva a capturar los datos.`
}

export function mensajeFaltanColumnas(etiquetas) {
  return `Faltan columnas de la plantilla: ${etiquetas.join(', ')}.`
}

export function mensajeSobranColumnas(encabezados) {
  return `El archivo tiene columnas que no están en la plantilla: ${encabezados.join(', ')}.`
}

export function tienePlantillaPropia(plantilla) {
  return Boolean(plantilla && Number(plantilla.version) > 0)
}

// Quita la marca de obligatorio («*») que la descarga agrega al encabezado.
export function limpiarEncabezado(encabezado) {
  return String(encabezado ?? '').replace(/\s*\*+\s*$/, '').trim()
}

function mismoEncabezado(encabezado, columna) {
  const texto = normalizarClave(limpiarEncabezado(encabezado))
  return Boolean(texto) && (texto === normalizarClave(columna.etiqueta) || texto === normalizarClave(columna.clave))
}

// Paso 1: estructura del archivo contra la plantilla de la empresa.
// Devuelve el mapa de columnas base (campo -> encabezado) y las columnas
// personalizadas con su encabezado en el archivo.
export function validarEstructura({ plantilla, empresaId, encabezados = [], meta = null } = {}) {
  const mensajes = []
  if (meta?.empresaId && empresaId && meta.empresaId !== empresaId) {
    return { ok: false, modo: null, mensajes: [MENSAJES_PLANTILLA_IMPORTACION.OTRA_EMPRESA], mapa: null, extras: [] }
  }
  if (!tienePlantillaPropia(plantilla)) {
    if (meta && Number(meta.version) > 0) {
      return { ok: false, modo: null, mensajes: [MENSAJES_PLANTILLA_IMPORTACION.VERSION_INVALIDA], mapa: null, extras: [] }
    }
    return { ok: true, modo: 'predeterminada', mensajes: [], mapa: null, extras: [], version: null }
  }
  const vigente = Number(plantilla.version)
  if (!meta || !meta.empresaId || !Number(meta.version)) {
    return { ok: false, modo: 'plantilla', mensajes: [MENSAJES_PLANTILLA_IMPORTACION.SIN_IDENTIFICADOR], mapa: null, extras: [] }
  }
  const delArchivo = Number(meta.version)
  if (delArchivo < vigente) {
    return { ok: false, modo: 'plantilla', mensajes: [mensajeDesactualizada(delArchivo, vigente)], mapa: null, extras: [] }
  }
  if (delArchivo > vigente) {
    return { ok: false, modo: 'plantilla', mensajes: [MENSAJES_PLANTILLA_IMPORTACION.VERSION_INVALIDA], mapa: null, extras: [] }
  }

  const columnas = ordenarColumnas(plantilla.columnas)
  const usados = new Set()
  const mapa = { nombre: '', curp: '', claveEmpleado: '', email: '', telefono: '', edad: '' }
  const extras = []
  const faltan = []
  for (const columna of columnas) {
    const encabezado = encabezados.find((item) => !usados.has(item) && mismoEncabezado(item, columna))
    if (!encabezado) {
      faltan.push(columna.etiqueta)
      continue
    }
    usados.add(encabezado)
    const base = infoCampoBase(columna.clave)
    if (base) mapa[base.campo] = encabezado
    else extras.push({ ...columna, encabezado })
  }
  const sobran = encabezados.filter((item) => item && !usados.has(item))
  if (faltan.length) mensajes.push(mensajeFaltanColumnas(faltan))
  if (sobran.length) mensajes.push(mensajeSobranColumnas(sobran))
  if (mensajes.length) return { ok: false, modo: 'plantilla', mensajes, mapa: null, extras: [] }
  return { ok: true, modo: 'plantilla', mensajes: [], mapa, extras, version: vigente }
}

// Paso 2: convierte los registros del archivo en valores para la vista previa:
// campos base (como aplicarMapa) más datosExtra con las columnas personalizadas.
export function aplicarPlantilla(registros, estructura) {
  const mapa = estructura?.mapa || {}
  const extras = estructura?.extras || []
  return (registros || []).map((registro) => {
    const datosExtra = {}
    for (const extra of extras) datosExtra[extra.clave] = registro[extra.encabezado] ?? ''
    return {
      nombre: mapa.nombre ? registro[mapa.nombre] : '',
      curp: mapa.curp ? registro[mapa.curp] : '',
      claveEmpleado: mapa.claveEmpleado ? registro[mapa.claveEmpleado] : '',
      email: mapa.email ? registro[mapa.email] : '',
      telefono: mapa.telefono ? registro[mapa.telefono] : '',
      edad: mapa.edad ? registro[mapa.edad] : '',
      datosExtra
    }
  })
}

function vacio(valor) {
  return valor == null || String(valor).trim() === ''
}

function fechaIso(anio, mes, dia) {
  const fecha = new Date(Date.UTC(anio, mes - 1, dia))
  if (fecha.getUTCFullYear() !== anio || fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== dia) return null
  return fecha.toISOString().slice(0, 10)
}

// Valida y normaliza un valor de columna personalizada según su tipo.
export function validarValorTipo(tipo, valor) {
  if (vacio(valor)) return { valor: null, error: null }
  const texto = String(valor).trim()
  if (tipo === 'numero') {
    const limpio = texto.replace(/,/g, '')
    if (!/^-?\d+(\.\d+)?$/.test(limpio)) return { valor: null, error: MENSAJES_PLANTILLA_IMPORTACION.NUMERO }
    return { valor: Number(limpio), error: null }
  }
  if (tipo === 'fecha') {
    let partes = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
    let iso = partes ? fechaIso(Number(partes[1]), Number(partes[2]), Number(partes[3])) : null
    if (!partes) {
      partes = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
      iso = partes ? fechaIso(Number(partes[3]), Number(partes[2]), Number(partes[1])) : null
    }
    if (!iso) return { valor: null, error: MENSAJES_PLANTILLA_IMPORTACION.FECHA }
    return { valor: iso, error: null }
  }
  if (tipo === 'email') {
    if (!validarCorreo(texto)) return { valor: null, error: MENSAJES_PLANTILLA_IMPORTACION.EMAIL }
    return { valor: normalizarCorreo(texto), error: null }
  }
  if (texto.length > MAX_TEXTO) return { valor: null, error: MENSAJES_PLANTILLA_IMPORTACION.TEXTO_LARGO }
  return { valor: texto, error: null }
}

// Paso 3: sobre las filas ya clasificadas (formato base y duplicados), aplica
// las reglas de la plantilla: obligatorios (base y personalizados) y tipos de
// las columnas personalizadas. Deja datosExtra normalizado en fila.valores.
export function revisarFilasConPlantilla(filas, valoresOriginales, plantilla) {
  if (!tienePlantillaPropia(plantilla)) return filas
  const columnas = ordenarColumnas(plantilla.columnas)
  return filas.map((fila) => {
    const original = valoresOriginales?.[fila.indice] || {}
    const extraOriginal = original.datosExtra || {}
    const errores = [...fila.errores]
    const faltantes = []
    const datosExtra = {}
    for (const columna of columnas) {
      const base = infoCampoBase(columna.clave)
      if (base) {
        if (columna.obligatorio && vacio(fila.valores[base.campo])) faltantes.push(base.campo)
        continue
      }
      const crudo = extraOriginal[columna.clave]
      if (vacio(crudo)) {
        if (columna.obligatorio) faltantes.push(columna.clave)
        continue
      }
      const revisado = validarValorTipo(columna.tipo, crudo)
      if (revisado.error) errores.push({ campo: columna.clave, mensaje: `${columna.etiqueta}: ${revisado.error}` })
      else datosExtra[columna.clave] = revisado.valor
    }
    return {
      ...fila,
      errores,
      incompleta: fila.incompleta || faltantes.length > 0,
      camposFaltantes: faltantes,
      valores: { ...fila.valores, datosExtra }
    }
  })
}


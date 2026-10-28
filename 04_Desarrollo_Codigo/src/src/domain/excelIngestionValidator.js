import {
  CAMPOS_IMPORTACION,
  aplicarMapa,
  clasificarFilas,
  evaluarConfirmacion,
  sugerirMapa,
  validarExtension
} from './excelImport.js'

export class ExcelIngestionValidator {
  static ID = 'C-03'
  static NOMBRE = 'ExcelIngestionValidator'

  validarExtension(nombre) {
    return validarExtension(nombre)
  }

  sugerirMapa(encabezados) {
    return sugerirMapa(encabezados || [])
  }

  columnasFaltantes(mapa) {
    return CAMPOS_IMPORTACION
      .filter((campo) => campo.obligatorio && !String(mapa?.[campo.id] || '').trim())
      .map((campo) => campo.id)
  }

  aplicar(registros, mapa) {
    return aplicarMapa(registros || [], mapa || {})
  }

  vistaPrevia({ valores, existentes, empresaId, decisiones, sobrescribir } = {}) {
    const filas = clasificarFilas(valores || [], existentes || [], empresaId).map((fila) => ({
      ...fila,
      marca: marcaDe(fila),
      camposConError: camposConError(fila)
    }))
    return {
      filas,
      evaluacion: evaluarConfirmacion(filas, decisiones || {}, { sobrescribir: Boolean(sobrescribir) }),
      resumen: resumir(filas)
    }
  }
}

function marcaDe(fila) {
  if (fila.incompleta || fila.errores.length) return 'error'
  if (fila.duplicadoBd || fila.duplicadoArchivo) return 'duplicado'
  return 'valida'
}

function camposConError(fila) {
  const campos = new Set(fila.errores.map((error) => error.campo))
  if (fila.incompleta) campos.add('nombre')
  return [...campos]
}

function resumir(filas) {
  return {
    total: filas.length,
    validas: filas.filter((fila) => fila.marca === 'valida').length,
    conError: filas.filter((fila) => fila.marca === 'error').length,
    duplicadas: filas.filter((fila) => fila.duplicadoBd || fila.duplicadoArchivo).length
  }
}

export const excelIngestionValidator = new ExcelIngestionValidator()

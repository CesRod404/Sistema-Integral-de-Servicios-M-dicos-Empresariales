import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { plantillaExcelEmpresa } from './excelArchivo.js'
import { MENSAJES_IMPORTACION } from './excelImport.js'
import { ExcelIngestionValidator } from './excelIngestionValidator.js'
import { MENSAJES_PLANTILLA_IMPORTACION, mensajeDesactualizada, validarValorTipo } from './importacionPlantilla.js'
import { armarRpcImportarEmpleados, filasDesdeOperaciones, leerEmpleadosDesdeExcel } from './ingestaEmpleados.js'
import { agregarCampo, editarCampo, plantillaPredeterminada } from './plantillaEmpresa.js'

const EMPRESA_A = { id: 'emp-a', nombre: 'Industrias Futura' }
const EMPRESA_B = { id: 'emp-b', nombre: 'Logística Norte' }

function plantillaDe(empresaId, version) {
  let columnas = plantillaPredeterminada(empresaId).columnas
  columnas = agregarCampo(columnas, { etiqueta: 'Puesto', tipo: 'texto', obligatorio: true })
  columnas = agregarCampo(columnas, { etiqueta: 'Fecha de ingreso', tipo: 'fecha' })
  columnas = agregarCampo(columnas, { etiqueta: 'Salario diario', tipo: 'numero' })
  columnas = editarCampo(columnas, 'curp', { obligatorio: true })
  return { id: `pl-${empresaId}`, empresaId, version, columnas }
}

// Descarga la plantilla, la "llena" con filas y la vuelve a leer como archivo.
async function archivoLlenado(empresa, plantilla, filas, nombre = 'llenada.xlsx') {
  const libro = new ExcelJS.Workbook()
  await libro.xlsx.load(await plantillaExcelEmpresa({ empresa, plantilla }))
  const hoja = libro.getWorksheet('Empleados')
  filas.forEach((fila) => hoja.addRow(fila))
  const buffer = await libro.xlsx.writeBuffer()
  return leerEmpleadosDesdeExcel({ name: nombre, arrayBuffer: async () => buffer })
}

describe('CRQ-004 importación con la plantilla de la empresa', () => {
  const validator = new ExcelIngestionValidator()
  const plantillaA = plantillaDe('emp-a', 2)

  it('lee la hoja _sisme y valida el archivo de la versión vigente de la empresa', async () => {
    const lectura = await archivoLlenado(EMPRESA_A, plantillaA, [
      ['Ana Ruiz', 'PEGJ910322HZSRRN03', 'EMP-1', 'ana@futura.mx', '4921232255', 30, 'Soldadora', '2024-03-01', '450.50']
    ])
    expect(lectura.ok).toBe(true)
    expect(lectura.meta).toMatchObject({ empresaId: 'emp-a', version: 2 })
    const estructura = validator.validarEstructura({ plantilla: plantillaA, empresaId: 'emp-a', encabezados: lectura.encabezados, meta: lectura.meta })
    expect(estructura.ok).toBe(true)
    expect(estructura.modo).toBe('plantilla')
    expect(estructura.mapa.nombre).toBe('Nombre completo *')
    expect(estructura.extras.map((extra) => extra.clave)).toEqual(['puesto', 'fecha_de_ingreso', 'salario_diario'])

    const valores = validator.aplicarPlantilla(lectura.registros, estructura)
    const vista = validator.vistaPrevia({ valores, empresaId: 'emp-a', plantilla: plantillaA })
    expect(vista.filas[0].marca).toBe('valida')
    expect(vista.evaluacion.ok).toBe(true)
    const filas = filasDesdeOperaciones(vista.evaluacion.operaciones)
    expect(filas[0]).toMatchObject({
      accion: 'insertar',
      nombre: 'Ana Ruiz',
      curp: 'PEGJ910322HZSRRN03',
      datos_extra: { puesto: 'Soldadora', fecha_de_ingreso: '2024-03-01', salario_diario: 450.5 }
    })
    const rpc = armarRpcImportarEmpleados({ empresaId: 'emp-a', nombreArchivo: 'llenada.xlsx', sobrescribir: false, filas, plantillaVersion: 2 })
    expect(rpc.p_plantilla_version).toBe(2)
    expect(rpc.p_filas[0].datos_extra.puesto).toBe('Soldadora')
  })

  it('rechaza el archivo de otra empresa', async () => {
    const lectura = await archivoLlenado(EMPRESA_B, plantillaDe('emp-b', 1), [['Luis', '', '', '', '', '', 'Chofer', '', '']])
    const estructura = validator.validarEstructura({ plantilla: plantillaA, empresaId: 'emp-a', encabezados: lectura.encabezados, meta: lectura.meta })
    expect(estructura.ok).toBe(false)
    expect(estructura.mensajes).toEqual([MENSAJES_PLANTILLA_IMPORTACION.OTRA_EMPRESA])
  })

  it('rechaza un archivo de una versión anterior de la plantilla', async () => {
    const lectura = await archivoLlenado(EMPRESA_A, plantillaDe('emp-a', 1), [['Luis', '', '', '', '', '', 'Chofer', '', '']])
    const estructura = validator.validarEstructura({ plantilla: plantillaA, empresaId: 'emp-a', encabezados: lectura.encabezados, meta: lectura.meta })
    expect(estructura.ok).toBe(false)
    expect(estructura.mensajes).toEqual([mensajeDesactualizada(1, 2)])
  })

  it('rechaza un Excel sin la hoja _sisme cuando la empresa tiene plantilla propia', () => {
    const estructura = validator.validarEstructura({ plantilla: plantillaA, empresaId: 'emp-a', encabezados: ['nombre_completo'], meta: null })
    expect(estructura.mensajes).toEqual([MENSAJES_PLANTILLA_IMPORTACION.SIN_IDENTIFICADOR])
  })

  it('reporta columnas faltantes o que no están en la plantilla', () => {
    const meta = { empresaId: 'emp-a', version: 2 }
    const encabezados = ['Nombre completo *', 'CURP *', 'Clave de empleado', 'Correo electrónico', 'Teléfono', 'Edad', 'Puesto *', 'Turno']
    const estructura = validator.validarEstructura({ plantilla: plantillaA, empresaId: 'emp-a', encabezados, meta })
    expect(estructura.ok).toBe(false)
    expect(estructura.mensajes).toEqual([
      'Faltan columnas de la plantilla: Fecha de ingreso, Salario diario.',
      'El archivo tiene columnas que no están en la plantilla: Turno.'
    ])
  })

  it('bloquea obligatorios vacíos y tipos inválidos, y solo confirma lo corregido o descartado', async () => {
    const lectura = await archivoLlenado(EMPRESA_A, plantillaA, [
      ['Sin puesto', 'PEGJ910322HZSRRN03', '', '', '', '', '', '', ''],
      ['Sin CURP', '', '', '', '', '', 'Almacén', '', ''],
      ['Fecha mala', 'LOMA850101MZSPRR09', '', '', '', '', 'Almacén', '31/02/2024', 'mucho'],
      ['Correcta', 'RUAA900101HZSZNN05', '', '', '', '', 'Almacén', '15/01/2023', '300']
    ])
    const estructura = validator.validarEstructura({ plantilla: plantillaA, empresaId: 'emp-a', encabezados: lectura.encabezados, meta: lectura.meta })
    const valores = validator.aplicarPlantilla(lectura.registros, estructura)
    const vista = validator.vistaPrevia({ valores, empresaId: 'emp-a', plantilla: plantillaA })
    expect(vista.filas.map((fila) => fila.marca)).toEqual(['error', 'error', 'error', 'valida'])
    expect(vista.filas[0].camposConError).toContain('puesto')
    expect(vista.filas[1].camposConError).toContain('curp')
    expect(vista.filas[2].camposConError).toEqual(expect.arrayContaining(['fecha_de_ingreso', 'salario_diario']))
    expect(vista.evaluacion.ok).toBe(false)
    expect(vista.evaluacion.mensajes).toEqual(expect.arrayContaining([MENSAJES_IMPORTACION.INCOMPLETO, MENSAJES_IMPORTACION.FORMATO]))

    const corregida = validator.vistaPrevia({ valores, empresaId: 'emp-a', plantilla: plantillaA, decisiones: { 0: 'descartar', 1: 'descartar', 2: 'descartar' } })
    expect(corregida.evaluacion.ok).toBe(true)
    const insertadas = filasDesdeOperaciones(corregida.evaluacion.operaciones).filter((fila) => fila.accion === 'insertar')
    expect(insertadas).toHaveLength(1)
    expect(insertadas[0].datos_extra).toEqual({ puesto: 'Almacén', fecha_de_ingreso: '2023-01-15', salario_diario: 300 })
  })

  it('sin plantilla propia sigue la importación de siempre (regresión)', async () => {
    const libro = new ExcelJS.Workbook()
    const hoja = libro.addWorksheet('Empleados')
    hoja.addRow(['nombre_completo', 'curp'])
    hoja.addRow(['María López', ''])
    const buffer = await libro.xlsx.writeBuffer()
    const lectura = await leerEmpleadosDesdeExcel({ name: 'lista.xlsx', arrayBuffer: async () => buffer })
    expect(lectura.meta).toBeNull()
    const estructura = validator.validarEstructura({ plantilla: null, empresaId: 'emp-a', encabezados: lectura.encabezados, meta: lectura.meta })
    expect(estructura).toMatchObject({ ok: true, modo: 'predeterminada' })
    const valores = validator.aplicar(lectura.registros, validator.sugerirMapa(lectura.encabezados))
    const vista = validator.vistaPrevia({ valores, empresaId: 'emp-a', plantilla: null })
    expect(vista.evaluacion.ok).toBe(true)
    const filas = filasDesdeOperaciones(vista.evaluacion.operaciones)
    expect(filas[0]).not.toHaveProperty('datos_extra')
    expect(armarRpcImportarEmpleados({ empresaId: 'emp-a', filas })).not.toHaveProperty('p_plantilla_version')
  })

  it('valida los tipos de dato de las columnas personalizadas', () => {
    expect(validarValorTipo('numero', '1,250.5')).toEqual({ valor: 1250.5, error: null })
    expect(validarValorTipo('numero', 'diez').error).toBe(MENSAJES_PLANTILLA_IMPORTACION.NUMERO)
    expect(validarValorTipo('fecha', '2024-02-29')).toEqual({ valor: '2024-02-29', error: null })
    expect(validarValorTipo('fecha', '29/02/2023').error).toBe(MENSAJES_PLANTILLA_IMPORTACION.FECHA)
    expect(validarValorTipo('email', 'RH@Empresa.MX')).toEqual({ valor: 'rh@empresa.mx', error: null })
    expect(validarValorTipo('email', 'rh@').error).toBe(MENSAJES_PLANTILLA_IMPORTACION.EMAIL)
    expect(validarValorTipo('texto', 'x'.repeat(251)).error).toBe(MENSAJES_PLANTILLA_IMPORTACION.TEXTO_LARGO)
    expect(validarValorTipo('texto', '   ')).toEqual({ valor: null, error: null })
  })
})

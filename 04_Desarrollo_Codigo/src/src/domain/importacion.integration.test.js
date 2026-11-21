import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { leerEmpleadosDesdeExcel, filasDesdeOperaciones, armarRpcImportarEmpleados } from './ingestaEmpleados.js'
import { excelIngestionValidator } from './excelIngestionValidator.js'

// Fixture en memoria: conserva exactamente las seis columnas de
// plantilla_industrias_futura.xlsx (hoja Empleados).
const ENCABEZADOS = [
  'nombre_completo', 'curp', 'clave_empleado', 'email', 'telefono', 'edad'
]

const FILAS_VALIDAS = [
  ['Ana Sofía Martínez López', 'MALA900415MZSRPN08', 'IF-EMP-001', 'ana.martinez@example.com', '4921234501', 36],
  ['Carlos Eduardo Ramírez Soto', 'RASC880721HZSMTR04', 'IF-EMP-002', 'carlos.ramirez@example.com', '4921234502', 38],
  ['Mariana Fernanda Torres Ruiz', 'TORM950203MZSRZR07', 'IF-EMP-003', 'mariana.torres@example.com', '4921234503', 31],
]

async function crearArchivoExcel(nombre, filas) {
  const libro = new ExcelJS.Workbook()
  const hoja = libro.addWorksheet('Empleados')
  hoja.addRow(ENCABEZADOS)
  filas.forEach((fila) => hoja.addRow(fila))
  const buffer = await libro.xlsx.writeBuffer()
  return { name: nombre, arrayBuffer: async () => buffer }
}

describe('SI.5 - Importación de empleados: integración del flujo Excel', () => {
  it('lee el formato de Industrias Futura, valida filas y prepara el payload RPC', async () => {
    const archivo = await crearArchivoExcel('industrias_futura_prueba.xlsx', FILAS_VALIDAS)
    const lectura = await leerEmpleadosDesdeExcel(archivo)

    expect(lectura.ok).toBe(true)
    expect(lectura.encabezados).toEqual(ENCABEZADOS)
    expect(lectura.registros).toHaveLength(3)

    const estructura = excelIngestionValidator.validarEstructura({
      plantilla: null,
      empresaId: 'empresa-industrias-futura',
      encabezados: lectura.encabezados,
      meta: lectura.meta
    })
    expect(estructura).toMatchObject({ ok: true, modo: 'predeterminada' })

    const mapa = excelIngestionValidator.sugerirMapa(lectura.encabezados)
    const valores = excelIngestionValidator.aplicar(lectura.registros, mapa)
    const previa = excelIngestionValidator.vistaPrevia({
      valores,
      existentes: [],
      empresaId: 'empresa-industrias-futura',
      plantilla: null
    })

    expect(previa.evaluacion.ok).toBe(true)
    expect(previa.resumen).toMatchObject({ total: 3, validas: 3, conError: 0, duplicadas: 0 })

    const filas = filasDesdeOperaciones(previa.evaluacion.operaciones)
    const payload = armarRpcImportarEmpleados({
      empresaId: 'empresa-industrias-futura',
      nombreArchivo: lectura.nombreArchivo,
      sobrescribir: false,
      filas
    })

    expect(payload.p_empresa_id).toBe('empresa-industrias-futura')
    expect(payload.p_filas).toHaveLength(3)
    expect(payload.p_filas[0]).toMatchObject({
      accion: 'insertar',
      nombre: 'Ana Sofía Martínez López',
      clave_empleado: 'IF-EMP-001',
      email: 'ana.martinez@example.com',
      telefono: '4921234501',
      edad: 36
    })
  })

  it('detecta errores de formato y obliga a descartar o corregir filas', async () => {
    const filasInvalidas = [
      ['Empleado con correo inválido', 'MALA900415MZSRPN08', 'IF-EMP-101', 'correo-invalido', '4921234511', 30],
      ['Empleado con teléfono inválido', 'RASC880721HZSMTR04', 'IF-EMP-102', 'telefono@example.com', '12345', 30],
      ['Empleado con edad inválida', 'TORM950203MZSRZR07', 'IF-EMP-103', 'edad@example.com', '4921234513', 150],
      ['', '', 'IF-EMP-104', 'sin.nombre@example.com', '4921234514', 25],
    ]
    const archivo = await crearArchivoExcel('industrias_futura_invalidos.xlsx', filasInvalidas)
    const lectura = await leerEmpleadosDesdeExcel(archivo)
    const mapa = excelIngestionValidator.sugerirMapa(lectura.encabezados)
    const valores = excelIngestionValidator.aplicar(lectura.registros, mapa)
    const previa = excelIngestionValidator.vistaPrevia({
      valores,
      existentes: [],
      empresaId: 'empresa-industrias-futura',
      plantilla: null
    })

    expect(lectura.ok).toBe(true)
    expect(previa.evaluacion.ok).toBe(false)
    expect(previa.resumen.conError).toBeGreaterThan(0)
    expect(previa.evaluacion.operaciones).toEqual([])
  })

  it('detecta duplicados contra los empleados existentes de la misma empresa', async () => {
    const archivo = await crearArchivoExcel('industrias_futura_duplicados.xlsx', [FILAS_VALIDAS[0]])
    const lectura = await leerEmpleadosDesdeExcel(archivo)
    const mapa = excelIngestionValidator.sugerirMapa(lectura.encabezados)
    const valores = excelIngestionValidator.aplicar(lectura.registros, mapa)
    const previa = excelIngestionValidator.vistaPrevia({
      valores,
      existentes: [{
        id: 'empleado-existente-001',
        empresaId: 'empresa-industrias-futura',
        nombre: 'Ana Sofía Martínez López',
        curp: 'MALA900415MZSRPN08',
        claveEmpleado: 'IF-EMP-001'
      }],
      empresaId: 'empresa-industrias-futura',
      plantilla: null
    })

    expect(previa.filas[0].marca).toBe('duplicado')
    expect(previa.evaluacion.ok).toBe(false)
  })

  it('rechaza archivos que no sean .xlsx', async () => {
    const resultado = await leerEmpleadosDesdeExcel({
      name: 'industrias_futura.csv',
      arrayBuffer: async () => new ArrayBuffer(0)
    })
    expect(resultado.ok).toBe(false)
  })
})

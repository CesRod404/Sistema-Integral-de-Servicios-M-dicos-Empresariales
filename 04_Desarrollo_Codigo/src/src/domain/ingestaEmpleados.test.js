import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { MENSAJES_IMPORTACION } from './excelImport.js'
import { armarRpcImportarEmpleados, filasDesdeOperaciones, leerEmpleadosDesdeExcel } from './ingestaEmpleados.js'

async function archivoXlsx(nombre, filas) {
  const libro = new ExcelJS.Workbook()
  const hoja = libro.addWorksheet('Empleados')
  filas.forEach((fila) => hoja.addRow(fila))
  const buffer = await libro.xlsx.writeBuffer()
  return { name: nombre, arrayBuffer: async () => buffer }
}

describe('ingesta de empleados desde Excel', () => {
  it('rechaza un archivo que no es .xlsx', async () => {
    const lectura = await leerEmpleadosDesdeExcel({ name: 'lista.xls', arrayBuffer: async () => new ArrayBuffer(0) })
    expect(lectura.ok).toBe(false)
    expect(lectura.mensaje).toBe(MENSAJES_IMPORTACION.EXTENSION)
  })

  it('lee la primera hoja y deja los empleados listos para la empresa', async () => {
    const archivo = await archivoXlsx('nomina.xlsx', [
      ['nombre_completo', 'curp', 'clave_empleado', 'email', 'telefono', 'edad'],
      ['Juan Pérez García', 'PEGJ910322HZSRRN03', 'EMP-100', 'juan.perez@empresa.mx', '4921232255', 35],
      ['María López', '', '', '', '', '']
    ])
    const lectura = await leerEmpleadosDesdeExcel(archivo)
    expect(lectura.ok).toBe(true)
    expect(lectura.nombreArchivo).toBe('nomina.xlsx')
    expect(lectura.encabezados).toContain('nombre_completo')
    expect(lectura.registros).toHaveLength(2)
    expect(lectura.registros[0].nombre_completo).toBe('Juan Pérez García')
    expect(lectura.registros[1].clave_empleado).toBe('')
  })

  it('no registra un libro vacío', async () => {
    const archivo = await archivoXlsx('vacio.xlsx', [['nombre_completo', 'curp']])
    const lectura = await leerEmpleadosDesdeExcel(archivo)
    expect(lectura.ok).toBe(false)
    expect(lectura.mensaje).toBe(MENSAJES_IMPORTACION.VACIO)
  })

  it('arma la llamada importar_empleados con la empresa y solo las filas del lote', () => {
    const rpc = armarRpcImportarEmpleados({
      empresaId: 'emp-1',
      nombreArchivo: 'nomina.xlsx',
      sobrescribir: false,
      filas: filasDesdeOperaciones([
        {
          accion: 'insertar',
          valores: {
            nombre: 'Juan Pérez García',
            curp: 'PEGJ910322HZSRRN03',
            claveEmpleado: 'EMP-100',
            email: 'juan.perez@empresa.mx',
            telefono: '4921232255',
            edad: 35
          }
        }
      ])
    })
    expect(rpc).toEqual({
      p_empresa_id: 'emp-1',
      p_nombre_archivo: 'nomina.xlsx',
      p_sobrescribir: false,
      p_filas: [{
        accion: 'insertar',
        nombre: 'Juan Pérez García',
        curp: 'PEGJ910322HZSRRN03',
        clave_empleado: 'EMP-100',
        email: 'juan.perez@empresa.mx',
        telefono: '4921232255',
        edad: 35
      }]
    })
  })
})

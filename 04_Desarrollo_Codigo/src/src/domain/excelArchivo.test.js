import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { HOJA_META, plantillaExcelEmpresa } from './excelArchivo.js'
import { agregarCampo, editarCampo, moverCampo, nombreArchivoPlantilla, plantillaPredeterminada } from './plantillaEmpresa.js'

async function abrir(buffer) {
  const libro = new ExcelJS.Workbook()
  await libro.xlsx.load(buffer)
  return libro
}

function fila(hoja, numero) {
  return hoja.getRow(numero).values.slice(1)
}

describe('CRQ-004 descarga de plantilla Excel por empresa', () => {
  const empresa = { id: 'emp-a', nombre: 'Industrias Futura' }

  it('genera el .xlsx con las columnas en el orden configurado y marca las obligatorias', async () => {
    let columnas = agregarCampo(plantillaPredeterminada('emp-a').columnas, { etiqueta: 'Puesto', obligatorio: true })
    columnas = moverCampo(columnas, 'puesto', -5)
    columnas = editarCampo(columnas, 'curp', { obligatorio: true })
    const plantilla = { empresaId: 'emp-a', version: 3, columnas }
    const libro = await abrir(await plantillaExcelEmpresa({ empresa, plantilla }))

    expect(libro.worksheets.map((hoja) => hoja.name)).toEqual(['Empleados', HOJA_META])
    const datos = libro.getWorksheet('Empleados')
    expect(fila(datos, 1)).toEqual(['Nombre completo *', 'Puesto *', 'CURP *', 'Clave de empleado', 'Correo electrónico', 'Teléfono', 'Edad'])
    expect(datos.rowCount).toBe(1)
    expect(datos.getRow(1).getCell(1).font?.bold).toBe(true)
  })

  it('incluye la hoja oculta _sisme con la empresa y la versión', async () => {
    const plantilla = { empresaId: 'emp-a', version: 2, columnas: plantillaPredeterminada('emp-a').columnas }
    const libro = await abrir(await plantillaExcelEmpresa({ empresa, plantilla }))
    const meta = libro.getWorksheet(HOJA_META)
    expect(meta.state).toBe('hidden')
    expect(fila(meta, 1)).toEqual(['empresa_id', 'emp-a'])
    expect(fila(meta, 2)).toEqual(['empresa', 'Industrias Futura'])
    expect(fila(meta, 3)).toEqual(['version', 2])
    expect(fila(meta, 4)).toEqual(['columnas', 'nombre_completo,curp,clave_empleado,email,telefono,edad'])
  })

  it('sin plantilla propia descarga la plantilla predeterminada de siempre', async () => {
    const libro = await abrir(await plantillaExcelEmpresa({ empresa, plantilla: null }))
    expect(libro.worksheets.map((hoja) => hoja.name)).toEqual(['Empleados'])
    expect(fila(libro.worksheets[0], 1)).toEqual(['nombre_completo', 'curp', 'clave_empleado', 'email', 'telefono', 'edad'])
  })

  it('nombra el archivo con la empresa y la versión', () => {
    expect(nombreArchivoPlantilla(empresa, { version: 4 })).toBe('plantilla_industrias_futura_v4.xlsx')
    expect(nombreArchivoPlantilla(empresa, null)).toBe('plantilla_industrias_futura.xlsx')
  })
})

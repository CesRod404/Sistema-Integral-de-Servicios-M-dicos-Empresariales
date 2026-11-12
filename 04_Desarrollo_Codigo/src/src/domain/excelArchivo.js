import { encabezadoDe, ordenarColumnas, ETIQUETA_TIPO } from './plantillaEmpresa.js'

export const HOJA_DATOS = 'Empleados'
export const HOJA_META = '_sisme'

async function crearLibro() {
  const modulo = await import('exceljs')
  const ExcelJS = modulo.default ?? modulo
  return new ExcelJS.Workbook()
}

function valorCelda(celda) {
  const valor = celda?.value
  if (valor == null) return ''
  if (valor instanceof Date) return valor.toISOString().slice(0, 10)
  if (typeof valor === 'object') {
    if (valor.text) return String(valor.text)
    if (valor.result != null) return String(valor.result)
    if (Array.isArray(valor.richText)) return valor.richText.map((parte) => parte.text || '').join('')
  }
  return String(valor).trim()
}

function leerMeta(hoja) {
  if (!hoja) return null
  const datos = {}
  hoja.eachRow((fila) => {
    const clave = valorCelda(fila.getCell(1))
    if (clave) datos[clave] = valorCelda(fila.getCell(2))
  })
  if (!datos.empresa_id && !datos.version) return null
  return {
    empresaId: datos.empresa_id || null,
    empresa: datos.empresa || '',
    version: Number(datos.version) || 0,
    columnas: String(datos.columnas || '').split(',').map((item) => item.trim()).filter(Boolean)
  }
}

export async function leerHoja(buffer) {
  const libro = await crearLibro()
  await libro.xlsx.load(buffer)
  // CRQ-004: la hoja de datos es la primera que no sea «_sisme»; «_sisme» trae
  // la empresa y la versión de la plantilla descargada (si existe).
  const hoja = libro.worksheets.find((item) => item.name !== HOJA_META)
  const meta = leerMeta(libro.getWorksheet(HOJA_META))
  if (!hoja) return { encabezados: [], registros: [], meta }
  const matriz = []
  hoja.eachRow({ includeEmpty: true }, (fila, numero) => {
    const valores = []
    const ultima = Math.max(fila.cellCount, hoja.columnCount || 0)
    for (let columna = 1; columna <= ultima; columna += 1) {
      valores.push(valorCelda(fila.getCell(columna)))
    }
    if (valores.some((item) => item !== '')) matriz[numero - 1] = valores
  })
  const compacta = matriz.filter(Boolean)
  if (!compacta.length) return { encabezados: [], registros: [], meta }
  const encabezados = compacta[0].map((celda) => String(celda ?? '').trim())
  const registros = compacta.slice(1).map((fila) => {
    const registro = {}
    encabezados.forEach((encabezado, indice) => {
      if (!encabezado) return
      registro[encabezado] = fila[indice] ?? ''
    })
    return registro
  })
  return { encabezados: encabezados.filter(Boolean), registros, meta }
}

export async function plantillaExcel() {
  const libro = await crearLibro()
  const hoja = libro.addWorksheet('Empleados')
  hoja.addRow(['nombre_completo', 'curp', 'clave_empleado', 'email', 'telefono', 'edad'])
  hoja.addRow(['Juan Pérez García', 'PEGJ910322HZSRRN03', 'EMP-100', 'juan.perez@empresa.mx', '4921232255', 35])
  return libro.xlsx.writeBuffer()
}

// CRQ-004 · descarga de la plantilla de una empresa: columnas en el orden
// configurado, encabezados obligatorios marcados con «*» y hoja oculta «_sisme»
// con la empresa y la versión para validar el archivo al importarlo.
export async function plantillaExcelEmpresa({ empresa, plantilla }) {
  if (!plantilla || !plantilla.version) return plantillaExcel()
  const columnas = ordenarColumnas(plantilla.columnas)
  const libro = await crearLibro()
  libro.creator = 'SISME'
  const hoja = libro.addWorksheet(HOJA_DATOS, { views: [{ state: 'frozen', ySplit: 1 }] })
  hoja.columns = columnas.map((columna) => ({
    header: encabezadoDe(columna),
    key: columna.clave,
    width: Math.max(14, Math.min(40, encabezadoDe(columna).length + 4))
  }))
  const encabezado = hoja.getRow(1)
  encabezado.font = { bold: true }
  columnas.forEach((columna, indice) => {
    const celda = encabezado.getCell(indice + 1)
    celda.note = `${ETIQUETA_TIPO[columna.tipo] || 'Texto'}${columna.obligatorio ? ' · obligatorio' : ' · opcional'}`
    if (columna.obligatorio) {
      celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF1E2' } }
    }
  })
  const meta = libro.addWorksheet(HOJA_META, { state: 'hidden' })
  meta.addRow(['empresa_id', empresa?.id || plantilla.empresaId || ''])
  meta.addRow(['empresa', empresa?.nombre || ''])
  meta.addRow(['version', Number(plantilla.version)])
  meta.addRow(['columnas', columnas.map((columna) => columna.clave).join(',')])
  return libro.xlsx.writeBuffer()
}

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

export async function leerHoja(buffer) {
  const libro = await crearLibro()
  await libro.xlsx.load(buffer)
  const hoja = libro.worksheets[0]
  if (!hoja) return { encabezados: [], registros: [] }
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
  if (!compacta.length) return { encabezados: [], registros: [] }
  const encabezados = compacta[0].map((celda) => String(celda ?? '').trim())
  const registros = compacta.slice(1).map((fila) => {
    const registro = {}
    encabezados.forEach((encabezado, indice) => {
      if (!encabezado) return
      registro[encabezado] = fila[indice] ?? ''
    })
    return registro
  })
  return { encabezados: encabezados.filter(Boolean), registros }
}

export async function plantillaExcel() {
  const libro = await crearLibro()
  const hoja = libro.addWorksheet('Empleados')
  hoja.addRow(['nombre_completo', 'curp', 'clave_empleado', 'email', 'telefono', 'edad'])
  hoja.addRow(['Juan Pérez García', 'PEGJ910322HZSRRN03', 'EMP-100', 'juan.perez@empresa.mx', '4921232255', 35])
  return libro.xlsx.writeBuffer()
}

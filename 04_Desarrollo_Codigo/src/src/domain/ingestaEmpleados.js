import { MENSAJES_IMPORTACION, validarExtension } from './excelImport.js'
import { leerHoja } from './excelArchivo.js'

const MENSAJE_LECTURA = 'No se pudo leer el archivo Excel. Verifique que sea un .xlsx válido.'

export async function leerEmpleadosDesdeExcel(archivo) {
  const extension = validarExtension(archivo?.name)
  if (extension) return { ok: false, mensaje: extension, encabezados: [], registros: [] }
  try {
    const buffer = await archivo.arrayBuffer()
    const hoja = await leerHoja(buffer)
    if (!hoja.encabezados.length || !hoja.registros.length) {
      return { ok: false, mensaje: MENSAJES_IMPORTACION.VACIO, encabezados: hoja.encabezados, registros: [] }
    }
    return {
      ok: true,
      nombreArchivo: archivo.name,
      encabezados: hoja.encabezados,
      registros: hoja.registros
    }
  } catch {
    return { ok: false, mensaje: MENSAJE_LECTURA, encabezados: [], registros: [] }
  }
}

export function filasDesdeOperaciones(operaciones) {
  return (operaciones || []).map((item) => {
    const valores = item.valores || item
    return {
      accion: item.accion || 'insertar',
      nombre: valores.nombre ?? '',
      curp: valores.curp ?? null,
      clave_empleado: valores.claveEmpleado ?? valores.clave_empleado ?? null,
      email: valores.email ?? null,
      telefono: valores.telefono ?? null,
      edad: valores.edad ?? null
    }
  })
}

export function armarRpcImportarEmpleados({ empresaId, nombreArchivo, sobrescribir, filas }) {
  return {
    p_empresa_id: empresaId,
    p_nombre_archivo: nombreArchivo || 'lista.xlsx',
    p_sobrescribir: Boolean(sobrescribir),
    p_filas: filasDesdeOperaciones(filas)
  }
}

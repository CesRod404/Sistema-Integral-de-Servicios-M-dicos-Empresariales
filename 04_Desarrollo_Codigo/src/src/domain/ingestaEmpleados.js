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
      registros: hoja.registros,
      meta: hoja.meta || null
    }
  } catch {
    return { ok: false, mensaje: MENSAJE_LECTURA, encabezados: [], registros: [] }
  }
}

export function filasDesdeOperaciones(operaciones) {
  return (operaciones || []).map((item) => {
    const valores = item.valores || item
    const fila = {
      accion: item.accion || 'insertar',
      nombre: valores.nombre ?? '',
      curp: valores.curp ?? null,
      clave_empleado: valores.claveEmpleado ?? valores.clave_empleado ?? null,
      email: valores.email ?? null,
      telefono: valores.telefono ?? null,
      edad: valores.edad ?? null
    }
    // CRQ-004: valores de las columnas personalizadas de la plantilla.
    const datosExtra = valores.datosExtra ?? valores.datos_extra
    if (datosExtra && Object.keys(datosExtra).length) fila.datos_extra = datosExtra
    return fila
  })
}

export function armarRpcImportarEmpleados({ empresaId, nombreArchivo, sobrescribir, filas, plantillaVersion }) {
  const rpc = {
    p_empresa_id: empresaId,
    p_nombre_archivo: nombreArchivo || 'lista.xlsx',
    p_sobrescribir: Boolean(sobrescribir),
    p_filas: filasDesdeOperaciones(filas)
  }
  // CRQ-004: versión de la plantilla con la que se validó el archivo. La base de
  // datos rechaza el lote si ya no es la vigente de la empresa.
  if (plantillaVersion != null) rpc.p_plantilla_version = Number(plantillaVersion)
  return rpc
}

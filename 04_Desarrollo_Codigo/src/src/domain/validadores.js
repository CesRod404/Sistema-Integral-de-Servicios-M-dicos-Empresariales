const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CURP = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/

export function validarContrasena(valor) {
  if (!valor || valor.length < 8) return 'La contraseña debe tener al menos 8 caracteres.'
  if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(valor) || !/\d/.test(valor)) {
    return 'La contraseña debe incluir letras y números.'
  }
  return null
}

export function normalizarCorreo(valor) {
  return String(valor || '').trim().toLowerCase()
}

export function validarCorreo(valor) {
  return CORREO.test(normalizarCorreo(valor))
}

export function normalizarCurp(valor) {
  const texto = String(valor || '').replace(/\s+/g, '').toUpperCase()
  return texto || null
}

export function validarCurp(valor) {
  const curp = normalizarCurp(valor)
  if (!curp) return { valor: null }
  if (!CURP.test(curp)) return { error: 'La CURP no tiene el formato de 18 caracteres.' }
  return { valor: curp }
}

export function normalizarTelefono(valor) {
  if (valor == null || String(valor).trim() === '') return { valor: null }
  let digitos = String(valor).replace(/\D/g, '')
  if (digitos.length === 13 && digitos.startsWith('521')) digitos = digitos.slice(3)
  if (digitos.length === 12 && digitos.startsWith('52')) digitos = digitos.slice(2)
  if (digitos.length !== 10) return { error: 'El teléfono debe tener 10 dígitos.' }
  return { valor: digitos }
}

export function normalizarEdad(valor) {
  if (valor == null || String(valor).trim() === '') return { valor: null }
  const numero = Number(String(valor).trim())
  if (!Number.isFinite(numero) || Math.floor(numero) !== numero || numero < 0 || numero > 120) {
    return { error: 'La edad debe ser un número entero entre 0 y 120.' }
  }
  return { valor: numero }
}

export function validarEmpresa(datos) {
  const errores = {}
  if (!String(datos.nombre || '').trim()) errores.nombre = 'El nombre de la empresa es obligatorio.'
  if (!String(datos.contacto || '').trim()) errores.contacto = 'El nombre del contacto es obligatorio.'
  if (!validarCorreo(datos.email)) errores.email = 'Capture un correo electrónico válido.'
  const telefono = normalizarTelefono(datos.telefono)
  if (telefono.error) errores.telefono = telefono.error
  return errores
}

export function validarEmpleado(datos) {
  const errores = {}
  if (!String(datos.nombre || '').trim()) errores.nombre = 'El nombre completo es obligatorio.'
  if (!datos.empresaId) errores.empresaId = 'Seleccione la empresa del paciente.'
  const curp = validarCurp(datos.curp)
  if (curp.error) errores.curp = curp.error
  if (datos.email && !validarCorreo(datos.email)) errores.email = 'El correo electrónico no es válido.'
  const telefono = normalizarTelefono(datos.telefono)
  if (telefono.error) errores.telefono = telefono.error
  const edad = normalizarEdad(datos.edad)
  if (edad.error) errores.edad = edad.error
  return errores
}

export const PDF_MAX_BYTES = 5 * 1024 * 1024

export function validarPdf(archivo) {
  if (!archivo) return 'Seleccione un archivo PDF.'
  const nombre = archivo.nombre || archivo.name || ''
  const tipo = archivo.tipo || archivo.type || ''
  const tamano = archivo.tamano ?? archivo.size ?? 0
  const esPdf = tipo === 'application/pdf' || nombre.toLowerCase().endsWith('.pdf')
  if (!esPdf) return 'Solo se permiten archivos PDF.'
  if (tamano <= 0) return 'El archivo PDF está vacío.'
  if (tamano > PDF_MAX_BYTES) return 'El PDF supera el tamaño máximo de 5 MB.'
  return null
}

export function validarCita({ empleadoId, fechaHora }) {
  if (!empleadoId) return 'Seleccione un empleado ya registrado.'
  if (!fechaHora) return 'Indique la fecha y la hora de la cita.'
  if (Number.isNaN(new Date(fechaHora).getTime())) return 'La fecha u hora no es válida.'
  return null
}

export function validarEstudio({ nombre, precio }) {
  const errores = {}
  if (!String(nombre || '').trim()) errores.nombre = 'El nombre del estudio es obligatorio.'
  const monto = Number(precio)
  if (!Number.isFinite(monto) || monto < 0) errores.precio = 'El precio debe ser un número mayor o igual a cero.'
  return errores
}

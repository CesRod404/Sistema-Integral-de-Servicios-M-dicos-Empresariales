// Empresas cliente: edición de datos de contacto (US-EMP-02, RF-05).
// Reglas puras compartidas por demoApi y supabaseApi.
import { normalizarCorreo, normalizarTelefono, validarEmpresa } from './validadores.js'

export const EMPRESA_VACIA = { nombre: '', contacto: '', email: '', telefono: '', direccion: '', notas: '' }
export const CAMPOS_CONTACTO = Object.keys(EMPRESA_VACIA)

// El formulario solo lleva los campos editables: el folio y el estado no se
// envían al guardar (el estado cambia solo con la baja lógica).
export function formularioDesdeEmpresa(empresa) {
  const formulario = { id: empresa.id }
  for (const campo of CAMPOS_CONTACTO) formulario[campo] = empresa[campo] == null ? '' : String(empresa[campo])
  return formulario
}

// Datos de la empresa normalizados tal como se guardan (RF-04, RF-05).
export function datosContactoEmpresa(datos) {
  return {
    nombre: String(datos.nombre || '').trim(),
    contacto: String(datos.contacto || '').trim(),
    email: normalizarCorreo(datos.email),
    telefono: normalizarTelefono(datos.telefono).valor,
    direccion: String(datos.direccion || '').trim() || null,
    notas: String(datos.notas || '').trim() || null
  }
}

export function camposModificados(actual, datos) {
  const antes = datosContactoEmpresa(actual)
  const despues = datosContactoEmpresa(datos)
  return CAMPOS_CONTACTO.filter((campo) => antes[campo] !== despues[campo])
}

// RF-05: valida la edición de una empresa ya registrada y devuelve solo los
// campos que cambiaron, para no reescribir lo que sigue igual.
export function prepararEdicionEmpresa(actual, datos) {
  if (!actual) return { ok: false, mensaje: 'La empresa no existe.' }
  const errores = validarEmpresa(datos)
  if (Object.keys(errores).length) return { ok: false, mensaje: Object.values(errores)[0], errores }
  const campos = camposModificados(actual, datos)
  const nuevos = datosContactoEmpresa(datos)
  const cambios = Object.fromEntries(campos.map((campo) => [campo, nuevos[campo]]))
  return { ok: true, campos, cambios }
}
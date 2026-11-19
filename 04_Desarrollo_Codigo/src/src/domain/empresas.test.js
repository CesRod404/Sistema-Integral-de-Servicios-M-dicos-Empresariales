import { describe, expect, it } from 'vitest'
import { EMPRESA_VACIA, camposModificados, datosContactoEmpresa, formularioDesdeEmpresa, prepararEdicionEmpresa } from './empresas.js'

const empresa = {
  id: 'emp-1',
  folio: 'EMP-001',
  nombre: 'Industrias Futura',
  contacto: 'Laura Méndez',
  email: 'rh@futura.mx',
  telefono: '4921232255',
  direccion: '',
  notas: '',
  estado: 'activo'
}

describe('US-EMP-02 / RF-05 edición de datos de contacto de empresa', () => {
  it('el formulario de edición solo lleva id y campos de contacto, sin folio ni estado', () => {
    const formulario = formularioDesdeEmpresa({ ...empresa, telefono: null })
    expect(Object.keys(formulario).sort()).toEqual(['id', ...Object.keys(EMPRESA_VACIA)].sort())
    expect(formulario.telefono).toBe('')
    expect(formulario).not.toHaveProperty('estado')
    expect(formulario).not.toHaveProperty('folio')
  })

  it('normaliza correo, teléfono y campos opcionales vacíos', () => {
    expect(datosContactoEmpresa({ nombre: ' Futura ', contacto: ' Ana ', email: ' RH@Futura.MX ', telefono: '+52 492 123 2255', direccion: '  ', notas: '' })).toEqual({
      nombre: 'Futura',
      contacto: 'Ana',
      email: 'rh@futura.mx',
      telefono: '4921232255',
      direccion: null,
      notas: null
    })
  })

  it('TEST-EMP-02: actualiza solo el teléfono y el correo que cambiaron', () => {
    const edicion = prepararEdicionEmpresa(empresa, { ...formularioDesdeEmpresa(empresa), telefono: '492 555 0101', email: 'Contacto@Futura.mx' })
    expect(edicion.ok).toBe(true)
    expect(edicion.campos).toEqual(['email', 'telefono'])
    expect(edicion.cambios).toEqual({ email: 'contacto@futura.mx', telefono: '4925550101' })
  })

  it('no detecta cambios si solo difieren espacios, mayúsculas del correo o formato del teléfono', () => {
    expect(camposModificados(empresa, { ...empresa, email: ' RH@FUTURA.MX', telefono: '(492) 123-2255', direccion: null })).toEqual([])
    const edicion = prepararEdicionEmpresa(empresa, formularioDesdeEmpresa(empresa))
    expect(edicion).toMatchObject({ ok: true, campos: [], cambios: {} })
  })

  it('rechaza contacto vacío, correo o teléfono inválidos y empresas inexistentes', () => {
    expect(prepararEdicionEmpresa(empresa, { ...empresa, contacto: '  ' })).toMatchObject({ ok: false, mensaje: 'El nombre del contacto es obligatorio.' })
    expect(prepararEdicionEmpresa(empresa, { ...empresa, email: 'sin-arroba' }).errores.email).toBeTruthy()
    expect(prepararEdicionEmpresa(empresa, { ...empresa, telefono: '123' }).errores.telefono).toMatch(/10 dígitos/)
    expect(prepararEdicionEmpresa(null, empresa)).toEqual({ ok: false, mensaje: 'La empresa no existe.' })
  })
})
import { describe, expect, it } from 'vitest'
import {
  EMPRESA_VACIA,
  camposModificados,
  datosContactoEmpresa,
  filtrarEmpresas,
  formularioDesdeEmpresa,
  prepararEdicionEmpresa,
  resumenEmpresas,
  validarCambioEstadoEmpresa
} from './empresas.js'

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

describe('US-EMP-03 / RF-06 consulta y baja lógica de empresa cliente', () => {
  const catalogo = [
    { id: 'e1', folio: 'EMP-001', nombre: 'Industrias Futura', contacto: 'Laura Méndez', email: 'rh@futura.mx', telefono: '4921232255', estado: 'activo' },
    { id: 'e2', folio: 'EMP-002', nombre: 'Minera Zacatecas', contacto: 'José Pérez', email: 'salud@minera.mx', telefono: '', estado: 'inactivo' },
    { id: 'e3', folio: 'EMP-003', nombre: 'Transportes del Centro', contacto: 'Ana Ruiz', email: 'ana@tdc.mx', telefono: '4925550101', estado: 'activo' }
  ]

  it('filtra por estado activo, inactivo o todas', () => {
    expect(filtrarEmpresas(catalogo, { estado: 'todas' }).map((e) => e.id)).toEqual(['e1', 'e2', 'e3'])
    expect(filtrarEmpresas(catalogo, { estado: 'activo' }).map((e) => e.id)).toEqual(['e1', 'e3'])
    expect(filtrarEmpresas(catalogo, { estado: 'inactivo' }).map((e) => e.id)).toEqual(['e2'])
  })

  it('busca por folio, nombre, contacto, correo o teléfono sin importar acentos ni mayúsculas', () => {
    expect(filtrarEmpresas(catalogo, { texto: 'emp-003' }).map((e) => e.id)).toEqual(['e3'])
    expect(filtrarEmpresas(catalogo, { texto: 'jose perez' }).map((e) => e.id)).toEqual(['e2'])
    expect(filtrarEmpresas(catalogo, { texto: 'MENDEZ' }).map((e) => e.id)).toEqual(['e1'])
    expect(filtrarEmpresas(catalogo, { texto: 'salud@' }).map((e) => e.id)).toEqual(['e2'])
    expect(filtrarEmpresas(catalogo, { texto: '555' }).map((e) => e.id)).toEqual(['e3'])
    expect(filtrarEmpresas(catalogo, { texto: 'futura', estado: 'inactivo' })).toEqual([])
  })

  it('resume cuántas empresas están activas e inactivas', () => {
    expect(resumenEmpresas(catalogo)).toEqual({ total: 3, activas: 2, inactivas: 1 })
    expect(resumenEmpresas([])).toEqual({ total: 0, activas: 0, inactivas: 0 })
  })

  it('TEST-EMP-03: la baja solo admite pasar de activo a inactivo y la reactivación lo inverso', () => {
    expect(validarCambioEstadoEmpresa(catalogo[0], 'inactivo')).toBeNull()
    expect(validarCambioEstadoEmpresa(catalogo[1], 'activo')).toBeNull()
    expect(validarCambioEstadoEmpresa(catalogo[1], 'inactivo')).toMatch(/ya está dada de baja/)
    expect(validarCambioEstadoEmpresa(catalogo[0], 'activo')).toMatch(/ya está activa/)
    expect(validarCambioEstadoEmpresa(catalogo[0], 'borrado')).toMatch(/no es válido/)
    expect(validarCambioEstadoEmpresa(null, 'inactivo')).toBe('La empresa no existe.')
  })
})

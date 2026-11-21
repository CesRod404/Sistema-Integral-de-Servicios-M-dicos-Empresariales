import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { normalizarEdad, validarEmpleado } from './validadores.js'
import { formularioPaciente } from './pacientes.js'
import { crearApiDemo } from '../datos/demoApi.js'

function almacenamiento() {
  const datos = new Map()
  return {
    getItem: (clave) => (datos.has(clave) ? datos.get(clave) : null),
    setItem: (clave, valor) => { datos.set(clave, String(valor)) },
    removeItem: (clave) => { datos.delete(clave) },
    clear: () => datos.clear()
  }
}

const ADMIN_ID = '00000000-0000-4000-8000-000000000001'
const EMPRESA_ID = '00000000-0000-4000-8000-000000000010'
const PACIENTE_ID = '00000000-0000-4000-8000-000000000020'

describe('S7-T08 edad del paciente: validación', () => {
  it('acepta vacío como sin edad y enteros entre 0 y 120', () => {
    expect(normalizarEdad('')).toEqual({ valor: null })
    expect(normalizarEdad(null)).toEqual({ valor: null })
    expect(normalizarEdad('0')).toEqual({ valor: 0 })
    expect(normalizarEdad(' 35 ')).toEqual({ valor: 35 })
    expect(normalizarEdad(120)).toEqual({ valor: 120 })
  })

  it('rechaza negativos, mayores de 120, decimales y texto', () => {
    for (const valor of ['-1', '121', '30.5', 'treinta']) {
      expect(normalizarEdad(valor).error).toBe('La edad debe ser un número entero entre 0 y 120.')
    }
    expect(validarEmpleado({ nombre: 'Ana', empresaId: EMPRESA_ID, edad: '130' }).edad).toBeTruthy()
    expect(validarEmpleado({ nombre: 'Ana', empresaId: EMPRESA_ID, edad: '' }).edad).toBeUndefined()
  })

  it('prepara el formulario de edición con la edad actual o vacía', () => {
    expect(formularioPaciente({ id: 'x', nombre: 'Ana', empresaId: 'e', estado: 'activo', edad: 41 })).toEqual({ id: 'x', nombre: 'Ana', empresaId: 'e', estado: 'activo', edad: 41 })
    expect(formularioPaciente({ id: 'x', nombre: 'Ana', empresaId: 'e', estado: 'activo', edad: null }).edad).toBe('')
    expect(formularioPaciente({ id: 'x', nombre: 'Ana', empresaId: 'e', estado: 'activo', edad: 0 }).edad).toBe(0)
  })
})

describe('S7-T08 edad del paciente: alta y edición en el CRUD (API demo)', () => {
  let api

  beforeEach(() => {
    const local = almacenamiento()
    vi.stubGlobal('localStorage', local)
    vi.stubGlobal('sessionStorage', almacenamiento())
    local.setItem('sisme.demo.sesion', ADMIN_ID)
    api = crearApiDemo()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('guarda la edad al dar de alta y la muestra en la consulta', async () => {
    const alta = await api.guardarEmpleado({ nombre: 'Paciente Nuevo', empresaId: EMPRESA_ID, estado: 'provisional', edad: '44' })
    expect(alta.ok).toBe(true)
    expect(alta.datos.edad).toBe(44)
    const lista = await api.consultarPacientesAdmin()
    expect(lista.datos.find((item) => item.id === alta.datos.id).edad).toBe(44)
  })

  it('edita la edad, permite dejarla vacía y no cambia otros campos', async () => {
    const lista = await api.consultarPacientesAdmin()
    const actual = lista.datos.find((item) => item.id === PACIENTE_ID)
    const editado = await api.guardarEmpleado({ ...formularioPaciente(actual), edad: '36' })
    expect(editado.ok).toBe(true)
    expect(editado.datos.edad).toBe(36)
    expect(editado.datos.curp).toBe(actual.curp)
    const vaciado = await api.guardarEmpleado({ ...formularioPaciente(actual), edad: '' })
    expect(vaciado.datos.edad).toBeNull()
  })

  it('rechaza una edad fuera de rango sin modificar el registro', async () => {
    const resultado = await api.guardarEmpleado({ id: PACIENTE_ID, nombre: 'Juan Pérez García', empresaId: EMPRESA_ID, estado: 'activo', edad: '150' })
    expect(resultado.ok).toBe(false)
    expect(resultado.mensaje).toBe('La edad debe ser un número entero entre 0 y 120.')
    const lista = await api.consultarPacientesAdmin()
    expect(lista.datos.find((item) => item.id === PACIENTE_ID).edad).toBe(35)
  })
})

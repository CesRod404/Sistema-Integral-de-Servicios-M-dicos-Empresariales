// S7-T21: los pacientes inactivos (baja lógica) solo aparecen con el filtro de inactivos.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { filtrarPacientes } from './pacientes.js'
import { alternarTodos, seleccionVisible } from './seleccion.js'
import { crearApiDemo } from '../datos/demoApi.js'

const ADMIN_ID = '00000000-0000-4000-8000-000000000001'

function almacenamiento() {
  const datos = new Map()
  return {
    getItem: (clave) => (datos.has(clave) ? datos.get(clave) : null),
    setItem: (clave, valor) => { datos.set(clave, String(valor)) },
    removeItem: (clave) => { datos.delete(clave) },
    clear: () => datos.clear()
  }
}

const LISTA = [
  { id: 'a', nombre: 'Ana', empresaId: 'e1', empresaNombre: 'Cantera', estado: 'activo', estadoCita: 'programada' },
  { id: 'b', nombre: 'Beto', empresaId: 'e1', empresaNombre: 'Cantera', estado: 'inactivo', estadoCita: 'programada' },
  { id: 'c', nombre: 'Carla', empresaId: 'e2', empresaNombre: 'Minera', estado: 'provisional', estadoCita: 'cerrada' },
  { id: 'd', nombre: 'Dani', empresaId: 'e2', empresaNombre: 'Minera', estado: 'inactivo', estadoCita: null }
]
const ids = (lista) => lista.map((item) => item.id)

describe('S7-T21 filtro de pacientes inactivos', () => {
  it('con «Todos» oculta a los inactivos', () => {
    expect(ids(filtrarPacientes(LISTA))).toEqual(['a', 'c'])
    expect(ids(filtrarPacientes(LISTA, { estado: '' }))).toEqual(['a', 'c'])
  })

  it('con un estado de cita tampoco muestra inactivos', () => {
    expect(ids(filtrarPacientes(LISTA, { estado: 'programada' }))).toEqual(['a'])
    expect(ids(filtrarPacientes(LISTA, { estado: 'cerrada' }))).toEqual(['c'])
  })

  it('solo el filtro de inactivos los muestra, y combinado con empresa y búsqueda', () => {
    expect(ids(filtrarPacientes(LISTA, { estado: 'inactivo' }))).toEqual(['b', 'd'])
    expect(ids(filtrarPacientes(LISTA, { estado: 'inactivo', empresa: 'e2' }))).toEqual(['d'])
    expect(ids(filtrarPacientes(LISTA, { estado: 'inactivo', texto: 'beto' }))).toEqual(['b'])
    expect(ids(filtrarPacientes(LISTA, { texto: 'beto' }))).toEqual([])
  })

  it('«Seleccionar todos» solo toma las filas visibles y quita las que dejan de verse', () => {
    const visiblesActivos = ids(filtrarPacientes(LISTA))
    const seleccion = alternarTodos(new Set(), visiblesActivos)
    expect([...seleccion].sort()).toEqual(['a', 'c'])
    const conInactivos = alternarTodos(new Set(), ids(filtrarPacientes(LISTA, { estado: 'inactivo' })))
    expect([...seleccionVisible(conInactivos, visiblesActivos)]).toEqual([])
  })
})

describe('S7-T21 baja lógica y lista (API demo)', () => {
  beforeEach(() => {
    const local = almacenamiento()
    vi.stubGlobal('localStorage', local)
    vi.stubGlobal('sessionStorage', almacenamiento())
    local.setItem('sisme.demo.sesion', ADMIN_ID)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('el paciente dado de baja sale de la lista y aparece en el filtro de inactivos', async () => {
    const api = crearApiDemo()
    const antes = filtrarPacientes((await api.consultarPacientesAdmin()).datos)
    const baja = antes.slice(0, 2).map((item) => item.id)
    expect((await api.darDeBajaPacientes(baja)).ok).toBe(true)
    const datos = (await api.consultarPacientesAdmin()).datos
    const activos = ids(filtrarPacientes(datos))
    expect(activos).toHaveLength(antes.length - 2)
    expect(activos.some((id) => baja.includes(id))).toBe(false)
    expect(ids(filtrarPacientes(datos, { estado: 'inactivo' }))).toEqual(expect.arrayContaining(baja))
  })
})

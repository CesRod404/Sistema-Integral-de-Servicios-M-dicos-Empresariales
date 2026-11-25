// S7-T17: selección múltiple con casillas y baja lógica de varios registros.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { alternarSeleccion, alternarTodos, estadoSeleccion, resumenNombres, seleccionVisible } from './seleccion.js'
import { crearApiDemo } from '../datos/demoApi.js'

const ADMIN_ID = '00000000-0000-4000-8000-000000000001'
const DOCTOR_ID = '00000000-0000-4000-8000-000000000002'

function almacenamiento() {
  const datos = new Map()
  return {
    getItem: (clave) => (datos.has(clave) ? datos.get(clave) : null),
    setItem: (clave, valor) => { datos.set(clave, String(valor)) },
    removeItem: (clave) => { datos.delete(clave) },
    clear: () => datos.clear()
  }
}

describe('S7-T17 selección con casillas', () => {
  it('marca y desmarca filas, y la casilla del encabezado selecciona todo lo visible', () => {
    let seleccion = new Set()
    seleccion = alternarSeleccion(seleccion, 'a')
    expect(estadoSeleccion(seleccion, ['a', 'b', 'c'])).toBe('algunos')
    seleccion = alternarTodos(seleccion, ['a', 'b', 'c'])
    expect([...seleccion].sort()).toEqual(['a', 'b', 'c'])
    expect(estadoSeleccion(seleccion, ['a', 'b', 'c'])).toBe('todos')
    seleccion = alternarTodos(seleccion, ['a', 'b', 'c'])
    expect(seleccion.size).toBe(0)
    expect(estadoSeleccion(seleccion, [])).toBe('ninguno')
    expect(alternarSeleccion(new Set(['a']), 'a').size).toBe(0)
  })

  it('al cambiar el filtro solo quedan seleccionadas las filas visibles', () => {
    const seleccion = new Set(['a', 'b', 'c'])
    expect([...seleccionVisible(seleccion, ['b', 'z'])]).toEqual(['b'])
    expect(seleccionVisible(seleccion, ['a', 'b', 'c'])).toBe(seleccion)
  })

  it('resume los nombres para la confirmación', () => {
    const lista = Array.from({ length: 10 }, (_, i) => ({ nombre: `P${i + 1}` }))
    expect(resumenNombres(lista.slice(0, 2))).toBe('P1, P2')
    expect(resumenNombres(lista, 'nombre', 8)).toBe('P1, P2, P3, P4, P5, P6, P7, P8 y 2 más')
  })
})

describe('S7-T17 baja lógica de varios registros en la API demo', () => {
  let local
  beforeEach(() => {
    local = almacenamiento()
    vi.stubGlobal('localStorage', local)
    vi.stubGlobal('sessionStorage', almacenamiento())
    local.setItem('sisme.demo.sesion', ADMIN_ID)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('da de baja varios pacientes sin borrarlos y omite los ya inactivos', async () => {
    const api = crearApiDemo()
    const antes = (await api.consultarPacientesAdmin()).datos
    const ids = antes.slice(0, 3).map((item) => item.id)
    const primera = await api.darDeBajaPacientes(ids)
    expect(primera.datos).toEqual({ actualizados: 3, omitidos: 0 })
    const segunda = await api.darDeBajaPacientes(ids)
    expect(segunda.datos).toEqual({ actualizados: 0, omitidos: 3 })
    const despues = (await api.consultarPacientesAdmin()).datos
    expect(despues).toHaveLength(antes.length)
    expect(despues.filter((item) => ids.includes(item.id)).every((item) => item.estado === 'inactivo')).toBe(true)
    expect((await api.darDeBajaPacientes([])).ok).toBe(false)
  })

  it('da de baja varias empresas activas y conserva sus cargos', async () => {
    const api = crearApiDemo()
    const empresas = (await api.listarEmpresas()).datos
    const activas = empresas.filter((item) => item.estado === 'activo').slice(0, 2).map((item) => item.id)
    const cargosAntes = (await api.listarCargos()).datos.cargos.length
    const resultado = await api.darDeBajaEmpresas(activas)
    expect(resultado.datos.actualizados).toBe(2)
    const despues = (await api.listarEmpresas()).datos
    expect(despues.filter((item) => activas.includes(item.id)).every((item) => item.estado === 'inactivo')).toBe(true)
    expect((await api.listarCargos()).datos.cargos.length).toBe(cargosAntes)
  })

  it('el doctor no puede dar de baja en lote', async () => {
    local.setItem('sisme.demo.sesion', DOCTOR_ID)
    const api = crearApiDemo()
    expect((await api.darDeBajaPacientes(['x'])).ok).toBe(false)
    expect((await api.darDeBajaEmpresas(['x'])).ok).toBe(false)
  })
})

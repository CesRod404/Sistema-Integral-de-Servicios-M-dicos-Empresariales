// S7-T18: marcar varios cobros como pagados (selección y «todos los del filtro»).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { filtrarCargos, prepararPagoLote, saldoCargo } from './cobranza.js'
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

const cargos = [
  { id: 'c1', empresaId: 'e1', empresaNombre: 'Cantera', pacienteNombre: 'Ana', concepto: 'Biometría', precioHistorico: 150, estatus: 'pendiente' },
  { id: 'c2', empresaId: 'e1', empresaNombre: 'Cantera', pacienteNombre: 'Luis', concepto: 'Química', precioHistorico: 200, estatus: 'parcial' },
  { id: 'c3', empresaId: 'e2', empresaNombre: 'Sodexo', pacienteNombre: 'Eva', concepto: 'Rayos X', precioHistorico: 300, estatus: 'pagado' }
]
const pagos = [
  { cargoId: 'c2', monto: 50 },
  { cargoId: 'c3', monto: 300 }
]

describe('S7-T18 pago en lote (dominio)', () => {
  it('paga el saldo completo de cada cargo y omite los ya pagados', () => {
    const r = prepararPagoLote({ cargos, pagos, ids: ['c1', 'c2', 'c3'], referencia: ' TRF-9 ', fecha: '2026-11-25' })
    expect(r.ok).toBe(true)
    expect(r.pagos).toEqual([{ cargoId: 'c1', monto: 150 }, { cargoId: 'c2', monto: 150 }])
    expect(r.omitidos).toBe(1)
    expect(r.total).toBe(300)
    expect(r.referencia).toBe('TRF-9')
  })

  it('exige referencia, fecha y al menos un cargo con saldo', () => {
    expect(prepararPagoLote({ cargos, pagos, ids: ['c1'], referencia: '', fecha: '2026-11-25' }).ok).toBe(false)
    expect(prepararPagoLote({ cargos, pagos, ids: ['c1'], referencia: 'R', fecha: '' }).ok).toBe(false)
    expect(prepararPagoLote({ cargos, pagos, ids: [], referencia: 'R', fecha: '2026-11-25' }).ok).toBe(false)
    expect(prepararPagoLote({ cargos, pagos, ids: ['c3'], referencia: 'R', fecha: '2026-11-25' }).mensaje).toMatch(/ya están pagados/)
  })

  it('filtra por empresa, texto y estatus («con saldo» = pendiente o parcial)', () => {
    expect(filtrarCargos(cargos, pagos, { estatus: 'con_saldo' }).map((c) => c.id)).toEqual(['c1', 'c2'])
    expect(filtrarCargos(cargos, pagos, { estatus: 'pagado' }).map((c) => c.id)).toEqual(['c3'])
    expect(filtrarCargos(cargos, pagos, { empresa: 'e1', texto: 'quím' }).map((c) => c.id)).toEqual(['c2'])
    expect(filtrarCargos(cargos, pagos).length).toBe(3)
  })
})

describe('S7-T18 pago en lote en la API demo', () => {
  let local
  beforeEach(() => {
    local = almacenamiento()
    vi.stubGlobal('localStorage', local)
    vi.stubGlobal('sessionStorage', almacenamiento())
    local.setItem('sisme.demo.sesion', ADMIN_ID)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('deja «pagado» todos los cargos del filtro y no repite pagos', async () => {
    const api = crearApiDemo()
    const { cargos: lista, pagos: pagosDemo } = (await api.listarCargos()).datos
    const conSaldo = filtrarCargos(lista, pagosDemo, { estatus: 'con_saldo' })
    expect(conSaldo.length).toBeGreaterThan(0)
    const esperado = conSaldo.reduce((suma, c) => suma + saldoCargo(c, pagosDemo).saldo, 0)
    const r = await api.registrarPagosLote({ cargoIds: conSaldo.map((c) => c.id), referencia: 'LOTE-1', fecha: '2026-11-25' })
    expect(r.ok).toBe(true)
    expect(r.datos.pagados).toBe(conSaldo.length)
    expect(r.datos.total).toBeCloseTo(esperado, 2)
    const despues = (await api.listarCargos()).datos
    const ids = new Set(conSaldo.map((c) => c.id))
    expect(despues.cargos.filter((c) => ids.has(c.id)).every((c) => c.estatus === 'pagado')).toBe(true)
    const repetido = await api.registrarPagosLote({ cargoIds: [...ids], referencia: 'LOTE-2', fecha: '2026-11-25' })
    expect(repetido.datos).toEqual({ pagados: 0, omitidos: ids.size, total: 0 })
    expect((await api.listarCargos()).datos.pagos.length).toBe(despues.pagos.length)
  })

  it('rechaza ids inexistentes sin pagar nada, y el doctor no puede pagar', async () => {
    const api = crearApiDemo()
    const { cargos: lista, pagos: antes } = (await api.listarCargos()).datos
    const r = await api.registrarPagosLote({ cargoIds: [lista[0].id, 'no-existe'], referencia: 'X', fecha: '2026-11-25' })
    expect(r.ok).toBe(false)
    expect((await api.listarCargos()).datos.pagos.length).toBe(antes.length)
    local.setItem('sisme.demo.sesion', DOCTOR_ID)
    expect((await crearApiDemo().registrarPagosLote({ cargoIds: [lista[0].id], referencia: 'X', fecha: '2026-11-25' })).ok).toBe(false)
  })
})

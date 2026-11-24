import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cambiarAsistencia, cancelarCita, puedeMarcarAsistencia } from './clinica.js'
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
const DOCTOR_ID = '00000000-0000-4000-8000-000000000002'
const CITA_PROGRAMADA_ID = '00000000-0000-4000-8000-000000000032'
const CITA_CERRADA_ID = '00000000-0000-4000-8000-000000000030'

describe('S7-T12 asistencia por el doctor (dominio)', () => {
  const cita = { estadoAsistencia: 'programada' }

  it('permite al administrador y al doctor marcar presente o ausente', () => {
    expect(cambiarAsistencia(cita, 'presente', 'doctor')).toEqual({ ok: true, estado: 'presente' })
    expect(cambiarAsistencia(cita, 'ausente', 'administrador')).toEqual({ ok: true, estado: 'ausente' })
  })

  it('sigue bloqueando a cualquier otro rol y las citas cerradas o canceladas', () => {
    expect(cambiarAsistencia(cita, 'presente', 'recepcion').ok).toBe(false)
    expect(cambiarAsistencia({ estadoAsistencia: 'cerrada' }, 'presente', 'doctor').ok).toBe(false)
    expect(cambiarAsistencia({ estadoAsistencia: 'cancelada' }, 'ausente', 'doctor').ok).toBe(false)
  })

  it('el doctor no puede cancelar una cita', () => {
    expect(cancelarCita(cita, 'doctor').ok).toBe(false)
    expect(cancelarCita(cita, 'doctor').mensaje).toBe('Solo el administrador puede cancelar la cita.')
    expect(cancelarCita(cita, 'administrador').ok).toBe(true)
  })

  it('solo se marca asistencia en citas programadas, presentes o ausentes', () => {
    expect(puedeMarcarAsistencia({ estadoAsistencia: 'programada' })).toBe(true)
    expect(puedeMarcarAsistencia({ estadoAsistencia: 'presente' })).toBe(true)
    expect(puedeMarcarAsistencia({ estadoAsistencia: 'cerrada' })).toBe(false)
    expect(puedeMarcarAsistencia({ estadoAsistencia: 'cancelada' })).toBe(false)
  })
})

describe('S7-T12 el doctor marca asistencia en la API demo', () => {
  let api
  let local

  beforeEach(() => {
    local = almacenamiento()
    vi.stubGlobal('localStorage', local)
    vi.stubGlobal('sessionStorage', almacenamiento())
    local.setItem('sisme.demo.sesion', DOCTOR_ID)
    api = crearApiDemo()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('marca una cita programada como presente y luego como ausente', async () => {
    const presente = await api.registrarAsistencia(CITA_PROGRAMADA_ID, 'presente')
    expect(presente.ok).toBe(true)
    expect(presente.datos.estadoAsistencia).toBe('presente')
    const ausente = await api.registrarAsistencia(CITA_PROGRAMADA_ID, 'ausente')
    expect(ausente.ok).toBe(true)
    expect(ausente.datos.estadoAsistencia).toBe('ausente')
  })

  it('no cancela citas ni modifica una cita ya cerrada', async () => {
    const cancelar = await api.cancelarCita(CITA_PROGRAMADA_ID)
    expect(cancelar.ok).toBe(false)
    expect(cancelar.mensaje).toBe('Solo el administrador puede cancelar la cita.')
    const cerrada = await api.registrarAsistencia(CITA_CERRADA_ID, 'presente')
    expect(cerrada.ok).toBe(false)
  })

  it('el administrador sigue pudiendo marcar asistencia', async () => {
    local.setItem('sisme.demo.sesion', ADMIN_ID)
    const resultado = await api.registrarAsistencia(CITA_PROGRAMADA_ID, 'presente')
    expect(resultado.ok).toBe(true)
    expect(resultado.datos.estadoAsistencia).toBe('presente')
  })
})

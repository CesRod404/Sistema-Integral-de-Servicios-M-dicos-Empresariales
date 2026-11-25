import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { citaAbierta, citaEditable, formularioEdicionCita, formularioNuevaCita, prepararEdicionCita } from './pacientes.js'
import { aMexicoInput } from './fecha.js'
import { crearApiDemo } from '../datos/demoApi.js'

// S7-T20: el administrador edita la fecha de cita desde la ficha del paciente.

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
const EMPLEADO_PROGRAMADO = '00000000-0000-4000-8000-000000000021'
const CITA_PROGRAMADA_ID = '00000000-0000-4000-8000-000000000032'
const EMPLEADO_CERRADO = '00000000-0000-4000-8000-000000000024'
const CITA_CERRADA_ID = '00000000-0000-4000-8000-000000000030'
const EMPLEADO_PRESENTE = '00000000-0000-4000-8000-000000000020'
const CITA_PRESENTE_ID = '00000000-0000-4000-8000-000000000031'

describe('S7-T20 edición de cita desde pacientes (dominio)', () => {
  it('solo el administrador edita citas programadas, presentes o ausentes', () => {
    for (const estado of ['programada', 'presente', 'ausente']) {
      expect(citaEditable({ estadoAsistencia: estado }, 'administrador')).toBe(true)
      expect(citaEditable({ estadoAsistencia: estado }, 'doctor')).toBe(false)
    }
    expect(citaEditable({ estadoAsistencia: 'cerrada' }, 'administrador')).toBe(false)
    expect(citaEditable({ estadoAsistencia: 'cancelada' }, 'administrador')).toBe(false)
  })

  it('arma el formulario con la fecha local de la cita y su motivo', () => {
    const visita = { citaId: 'c1', fechaHora: '2026-11-26T16:30:00.000Z', motivo: 'Ingreso' }
    expect(formularioEdicionCita(visita, aMexicoInput)).toEqual({ citaId: 'c1', fechaHoraLocal: '2026-11-26T10:30', motivo: 'Ingreso' })
  })

  it('exige cita, empleado y una fecha y hora válidas', () => {
    expect(prepararEdicionCita({ empleadoId: 'e1', fechaHoraLocal: '2026-11-26T10:30' }).ok).toBe(false)
    expect(prepararEdicionCita({ citaId: 'c1', fechaHoraLocal: '2026-11-26T10:30' }).ok).toBe(false)
    expect(prepararEdicionCita({ citaId: 'c1', empleadoId: 'e1', fechaHoraLocal: '' }).mensaje).toBe('Indique la fecha y la hora de la cita.')
    expect(prepararEdicionCita({ citaId: 'c1', empleadoId: 'e1', fechaHoraLocal: '26/11/2026' }).mensaje).toBe('Indique una fecha y hora de cita válidas.')
    expect(prepararEdicionCita({ citaId: 'c1', empleadoId: 'e1', fechaHoraLocal: '2026-11-26T10:30:00', motivo: '  Periódico ' })).toEqual({
      ok: true,
      cita: { id: 'c1', empleadoId: 'e1', fechaHoraLocal: '2026-11-26T10:30', motivo: 'Periódico' }
    })
  })
})

describe('S7-T20 panel de cita en la ficha (dominio)', () => {
  const ahora = new Date('2026-11-25T18:00:00Z')

  it('muestra la próxima cita abierta, o la más reciente si ya pasaron todas', () => {
    const visitas = [
      { citaId: 'a', fechaHora: '2026-11-20T15:00:00Z', estadoAsistencia: 'cerrada' },
      { citaId: 'b', fechaHora: '2026-11-24T15:00:00Z', estadoAsistencia: 'presente' },
      { citaId: 'c', fechaHora: '2026-11-28T15:00:00Z', estadoAsistencia: 'programada' },
      { citaId: 'd', fechaHora: '2026-12-05T15:00:00Z', estadoAsistencia: 'programada' }
    ]
    expect(citaAbierta(visitas, ahora).citaId).toBe('c')
    expect(citaAbierta(visitas.slice(0, 2), ahora).citaId).toBe('b')
    expect(citaAbierta([visitas[0]], ahora)).toBeNull()
    expect(citaAbierta([], ahora)).toBeNull()
  })

  it('sin cita abierta permite agendar una nueva (sin id)', () => {
    const form = { ...formularioNuevaCita(), fechaHoraLocal: '2026-11-27T09:00', motivo: 'Ingreso' }
    expect(prepararEdicionCita({ ...form, empleadoId: 'e1' })).toEqual({
      ok: true,
      cita: { empleadoId: 'e1', fechaHoraLocal: '2026-11-27T09:00', motivo: 'Ingreso' }
    })
  })
})

describe('S7-T20 edición de cita desde pacientes (API demo)', () => {
  let api
  let local

  beforeEach(() => {
    local = almacenamiento()
    vi.stubGlobal('localStorage', local)
    vi.stubGlobal('sessionStorage', almacenamiento())
    local.setItem('sisme.demo.sesion', ADMIN_ID)
    api = crearApiDemo()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('el administrador cambia fecha, hora y motivo y la ficha muestra la cita nueva', async () => {
    const preparado = prepararEdicionCita({ citaId: CITA_PROGRAMADA_ID, empleadoId: EMPLEADO_PROGRAMADO, fechaHoraLocal: '2026-12-01T10:15', motivo: 'Seguimiento' })
    const resultado = await api.guardarCita(preparado.cita)
    expect(resultado.ok).toBe(true)
    const visitas = await api.consultarVisitasAdmin(EMPLEADO_PROGRAMADO)
    const cita = visitas.datos.find((item) => item.citaId === CITA_PROGRAMADA_ID)
    expect(aMexicoInput(cita.fechaHora)).toBe('2026-12-01T10:15')
    expect(cita.motivo).toBe('Seguimiento')
    expect(cita.estadoAsistencia).toBe('programada')
  })

  it('al cambiar la fecha de una cita presente, la asistencia vuelve a programada', async () => {
    const preparado = prepararEdicionCita({ citaId: CITA_PRESENTE_ID, empleadoId: EMPLEADO_PRESENTE, fechaHoraLocal: '2026-12-02T09:00', motivo: 'Periódico' })
    expect((await api.guardarCita(preparado.cita)).ok).toBe(true)
    const visitas = await api.consultarVisitasAdmin(EMPLEADO_PRESENTE)
    expect(visitas.datos.find((item) => item.citaId === CITA_PRESENTE_ID).estadoAsistencia).toBe('programada')
  })

  it('agenda una cita nueva a un paciente cuya única cita está cerrada', async () => {
    const preparado = prepararEdicionCita({ ...formularioNuevaCita(), empleadoId: EMPLEADO_CERRADO, fechaHoraLocal: '2026-12-03T11:00', motivo: 'Periódico' })
    expect((await api.guardarCita(preparado.cita)).ok).toBe(true)
    const visitas = await api.consultarVisitasAdmin(EMPLEADO_CERRADO)
    const abierta = citaAbierta(visitas.datos, new Date('2026-11-25T18:00:00Z'))
    expect(aMexicoInput(abierta.fechaHora)).toBe('2026-12-03T11:00')
    expect(abierta.estadoAsistencia).toBe('programada')
  })

  it('no reprograma una cita cerrada', async () => {
    const preparado = prepararEdicionCita({ citaId: CITA_CERRADA_ID, empleadoId: EMPLEADO_CERRADO, fechaHoraLocal: '2026-12-01T10:15' })
    const resultado = await api.guardarCita(preparado.cita)
    expect(resultado.ok).toBe(false)
    expect(resultado.mensaje).toBe('La cita ya no se puede reprogramar.')
  })

  it('el doctor no puede editar la fecha de la cita', async () => {
    local.setItem('sisme.demo.sesion', DOCTOR_ID)
    const preparado = prepararEdicionCita({ citaId: CITA_PROGRAMADA_ID, empleadoId: EMPLEADO_PROGRAMADO, fechaHoraLocal: '2026-12-01T10:15' })
    const resultado = await api.guardarCita(preparado.cita)
    expect(resultado.ok).toBe(false)
  })
})

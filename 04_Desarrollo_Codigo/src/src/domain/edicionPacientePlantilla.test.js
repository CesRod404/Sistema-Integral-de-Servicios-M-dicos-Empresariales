// S7-T14: al editar un paciente y cambiarlo de empresa, los campos cambian a la
// plantilla vigente de la empresa nueva.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { agregarCampo, plantillaPredeterminada, validarPlantilla } from './plantillaEmpresa.js'
import { cambiarEmpresaPaciente, payloadEdicionPaciente, valoresDesdePaciente } from './plantillaCampos.js'
import { crearApiDemo } from '../datos/demoApi.js'

const EMPRESA_A = '00000000-0000-4000-8000-000000000010'
const EMPRESA_B = '00000000-0000-4000-8000-000000000011'
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

function plantillaCon(empresaId, version, ...etiquetas) {
  let columnas = plantillaPredeterminada(empresaId).columnas
  for (const etiqueta of etiquetas) columnas = agregarCampo(columnas, { etiqueta, tipo: 'texto' })
  return { empresaId, version, columnas: validarPlantilla(columnas).columnas }
}

const PACIENTE = {
  id: 'pac-1',
  nombre: 'Juan Pérez',
  empresaId: EMPRESA_A,
  estado: 'activo',
  curp: 'PEGJ910322HZSRRN03',
  claveEmpleado: 'A-01',
  edad: 35,
  datosExtra: { puesto: 'Soldador', area: 'Planta' }
}

describe('S7-T14 cambio de empresa en la edición del paciente', () => {
  it('conserva los campos con la misma clave y lista los que se quitan', () => {
    const anterior = plantillaCon(EMPRESA_A, 1, 'Puesto', 'Área')
    const nueva = plantillaCon(EMPRESA_B, 3, 'Área', 'Turno')
    const actuales = valoresDesdePaciente(anterior, PACIENTE)
    const { valores, descartados } = cambiarEmpresaPaciente({ valoresActuales: actuales, plantillaAnterior: anterior, plantillaNueva: nueva, paciente: PACIENTE })
    expect(valores.curp).toBe('PEGJ910322HZSRRN03')
    expect(valores.edad).toBe(35)
    expect(valores.area).toBe('Planta')
    expect(valores.turno).toBe('')
    expect('puesto' in valores).toBe(false)
    expect(descartados).toEqual(['Puesto'])
  })

  it('al guardar con la empresa nueva solo quedan las columnas personalizadas de su plantilla', () => {
    const nueva = plantillaCon(EMPRESA_B, 3, 'Área', 'Turno')
    const resultado = payloadEdicionPaciente({
      paciente: PACIENTE,
      nombre: 'Juan Pérez García',
      empresaId: EMPRESA_B,
      estado: 'activo',
      plantilla: nueva,
      valores: { curp: 'PEGJ910322HZSRRN03', clave_empleado: 'B-07', email: '', telefono: '', edad: '36', area: 'Planta', turno: 'Noche' }
    })
    expect(resultado.ok).toBe(true)
    expect(resultado.payload).toMatchObject({ id: 'pac-1', empresaId: EMPRESA_B, nombre: 'Juan Pérez García', claveEmpleado: 'B-07', edad: 36 })
    expect(resultado.payload.datosExtra).toEqual({ area: 'Planta', turno: 'Noche' })
  })

  it('sin cambio de empresa no se pierden datos extra fuera de la plantilla', () => {
    const misma = plantillaCon(EMPRESA_A, 2, 'Puesto')
    const resultado = payloadEdicionPaciente({ paciente: PACIENTE, nombre: PACIENTE.nombre, empresaId: EMPRESA_A, estado: 'activo', plantilla: misma, valores: { puesto: 'Supervisor' } })
    expect(resultado.ok).toBe(true)
    expect(resultado.payload.datosExtra).toEqual({ puesto: 'Supervisor', area: 'Planta' })
  })

  it('valida los campos de la plantilla nueva y la edad aunque la plantilla no la tenga', () => {
    const nueva = plantillaCon(EMPRESA_B, 1)
    const curpMal = payloadEdicionPaciente({ paciente: PACIENTE, nombre: 'Juan', empresaId: EMPRESA_B, plantilla: nueva, valores: { curp: 'XX' } })
    expect(curpMal.ok).toBe(false)
    expect(curpMal.mensaje).toMatch(/CURP/)
    const sinEdad = { ...nueva, columnas: nueva.columnas.filter((columna) => columna.clave !== 'edad') }
    const edadMal = payloadEdicionPaciente({ paciente: PACIENTE, nombre: 'Juan', empresaId: EMPRESA_B, plantilla: sinEdad, edad: '200', valores: {} })
    expect(edadMal.ok).toBe(false)
    const edadBien = payloadEdicionPaciente({ paciente: PACIENTE, nombre: 'Juan', empresaId: EMPRESA_B, plantilla: sinEdad, edad: '40', valores: {} })
    expect(edadBien.payload.edad).toBe(40)
  })
})

describe('S7-T14 edición con cambio de empresa en la API demo', () => {
  beforeEach(() => {
    const local = almacenamiento()
    vi.stubGlobal('localStorage', local)
    vi.stubGlobal('sessionStorage', almacenamiento())
    local.setItem('sisme.demo.sesion', ADMIN_ID)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('guarda al paciente con los campos de la empresa nueva', async () => {
    const api = crearApiDemo()
    const a = plantillaCon(EMPRESA_A, 0, 'Puesto')
    const b = plantillaCon(EMPRESA_B, 0, 'Turno')
    expect((await api.guardarPlantillaEmpresa(EMPRESA_A, a.columnas)).ok).toBe(true)
    expect((await api.guardarPlantillaEmpresa(EMPRESA_B, b.columnas)).ok).toBe(true)
    const alta = await api.guardarEmpleado({ nombre: 'Paciente Movido', empresaId: EMPRESA_A, estado: 'activo', datosExtra: { puesto: 'Operador' } })
    expect(alta.ok).toBe(true)
    const leido = await api.obtenerEmpleado(alta.datos.id)
    expect(leido.datos.datosExtra.puesto).toBe('Operador')
    const plantillaB = (await api.obtenerPlantillaEmpresa(EMPRESA_B)).datos
    const preparado = payloadEdicionPaciente({ paciente: leido.datos, nombre: 'Paciente Movido', empresaId: EMPRESA_B, estado: 'activo', plantilla: plantillaB, valores: { turno: 'Mañana' } })
    const guardado = await api.guardarEmpleado(preparado.payload)
    expect(guardado.ok).toBe(true)
    expect(guardado.datos.empresaId).toBe(EMPRESA_B)
    expect(guardado.datos.datosExtra).toEqual({ turno: 'Mañana' })
  })
})

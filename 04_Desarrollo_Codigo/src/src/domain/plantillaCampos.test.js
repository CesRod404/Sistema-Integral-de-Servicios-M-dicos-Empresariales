import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { agregarCampo, plantillaPredeterminada, validarPlantilla } from './plantillaEmpresa.js'
import { payloadAltaPaciente, resolverPlantilla, valoresDesdePaciente } from './plantillaCampos.js'
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
const EMPRESA_ID = '00000000-0000-4000-8000-000000000010'
const OTRA_EMPRESA_ID = '00000000-0000-4000-8000-000000000011'

function plantillaConPuesto(empresaId = EMPRESA_ID) {
  const columnas = agregarCampo(plantillaPredeterminada(empresaId).columnas, { etiqueta: 'Puesto', tipo: 'texto', obligatorio: true })
  return validarPlantilla(columnas).columnas
}

describe('S7-T11 campos de la plantilla en el alta', () => {
  it('al elegir empresa usa la plantilla vigente o la predeterminada', () => {
    expect(resolverPlantilla(null, EMPRESA_ID).predeterminada).toBe(true)
    const propia = { version: 2, columnas: plantillaConPuesto() }
    const resuelta = resolverPlantilla(propia, EMPRESA_ID)
    expect(resuelta.columnas.some((columna) => columna.clave === 'puesto')).toBe(true)
  })

  it('al cambiar de empresa los campos se reconstruyen', () => {
    const plantillaA = { columnas: plantillaConPuesto(EMPRESA_ID) }
    const plantillaB = plantillaPredeterminada(OTRA_EMPRESA_ID)
    const deA = valoresDesdePaciente(plantillaA, {})
    expect('puesto' in deA).toBe(true)
    const deB = valoresDesdePaciente(plantillaB, { nombre: 'Ana' })
    expect('puesto' in deB).toBe(false)
    expect(deB.nombre_completo).toBe('Ana')
    expect(deB.curp).toBe('')
  })

  it('arma el alta con campos base y personalizados, y rechaza un obligatorio vacío', () => {
    const plantilla = { columnas: plantillaConPuesto() }
    const ok = payloadAltaPaciente({
      empresaId: EMPRESA_ID,
      estado: 'provisional',
      plantilla,
      valores: {
        nombre_completo: 'Paciente Plantilla',
        curp: '',
        clave_empleado: 'FUT-99',
        email: '',
        telefono: '',
        edad: '27',
        puesto: 'Operador'
      }
    })
    expect(ok.ok).toBe(true)
    expect(ok.payload.id).toBeUndefined()
    expect(ok.payload.nombre).toBe('Paciente Plantilla')
    expect(ok.payload.edad).toBe(27)
    expect(ok.payload.datosExtra.puesto).toBe('Operador')

    const vacio = payloadAltaPaciente({
      empresaId: EMPRESA_ID,
      estado: 'provisional',
      plantilla,
      valores: { nombre_completo: 'Paciente Plantilla', puesto: '' }
    })
    expect(vacio.ok).toBe(false)
    expect(vacio.mensaje).toBe('El campo «Puesto» es obligatorio.')
  })
})

describe('S7-T11 alta con plantilla en la API demo', () => {
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

  it('el administrador guarda los campos de la plantilla vigente, incluidos los personalizados', async () => {
    const guardada = await api.guardarPlantillaEmpresa(EMPRESA_ID, plantillaConPuesto())
    expect(guardada.ok).toBe(true)
    const plantilla = await api.obtenerPlantillaEmpresa(EMPRESA_ID)
    const preparado = payloadAltaPaciente({
      empresaId: EMPRESA_ID,
      estado: 'provisional',
      plantilla: plantilla.datos,
      valores: {
        nombre_completo: 'Nuevo Con Plantilla',
        curp: '',
        clave_empleado: 'FUT-88',
        email: 'nuevo@industriasfutura.mx',
        telefono: '4921112233',
        edad: '41',
        puesto: 'Soldador'
      }
    })
    const alta = await api.guardarEmpleado(preparado.payload)
    expect(alta.ok).toBe(true)
    expect(alta.datos.edad).toBe(41)
    expect(alta.datos.claveEmpleado).toBe('FUT-88')
    expect(alta.datos.datosExtra.puesto).toBe('Soldador')
  })

  it('el doctor también consulta la plantilla y puede registrar al paciente con esos campos', async () => {
    await api.guardarPlantillaEmpresa(EMPRESA_ID, plantillaConPuesto())
    local.setItem('sisme.demo.sesion', DOCTOR_ID)
    const plantilla = await api.obtenerPlantillaEmpresa(EMPRESA_ID)
    expect(plantilla.ok).toBe(true)
    expect(plantilla.datos.columnas.some((columna) => columna.clave === 'puesto')).toBe(true)
    const preparado = payloadAltaPaciente({
      empresaId: EMPRESA_ID,
      estado: 'provisional',
      plantilla: plantilla.datos,
      valores: { nombre_completo: 'Alta Doctor', puesto: 'Auxiliar', clave_empleado: 'FUT-77' }
    })
    const alta = await api.guardarEmpleado(preparado.payload)
    expect(alta.ok).toBe(true)
    expect(alta.datos.datosExtra.puesto).toBe('Auxiliar')
  })
})

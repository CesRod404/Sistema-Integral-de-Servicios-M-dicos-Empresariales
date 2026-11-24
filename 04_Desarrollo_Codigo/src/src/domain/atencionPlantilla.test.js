import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { agregarCampo, plantillaPredeterminada, validarPlantilla } from './plantillaEmpresa.js'
import { payloadGuardarPaciente, resolverPlantilla, valoresDesdePaciente } from './atencionPlantilla.js'
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
const PACIENTE_ID = '00000000-0000-4000-8000-000000000020'
const CITA_PRESENTE_ID = '00000000-0000-4000-8000-000000000031'

function plantillaConPuesto() {
  const columnas = agregarCampo(plantillaPredeterminada(EMPRESA_ID).columnas, { etiqueta: 'Puesto', tipo: 'texto', obligatorio: true })
  return validarPlantilla(columnas).columnas
}

describe('S7-T10 campos de la plantilla en la atención', () => {
  it('usa la plantilla predeterminada cuando la empresa no tiene una propia', () => {
    const plantilla = resolverPlantilla(null, EMPRESA_ID)
    expect(plantilla.predeterminada).toBe(true)
    expect(plantilla.columnas.map((columna) => columna.clave)).toEqual([
      'nombre_completo', 'curp', 'clave_empleado', 'email', 'telefono', 'edad'
    ])
  })

  it('rellena los valores desde el paciente, incluidos los campos personalizados', () => {
    const plantilla = { columnas: plantillaConPuesto() }
    const valores = valoresDesdePaciente(plantilla, {
      nombre: 'Juan Pérez García',
      curp: 'PEGJ910322HZSRRN03',
      claveEmpleado: 'FUT-01',
      email: 'juan@empresa.mx',
      telefono: '4921232255',
      edad: 35,
      datosExtra: { puesto: 'Operador' }
    })
    expect(valores.nombre_completo).toBe('Juan Pérez García')
    expect(valores.edad).toBe(35)
    expect(valores.puesto).toBe('Operador')
  })

  it('arma el payload editable y rechaza un campo obligatorio vacío o un tipo inválido', () => {
    const plantilla = { columnas: plantillaConPuesto() }
    const paciente = { id: PACIENTE_ID, empresaId: EMPRESA_ID, estado: 'activo', nombre: 'Juan Pérez García', datosExtra: { puesto: 'Operador' } }
    const ok = payloadGuardarPaciente({
      paciente,
      plantilla,
      valores: {
        nombre_completo: 'Juan Pérez García',
        curp: 'PEGJ910322HZSRRN03',
        clave_empleado: 'FUT-01',
        email: 'juan@empresa.mx',
        telefono: '4921232255',
        edad: '36',
        puesto: 'Supervisor'
      }
    })
    expect(ok.ok).toBe(true)
    expect(ok.payload.edad).toBe(36)
    expect(ok.payload.datosExtra.puesto).toBe('Supervisor')

    const vacio = payloadGuardarPaciente({
      paciente,
      plantilla,
      valores: { nombre_completo: 'Juan Pérez García', puesto: '' }
    })
    expect(vacio.ok).toBe(false)
    expect(vacio.mensaje).toBe('El campo «Puesto» es obligatorio.')
  })
})

describe('S7-T10 el doctor ve y edita la plantilla vigente en la atención (API demo)', () => {
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

  it('muestra los campos de la plantilla vigente y permite editarlos al guardar la atención', async () => {
    const guardada = await api.guardarPlantillaEmpresa(EMPRESA_ID, plantillaConPuesto())
    expect(guardada.ok).toBe(true)

    const previo = await api.guardarEmpleado({
      id: PACIENTE_ID,
      nombre: 'Juan Pérez García',
      empresaId: EMPRESA_ID,
      estado: 'activo',
      curp: 'PEGJ910322HZSRRN03',
      claveEmpleado: 'FUT-01',
      email: 'juan.perez@industriasfutura.mx',
      telefono: '4921232255',
      edad: 35,
      datosExtra: { puesto: 'Operador' }
    })
    expect(previo.ok).toBe(true)
    expect(previo.datos.datosExtra.puesto).toBe('Operador')

    local.setItem('sisme.demo.sesion', DOCTOR_ID)
    const atencion = await api.obtenerAtencion(CITA_PRESENTE_ID)
    expect(atencion.ok).toBe(true)
    expect(atencion.datos.plantilla.version).toBe(guardada.datos.version)
    expect(atencion.datos.paciente.datosExtra.puesto).toBe('Operador')
    const valores = valoresDesdePaciente(atencion.datos.plantilla, atencion.datos.paciente)
    expect(valores.puesto).toBe('Operador')
    expect(valores.nombre_completo).toBe('Juan Pérez García')

    const preparado = payloadGuardarPaciente({
      paciente: atencion.datos.paciente,
      plantilla: atencion.datos.plantilla,
      valores: { ...valores, puesto: 'Supervisor', edad: '36' }
    })
    expect(preparado.ok).toBe(true)
    const actualizado = await api.guardarEmpleado(preparado.payload)
    expect(actualizado.ok).toBe(true)
    expect(actualizado.datos.edad).toBe(36)
    expect(actualizado.datos.datosExtra.puesto).toBe('Supervisor')
    expect(actualizado.datos.curp).toBe('PEGJ910322HZSRRN03')

    const recarga = await api.obtenerAtencion(CITA_PRESENTE_ID)
    expect(recarga.datos.paciente.datosExtra.puesto).toBe('Supervisor')
    expect(recarga.datos.paciente.edad).toBe(36)
  })

  it('el doctor puede consultar la plantilla vigente de la empresa', async () => {
    await api.guardarPlantillaEmpresa(EMPRESA_ID, plantillaConPuesto())
    local.setItem('sisme.demo.sesion', DOCTOR_ID)
    const plantilla = await api.obtenerPlantillaEmpresa(EMPRESA_ID)
    expect(plantilla.ok).toBe(true)
    expect(plantilla.datos.columnas.some((columna) => columna.clave === 'puesto')).toBe(true)
  })
})

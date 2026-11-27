// S7-T15: al editar la plantilla de una empresa se crea la versión siguiente y
// cada paciente muestra con qué versión se capturaron sus datos.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { agregarCampo, marcadorPlantilla, plantillaPredeterminada, validarPlantilla } from './plantillaEmpresa.js'
import { payloadAltaPaciente, payloadEdicionPaciente } from './plantillaCampos.js'
import { crearApiDemo } from '../datos/demoApi.js'

const EMPRESA_ID = '00000000-0000-4000-8000-000000000010'
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

function columnasCon(...etiquetas) {
  let columnas = plantillaPredeterminada(EMPRESA_ID).columnas
  for (const etiqueta of etiquetas) columnas = agregarCampo(columnas, { etiqueta, tipo: 'texto' })
  return validarPlantilla(columnas).columnas
}

describe('S7-T15 marcador de versión de plantilla', () => {
  it('muestra la versión y avisa si quedó desactualizada', () => {
    expect(marcadorPlantilla({ plantillaVersion: 2, plantillaVersionVigente: 2 })).toMatchObject({ texto: 'Plantilla v2', tono: 'azul', desactualizada: false })
    expect(marcadorPlantilla({ plantillaVersion: 1, plantillaVersionVigente: 3 })).toMatchObject({ texto: 'Plantilla v1 · vigente v3', tono: 'ambar', desactualizada: true })
    expect(marcadorPlantilla({ plantillaVersion: 0, plantillaVersionVigente: 0 })).toMatchObject({ texto: 'Predeterminada', desactualizada: false })
    expect(marcadorPlantilla({ plantillaVersion: 0, plantillaVersionVigente: 1 }).desactualizada).toBe(true)
    expect(marcadorPlantilla({ plantillaVersion: null }).texto).toBe('Sin versión')
  })

  it('el alta y la edición envían la versión de la plantilla usada', () => {
    const alta = payloadAltaPaciente({ empresaId: EMPRESA_ID, plantilla: { version: 4, columnas: columnasCon('Puesto') }, valores: { nombre_completo: 'Ana', puesto: 'Chofer' } })
    expect(alta.payload.plantillaVersion).toBe(4)
    const predeterminada = payloadAltaPaciente({ empresaId: EMPRESA_ID, plantilla: null, valores: { nombre_completo: 'Ana' } })
    expect(predeterminada.payload.plantillaVersion).toBe(0)
    const edicion = payloadEdicionPaciente({ paciente: { id: 'p', empresaId: EMPRESA_ID, nombre: 'Ana' }, nombre: 'Ana', empresaId: EMPRESA_ID, plantilla: { version: 5, columnas: columnasCon() }, valores: {} })
    expect(edicion.payload.plantillaVersion).toBe(5)
  })
})

describe('S7-T15 versión de plantilla en la API demo', () => {
  beforeEach(() => {
    const local = almacenamiento()
    vi.stubGlobal('localStorage', local)
    vi.stubGlobal('sessionStorage', almacenamiento())
    local.setItem('sisme.demo.sesion', ADMIN_ID)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('el paciente conserva su versión al editar la plantilla y se actualiza al guardarlo', async () => {
    const api = crearApiDemo()
    const v1 = await api.guardarPlantillaEmpresa(EMPRESA_ID, columnasCon('Puesto'))
    expect(v1.datos.version).toBe(1)
    const alta = await api.guardarEmpleado(payloadAltaPaciente({ empresaId: EMPRESA_ID, plantilla: v1.datos, valores: { nombre_completo: 'Paciente Versionado', puesto: 'Operador' } }).payload)
    expect(alta.datos.plantillaVersion).toBe(1)

    const v2 = await api.guardarPlantillaEmpresa(EMPRESA_ID, columnasCon('Puesto', 'Turno'))
    expect(v2.datos.version).toBe(2)
    let lista = await api.consultarPacientesAdmin()
    let fila = lista.datos.find((item) => item.id === alta.datos.id)
    expect(fila).toMatchObject({ plantillaVersion: 1, plantillaVersionVigente: 2 })
    expect(marcadorPlantilla(fila).desactualizada).toBe(true)

    const edicion = payloadEdicionPaciente({ paciente: alta.datos, nombre: alta.datos.nombre, empresaId: EMPRESA_ID, plantilla: v2.datos, valores: { puesto: 'Operador', turno: 'Noche' } })
    const guardado = await api.guardarEmpleado(edicion.payload)
    expect(guardado.datos.plantillaVersion).toBe(2)
    lista = await api.consultarPacientesAdmin()
    fila = lista.datos.find((item) => item.id === alta.datos.id)
    expect(marcadorPlantilla(fila)).toMatchObject({ texto: 'Plantilla v2', desactualizada: false })
  })

  it('rechaza una versión que no existe para la empresa', async () => {
    const api = crearApiDemo()
    const resultado = await api.guardarEmpleado({ nombre: 'X', empresaId: EMPRESA_ID, plantillaVersion: 7 })
    expect(resultado.ok).toBe(false)
  })
})

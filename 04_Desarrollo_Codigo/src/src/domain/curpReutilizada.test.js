// S7-T13: bug reportado el 25/11/2026 en la empresa «Cantera»: la columna CURP
// se renombró a «Mina a la que va» y el alta fallaba con
// «Mina a la que va: La CURP no tiene el formato de 18 caracteres.»
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MENSAJES_PLANTILLA,
  convertirCurpReutilizada,
  editarCampo,
  etiquetaEsCurp,
  plantillaPredeterminada,
  puedeQuitarse,
  quitarCampo,
  validarPlantilla
} from './plantillaEmpresa.js'
import { payloadAltaPaciente, resolverPlantilla } from './plantillaCampos.js'
import { payloadGuardarPaciente } from './atencionPlantilla.js'
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

// Plantilla tal como quedó guardada en Supabase (Cantera v2): clave «curp», nombre «MIna a la que va».
function plantillaCantera() {
  const columnas = editarCampo(plantillaPredeterminada(EMPRESA_ID).columnas, 'curp', { etiqueta: 'MIna a la que va' })
  return { id: 'p-2', empresaId: EMPRESA_ID, version: 2, columnas }
}

describe('S7-T13 columna CURP renombrada a otro dato', () => {
  it('reconoce cuándo el nombre de la columna sigue siendo CURP', () => {
    expect(etiquetaEsCurp('CURP')).toBe(true)
    expect(etiquetaEsCurp('CURP del trabajador')).toBe(true)
    expect(etiquetaEsCurp('Clave Única de Registro de Población')).toBe(true)
    expect(etiquetaEsCurp('MIna a la que va')).toBe(false)
  })

  it('reproduce el bug: el alta ya no valida «Mina a la que va» como CURP', () => {
    const resultado = payloadAltaPaciente({
      empresaId: EMPRESA_ID,
      estado: 'provisional',
      plantilla: plantillaCantera(),
      valores: { nombre_completo: 'Paciente Cantera', mina_a_la_que_va: 'Mina El Peñasco', clave_empleado: 'CAN-01' }
    })
    expect(resultado.ok).toBe(true)
    expect(resultado.payload.curp).toBeUndefined()
    expect(resultado.payload.datosExtra).toEqual({ mina_a_la_que_va: 'Mina El Peñasco' })
  })

  it('la columna convertida conserva nombre, orden y obligatoriedad', () => {
    const base = editarCampo(plantillaCantera().columnas, 'curp', { obligatorio: true })
    const { columnas, convertida } = convertirCurpReutilizada(base)
    expect(convertida).toMatchObject({ clave: 'mina_a_la_que_va', etiqueta: 'MIna a la que va', tipo: 'texto', obligatorio: true, orden: 2, personalizado: true })
    expect(columnas.some((columna) => columna.clave === 'curp')).toBe(false)
    const resuelta = resolverPlantilla({ version: 2, columnas: base }, EMPRESA_ID)
    expect(resuelta.columnas[1].clave).toBe('mina_a_la_que_va')
    const vacio = payloadGuardarPaciente({ paciente: { id: 'x', empresaId: EMPRESA_ID, nombre: 'A' }, plantilla: { columnas: base }, valores: { nombre_completo: 'A' } })
    expect(vacio.mensaje).toBe('El campo «MIna a la que va» es obligatorio.')
  })

  it('una columna CURP real sigue validando el formato de 18 caracteres', () => {
    const columnas = editarCampo(plantillaPredeterminada(EMPRESA_ID).columnas, 'curp', { etiqueta: 'CURP del trabajador' })
    const mal = payloadAltaPaciente({ empresaId: EMPRESA_ID, plantilla: { columnas }, valores: { nombre_completo: 'Ana', curp: 'Mina El Peñasco' } })
    expect(mal.ok).toBe(false)
    expect(mal.mensaje).toBe('CURP del trabajador: La CURP no tiene el formato de 18 caracteres.')
    const bien = payloadAltaPaciente({ empresaId: EMPRESA_ID, plantilla: { columnas }, valores: { nombre_completo: 'Ana', curp: 'pegj910322hzsrrn03' } })
    expect(bien.ok).toBe(true)
    expect(bien.payload.curp).toBe('PEGJ910322HZSRRN03')
  })

  it('al guardar la plantilla convierte la columna y avisa al administrador', () => {
    const validacion = validarPlantilla(plantillaCantera().columnas)
    expect(validacion.ok).toBe(true)
    expect(validacion.columnas.find((columna) => columna.clave === 'mina_a_la_que_va')).toMatchObject({ personalizado: true, tipo: 'texto' })
    expect(validacion.columnas.some((columna) => columna.clave === 'curp')).toBe(false)
    expect(validacion.avisos[0]).toMatch(/ya no es CURP/)
  })

  it('se puede quitar CURP o Clave de empleado, pero debe quedar uno de los dos', () => {
    const base = plantillaPredeterminada(EMPRESA_ID).columnas
    const curp = base.find((columna) => columna.clave === 'curp')
    expect(puedeQuitarse(curp, base)).toBe(true)
    const sinClave = quitarCampo(base, 'clave_empleado')
    expect(puedeQuitarse(curp, sinClave)).toBe(false)
    expect(puedeQuitarse(base[0], base)).toBe(false)
    const sinAmbos = base.filter((columna) => !['curp', 'clave_empleado'].includes(columna.clave))
    expect(validarPlantilla(sinAmbos).errores).toContain(MENSAJES_PLANTILLA.IDENTIFICADOR)
  })
})

describe('S7-T13 alta en la API demo con la plantilla de Cantera', () => {
  let local
  beforeEach(() => {
    local = almacenamiento()
    vi.stubGlobal('localStorage', local)
    vi.stubGlobal('sessionStorage', almacenamiento())
    local.setItem('sisme.demo.sesion', ADMIN_ID)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('guarda la plantilla y registra al paciente con la mina capturada', async () => {
    const api = crearApiDemo()
    const guardada = await api.guardarPlantillaEmpresa(EMPRESA_ID, plantillaCantera().columnas)
    expect(guardada.ok).toBe(true)
    const vigente = await api.obtenerPlantillaEmpresa(EMPRESA_ID)
    const preparado = payloadAltaPaciente({
      empresaId: EMPRESA_ID,
      estado: 'provisional',
      plantilla: vigente.datos,
      valores: { nombre_completo: 'Paciente Cantera', mina_a_la_que_va: 'Mina El Peñasco', clave_empleado: 'CAN-02' }
    })
    expect(preparado.ok).toBe(true)
    const alta = await api.guardarEmpleado(preparado.payload)
    expect(alta.ok).toBe(true)
    expect(alta.datos.datosExtra.mina_a_la_que_va).toBe('Mina El Peñasco')
    expect(alta.datos.curp).toBeNull()
  })
})

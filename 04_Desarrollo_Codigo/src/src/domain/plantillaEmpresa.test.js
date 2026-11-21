import { describe, expect, it } from 'vitest'
import {
  MENSAJES_PLANTILLA,
  agregarCampo,
  agregarCampoBase,
  claveDesdeEtiqueta,
  editarCampo,
  encabezadoDe,
  moverCampo,
  plantillaPredeterminada,
  quitarCampo,
  siguienteVersion,
  validarPlantilla
} from './plantillaEmpresa.js'
import { puedeAcceder } from './roles.js'

describe('CRQ-004 configuración de plantilla Excel por empresa', () => {
  it('la plantilla predeterminada conserva las columnas de siempre y solo el nombre es obligatorio', () => {
    const plantilla = plantillaPredeterminada('emp-1')
    expect(plantilla.version).toBe(0)
    expect(plantilla.columnas.map((columna) => columna.clave)).toEqual(['nombre_completo', 'curp', 'clave_empleado', 'email', 'telefono', 'edad'])
    expect(plantilla.columnas.filter((columna) => columna.obligatorio).map((columna) => columna.clave)).toEqual(['nombre_completo'])
    expect(validarPlantilla(plantilla.columnas).ok).toBe(true)
  })

  it('agrega, renombra, reordena, marca obligatoria y quita columnas personalizadas', () => {
    let columnas = plantillaPredeterminada().columnas
    columnas = agregarCampo(columnas, { etiqueta: 'Puesto', tipo: 'texto', obligatorio: true })
    columnas = agregarCampo(columnas, { etiqueta: 'Fecha de ingreso', tipo: 'fecha' })
    expect(columnas.at(-2)).toMatchObject({ clave: 'puesto', personalizado: true, obligatorio: true, orden: 7 })
    expect(columnas.at(-1)).toMatchObject({ clave: 'fecha_de_ingreso', tipo: 'fecha', orden: 8 })

    columnas = editarCampo(columnas, 'puesto', { etiqueta: 'Puesto actual', obligatorio: false })
    expect(columnas.find((c) => c.clave === 'puesto')).toMatchObject({ etiqueta: 'Puesto actual', obligatorio: false })

    columnas = moverCampo(columnas, 'puesto', -5)
    expect(columnas.map((c) => c.clave).slice(0, 2)).toEqual(['nombre_completo', 'puesto'])
    expect(columnas.map((c) => c.orden)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])

    columnas = quitarCampo(quitarCampo(columnas, 'edad'), 'fecha_de_ingreso')
    expect(columnas.map((c) => c.clave)).toEqual(['nombre_completo', 'puesto', 'curp', 'clave_empleado', 'email', 'telefono'])

    columnas = agregarCampoBase(columnas, 'edad')
    expect(columnas.at(-1)).toMatchObject({ clave: 'edad', tipo: 'numero', personalizado: false })

    const validacion = validarPlantilla(columnas)
    expect(validacion.ok).toBe(true)
    expect(validacion.columnas.map((c) => c.orden)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('protege nombre_completo, CURP y clave de empleado', () => {
    const base = plantillaPredeterminada().columnas
    expect(quitarCampo(base, 'nombre_completo')).toHaveLength(6)
    expect(quitarCampo(base, 'curp')).toHaveLength(6)
    expect(quitarCampo(base, 'clave_empleado')).toHaveLength(6)
    expect(editarCampo(base, 'nombre_completo', { obligatorio: false })[0].obligatorio).toBe(true)
    expect(editarCampo(base, 'curp', { obligatorio: true }).find((c) => c.clave === 'curp').obligatorio).toBe(true)
    expect(editarCampo(base, 'edad', { tipo: 'texto' }).find((c) => c.clave === 'edad').tipo).toBe('numero')

    const sinNombre = base.filter((c) => c.clave !== 'nombre_completo')
    expect(validarPlantilla(sinNombre).errores).toContain(MENSAJES_PLANTILLA.NOMBRE_OBLIGATORIO)
    const nombreOpcional = base.map((c) => (c.clave === 'nombre_completo' ? { ...c, obligatorio: false } : c))
    expect(validarPlantilla(nombreOpcional).errores).toContain(MENSAJES_PLANTILLA.NOMBRE_OBLIGATORIO)
    const sinCurp = base.filter((c) => c.clave !== 'curp')
    expect(validarPlantilla(sinCurp).errores).toContain(MENSAJES_PLANTILLA.IDENTIFICADOR)
  })

  it('rechaza nombres vacíos o repetidos, claves inválidas y tipos desconocidos', () => {
    const base = plantillaPredeterminada().columnas
    expect(validarPlantilla([]).errores).toContain(MENSAJES_PLANTILLA.SIN_COLUMNAS)
    expect(validarPlantilla([...base, { clave: 'puesto', etiqueta: '  ', tipo: 'texto', personalizado: true }]).errores).toContain(MENSAJES_PLANTILLA.ETIQUETA_VACIA)
    expect(validarPlantilla([...base, { clave: 'otro', etiqueta: 'curp', tipo: 'texto', personalizado: true }]).errores).toContain(MENSAJES_PLANTILLA.ETIQUETA_REPETIDA)
    expect(validarPlantilla([...base, { clave: 'Mal Clave', etiqueta: 'X', tipo: 'texto', personalizado: true }]).errores).toContain(MENSAJES_PLANTILLA.CLAVE_INVALIDA)
    expect(validarPlantilla([...base, { clave: 'curp', etiqueta: 'Otra', tipo: 'texto' }]).errores).toContain(MENSAJES_PLANTILLA.CLAVE_REPETIDA)
    expect(validarPlantilla([...base, { clave: 'turno', etiqueta: 'Turno', tipo: 'booleano', personalizado: true }]).errores).toContain(MENSAJES_PLANTILLA.TIPO_INVALIDO)
    expect(validarPlantilla(base.map((c) => (c.clave === 'edad' ? { ...c, tipo: 'texto' } : c))).errores).toContain(MENSAJES_PLANTILLA.TIPO_BASE)
    const muchas = [...base, ...Array.from({ length: 25 }, (_, i) => ({ clave: `c_${i}`, etiqueta: `C ${i}`, tipo: 'texto', personalizado: true }))]
    expect(validarPlantilla(muchas).errores).toContain(MENSAJES_PLANTILLA.DEMASIADAS)
  })

  it('genera claves internas únicas y legibles desde el nombre visible', () => {
    expect(claveDesdeEtiqueta('Área de trabajo')).toBe('area_de_trabajo')
    expect(claveDesdeEtiqueta('2do turno')).toBe('campo_2do_turno')
    const columnas = agregarCampo(agregarCampo(plantillaPredeterminada().columnas, { etiqueta: 'Turno' }), { etiqueta: 'turno!' })
    expect(columnas.slice(-2).map((c) => c.clave)).toEqual(['turno', 'turno_2'])
    expect(agregarCampo(plantillaPredeterminada().columnas, { etiqueta: 'Email' }).at(-1).clave).toBe('email_2')
  })

  it('cada guardado crea la versión siguiente y marca los encabezados obligatorios', () => {
    expect(siguienteVersion(null)).toBe(1)
    expect(siguienteVersion({ version: 0 })).toBe(1)
    expect(siguienteVersion({ version: 4 })).toBe(5)
    expect(encabezadoDe({ etiqueta: 'Puesto', obligatorio: true })).toBe('Puesto *')
    expect(encabezadoDe({ etiqueta: 'Turno', obligatorio: false })).toBe('Turno')
  })

  it('solo el Administrador entra a la configuración de plantillas', () => {
    expect(puedeAcceder('administrador', '/app/empresas/emp-1/plantilla')).toBe(true)
    expect(puedeAcceder('doctor', '/app/empresas/emp-1/plantilla')).toBe(false)
  })
})

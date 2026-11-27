import { describe, expect, it } from 'vitest'
import { MENSAJES_IMPORTACION } from './excelImport.js'
import { filasDesdeOperaciones } from './ingestaEmpleados.js'
import { ExcelIngestionValidator } from './excelIngestionValidator.js'

const EMPRESA = 'emp-1'

describe('C-03 ExcelIngestionValidator', () => {
  const validator = new ExcelIngestionValidator()

  it('se identifica como el componente C-03 del SDD', () => {
    expect(ExcelIngestionValidator.ID).toBe('C-03')
    expect(ExcelIngestionValidator.NOMBRE).toBe('ExcelIngestionValidator')
  })

  it('exige la columna de nombre y acepta un empleado solo con ese dato', () => {
    expect(validator.columnasFaltantes(validator.sugerirMapa(['Teléfono', 'Edad']))).toEqual(['nombre'])
    expect(validator.columnasFaltantes(validator.sugerirMapa(['Nombre completo', 'CURP']))).toEqual([])
    const valores = validator.aplicar(
      [{ 'Nombre completo': 'Luis Silva', CURP: '' }],
      validator.sugerirMapa(['Nombre completo', 'CURP'])
    )
    const vista = validator.vistaPrevia({ valores, empresaId: EMPRESA })
    expect(vista.filas[0].marca).toBe('valida')
    expect(vista.evaluacion.ok).toBe(true)
    expect(filasDesdeOperaciones(vista.evaluacion.operaciones)).toEqual([
      expect.objectContaining({ accion: 'insertar', nombre: 'Luis Silva', curp: null })
    ])
  })

  it('marca filas con error de formato, incompletas y duplicadas, y solo confirma lo válido', () => {
    const encabezados = ['Nombre', 'CURP', 'Edad']
    const mapa = validator.sugerirMapa(encabezados)
    const valores = validator.aplicar([
      { Nombre: 'Ana Ruiz', CURP: 'PEGJ910322HZSRRN03', Edad: 30 },
      { Nombre: 'Pedro Malo', CURP: 'XXX', Edad: 'no' },
      { Nombre: '', CURP: '', Edad: '' },
      { Nombre: 'María López', CURP: '', Edad: '' },
      { Nombre: 'Maria Lopez', CURP: '', Edad: '' }
    ], mapa)
    const vista = validator.vistaPrevia({
      valores,
      existentes: [{ id: 'ya', empresaId: EMPRESA, nombre: 'Ana Ruiz García', curp: 'PEGJ910322HZSRRN03' }],
      empresaId: EMPRESA
    })
    expect(vista.filas.map((fila) => fila.marca)).toEqual(['duplicado', 'error', 'error', 'duplicado', 'duplicado'])
    expect(vista.filas[1].camposConError).toEqual(expect.arrayContaining(['curp', 'edad']))
    expect(vista.filas[2].camposConError).toContain('nombre')
    expect(vista.resumen).toEqual({ total: 5, validas: 0, conError: 2, duplicadas: 3 })
    expect(vista.evaluacion.ok).toBe(false)
    expect(vista.evaluacion.mensajes).toEqual(expect.arrayContaining([
      MENSAJES_IMPORTACION.DUPLICADO_SIN_DECISION,
      MENSAJES_IMPORTACION.INCOMPLETO,
      MENSAJES_IMPORTACION.FORMATO
    ]))

    const corregida = validator.vistaPrevia({
      valores,
      existentes: [{ id: 'ya', empresaId: EMPRESA, nombre: 'Ana Ruiz García', curp: 'PEGJ910322HZSRRN03' }],
      empresaId: EMPRESA,
      decisiones: { 0: 'descartar', 1: 'descartar', 2: 'descartar', 3: 'conservar', 4: 'descartar' },
      sobrescribir: false
    })
    expect(corregida.evaluacion.ok).toBe(true)
    const confirmadas = filasDesdeOperaciones(corregida.evaluacion.operaciones)
    expect(confirmadas.filter((fila) => fila.accion === 'insertar').map((fila) => fila.nombre)).toEqual(['María López'])
    expect(confirmadas.filter((fila) => fila.accion === 'insertar').every((fila) => fila.curp == null && fila.nombre)).toBe(true)
    expect(confirmadas.some((fila) => fila.nombre === 'Pedro Malo' && fila.accion === 'insertar')).toBe(false)
  })
})

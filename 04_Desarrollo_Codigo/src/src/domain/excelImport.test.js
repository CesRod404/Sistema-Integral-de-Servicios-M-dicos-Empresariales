import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { aplicarMapa, clasificarFilas, evaluarConfirmacion, MENSAJES_IMPORTACION, sugerirMapa, validarExtension } from './excelImport.js'
import { leerHoja } from './excelArchivo.js'

async function libroDe(filas) {
  const libro = new ExcelJS.Workbook()
  const hoja = libro.addWorksheet('Empleados')
  filas.forEach((fila) => hoja.addRow(fila))
  return libro.xlsx.writeBuffer()
}

const EMPRESA = 'emp-1'

function clasificar(valores, existentes = []) {
  return clasificarFilas(valores, existentes, EMPRESA)
}

describe('importación Excel (RF-07 a RF-11)', () => {
  it('solo acepta .xlsx', () => {
    expect(validarExtension('lista.xlsx')).toBeNull()
    expect(validarExtension('lista.xls')).toMatch(/\.xlsx/)
  })

  it('mapea columnas, señala incompletos y detecta duplicados por CURP y por nombre', async () => {
    const buffer = await libroDe([
      ['Nombre completo', 'CURP', 'Correo', 'Teléfono', 'Edad'],
      ['Juan Pérez', 'PEGJ910322HZSRRN03', 'juan@futura.mx', '+52 492 123 2255', 35],
      ['', 'CURP-INVALIDA', 'mal', '12', 'x'],
      ['Juan Perez', '', '', '', '']
    ])
    const { encabezados, registros } = await leerHoja(buffer)
    const mapa = sugerirMapa(encabezados)
    expect(mapa.nombre).toBe('Nombre completo')
    expect(mapa.email).toBe('Correo')
    const filas = clasificar(aplicarMapa(registros, mapa), [
      { id: 'ya', empresaId: EMPRESA, nombre: 'Ana Torres', curp: 'PEGJ910322HZSRRN03', claveEmpleado: null }
    ])
    expect(filas[0].duplicadoBd?.id).toBe('ya')
    expect(filas[0].valores.telefono).toBe('4921232255')
    expect(filas[1].incompleta).toBe(true)
    expect(filas[1].errores.map((error) => error.campo)).toEqual(expect.arrayContaining(['curp', 'email', 'telefono', 'edad']))
    expect(filas[2].duplicadoArchivo).toBe(false)
    expect(filas[2].valores.nombre).toBe('Juan Perez')
  })

  it('bloquea la confirmación hasta corregir, descartar o confirmar la sobreescritura', () => {
    const filas = clasificar(
      [
        { nombre: 'Juan Pérez', curp: 'PEGJ910322HZSRRN03' },
        { nombre: '', curp: '' },
        { nombre: 'Luis Silva', curp: 'NO' }
      ],
      [{ id: 'existente', empresaId: EMPRESA, nombre: 'Juan Pérez García', curp: 'PEGJ910322HZSRRN03' }]
    )
    expect(evaluarConfirmacion(filas, {}, { sobrescribir: false }).codigos).toEqual(
      expect.arrayContaining(['DUPLICADO_SIN_DECISION', 'INCOMPLETO', 'FORMATO'])
    )
    const decisiones = { 0: 'actualizar', 1: 'descartar', 2: 'descartar' }
    expect(evaluarConfirmacion(filas, decisiones, { sobrescribir: false }).codigos).toContain('SOBRESCRITURA_NO_CONFIRMADA')
    const listo = evaluarConfirmacion(filas, decisiones, { sobrescribir: true })
    expect(listo.ok).toBe(true)
    expect(listo.operaciones.map((item) => item.accion)).toEqual(['actualizar', 'descartar', 'descartar'])
  })

  it('trata como duplicado el mismo nombre sin CURP dentro de la empresa y exige una sola conservación', () => {
    const filas = clasificar([
      { nombre: 'María López' },
      { nombre: 'Maria Lopez' }
    ])
    expect(filas.every((fila) => fila.duplicadoArchivo)).toBe(true)
    expect(evaluarConfirmacion(filas, { 0: 'conservar', 1: 'conservar' }).codigos).toContain('DUPLICADO_ARCHIVO')
    const resuelto = evaluarConfirmacion(filas, { 0: 'conservar', 1: 'descartar' })
    expect(resuelto.ok).toBe(true)
    expect(resuelto.operaciones.filter((item) => item.accion === 'insertar')).toHaveLength(1)
  })

  it('no confunde a dos personas de la misma empresa si la CURP es distinta', () => {
    const filas = clasificar(
      [{ nombre: 'Juan Pérez', curp: 'SILA870710HZSRRN02' }],
      [{ id: 'otro', empresaId: EMPRESA, nombre: 'Juan Pérez', curp: 'PEGJ910322HZSRRN03' }]
    )
    expect(filas[0].duplicadoBd).toBeNull()
  })

  it('clasifica 500 filas en menos de dos segundos (RNF-02)', () => {
    const valores = Array.from({ length: 500 }, (_, indice) => ({
      nombre: `Empleado ${indice}`,
      claveEmpleado: `C-${indice}`
    }))
    const inicio = performance.now()
    const filas = clasificar(valores)
    const evaluacion = evaluarConfirmacion(filas, {})
    const transcurrido = performance.now() - inicio
    expect(evaluacion.ok).toBe(true)
    expect(evaluacion.operaciones).toHaveLength(500)
    expect(transcurrido).toBeLessThan(2000)
  })

  it('los mensajes de validación no exponen códigos técnicos', () => {
    for (const mensaje of Object.values(MENSAJES_IMPORTACION)) {
      expect(mensaje).not.toMatch(/PGRST|SQLSTATE|500|stack/i)
    }
  })
})

import { describe, expect, it } from 'vitest'
import { aMexicoInput, desdeMexicoInput, hoyMexico } from './fecha.js'
import { mensajeAmigable } from './errores.js'
import { normalizarTelefono, validarContrasena, validarCurp, validarEmpresa, validarPdf } from './validadores.js'
import { puedeAcceder, puedeVerDiagnostico, puedeVerPrecios, ROLES, modulosPara, vistaEstudio, vistaExpediente } from './roles.js'
import { estaBloqueado, registrarFallo, reiniciarIntentos, solicitarCodigo, verificarCodigo } from './acceso.js'
import { cambiarAsistencia, columnaKanban, validarCierre } from './clinica.js'
import { aplicarPago, generarCargos, LEYENDA_REPORTE_PERIODO, reportePeriodo, saldoCargo } from './cobranza.js'

describe('fecha de la clínica (America/Mexico_City)', () => {
  it('convierte la hora local de Zacatecas a UTC', () => {
    expect(desdeMexicoInput('2026-10-26T09:00')).toBe('2026-10-26T15:00:00.000Z')
    expect(aMexicoInput('2026-10-26T15:00:00.000Z')).toBe('2026-10-26T09:00')
    expect(aMexicoInput('2026-10-26T06:00:00.000Z')).toBe('2026-10-26T00:00')
  })

  it('entrega el día de hoy con formato ISO', () => {
    expect(hoyMexico(new Date('2026-10-26T15:30:00.000Z'))).toBe('2026-10-26')
  })
})

describe('mensajes al usuario (RNF-08)', () => {
  it('oculta detalles técnicos y conserva el mensaje de negocio', () => {
    expect(mensajeAmigable(new Error('duplicate key value violates unique constraint'))).toBe(
      'No se pudo completar la operación. Revise los datos e intente de nuevo.'
    )
    expect(mensajeAmigable(new Error('SISME: El expediente está cerrado y no admite cambios.'))).toBe(
      'El expediente está cerrado y no admite cambios.'
    )
    expect(mensajeAmigable(new Error('TypeError: Failed to fetch'))).toBe('No hay conexión con el servidor. Intente de nuevo.')
  })
})

describe('validadores', () => {
  it('exige contraseña de 8 caracteres con letras y números (RNF-06)', () => {
    expect(validarContrasena('abc')).toMatch(/8 caracteres/)
    expect(validarContrasena('abcdefgh')).toMatch(/letras y números/)
    expect(validarContrasena('Admin1234')).toBeNull()
  })

  it('normaliza teléfono mexicano y CURP', () => {
    expect(normalizarTelefono('+52 492 123 2255')).toEqual({ valor: '4921232255' })
    expect(normalizarTelefono('123')).toMatchObject({ error: expect.any(String) })
    expect(validarCurp('pegj910322hzsrrn03')).toEqual({ valor: 'PEGJ910322HZSRRN03' })
    expect(validarCurp('NO-ES-CURP').error).toMatch(/CURP/)
  })

  it('exige contacto de empresa y limita el PDF a 5 MB (RNF-03)', () => {
    expect(validarEmpresa({ nombre: 'Futura', contacto: '', email: 'mal', telefono: '' }).contacto).toBeTruthy()
    expect(validarPdf({ name: 'estudio.pdf', type: 'application/pdf', size: 5 * 1024 * 1024 + 1 })).toMatch(/5 MB/)
    expect(validarPdf({ name: 'estudio.pdf', type: 'application/pdf', size: 2048 })).toBeNull()
  })
})

describe('roles RF-03 y RN-02', () => {
  it('reconoce exactamente Administrador y Doctor', () => {
    expect(ROLES).toEqual(['administrador', 'doctor'])
  })

  it('oculta cobranza, empresas, importación y precios al doctor', () => {
    const ids = modulosPara('doctor').map((modulo) => modulo.id)
    expect(ids).toEqual(['inicio', 'pacientes', 'citas'])
    expect(puedeVerPrecios('doctor')).toBe(false)
    expect(puedeVerPrecios('administrador')).toBe(true)
    expect(puedeAcceder('doctor', '/app/cobranza')).toBe(false)
    expect(puedeAcceder('doctor', '/app/importacion')).toBe(false)
    expect(puedeAcceder('administrador', '/app/cobranza')).toBe(true)
    expect(puedeAcceder('administrador', '/app/atencion/1')).toBe(false)
    expect(puedeAcceder('doctor', '/app/reportes')).toBe(false)
    expect(puedeAcceder('administrador', '/app/configuracion')).toBe(false)
  })

  it('quita el precio al doctor y el diagnóstico al administrador', () => {
    expect(vistaEstudio({ id: '1', nombre: 'Rayos X', precio: 300, vigente: true }, 'doctor')).toEqual({
      id: '1',
      nombre: 'Rayos X',
      vigente: true
    })
    expect(puedeVerDiagnostico('administrador')).toBe(false)
    const vista = vistaExpediente(
      {
        id: 'e1',
        citaId: 'c1',
        diagnostico: 'Apto',
        observaciones: 'Detalle clínico',
        archivos: [{ id: 'a1' }],
        estadoExpediente: 'cerrado',
        fechaAtencion: '2026-10-26T15:00:00.000Z',
        estudios: [{ id: 's1', nombre: 'Biometría hemática', precio: 250 }]
      },
      'administrador'
    )
    expect(vista.diagnostico).toBeUndefined()
    expect(vista.observaciones).toBeUndefined()
    expect(vista.archivos).toBeUndefined()
    expect(vista.estudios).toEqual([{ id: 's1', nombre: 'Biometría hemática' }])
  })
})

describe('acceso', () => {
  it('bloquea la cuenta al quinto intento y la libera al entrar (RNF-07)', () => {
    const ahora = new Date('2026-10-26T15:00:00.000Z')
    let perfil = { intentosFallidos: 0, bloqueadoHasta: null }
    for (let i = 0; i < 4; i += 1) perfil = registrarFallo(perfil, ahora)
    expect(perfil.bloqueado).toBe(false)
    perfil = registrarFallo(perfil, ahora)
    expect(perfil.bloqueado).toBe(true)
    expect(estaBloqueado(perfil, new Date(ahora.getTime() + 60 * 1000))).toBe(true)
    expect(reiniciarIntentos().intentosFallidos).toBe(0)
  })

  it('envía el código solo si el correo está registrado (RF-02)', () => {
    const ahora = new Date('2026-10-26T15:00:00.000Z')
    const usuarios = [{ email: 'admin@sisme.local' }]
    const conocido = solicitarCodigo(usuarios, 'admin@sisme.local', ahora, '123456')
    const desconocido = solicitarCodigo(usuarios, 'otro@sisme.local', ahora, '123456')
    expect(conocido.mensaje).toBe(desconocido.mensaje)
    expect(conocido.solicitud?.codigo).toBe('123456')
    expect(desconocido.solicitud).toBeNull()
    expect(verificarCodigo(conocido.solicitud, '000000', ahora).ok).toBe(false)
    expect(verificarCodigo(conocido.solicitud, '123456', ahora).ok).toBe(true)
  })
})

describe('asistencia y expediente', () => {
  it('solo el administrador marca presente o ausente (RF-13)', () => {
    const cita = { estadoAsistencia: 'programada' }
    expect(cambiarAsistencia(cita, 'presente', 'doctor').ok).toBe(false)
    expect(cambiarAsistencia(cita, 'ausente', 'administrador')).toEqual({ ok: true, estado: 'ausente' })
    expect(cambiarAsistencia({ estadoAsistencia: 'cerrada' }, 'presente', 'administrador').ok).toBe(false)
  })

  it('impide cerrar el expediente sin fecha o diagnóstico (RF-15)', () => {
    expect(validarCierre({ estadoAsistencia: 'presente', estadoExpediente: 'abierto', fechaAtencion: '', diagnostico: 'Apto' }).ok).toBe(false)
    expect(validarCierre({ estadoAsistencia: 'ausente', estadoExpediente: 'abierto', fechaAtencion: '2026-10-26', diagnostico: 'Apto' }).ok).toBe(false)
    expect(validarCierre({ estadoAsistencia: 'presente', estadoExpediente: 'abierto', fechaAtencion: '2026-10-26', diagnostico: 'Apto para el puesto' }).ok).toBe(true)
  })

  it('agrupa el tablero del doctor sin crear otro rol', () => {
    expect(columnaKanban({ estadoAsistencia: 'presente', estadoExpediente: null })).toBe('pendientes')
    expect(columnaKanban({ estadoAsistencia: 'presente', estadoExpediente: 'abierto' })).toBe('en_proceso')
    expect(columnaKanban({ estadoAsistencia: 'cerrada', estadoExpediente: 'cerrado' })).toBe('finalizado')
    expect(columnaKanban({ estadoAsistencia: 'ausente', estadoExpediente: null })).toBe('ausentes')
  })
})

describe('cobranza e histórico (RF-16 a RF-18)', () => {
  it('congela el precio aunque después cambie el catálogo', () => {
    const catalogo = [{ id: 'bio', nombre: 'Biometría hemática', precio: 200, vigente: true }]
    const [cargo] = generarCargos({
      empresaId: 'emp',
      citaId: 'cita',
      estudios: ['bio'],
      catalogo,
      fecha: '2026-10-01'
    })
    catalogo[0].precio = 250
    catalogo[0].nombre = 'Biometría actualizada'
    expect(cargo.precioHistorico).toBe(200)
    expect(cargo.concepto).toBe('Biometría hemática')
  })

  it('registra pago parcial y rechaza un abono mayor al saldo', () => {
    const cargo = { id: 'c1', precioHistorico: 250, empresaId: 'e1' }
    const parcial = aplicarPago(cargo, [], { monto: 100, referencia: 'SPEI-1', fecha: '2026-10-26' })
    expect(parcial.ok).toBe(true)
    expect(parcial.estatus).toBe('parcial')
    expect(saldoCargo(cargo, [{ cargoId: 'c1', monto: 100 }]).saldo).toBe(150)
    expect(aplicarPago(cargo, [{ monto: 100 }], { monto: 200, referencia: 'SPEI-2', fecha: '2026-10-26' }).ok).toBe(false)
  })

  it('marca el reporte de periodo como pendiente de validar contra el SRS', () => {
    const resultado = reportePeriodo({
      empresas: [{ id: 'e1', nombre: 'Industrias Futura' }],
      cargos: [{ id: 'c1', empresaId: 'e1', precioHistorico: 200, fechaCargo: '2026-10-10' }],
      pagos: [{ cargoId: 'c1', empresaId: 'e1', monto: 50, fecha: '2026-10-12' }],
      desde: '2026-10-01',
      hasta: '2026-10-31'
    })
    expect(resultado.leyenda).toBe('PENDIENTE DE VALIDAR CONTRA SRS')
    expect(LEYENDA_REPORTE_PERIODO).toBe('PENDIENTE DE VALIDAR CONTRA SRS')
    expect(resultado.filas[0]).toMatchObject({ cargos: 200, pagos: 50, saldo: 150 })
  })
})

import { desdeMexicoInput, hoyMexico } from '../domain/fecha.js'

const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

export function crearSemilla() {
  const hoy = hoyMexico()
  const hora = (hhmm) => desdeMexicoInput(`${hoy}T${hhmm}`)
  return {
    usuarios: [
      {
        id: uid(1),
        nombre: 'Administrador',
        email: 'admin@sisme.local',
        password: 'Admin1234',
        rol: 'administrador',
        intentosFallidos: 0,
        bloqueadoHasta: null
      },
      {
        id: uid(2),
        nombre: 'Consultorio médico',
        email: 'doctor@sisme.local',
        password: 'Doctor1234',
        rol: 'doctor',
        intentosFallidos: 0,
        bloqueadoHasta: null
      }
    ],
    empresas: [
      { id: uid(10), folio: 'EMP-001', nombre: 'Industrias Futura', contacto: 'Laura Méndez', email: 'laura@industriasfutura.mx', telefono: '4921232255', direccion: 'Parque industrial, Zacatecas', notas: '', estado: 'activo' },
      { id: uid(11), folio: 'EMP-002', nombre: 'Minera Zacatecas', contacto: 'Jorge Ramírez', email: 'jorge@minerazacatecas.mx', telefono: '4921592589', direccion: 'Fresnillo, Zacatecas', notas: '', estado: 'activo' },
      { id: uid(12), folio: 'EMP-003', nombre: 'Servicios Logísticos', contacto: 'Ana Torres', email: 'ana@servicioslogisticos.mx', telefono: '4924567896', direccion: 'Guadalupe, Zacatecas', notas: '', estado: 'activo' },
      { id: uid(13), folio: 'EMP-004', nombre: 'Transportes Siglo XXI', contacto: 'Luis Enríquez', email: 'luis@transportes.mx', telefono: '4921112233', direccion: 'Calera, Zacatecas', notas: '', estado: 'activo' },
      { id: uid(14), folio: 'EMP-005', nombre: 'Alimentos del Norte', contacto: 'Pedro Ríos', email: 'pedro@alimentos.mx', telefono: '4920001122', direccion: 'Jerez, Zacatecas', notas: 'Empresa dada de baja. Se conserva el historial.', estado: 'inactivo' }
    ],
    empleados: [
      { id: uid(20), folio: 'P-001', empresaId: uid(10), nombre: 'Juan Pérez García', curp: 'PEGJ910322HZSRRN03', claveEmpleado: 'FUT-01', email: 'juan.perez@industriasfutura.mx', telefono: '4921232255', edad: 35, estado: 'activo' },
      { id: uid(21), folio: 'P-002', empresaId: uid(11), nombre: 'María Ramírez', curp: 'RAMM980614MZSRRN08', claveEmpleado: 'MIN-14', email: 'maria.ramirez@minerazacatecas.mx', telefono: '4921592501', edad: 28, estado: 'activo' },
      { id: uid(22), folio: 'P-003', empresaId: uid(12), nombre: 'Ana Torres', curp: 'TOAA950201MZSRRN05', claveEmpleado: 'LOG-08', email: 'ana.torres@servicioslogisticos.mx', telefono: '4924567801', edad: 31, estado: 'activo' },
      { id: uid(23), folio: 'P-004', empresaId: uid(13), nombre: 'Luis Silva', curp: 'SILA870710HZSRRN02', claveEmpleado: 'TRA-03', email: 'luis.silva@transportes.mx', telefono: '4921112201', edad: 39, estado: 'activo' },
      { id: uid(24), folio: 'P-005', empresaId: uid(10), nombre: 'Carlos Martínez', curp: 'MACC880101HZSRRN07', claveEmpleado: 'FUT-09', email: 'carlos.martinez@industriasfutura.mx', telefono: '4921232209', edad: 38, estado: 'activo' },
      { id: uid(25), folio: 'P-006', empresaId: uid(11), nombre: 'Sofía Ramírez', curp: 'RASA930505MZSRRN04', claveEmpleado: 'MIN-22', email: 'sofia.ramirez@minerazacatecas.mx', telefono: '4921592522', edad: 33, estado: 'activo' }
    ],
    citas: [
      { id: uid(30), empleadoId: uid(24), fechaHora: hora('08:30'), estadoAsistencia: 'cerrada', motivo: 'Ingreso' },
      { id: uid(31), empleadoId: uid(20), fechaHora: hora('09:00'), estadoAsistencia: 'presente', motivo: 'Periódico' },
      { id: uid(32), empleadoId: uid(21), fechaHora: hora('09:30'), estadoAsistencia: 'programada', motivo: 'Ingreso' },
      { id: uid(33), empleadoId: uid(22), fechaHora: hora('11:00'), estadoAsistencia: 'ausente', motivo: 'Periódico' },
      { id: uid(34), empleadoId: uid(23), fechaHora: hora('13:00'), estadoAsistencia: 'presente', motivo: 'Seguimiento' },
      { id: uid(35), empleadoId: uid(25), fechaHora: hora('15:00'), estadoAsistencia: 'cerrada', motivo: 'Ingreso' }
    ],
    expedientes: [
      {
        id: uid(41),
        citaId: uid(30),
        doctorId: uid(2),
        diagnostico: 'Apto para el puesto de operador. Sin hallazgos relevantes.',
        observaciones: 'Exploración física sin datos patológicos.',
        fechaAtencion: hora('08:30'),
        estadoExpediente: 'cerrado',
        estudios: [uid(50)]
      },
      {
        id: uid(40),
        citaId: uid(31),
        doctorId: uid(2),
        diagnostico: '',
        observaciones: '',
        fechaAtencion: null,
        estadoExpediente: 'abierto',
        estudios: [uid(50)]
      },
      {
        id: uid(42),
        citaId: uid(35),
        doctorId: uid(2),
        diagnostico: 'Apto con observación de seguimiento auditivo.',
        observaciones: 'Se adjunta audiometría.',
        fechaAtencion: hora('15:00'),
        estadoExpediente: 'cerrado',
        estudios: [uid(51)]
      }
    ],
    archivos: [],
    estudios: [
      { id: uid(50), nombre: 'Biometría hemática', precio: 250, vigente: true },
      { id: uid(51), nombre: 'Química sanguínea', precio: 280, vigente: true },
      { id: uid(52), nombre: 'Examen general de orina', precio: 180, vigente: true },
      { id: uid(53), nombre: 'Perfil lipídico', precio: 320, vigente: true },
      { id: uid(54), nombre: 'Rayos X (tórax)', precio: 300, vigente: true },
      { id: uid(55), nombre: 'Electrocardiograma (ECG)', precio: 250, vigente: true },
      { id: uid(56), nombre: 'Audiometría', precio: 200, vigente: true },
      { id: uid(57), nombre: 'Espirometría', precio: 220, vigente: true }
    ],
    cargos: [
      {
        id: uid(60),
        empresaId: uid(10),
        citaId: uid(30),
        catalogoEstudioId: uid(50),
        concepto: 'Biometría hemática',
        precioHistorico: 200,
        estatus: 'pagado',
        fechaCargo: '2026-09-15T15:00:00.000Z'
      },
      {
        id: uid(61),
        empresaId: uid(11),
        citaId: uid(35),
        catalogoEstudioId: uid(51),
        concepto: 'Química sanguínea',
        precioHistorico: 280,
        estatus: 'pendiente',
        fechaCargo: hora('15:00')
      }
    ],
    pagos: [
      { id: uid(70), cargoId: uid(60), empresaId: uid(10), monto: 200, referencia: 'SPEI-DEMO-200', fecha: '2026-09-20' }
    ],
    importaciones: []
  }
}

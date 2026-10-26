import { reiniciarIntentos, registrarFallo, estaBloqueado, solicitarCodigo, verificarCodigo } from '../domain/acceso.js'
import { validarContrasena } from '../domain/validadores.js'
import { buscarDuplicado } from '../domain/excelImport.js'
import { cambiarAsistencia, cancelarCita, validarCierre } from '../domain/clinica.js'
import { aplicarPago, generarCargos, reportePeriodo } from '../domain/cobranza.js'
import { vistaEstudio, vistaExpediente } from '../domain/roles.js'
import { validarCita, validarEmpleado, validarEmpresa, validarEstudio, validarPdf, normalizarCorreo, normalizarTelefono, validarCurp, normalizarEdad } from '../domain/validadores.js'
import { desdeMexicoInput, hoyMexico } from '../domain/fecha.js'
import { crearSemilla } from './semilla.js'

const CLAVE = 'sisme.demo.v1'
const CLAVE_SESION = 'sisme.demo.sesion'
const codigos = new Map()
const archivosBinarios = new Map()

function puedePersistir() {
  return typeof localStorage !== 'undefined'
}

function cargar() {
  if (!puedePersistir()) return crearSemilla()
  const raw = localStorage.getItem(CLAVE)
  if (!raw) {
    const semilla = crearSemilla()
    localStorage.setItem(CLAVE, JSON.stringify(semilla))
    return semilla
  }
  return JSON.parse(raw)
}

function guardar(estado) {
  if (puedePersistir()) localStorage.setItem(CLAVE, JSON.stringify(estado))
}

function leerSesionId() {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(CLAVE_SESION) || sessionStorage.getItem(CLAVE_SESION)
}

function guardarSesion(id, recordarme) {
  localStorage.removeItem(CLAVE_SESION)
  sessionStorage.removeItem(CLAVE_SESION)
  const destino = recordarme ? localStorage : sessionStorage
  destino.setItem(CLAVE_SESION, id)
}

function borrarSesion() {
  localStorage.removeItem(CLAVE_SESION)
  sessionStorage.removeItem(CLAVE_SESION)
}

function publico(usuario) {
  if (!usuario) return null
  return { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol }
}

function mal(mensaje) {
  return { ok: false, mensaje }
}

function bien(datos) {
  return { ok: true, datos }
}

function folioSiguiente(lista, prefijo) {
  const numeros = lista.map((item) => Number(String(item.folio || '').replace(/\D/g, ''))).filter((n) => Number.isFinite(n))
  const siguiente = (numeros.length ? Math.max(...numeros) : 0) + 1
  return `${prefijo}-${String(siguiente).padStart(3, '0')}`
}

function exigir(usuario, roles) {
  if (!usuario || !roles.includes(usuario.rol)) return 'No tiene permiso para realizar esta acción.'
  return null
}

export function crearApiDemo() {
  const usuarioActual = () => {
    const estado = cargar()
    return publico(estado.usuarios.find((usuario) => usuario.id === leerSesionId()))
  }

  return {
    modo: 'demo',

    async obtenerSesion() {
      return bien(usuarioActual())
    },

    async iniciarSesion(email, password, recordarme = true) {
      const correo = normalizarCorreo(email)
      if (!correo || !password) return mal('Ingrese correo y contraseña.')
      const estado = cargar()
      const indice = estado.usuarios.findIndex((usuario) => usuario.email === correo)
      if (indice < 0) return mal('Correo o contraseña incorrectos.')
      const usuario = estado.usuarios[indice]
      if (estaBloqueado(usuario)) {
        return mal('La cuenta está bloqueada temporalmente. Intente de nuevo más tarde.')
      }
      if (usuario.password !== password) {
        const fallo = registrarFallo(usuario)
        usuario.intentosFallidos = fallo.intentosFallidos
        usuario.bloqueadoHasta = fallo.bloqueadoHasta
        guardar(estado)
        if (fallo.bloqueado) return mal('La cuenta se bloqueó temporalmente después de varios intentos fallidos.')
        return mal('Correo o contraseña incorrectos.')
      }
      const limpio = reiniciarIntentos()
      usuario.intentosFallidos = limpio.intentosFallidos
      usuario.bloqueadoHasta = limpio.bloqueadoHasta
      guardar(estado)
      guardarSesion(usuario.id, recordarme)
      return { ok: true, usuario: publico(usuario) }
    },

    async cerrarSesion() {
      borrarSesion()
      return bien(null)
    },

    async solicitarRecuperacion(email) {
      const estado = cargar()
      const codigo = String(Math.floor(100000 + Math.random() * 900000))
      const resultado = solicitarCodigo(estado.usuarios, email, new Date(), codigo)
      if (resultado.solicitud) codigos.set(resultado.solicitud.email, resultado.solicitud)
      return { ok: true, mensaje: resultado.mensaje, demoCodigo: resultado.solicitud ? codigo : undefined }
    },

    async confirmarRecuperacion({ email, codigo, password }) {
      const politica = validarContrasena(password)
      if (politica) return mal(politica)
      const correo = normalizarCorreo(email)
      const solicitud = codigos.get(correo) || codigos.get(email)
      const verificacion = verificarCodigo(solicitud, codigo)
      if (verificacion.solicitud) {
        if (verificacion.solicitud.usado && !verificacion.ok) codigos.delete(correo)
        else codigos.set(correo, verificacion.solicitud)
      }
      if (!verificacion.ok) return mal(verificacion.mensaje)
      const estado = cargar()
      const usuario = estado.usuarios.find((item) => item.email === correo)
      if (!usuario) return mal('El código no es válido o ya fue utilizado.')
      usuario.password = password
      const limpio = reiniciarIntentos()
      usuario.intentosFallidos = limpio.intentosFallidos
      usuario.bloqueadoHasta = limpio.bloqueadoHasta
      guardar(estado)
      codigos.delete(correo)
      return { ok: true, mensaje: 'La contraseña se actualizó. Ya puede iniciar sesión.' }
    },

    async listarEmpresas() {
      const usuario = usuarioActual()
      const permiso = exigir(usuario, ['administrador', 'doctor'])
      if (permiso) return mal(permiso)
      const estado = cargar()
      const empresas = estado.empresas.map((empresa) => ({ ...empresa }))
      if (usuario.rol !== 'administrador') {
        return bien(empresas.map(({ id, nombre, estado: est }) => ({ id, nombre, estado: est })))
      }
      return bien(empresas)
    },

    async guardarEmpresa(datos) {
      const permiso = exigir(usuarioActual(), ['administrador'])
      if (permiso) return mal(permiso)
      const errores = validarEmpresa(datos)
      if (Object.keys(errores).length) return mal(Object.values(errores)[0])
      const estado = cargar()
      const telefono = normalizarTelefono(datos.telefono).valor
      const duplicada = estado.empresas.find(
        (empresa) => empresa.nombre.trim().toLowerCase() === datos.nombre.trim().toLowerCase() && empresa.id !== datos.id
      )
      if (duplicada) return mal('Ya existe una empresa con ese nombre.')
      if (datos.id) {
        const actual = estado.empresas.find((empresa) => empresa.id === datos.id)
        if (!actual) return mal('La empresa no existe.')
        Object.assign(actual, {
          nombre: datos.nombre.trim(),
          contacto: datos.contacto.trim(),
          email: normalizarCorreo(datos.email),
          telefono,
          direccion: datos.direccion?.trim() || '',
          notas: datos.notas?.trim() || ''
        })
        guardar(estado)
        return bien(actual)
      }
      const empresa = {
        id: crypto.randomUUID(),
        folio: folioSiguiente(estado.empresas, 'EMP'),
        nombre: datos.nombre.trim(),
        contacto: datos.contacto.trim(),
        email: normalizarCorreo(datos.email),
        telefono,
        direccion: datos.direccion?.trim() || '',
        notas: datos.notas?.trim() || '',
        estado: 'activo'
      }
      estado.empresas.push(empresa)
      guardar(estado)
      return bien(empresa)
    },

    async cambiarEstadoEmpresa(id, nuevoEstado) {
      const permiso = exigir(usuarioActual(), ['administrador'])
      if (permiso) return mal(permiso)
      if (!['activo', 'inactivo'].includes(nuevoEstado)) return mal('El estado de la empresa no es válido.')
      const estado = cargar()
      const empresa = estado.empresas.find((item) => item.id === id)
      if (!empresa) return mal('La empresa no existe.')
      empresa.estado = nuevoEstado
      guardar(estado)
      return bien(empresa)
    },

    async listarEmpleados() {
      const usuario = usuarioActual()
      const permiso = exigir(usuario, ['administrador', 'doctor'])
      if (permiso) return mal(permiso)
      const estado = cargar()
      return bien(estado.empleados.map((empleado) => enriquecerEmpleado(estado, empleado)))
    },

    async guardarEmpleado(datos) {
      const permiso = exigir(usuarioActual(), ['administrador'])
      if (permiso) return mal(permiso)
      const errores = validarEmpleado(datos)
      if (Object.keys(errores).length) return mal(Object.values(errores)[0])
      const estado = cargar()
      const empresa = estado.empresas.find((item) => item.id === datos.empresaId)
      if (!empresa) return mal('Seleccione la empresa del paciente.')
      const curp = validarCurp(datos.curp).valor
      const ocupada = estado.empleados.find((item) => curp && item.curp === curp && item.id !== datos.id)
      if (ocupada) return mal('La CURP ya está registrada. Revise si el paciente es un duplicado.')
      const telefono = normalizarTelefono(datos.telefono).valor
      const edad = normalizarEdad(datos.edad).valor
      if (datos.id) {
        const actual = estado.empleados.find((item) => item.id === datos.id)
        if (!actual) return mal('El paciente no existe.')
        Object.assign(actual, {
          nombre: datos.nombre.trim(),
          empresaId: datos.empresaId,
          curp,
          claveEmpleado: datos.claveEmpleado?.trim() || null,
          email: datos.email ? normalizarCorreo(datos.email) : null,
          telefono,
          edad,
          estado: datos.estado || actual.estado
        })
        guardar(estado)
        return bien(enriquecerEmpleado(estado, actual))
      }
      const empleado = {
        id: crypto.randomUUID(),
        folio: folioSiguiente(estado.empleados, 'P'),
        empresaId: datos.empresaId,
        nombre: datos.nombre.trim(),
        curp,
        claveEmpleado: datos.claveEmpleado?.trim() || null,
        email: datos.email ? normalizarCorreo(datos.email) : null,
        telefono,
        edad,
        estado: 'provisional'
      }
      estado.empleados.push(empleado)
      guardar(estado)
      return bien(enriquecerEmpleado(estado, empleado))
    },

    async listarCitas(fecha) {
      const usuario = usuarioActual()
      const permiso = exigir(usuario, ['administrador', 'doctor'])
      if (permiso) return mal(permiso)
      const estado = cargar()
      const citas = estado.citas
        .filter((cita) => !fecha || diaDeCita(cita.fechaHora) === fecha)
        .map((cita) => vistaCita(estado, cita))
        .sort((a, b) => a.fechaHora.localeCompare(b.fechaHora))
      return bien(citas)
    },

    async guardarCita(datos) {
      const usuario = usuarioActual()
      const permiso = exigir(usuario, ['administrador'])
      if (permiso) return mal(permiso)
      const fechaHora = desdeMexicoInput(datos.fechaHoraLocal)
      const error = validarCita({ empleadoId: datos.empleadoId, fechaHora })
      if (error) return mal(error)
      const estado = cargar()
      const empleado = estado.empleados.find((item) => item.id === datos.empleadoId)
      if (!empleado || empleado.estado === 'inactivo') return mal('Seleccione un empleado activo ya registrado.')
      const empresa = estado.empresas.find((item) => item.id === empleado.empresaId)
      if (!empresa || empresa.estado !== 'activo') return mal('No se agendan citas de una empresa inactiva.')
      if (datos.id) {
        const cita = estado.citas.find((item) => item.id === datos.id)
        if (!cita) return mal('La cita no existe.')
        if (['cerrada', 'cancelada'].includes(cita.estadoAsistencia)) return mal('La cita ya no se puede reprogramar.')
        const cambiaFecha = cita.fechaHora !== fechaHora
        cita.empleadoId = datos.empleadoId
        cita.fechaHora = fechaHora
        cita.motivo = datos.motivo?.trim() || ''
        if (cambiaFecha) cita.estadoAsistencia = 'programada'
        guardar(estado)
        return bien(vistaCita(estado, cita))
      }
      const cita = {
        id: crypto.randomUUID(),
        empleadoId: datos.empleadoId,
        fechaHora,
        estadoAsistencia: 'programada',
        motivo: datos.motivo?.trim() || ''
      }
      estado.citas.push(cita)
      guardar(estado)
      return bien(vistaCita(estado, cita))
    },

    async registrarAsistencia(citaId, nuevoEstado) {
      const usuario = usuarioActual()
      const estado = cargar()
      const cita = estado.citas.find((item) => item.id === citaId)
      const resultado = cambiarAsistencia(cita, nuevoEstado, usuario?.rol)
      if (!resultado.ok) return mal(resultado.mensaje)
      cita.estadoAsistencia = resultado.estado
      guardar(estado)
      return bien(vistaCita(estado, cita))
    },

    async cancelarCita(citaId) {
      const usuario = usuarioActual()
      const estado = cargar()
      const cita = estado.citas.find((item) => item.id === citaId)
      const resultado = cancelarCita(cita, usuario?.rol)
      if (!resultado.ok) return mal(resultado.mensaje)
      cita.estadoAsistencia = resultado.estado
      guardar(estado)
      return bien(vistaCita(estado, cita))
    },

    async obtenerAtencion(citaId) {
      const usuario = usuarioActual()
      const permiso = exigir(usuario, ['administrador', 'doctor'])
      if (permiso) return mal(permiso)
      const estado = cargar()
      const atencion = armarAtencion(estado, citaId, usuario.rol)
      if (!atencion) return mal('La cita no existe.')
      return bien(atencion)
    },

    async guardarAtencion(citaId, datos) {
      const usuario = usuarioActual()
      const permiso = exigir(usuario, ['doctor'])
      if (permiso) return mal(permiso)
      const estado = cargar()
      const cita = estado.citas.find((item) => item.id === citaId)
      if (!cita) return mal('La cita no existe.')
      if (cita.estadoAsistencia !== 'presente') return mal('Solo se captura la atención de un paciente presente.')
      let expediente = estado.expedientes.find((item) => item.citaId === citaId)
      if (expediente?.estadoExpediente === 'cerrado') return mal('El expediente está cerrado y no admite cambios.')
      const estudios = datos.estudios || []
      const invalidos = estudios.filter((id) => !estado.estudios.some((item) => item.id === id && item.vigente))
      if (invalidos.length) return mal('Uno de los estudios no está vigente.')
      if (!expediente) {
        expediente = {
          id: crypto.randomUUID(),
          citaId,
          doctorId: usuario.id,
          diagnostico: '',
          observaciones: '',
          fechaAtencion: null,
          estadoExpediente: 'abierto',
          estudios: []
        }
        estado.expedientes.push(expediente)
      }
      expediente.diagnostico = datos.diagnostico?.trim() || ''
      expediente.observaciones = datos.observaciones?.trim() || ''
      expediente.fechaAtencion = datos.fechaAtencionLocal ? desdeMexicoInput(`${datos.fechaAtencionLocal}T00:00`) : null
      expediente.estudios = estudios
      guardar(estado)
      return bien(armarAtencion(estado, citaId, 'doctor'))
    },

    async subirPdf(expedienteId, archivo) {
      const permiso = exigir(usuarioActual(), ['doctor'])
      if (permiso) return mal(permiso)
      const error = validarPdf(archivo)
      if (error) return mal(error)
      const estado = cargar()
      const expediente = estado.expedientes.find((item) => item.id === expedienteId)
      if (!expediente) return mal('El expediente no existe.')
      if (expediente.estadoExpediente !== 'abierto') return mal('El expediente está cerrado y no admite archivos.')
      const registro = {
        id: crypto.randomUUID(),
        expedienteId,
        nombre: archivo.name,
        tamano: archivo.size
      }
      estado.archivos.push(registro)
      archivosBinarios.set(registro.id, archivo)
      guardar(estado)
      return bien({ id: registro.id, nombre: registro.nombre, tamano: registro.tamano })
    },

    async abrirPdf(archivoId) {
      const permiso = exigir(usuarioActual(), ['doctor'])
      if (permiso) return mal(permiso)
      const archivo = archivosBinarios.get(archivoId)
      if (!archivo) return mal('El archivo no está disponible en esta sesión. Las ligas de los PDF son temporales.')
      return bien({ url: URL.createObjectURL(archivo), nombre: archivo.name })
    },

    async cerrarExpediente(expedienteId) {
      const permiso = exigir(usuarioActual(), ['doctor'])
      if (permiso) return mal(permiso)
      const estado = cargar()
      const expediente = estado.expedientes.find((item) => item.id === expedienteId)
      if (!expediente) return mal('El expediente no existe.')
      const cita = estado.citas.find((item) => item.id === expediente.citaId)
      const validacion = validarCierre({
        fechaAtencion: expediente.fechaAtencion,
        diagnostico: expediente.diagnostico,
        estadoAsistencia: cita?.estadoAsistencia,
        estadoExpediente: expediente.estadoExpediente
      })
      if (!validacion.ok) return mal(validacion.mensaje)
      const empleado = estado.empleados.find((item) => item.id === cita.empleadoId)
      let cargos = []
      try {
        cargos = generarCargos({
          empresaId: empleado.empresaId,
          citaId: cita.id,
          estudios: expediente.estudios,
          catalogo: estado.estudios,
          fecha: expediente.fechaAtencion
        })
      } catch (error) {
        return mal(error.message.replace('SISME: ', ''))
      }
      expediente.estadoExpediente = 'cerrado'
      cita.estadoAsistencia = 'cerrada'
      estado.cargos.push(...cargos)
      guardar(estado)
      return bien(armarAtencion(estado, cita.id, 'doctor'))
    },

    async listarEstudios() {
      const usuario = usuarioActual()
      const permiso = exigir(usuario, ['administrador', 'doctor'])
      if (permiso) return mal(permiso)
      const estado = cargar()
      return bien(estado.estudios.filter((estudio) => usuario.rol === 'administrador' || estudio.vigente).map((estudio) => vistaEstudio(estudio, usuario.rol)))
    },

    async guardarEstudio(datos) {
      const permiso = exigir(usuarioActual(), ['administrador'])
      if (permiso) return mal(permiso)
      const errores = validarEstudio(datos)
      if (Object.keys(errores).length) return mal(Object.values(errores)[0])
      const estado = cargar()
      const nombre = datos.nombre.trim()
      const duplicado = estado.estudios.find((item) => item.nombre.toLowerCase() === nombre.toLowerCase() && item.id !== datos.id)
      if (duplicado) return mal('Ya existe un estudio con ese nombre.')
      if (datos.id) {
        const actual = estado.estudios.find((item) => item.id === datos.id)
        if (!actual) return mal('El estudio no existe.')
        actual.nombre = nombre
        actual.precio = Number(datos.precio)
        actual.vigente = Boolean(datos.vigente)
        guardar(estado)
        return bien(vistaEstudio(actual, 'administrador'))
      }
      const estudio = { id: crypto.randomUUID(), nombre, precio: Number(datos.precio), vigente: datos.vigente !== false }
      estado.estudios.push(estudio)
      guardar(estado)
      return bien(vistaEstudio(estudio, 'administrador'))
    },

    async listarCargos() {
      const permiso = exigir(usuarioActual(), ['administrador'])
      if (permiso) return mal(permiso)
      const estado = cargar()
      return bien({
        cargos: estado.cargos.map((cargo) => vistaCargo(estado, cargo)),
        pagos: estado.pagos.map((pago) => ({ ...pago }))
      })
    },

    async registrarPago(datos) {
      const permiso = exigir(usuarioActual(), ['administrador'])
      if (permiso) return mal(permiso)
      const estado = cargar()
      const cargo = estado.cargos.find((item) => item.id === datos.cargoId)
      if (!cargo) return mal('El cargo no existe.')
      const pagos = estado.pagos.filter((pago) => pago.cargoId === cargo.id)
      const resultado = aplicarPago(cargo, pagos, datos)
      if (!resultado.ok) return mal(resultado.mensaje)
      estado.pagos.push({
        id: crypto.randomUUID(),
        cargoId: cargo.id,
        empresaId: cargo.empresaId,
        monto: resultado.pago.monto,
        referencia: resultado.pago.referencia,
        fecha: resultado.pago.fecha
      })
      cargo.estatus = resultado.estatus
      guardar(estado)
      return bien(vistaCargo(estado, cargo))
    },

    async reportePeriodo(desde, hasta) {
      const permiso = exigir(usuarioActual(), ['administrador'])
      if (permiso) return mal(permiso)
      const estado = cargar()
      return bien(reportePeriodo({ empresas: estado.empresas, cargos: estado.cargos, pagos: estado.pagos, desde, hasta }))
    },

    async confirmarImportacion({ empresaId, nombreArchivo, sobrescribir, filas }) {
      const usuario = usuarioActual()
      const permiso = exigir(usuario, ['administrador'])
      if (permiso) return mal(permiso)
      const estado = cargar()
      const empresa = estado.empresas.find((item) => item.id === empresaId)
      if (!empresa || empresa.estado !== 'activo') return mal('Seleccione una empresa activa.')
      if (!Array.isArray(filas) || !filas.length) return mal('El archivo no contiene registros para importar.')
      const claves = new Map()
      let insertados = 0
      let actualizados = 0
      let descartados = 0
      for (const fila of filas) {
        if (fila.accion === 'descartar') {
          descartados += 1
          continue
        }
        const valores = {
          nombre: String(fila.nombre || '').trim(),
          curp: fila.curp || null,
          claveEmpleado: fila.clave_empleado || null,
          email: fila.email || null,
          telefono: fila.telefono || null,
          edad: fila.edad ?? null,
          empresaId
        }
        if (!valores.nombre) return mal('Hay registros incompletos. La importación no se confirmó.')
        const clave = valores.curp ? `curp:${valores.curp}` : valores.claveEmpleado ? `clave:${valores.claveEmpleado}` : `nombre:${valores.nombre.toLowerCase()}`
        claves.set(clave, (claves.get(clave) || 0) + 1)
        if (claves.get(clave) > 1) return mal('Hay duplicados dentro del archivo. Conserve un solo registro de cada grupo y descarte el resto.')
        const duplicado = buscarDuplicado(valores, estado.empleados)
        if (fila.accion === 'actualizar') {
          if (!sobrescribir) return mal('La actualización de registros existentes requiere su confirmación explícita.')
          if (!duplicado) return mal('No se encontró el registro a actualizar.')
          const actual = estado.empleados.find((item) => item.id === duplicado.id)
          actual.nombre = valores.nombre
          actual.curp = valores.curp || actual.curp
          actual.claveEmpleado = valores.claveEmpleado || actual.claveEmpleado
          actual.email = valores.email || actual.email
          actual.telefono = valores.telefono || actual.telefono
          actual.edad = valores.edad ?? actual.edad
          actualizados += 1
        } else if (duplicado) {
          return mal('Hay duplicados sin decisión. La importación no se confirmó.')
        } else {
          estado.empleados.push({
            id: crypto.randomUUID(),
            folio: folioSiguiente(estado.empleados, 'P'),
            empresaId,
            nombre: valores.nombre,
            curp: valores.curp,
            claveEmpleado: valores.claveEmpleado,
            email: valores.email,
            telefono: valores.telefono,
            edad: valores.edad,
            estado: 'provisional'
          })
          insertados += 1
        }
      }
      estado.importaciones.unshift({
        id: crypto.randomUUID(),
        empresaId,
        nombreArchivo: nombreArchivo || 'lista.xlsx',
        totalFilas: filas.length,
        insertados,
        actualizados,
        descartados,
        fecha: new Date().toISOString()
      })
      guardar(estado)
      return bien({ insertados, actualizados, descartados })
    },

    async listarImportaciones() {
      const permiso = exigir(usuarioActual(), ['administrador'])
      if (permiso) return mal(permiso)
      const estado = cargar()
      return bien(estado.importaciones.map((item) => ({
        ...item,
        empresa: estado.empresas.find((empresa) => empresa.id === item.empresaId)?.nombre || '—'
      })))
    },

    async consultarPacientesAdmin() {
      const permiso = exigir(usuarioActual(), ['administrador'])
      if (permiso) return mal(permiso)
      const estado = cargar()
      const pacientes = estado.empleados.map((empleado) => {
        const visitas = estado.citas.filter((cita) => cita.empleadoId === empleado.id).sort((a, b) => b.fechaHora.localeCompare(a.fechaHora))
        const ultima = visitas[0]
        const expediente = ultima ? estado.expedientes.find((item) => item.citaId === ultima.id) : null
        const nombres = (expediente?.estudios || [])
          .map((id) => estado.estudios.find((estudio) => estudio.id === id)?.nombre)
          .filter(Boolean)
        return {
          ...enriquecerEmpleado(estado, empleado),
          estadoCita: ultima?.estadoAsistencia || null,
          ultimaCita: ultima?.fechaHora || null,
          estadoExpediente: expediente?.estadoExpediente || null,
          fechaAtencion: expediente?.fechaAtencion || null,
          estudiosNombres: nombres.join(', ')
        }
      })
      return bien(pacientes)
    },

    async consultarVisitasAdmin(empleadoId) {
      const permiso = exigir(usuarioActual(), ['administrador'])
      if (permiso) return mal(permiso)
      const estado = cargar()
      const visitas = estado.citas
        .filter((cita) => cita.empleadoId === empleadoId)
        .sort((a, b) => b.fechaHora.localeCompare(a.fechaHora))
        .map((cita) => {
          const expediente = estado.expedientes.find((item) => item.citaId === cita.id)
          const estudios = (expediente?.estudios || [])
            .map((id) => estado.estudios.find((estudio) => estudio.id === id)?.nombre)
            .filter(Boolean)
          return {
            citaId: cita.id,
            fechaHora: cita.fechaHora,
            estadoAsistencia: cita.estadoAsistencia,
            motivo: cita.motivo,
            estadoExpediente: expediente?.estadoExpediente || null,
            fechaAtencion: expediente?.fechaAtencion || null,
            estudiosNombres: estudios.join(', ')
          }
        })
      return bien(visitas)
    },

    suscribirCitas(callback) {
      const id = setInterval(callback, 4000)
      return () => clearInterval(id)
    }
  }
}

function diaDeCita(iso) {
  const fecha = new Date(iso)
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).format(fecha)
  return partes
}

function enriquecerEmpleado(estado, empleado) {
  const empresa = estado.empresas.find((item) => item.id === empleado.empresaId)
  return { ...empleado, empresaNombre: empresa?.nombre || '—' }
}

function vistaCita(estado, cita) {
  const empleado = estado.empleados.find((item) => item.id === cita.empleadoId)
  const empresa = estado.empresas.find((item) => item.id === empleado?.empresaId)
  const expediente = estado.expedientes.find((item) => item.citaId === cita.id)
  return {
    id: cita.id,
    empleadoId: cita.empleadoId,
    empleadoNombre: empleado?.nombre || '—',
    empresaId: empleado?.empresaId || null,
    empresaNombre: empresa?.nombre || '—',
    fechaHora: cita.fechaHora,
    estadoAsistencia: cita.estadoAsistencia,
    motivo: cita.motivo || '',
    expedienteId: expediente?.id || null,
    estadoExpediente: expediente?.estadoExpediente || null
  }
}

function armarAtencion(estado, citaId, rol) {
  const cita = estado.citas.find((item) => item.id === citaId)
  if (!cita) return null
  const vista = vistaCita(estado, cita)
  const expediente = estado.expedientes.find((item) => item.citaId === citaId)
  if (!expediente) return { cita: vista, expediente: null }
  const detalle = {
    id: expediente.id,
    citaId: expediente.citaId,
    estadoExpediente: expediente.estadoExpediente,
    fechaAtencion: expediente.fechaAtencion,
    diagnostico: expediente.diagnostico,
    observaciones: expediente.observaciones,
    estudios: (expediente.estudios || []).map((id) => ({
      id,
      nombre: estado.estudios.find((estudio) => estudio.id === id)?.nombre || 'Estudio'
    })),
    archivos: estado.archivos
      .filter((archivo) => archivo.expedienteId === expediente.id)
      .map((archivo) => ({ id: archivo.id, nombre: archivo.nombre, tamano: archivo.tamano }))
  }
  return { cita: vista, expediente: vistaExpediente(detalle, rol) }
}

function vistaCargo(estado, cargo) {
  const empresa = estado.empresas.find((item) => item.id === cargo.empresaId)
  const cita = estado.citas.find((item) => item.id === cargo.citaId)
  const empleado = estado.empleados.find((item) => item.id === cita?.empleadoId)
  return {
    ...cargo,
    empresaNombre: empresa?.nombre || '—',
    pacienteNombre: empleado?.nombre || '—'
  }
}

export function hoyDemo() {
  return hoyMexico()
}

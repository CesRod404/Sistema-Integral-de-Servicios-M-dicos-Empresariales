import { supabase } from './supabaseCliente.js'
import { mensajeAmigable } from '../domain/errores.js'
import { validarContrasena, validarCorreo, validarCurp, normalizarCorreo, validarEmpresa, validarEmpleado, validarEstudio, validarPdf, normalizarTelefono, normalizarEdad } from '../domain/validadores.js'
import { desdeMexicoInput } from '../domain/fecha.js'
import { vistaEstudio } from '../domain/roles.js'
import { reportePeriodo as armarReporte } from '../domain/cobranza.js'
import { armarRpcImportarEmpleados } from '../domain/ingestaEmpleados.js'

function mal(mensaje) {
  return { ok: false, mensaje }
}
function bien(datos) {
  return { ok: true, datos }
}
function fallo(error) {
  return mal(mensajeAmigable(error))
}

let cache = null

async function perfilDe(userId) {
  const { data, error } = await supabase.from('perfiles').select('id, nombre, email, rol').eq('id', userId).maybeSingle()
  if (error || !data || !['administrador', 'doctor'].includes(data.rol)) return null
  return data
}

async function usuarioActual() {
  if (cache) return cache
  const { data } = await supabase.auth.getSession()
  if (!data.session?.user) return null
  cache = await perfilDe(data.session.user.id)
  return cache
}

function exigir(usuario, roles) {
  if (!usuario || !roles.includes(usuario.rol)) return 'No tiene permiso para realizar esta acción.'
  return null
}

function mapEmpresa(fila) {
  return {
    id: fila.id,
    folio: fila.folio,
    nombre: fila.nombre,
    contacto: fila.contacto,
    email: fila.email,
    telefono: fila.telefono || '',
    direccion: fila.direccion || '',
    notas: fila.notas || '',
    estado: fila.estado
  }
}

function mapEmpleado(fila) {
  const empresa = fila.empresas || {}
  return {
    id: fila.id,
    folio: fila.folio,
    nombre: fila.nombre,
    edad: fila.edad,
    curp: fila.curp,
    claveEmpleado: fila.clave_empleado,
    email: fila.email,
    telefono: fila.telefono,
    estado: fila.estado,
    empresaId: fila.empresa_id,
    empresaNombre: empresa.nombre || '—'
  }
}

export function crearApiSupabase() {
  return {
    modo: 'supabase',

    async obtenerSesion() {
      const usuario = await usuarioActual()
      return bien(usuario)
    },

    async iniciarSesion(email, password, recordarme = true) {
      const correo = normalizarCorreo(email)
      if (!correo || !password) return mal('Ingrese correo y contraseña.')
      window.localStorage.setItem('sisme.recordarme', recordarme ? '1' : '0')
      const estado = await supabase.rpc('estado_acceso', { p_email: correo })
      if (estado.error) return fallo(estado.error)
      if (estado.data?.bloqueado) return mal('La cuenta está bloqueada temporalmente. Intente de nuevo más tarde.')
      const acceso = await supabase.auth.signInWithPassword({ email: correo, password })
      if (acceso.error) {
        const intento = await supabase.rpc('registrar_intento_fallido', { p_email: correo })
        if (intento.data?.bloqueado) return mal('La cuenta se bloqueó temporalmente después de varios intentos fallidos.')
        return mal('Correo o contraseña incorrectos.')
      }
      await supabase.rpc('registrar_acceso_exitoso')
      const perfil = await perfilDe(acceso.data.user.id)
      if (!perfil) {
        await supabase.auth.signOut()
        cache = null
        return mal('Su usuario no tiene un perfil de Administrador o Doctor. Solicite el alta.')
      }
      cache = perfil
      return { ok: true, usuario: perfil }
    },

    suscribirSesion(alCerrar) {
      // US-ACC-01: si la sesión de Supabase termina (cierre en otra pestaña o token
      // no renovable), se limpia el perfil en memoria y la app vuelve a /login.
      const { data } = supabase.auth.onAuthStateChange((evento, sesion) => {
        if (evento === 'SIGNED_OUT' || !sesion) {
          cache = null
          alCerrar()
        }
      })
      return () => data.subscription.unsubscribe()
    },

    async cerrarSesion() {
      await supabase.auth.signOut()
      cache = null
      return bien(null)
    },

    async solicitarRecuperacion(email) {
      const correo = normalizarCorreo(email)
      if (!validarCorreo(correo)) return mal('Capture el correo registrado.')
      const { error } = await supabase.auth.signInWithOtp({ email: correo, options: { shouldCreateUser: false } })
      if (error) return mal('No se pudo enviar el código de recuperación. Intente más tarde.')
      return { ok: true, mensaje: 'Si el correo está registrado, recibirá un código de un solo uso. Revise su bandeja.' }
    },

    async confirmarRecuperacion({ email, codigo, password }) {
      const politica = validarContrasena(password)
      if (politica) return mal(politica)
      const correo = normalizarCorreo(email)
      const verificado = await supabase.auth.verifyOtp({ email: correo, token: String(codigo || '').trim(), type: 'email' })
      if (verificado.error) return mal('El código no es válido o ya expiró.')
      const actualizado = await supabase.auth.updateUser({ password })
      await supabase.auth.signOut()
      cache = null
      if (actualizado.error) return mal('No se pudo actualizar la contraseña. Use al menos 8 caracteres, con letras y números.')
      return { ok: true, mensaje: 'La contraseña se actualizó. Ya puede iniciar sesión.' }
    },

    async listarEmpresas() {
      const usuario = await usuarioActual()
      const permiso = exigir(usuario, ['administrador', 'doctor'])
      if (permiso) return mal(permiso)
      const columnas = usuario.rol === 'administrador'
        ? 'id, folio, nombre, contacto, email, telefono, direccion, notas, estado'
        : 'id, nombre, estado'
      const { data, error } = await supabase.from('empresas').select(columnas).order('nombre')
      if (error) return fallo(error)
      return bien((data || []).map((fila) => (usuario.rol === 'administrador' ? mapEmpresa(fila) : fila)))
    },

    async guardarEmpresa(datos) {
      const permiso = exigir(await usuarioActual(), ['administrador'])
      if (permiso) return mal(permiso)
      const errores = validarEmpresa(datos)
      if (Object.keys(errores).length) return mal(Object.values(errores)[0])
      const payload = {
        nombre: datos.nombre.trim(),
        contacto: datos.contacto.trim(),
        email: normalizarCorreo(datos.email),
        telefono: normalizarTelefono(datos.telefono).valor,
        direccion: datos.direccion?.trim() || null,
        notas: datos.notas?.trim() || null
      }
      const consulta = datos.id
        ? supabase.from('empresas').update(payload).eq('id', datos.id).select().single()
        : supabase.from('empresas').insert(payload).select().single()
      const { data, error } = await consulta
      if (error) return fallo(error)
      return bien(mapEmpresa(data))
    },

    async cambiarEstadoEmpresa(id, nuevoEstado) {
      const permiso = exigir(await usuarioActual(), ['administrador'])
      if (permiso) return mal(permiso)
      const { data, error } = await supabase.from('empresas').update({ estado: nuevoEstado }).eq('id', id).select().single()
      if (error) return fallo(error)
      return bien(mapEmpresa(data))
    },

    async listarEmpleados() {
      const permiso = exigir(await usuarioActual(), ['administrador', 'doctor'])
      if (permiso) return mal(permiso)
      const { data, error } = await supabase.from('empleados').select('id, folio, nombre, edad, curp, clave_empleado, email, telefono, estado, empresa_id, empresas(nombre)').order('nombre')
      if (error) return fallo(error)
      return bien((data || []).map(mapEmpleado))
    },

    async guardarEmpleado(datos) {
      const permiso = exigir(await usuarioActual(), ['administrador'])
      if (permiso) return mal(permiso)
      const errores = validarEmpleado(datos)
      if (Object.keys(errores).length) return mal(Object.values(errores)[0])
      const payload = {
        nombre: datos.nombre.trim(),
        empresa_id: datos.empresaId,
        curp: validarCurp(datos.curp).valor,
        clave_empleado: datos.claveEmpleado?.trim() || null,
        email: datos.email ? normalizarCorreo(datos.email) : null,
        telefono: normalizarTelefono(datos.telefono).valor,
        edad: normalizarEdad(datos.edad).valor,
        estado: datos.id ? datos.estado || 'activo' : 'provisional'
      }
      const consulta = datos.id
        ? supabase.from('empleados').update(payload).eq('id', datos.id).select('id, folio, nombre, edad, curp, clave_empleado, email, telefono, estado, empresa_id, empresas(nombre)').single()
        : supabase.from('empleados').insert(payload).select('id, folio, nombre, edad, curp, clave_empleado, email, telefono, estado, empresa_id, empresas(nombre)').single()
      const { data, error } = await consulta
      if (error) return fallo(error)
      return bien(mapEmpleado(data))
    },

    async listarCitas(fecha) {
      const usuario = await usuarioActual()
      const permiso = exigir(usuario, ['administrador', 'doctor'])
      if (permiso) return mal(permiso)
      let consulta = supabase.from('citas').select('id, empleado_id, fecha_hora, estado_asistencia, motivo, empleados(nombre, empresa_id, empresas(nombre))').order('fecha_hora')
      if (fecha) {
        const inicio = desdeMexicoInput(`${fecha}T00:00`)
        const fin = new Date(new Date(inicio).getTime() + 24 * 60 * 60 * 1000).toISOString()
        consulta = consulta.gte('fecha_hora', inicio).lt('fecha_hora', fin)
      }
      const { data, error } = await consulta
      if (error) return fallo(error)
      const ids = (data || []).map((cita) => cita.id)
      let expedientes = []
      if (usuario.rol === 'doctor' && ids.length) {
        const extra = await supabase.from('expedientes_clinicos').select('id, cita_id, estado_expediente').in('cita_id', ids)
        if (extra.error) return fallo(extra.error)
        expedientes = extra.data || []
      }
      return bien((data || []).map((cita) => {
        const expediente = expedientes.find((item) => item.cita_id === cita.id)
        return {
          id: cita.id,
          empleadoId: cita.empleado_id,
          empleadoNombre: cita.empleados?.nombre || '—',
          empresaId: cita.empleados?.empresa_id || null,
          empresaNombre: cita.empleados?.empresas?.nombre || '—',
          fechaHora: cita.fecha_hora,
          estadoAsistencia: cita.estado_asistencia,
          motivo: cita.motivo || '',
          expedienteId: expediente?.id || null,
          estadoExpediente: expediente?.estado_expediente || null
        }
      }))
    },

    async guardarCita(datos) {
      const permiso = exigir(await usuarioActual(), ['administrador'])
      if (permiso) return mal(permiso)
      const { error } = await supabase.rpc('programar_cita', {
        p_id: datos.id || null,
        p_empleado_id: datos.empleadoId,
        p_fecha_hora: desdeMexicoInput(datos.fechaHoraLocal),
        p_motivo: datos.motivo || ''
      })
      if (error) return fallo(error)
      return bien(true)
    },

    async registrarAsistencia(citaId, nuevoEstado) {
      const { error } = await supabase.rpc('registrar_asistencia', { p_cita_id: citaId, p_estado: nuevoEstado })
      if (error) return fallo(error)
      return bien(true)
    },

    async cancelarCita(citaId) {
      const { error } = await supabase.rpc('cancelar_cita', { p_cita_id: citaId })
      if (error) return fallo(error)
      return bien(true)
    },

    async obtenerAtencion(citaId) {
      const usuario = await usuarioActual()
      const permiso = exigir(usuario, ['doctor'])
      if (permiso) return mal(permiso)
      const cita = await supabase.from('citas').select('id, empleado_id, fecha_hora, estado_asistencia, motivo, empleados(nombre, edad, empresas(nombre))').eq('id', citaId).maybeSingle()
      if (cita.error) return fallo(cita.error)
      if (!cita.data) return mal('La cita no existe.')
      const expediente = await supabase.from('expedientes_clinicos').select('id, cita_id, diagnostico, observaciones, estado_expediente, fecha_atencion').eq('cita_id', citaId).maybeSingle()
      if (expediente.error) return fallo(expediente.error)
      let estudios = []
      let archivos = []
      if (expediente.data) {
        const rel = await supabase.from('estudios_realizados').select('catalogo_estudio_id').eq('expediente_id', expediente.data.id).eq('activo', true)
        if (rel.error) return fallo(rel.error)
        const nombres = await supabase.from('v_estudios_nombres').select('id, nombre')
        if (nombres.error) return fallo(nombres.error)
        const catalogo = new Map((nombres.data || []).map((item) => [item.id, item.nombre]))
        estudios = (rel.data || []).map((item) => ({ id: item.catalogo_estudio_id, nombre: catalogo.get(item.catalogo_estudio_id) || 'Estudio' }))
        const docs = await supabase.from('expediente_archivos').select('id, nombre, tamano_bytes').eq('expediente_id', expediente.data.id)
        if (docs.error) return fallo(docs.error)
        archivos = (docs.data || []).map((item) => ({ id: item.id, nombre: item.nombre, tamano: item.tamano_bytes }))
      }
      return bien({
        cita: {
          id: cita.data.id,
          empleadoId: cita.data.empleado_id,
          empleadoNombre: cita.data.empleados?.nombre || '—',
          edad: cita.data.empleados?.edad,
          empresaNombre: cita.data.empleados?.empresas?.nombre || '—',
          fechaHora: cita.data.fecha_hora,
          estadoAsistencia: cita.data.estado_asistencia,
          motivo: cita.data.motivo || ''
        },
        expediente: expediente.data ? {
          id: expediente.data.id,
          citaId: expediente.data.cita_id,
          diagnostico: expediente.data.diagnostico || '',
          observaciones: expediente.data.observaciones || '',
          estadoExpediente: expediente.data.estado_expediente,
          fechaAtencion: expediente.data.fecha_atencion,
          estudios,
          archivos
        } : null
      })
    },

    async guardarAtencion(citaId, datos) {
      const permiso = exigir(await usuarioActual(), ['doctor'])
      if (permiso) return mal(permiso)
      const { error } = await supabase.rpc('guardar_atencion', {
        p_cita_id: citaId,
        p_diagnostico: datos.diagnostico || '',
        p_observaciones: datos.observaciones || '',
        p_fecha_atencion: datos.fechaAtencionLocal ? desdeMexicoInput(`${datos.fechaAtencionLocal}T00:00`) : null,
        p_estudios: datos.estudios || []
      })
      if (error) return fallo(error)
      return this.obtenerAtencion(citaId)
    },

    async subirPdf(expedienteId, archivo) {
      const usuario = await usuarioActual()
      const permiso = exigir(usuario, ['doctor'])
      if (permiso) return mal(permiso)
      const errorPdf = validarPdf(archivo)
      if (errorPdf) return mal(errorPdf)
      const ruta = `${usuario.id}/${expedienteId}/${crypto.randomUUID()}.pdf`
      const subida = await supabase.storage.from('expedientes_medicos').upload(ruta, archivo, { contentType: 'application/pdf', upsert: false })
      if (subida.error) return mal('No se pudo guardar el PDF en el repositorio privado.')
      const registro = await supabase.rpc('registrar_archivo_pdf', {
        p_expediente_id: expedienteId,
        p_ruta: ruta,
        p_nombre: archivo.name,
        p_tamano: archivo.size
      })
      if (registro.error) return fallo(registro.error)
      return bien({ id: registro.data, nombre: archivo.name, tamano: archivo.size })
    },

    async abrirPdf(archivoId) {
      const permiso = exigir(await usuarioActual(), ['doctor'])
      if (permiso) return mal(permiso)
      const archivo = await supabase.from('expediente_archivos').select('ruta, nombre').eq('id', archivoId).maybeSingle()
      if (archivo.error || !archivo.data) return mal('No tiene permiso para abrir este archivo.')
      const firmada = await supabase.storage.from('expedientes_medicos').createSignedUrl(archivo.data.ruta, 120)
      if (firmada.error || !firmada.data?.signedUrl) return mal('No se pudo generar el acceso temporal al PDF.')
      return bien({ url: firmada.data.signedUrl, nombre: archivo.data.nombre })
    },

    async cerrarExpediente(expedienteId) {
      const permiso = exigir(await usuarioActual(), ['doctor'])
      if (permiso) return mal(permiso)
      const { error } = await supabase.rpc('cerrar_expediente', { p_expediente_id: expedienteId })
      if (error) return fallo(error)
      return bien(true)
    },

    async listarEstudios() {
      const usuario = await usuarioActual()
      const permiso = exigir(usuario, ['administrador', 'doctor'])
      if (permiso) return mal(permiso)
      if (usuario.rol === 'doctor') {
        const { data, error } = await supabase.from('v_estudios_nombres').select('id, nombre, vigente').eq('vigente', true).order('nombre')
        if (error) return fallo(error)
        return bien((data || []).map((estudio) => vistaEstudio(estudio, 'doctor')))
      }
      const { data, error } = await supabase.from('catalogo_estudios').select('id, nombre, precio, vigente').order('nombre')
      if (error) return fallo(error)
      return bien((data || []).map((estudio) => vistaEstudio(estudio, 'administrador')))
    },

    async guardarEstudio(datos) {
      const permiso = exigir(await usuarioActual(), ['administrador'])
      if (permiso) return mal(permiso)
      const errores = validarEstudio(datos)
      if (Object.keys(errores).length) return mal(Object.values(errores)[0])
      const payload = { nombre: datos.nombre.trim(), precio: Number(datos.precio), vigente: datos.vigente !== false }
      const consulta = datos.id
        ? supabase.from('catalogo_estudios').update(payload).eq('id', datos.id).select().single()
        : supabase.from('catalogo_estudios').insert(payload).select().single()
      const { data, error } = await consulta
      if (error) return fallo(error)
      return bien(vistaEstudio(data, 'administrador'))
    },

    async listarCargos() {
      const permiso = exigir(await usuarioActual(), ['administrador'])
      if (permiso) return mal(permiso)
      const cargos = await supabase.from('cargos_detalle').select('id, empresa_id, cita_id, concepto, precio_historico, estatus_pago, fecha_cargo, empresas(nombre), citas(empleados(nombre))').order('fecha_cargo', { ascending: false })
      if (cargos.error) return fallo(cargos.error)
      const pagos = await supabase.from('pagos').select('id, cargo_id, empresa_id, monto, referencia, fecha_pago')
      if (pagos.error) return fallo(pagos.error)
      return bien({
        cargos: (cargos.data || []).map((cargo) => ({
          id: cargo.id,
          empresaId: cargo.empresa_id,
          empresaNombre: cargo.empresas?.nombre || '—',
          citaId: cargo.cita_id,
          pacienteNombre: cargo.citas?.empleados?.nombre || '—',
          concepto: cargo.concepto,
          precioHistorico: Number(cargo.precio_historico),
          estatus: cargo.estatus_pago,
          fechaCargo: cargo.fecha_cargo
        })),
        pagos: (pagos.data || []).map((pago) => ({
          id: pago.id,
          cargoId: pago.cargo_id,
          empresaId: pago.empresa_id,
          monto: Number(pago.monto),
          referencia: pago.referencia,
          fecha: pago.fecha_pago
        }))
      })
    },

    async registrarPago(datos) {
      const permiso = exigir(await usuarioActual(), ['administrador'])
      if (permiso) return mal(permiso)
      const { error } = await supabase.rpc('registrar_pago', {
        p_cargo_id: datos.cargoId,
        p_monto: Number(datos.monto),
        p_referencia: datos.referencia,
        p_fecha: datos.fecha
      })
      if (error) return fallo(error)
      return bien(true)
    },

    async reportePeriodo(desde, hasta) {
      const lista = await this.listarCargos()
      if (!lista.ok) return lista
      return bien(armarReporte({
        empresas: [...new Map(lista.datos.cargos.map((cargo) => [cargo.empresaId, { id: cargo.empresaId, nombre: cargo.empresaNombre }])).values()],
        cargos: lista.datos.cargos,
        pagos: lista.datos.pagos,
        desde,
        hasta
      }))
    },

    async confirmarImportacion({ empresaId, nombreArchivo, sobrescribir, filas }) {
      const permiso = exigir(await usuarioActual(), ['administrador'])
      if (permiso) return mal(permiso)
      const { data, error } = await supabase.rpc('importar_empleados', armarRpcImportarEmpleados({
        empresaId,
        nombreArchivo,
        sobrescribir,
        filas
      }))
      if (error) return fallo(error)
      return bien(data)
    },

    async listarImportaciones() {
      const permiso = exigir(await usuarioActual(), ['administrador'])
      if (permiso) return mal(permiso)
      const { data, error } = await supabase.from('importaciones').select('id, nombre_archivo, total_filas, insertados, actualizados, descartados, created_at, empresas(nombre)').order('created_at', { ascending: false })
      if (error) return fallo(error)
      return bien((data || []).map((item) => ({
        id: item.id,
        nombreArchivo: item.nombre_archivo,
        totalFilas: item.total_filas,
        insertados: item.insertados,
        actualizados: item.actualizados,
        descartados: item.descartados,
        fecha: item.created_at,
        empresa: item.empresas?.nombre || '—'
      })))
    },

    async consultarPacientesAdmin() {
      const permiso = exigir(await usuarioActual(), ['administrador'])
      if (permiso) return mal(permiso)
      const { data, error } = await supabase.from('v_pacientes_admin').select('*').order('nombre')
      if (error) return fallo(error)
      return bien((data || []).map((fila) => ({
        id: fila.id,
        folio: fila.folio,
        nombre: fila.nombre,
        edad: fila.edad,
        curp: fila.curp,
        claveEmpleado: fila.clave_empleado,
        email: fila.email,
        telefono: fila.telefono,
        estado: fila.estado,
        empresaId: fila.empresa_id,
        empresaNombre: fila.empresa_nombre,
        estadoCita: fila.estado_cita,
        ultimaCita: fila.ultima_cita,
        estadoExpediente: fila.estado_expediente,
        fechaAtencion: fila.fecha_atencion,
        estudiosNombres: fila.estudios_nombres || ''
      })))
    },

    async consultarVisitasAdmin(empleadoId) {
      const permiso = exigir(await usuarioActual(), ['administrador'])
      if (permiso) return mal(permiso)
      const { data, error } = await supabase.from('v_visitas_admin').select('*').eq('empleado_id', empleadoId).order('fecha_hora', { ascending: false })
      if (error) return fallo(error)
      return bien((data || []).map((fila) => ({
        citaId: fila.cita_id,
        fechaHora: fila.fecha_hora,
        estadoAsistencia: fila.estado_asistencia,
        motivo: fila.motivo,
        estadoExpediente: fila.estado_expediente,
        fechaAtencion: fila.fecha_atencion,
        estudiosNombres: fila.estudios_nombres || ''
      })))
    },

    suscribirCitas(callback) {
      const canal = supabase.channel('sisme-citas')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'citas' }, () => callback())
        .subscribe()
      return () => { supabase.removeChannel(canal) }
    }
  }
}

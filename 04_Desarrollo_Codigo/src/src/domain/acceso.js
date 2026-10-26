export const INTENTOS_MAXIMOS = 5
export const BLOQUEO_MINUTOS = 15

export function estaBloqueado(perfil, ahora = new Date()) {
  if (!perfil?.bloqueadoHasta) return false
  return new Date(perfil.bloqueadoHasta).getTime() > ahora.getTime()
}

export function registrarFallo(perfil, ahora = new Date()) {
  if (estaBloqueado(perfil, ahora)) {
    return {
      intentosFallidos: perfil.intentosFallidos || 0,
      bloqueadoHasta: perfil.bloqueadoHasta,
      bloqueado: true,
      recienBloqueado: false
    }
  }
  const intentos = (perfil?.intentosFallidos || 0) + 1
  if (intentos >= INTENTOS_MAXIMOS) {
    return {
      intentosFallidos: 0,
      bloqueadoHasta: new Date(ahora.getTime() + BLOQUEO_MINUTOS * 60 * 1000).toISOString(),
      bloqueado: true,
      recienBloqueado: true
    }
  }
  return { intentosFallidos: intentos, bloqueadoHasta: null, bloqueado: false, recienBloqueado: false }
}

export function reiniciarIntentos() {
  return { intentosFallidos: 0, bloqueadoHasta: null, bloqueado: false }
}

export function solicitarCodigo(usuarios, email, ahora, codigo) {
  const correo = String(email || '').trim().toLowerCase()
  const mensaje = 'Si el correo está registrado, recibirá un código de un solo uso con vigencia de 15 minutos.'
  const usuario = (usuarios || []).find((item) => item.email.toLowerCase() === correo)
  if (!usuario) return { ok: true, mensaje, solicitud: null }
  return {
    ok: true,
    mensaje,
    solicitud: {
      email: usuario.email,
      codigo,
      expira: new Date(ahora.getTime() + 15 * 60 * 1000).toISOString(),
      intentos: 0,
      usado: false
    }
  }
}

export function verificarCodigo(solicitud, codigo, ahora = new Date()) {
  if (!solicitud || solicitud.usado) {
    return { ok: false, mensaje: 'El código no es válido o ya fue utilizado.' }
  }
  if (new Date(solicitud.expira).getTime() <= ahora.getTime()) {
    return { ok: false, mensaje: 'El código expiró. Solicite uno nuevo.', solicitud: { ...solicitud, usado: true } }
  }
  if (String(solicitud.codigo) !== String(codigo || '').trim()) {
    const intentos = solicitud.intentos + 1
    if (intentos >= INTENTOS_MAXIMOS) {
      return {
        ok: false,
        mensaje: 'El código quedó invalidado. Solicite uno nuevo.',
        solicitud: { ...solicitud, usado: true, intentos }
      }
    }
    return { ok: false, mensaje: 'El código no es válido.', solicitud: { ...solicitud, intentos } }
  }
  return { ok: true, solicitud: { ...solicitud, usado: true } }
}

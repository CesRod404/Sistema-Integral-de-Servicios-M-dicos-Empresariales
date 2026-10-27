import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSesion } from '../datos/ProveedorSesion.jsx'
import { Aviso, Boton, Campo } from '../componentes/Ui.jsx'

export function Recuperar() {
  const { api } = useSesion()
  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState('')
  const [password, setPassword] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [demoCodigo, setDemoCodigo] = useState('')
  const [enviado, setEnviado] = useState(false)

  async function solicitar(evento) {
    evento.preventDefault()
    setError('')
    const resultado = await api.solicitarRecuperacion(email)
    if (!resultado.ok) {
      setError(resultado.mensaje)
      return
    }
    setEnviado(true)
    setMensaje(resultado.mensaje)
    setDemoCodigo(resultado.demoCodigo || '')
  }

  async function confirmar(evento) {
    evento.preventDefault()
    setError('')
    if (password !== confirmacion) {
      setError('La confirmación no coincide con la contraseña.')
      return
    }
    const resultado = await api.confirmarRecuperacion({ email, codigo, password })
    if (!resultado.ok) {
      setError(resultado.mensaje)
      return
    }
    setMensaje(resultado.mensaje)
    setEnviado(false)
    setDemoCodigo('')
  }

  return (
    <main className="pagina-publica">
      <form className="tarjeta login-caja" onSubmit={enviado ? confirmar : solicitar}>
        <h1>Recuperar acceso</h1>
        <p className="nota">El código de un solo uso se envía únicamente al correo registrado y vence en 15 minutos.</p>
        <Campo etiqueta="Correo registrado" requerido>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Campo>
        {enviado ? (
          <>
            <Campo etiqueta="Código" requerido>
              <input inputMode="numeric" value={codigo} onChange={(e) => setCodigo(e.target.value)} required />
            </Campo>
            <Campo etiqueta="Nueva contraseña" requerido>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </Campo>
            <Campo etiqueta="Confirmar contraseña" requerido>
              <input type="password" value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} required />
            </Campo>
          </>
        ) : null}
        <Aviso tipo="info">{mensaje}</Aviso>
        {demoCodigo ? <Aviso tipo="pendiente">Bandeja de demostración (no sale del navegador): {demoCodigo}</Aviso> : null}
        <Aviso tipo="error">{error}</Aviso>
        <Boton variante="azul" tipo="submit">{enviado ? 'Guardar contraseña' : 'Enviar código'}</Boton>
        <p style={{ marginTop: 12 }}><Link className="enlace" to="/login">Volver al inicio de sesión</Link></p>
      </form>
    </main>
  )
}

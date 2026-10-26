import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useSesion } from '../datos/ProveedorSesion.jsx'
import { Logo } from '../componentes/Iconos.jsx'
import { Aviso, Boton, Campo } from '../componentes/Ui.jsx'

export function Login() {
  const { usuario, entrar, modo } = useSesion()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [ver, setVer] = useState(false)
  const [recordarme, setRecordarme] = useState(true)
  const [mensaje, setMensaje] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (usuario) return <Navigate to={usuario.rol === 'doctor' ? '/app/pacientes' : '/app/inicio'} replace />

  async function enviar(evento) {
    evento.preventDefault()
    setEnviando(true)
    setMensaje('')
    const resultado = await entrar(email, password, recordarme)
    setEnviando(false)
    if (!resultado.ok) {
      setMensaje(resultado.mensaje)
      return
    }
    const destino = params.get('cita') === '1' && resultado.usuario.rol === 'administrador' ? '/app/citas' : resultado.usuario.rol === 'doctor' ? '/app/pacientes' : '/app/inicio'
    navigate(destino, { replace: true })
  }

  return (
    <main className="pagina-publica">
      <form className="tarjeta login-caja" onSubmit={enviar}>
        <Logo />
        <h1>Inicio de sesión</h1>
        {params.get('cita') === '1' ? <Aviso tipo="info">La cita se programa desde el perfil Administrador, con un empleado ya registrado.</Aviso> : null}
        <Campo etiqueta="Correo" requerido>
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Campo>
        <Campo etiqueta="Contraseña" requerido>
          <input type={ver ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Campo>
        <div className="fila-login">
          <label><input type="checkbox" checked={recordarme} onChange={(e) => setRecordarme(e.target.checked)} /> Recordarme</label>
          <button type="button" className="btn btn-texto" onClick={() => setVer((v) => !v)}>{ver ? 'Ocultar' : 'Mostrar'}</button>
        </div>
        <Aviso tipo="error">{mensaje}</Aviso>
        <Boton variante="azul" tipo="submit" disabled={enviando}>{enviando ? 'Ingresando…' : 'Ingreso'}</Boton>
        <p style={{ marginTop: 12 }}><Link className="enlace" to="/recuperar">¿Olvidaste tu contraseña?</Link></p>
        {modo === 'demo' ? (
          <div className="demo-credenciales">
            <p>Demostración local</p>
            <button type="button" className="btn btn-texto" onClick={() => { setEmail('admin@sisme.local'); setPassword('Admin1234') }}>Administrador: admin@sisme.local / Admin1234</button>
            <button type="button" className="btn btn-texto" onClick={() => { setEmail('doctor@sisme.local'); setPassword('Doctor1234') }}>Doctor: doctor@sisme.local / Doctor1234</button>
          </div>
        ) : null}
      </form>
    </main>
  )
}

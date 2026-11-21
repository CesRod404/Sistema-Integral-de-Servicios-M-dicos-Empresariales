// Diseño visual basado en los mockups de Miguel Angel López (diseñador UX/UI).
import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useSesion } from '../datos/ProveedorSesion.jsx'
import { Aviso, Boton, Campo } from '../componentes/Ui.jsx'
import { InicioPublico } from './InicioPublico.jsx'

export function Login() {
  const { usuario, entrar, modo } = useSesion()
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
    const destino = resultado.usuario.rol === 'doctor' ? '/app/pacientes' : '/app/inicio'
    navigate(destino, { replace: true })
  }

  return (
    <main className="login-modal-pagina">

      {/* Portada visible detrás del login */}
      <div className="login-fondo-portada" aria-hidden="true">
        <InicioPublico />
      </div>

      {/* Capa tenue sobre la portada */}
      <div className="login-capa-oscura" />

      {/* Ventana modal */}
      <section
        className="login-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-titulo"
      >
        {/* Encabezado con logo */}


        <div className="login-modal-contenido">
          <h1 id="login-titulo">Inicio de sesión</h1>

          <form className="login-modal-formulario" onSubmit={enviar}>
            <Campo etiqueta="Usuario:" requerido>
              <input
                type="email"
                autoComplete="username"
                placeholder="consultorio medico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Campo>

            <Campo etiqueta="Contraseña:" requerido>
              <div className="login-password-contenedor">
                <input
                  type={ver ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Ingresa tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setVer((v) => !v)}
                  aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    {ver ? (
                      <>
                        <path d="M3 3l18 18" />
                        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                        <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a16 16 0 0 1-3.2 4.1" />
                        <path d="M6.2 6.2C3.5 8 2 12 2 12s3.5 7 10 7a10 10 0 0 0 4-.8" />
                      </>
                    ) : (
                      <>
                        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                        <circle cx="12" cy="12" r="3" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </Campo>

            <div className="login-modal-opciones">
              <label className="login-modal-recordarme">
                <input
                  type="checkbox"
                  checked={recordarme}
                  onChange={(e) => setRecordarme(e.target.checked)}
                />
                <span>Recordarme</span>
              </label>

              <Link className="login-modal-recuperar" to="/recuperar">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <Aviso tipo="error">{mensaje}</Aviso>

            <Boton
              variante="azul"
              tipo="submit"
              disabled={enviando}
            >
              {enviando ? 'Ingresando…' : 'Ingreso'}
            </Boton>

            {modo === 'demo' ? (
              <div className="demo-credenciales">
                <p>Demostración local</p>

                <button
                  type="button"
                  className="btn btn-texto"
                  onClick={() => {
                    setEmail('admin@sisme.local')
                    setPassword('Admin1234')
                  }}
                >
                  Administrador: admin@sisme.local
                </button>

                <button
                  type="button"
                  className="btn btn-texto"
                  onClick={() => {
                    setEmail('doctor@sisme.local')
                    setPassword('Doctor1234')
                  }}
                >
                  Doctor: doctor@sisme.local
                </button>
              </div>
            ) : null}
          </form>
        </div>
      </section>
    </main>
  )
}

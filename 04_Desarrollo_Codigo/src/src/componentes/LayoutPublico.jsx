import { NavLink, Outlet } from 'react-router-dom'
import { Logo } from './Iconos.jsx'

const ENLACES = [
  ['/', 'Inicio'],
  ['/servicios', 'Nuestros servicios'],
  ['/contacto', 'Contáctanos']
]

export function LayoutPublico() {
  return (
    <>
      <header className="barra-publica">
        <Logo />
        <nav className="nav-publica">
          {ENLACES.map(([ruta, etiqueta]) => (
            <NavLink key={ruta} to={ruta} className={({ isActive }) => (isActive ? 'activa' : undefined)} end={ruta === '/'}>
              {etiqueta}
            </NavLink>
          ))}
        </nav>
        <NavLink to="/login" className="btn btn-azul">Inicio de sesión</NavLink>
      </header>
      <Outlet />
    </>
  )
}

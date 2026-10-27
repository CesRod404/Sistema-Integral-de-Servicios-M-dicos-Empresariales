// Barra pública de DrakeJJ (José Eduardo Juárez Martínez).
import { NavLink } from 'react-router-dom'
import { Icono, Logo } from './Iconos.jsx'

const ENLACES = [
  ['/', 'inicio', 'Inicio', 'inicio'],
  ['/servicios', 'servicios', 'Nuestros servicios', 'documento'],
  ['/contacto', 'contacto', 'Contáctanos', 'usuario']
]

export default function NavBar({ activeTab }) {
  return (
    <header className="barra-publica">
      <Logo />
      <nav className="nav-publica">
        {ENLACES.map(([ruta, id, etiqueta, icono]) => (
          <NavLink
            key={ruta}
            to={ruta}
            end={ruta === '/'}
            className={({ isActive }) => (isActive || activeTab === id ? 'activa' : undefined)}
          >
            <Icono nombre={icono} /> {etiqueta}
          </NavLink>
        ))}
      </nav>
      <NavLink to="/login" className="btn btn-azul">
        <Icono nombre="usuario" /> Inicio de sesión
      </NavLink>
    </header>
  )
}

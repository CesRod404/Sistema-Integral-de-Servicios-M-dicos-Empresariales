import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useSesion } from '../datos/ProveedorSesion.jsx'
import { modulosPara, ETIQUETA_ROL } from '../domain/roles.js'
import { Icono, Logo } from './Iconos.jsx'
import { Aviso } from './Ui.jsx'

export function LayoutApp() {
  const { usuario, salir, modo } = useSesion()
  const [abierto, setAbierto] = useState(false)
  const location = useLocation()
  const modulos = modulosPara(usuario.rol)

  return (
    <>
      {modo === 'demo' ? (
        <div className="demo-banner">Modo demostración: los datos permanecen en este navegador hasta conectar Supabase.</div>
      ) : null}
      <div className="app-shell">
        <aside className={abierto ? 'sidebar abierta' : 'sidebar'}>
          <Logo compacto />
          <nav>
            {modulos.map((modulo) => (
              <NavLink key={modulo.id} to={modulo.ruta} className={({ isActive }) => (isActive ? 'activa' : undefined)} onClick={() => setAbierto(false)}>
                <Icono nombre={modulo.id} />
                {modulo.etiqueta}
              </NavLink>
            ))}
            <button type="button" className="menu-btn" onClick={salir}>
              <Icono nombre="salir" />
              Cerrar sesión
            </button>
          </nav>
        </aside>
        <main className="contenido">
          <div className="topbar">
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button type="button" className="icono-btn menu-movil" onClick={() => setAbierto((v) => !v)} aria-label="Abrir menú">
                <Icono nombre="inicio" />
              </button>
              <p className="miga">Inicio / {modulos.find((modulo) => location.pathname.startsWith(modulo.ruta))?.etiqueta || 'SISME'}</p>
            </div>
            <div className="usuario-chip">
              <div className="avatar"><Icono nombre="usuario" /></div>
              <div>
                <span>{usuario.nombre}</span>
                <small>{ETIQUETA_ROL[usuario.rol]}</small>
              </div>
            </div>
          </div>
          {location.state?.denegado ? <Aviso tipo="error">Su rol no tiene acceso a ese módulo.</Aviso> : null}
          <Outlet />
        </main>
      </div>
    </>
  )
}

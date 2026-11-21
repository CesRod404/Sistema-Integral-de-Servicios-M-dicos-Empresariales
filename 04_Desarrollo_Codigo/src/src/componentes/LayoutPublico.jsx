import { Outlet, useLocation } from 'react-router-dom'
import NavBar from './NavBar.jsx'

export function LayoutPublico() {
  const { pathname } = useLocation()
  const activeTab = pathname.startsWith('/servicios')
    ? 'servicios'
    : pathname.startsWith('/contacto')
      ? 'contacto'
      : 'inicio'

  return (
    <>
      <NavBar activeTab={activeTab} />
      <Outlet />
    </>
  )
}

import { Navigate, Route, Routes } from 'react-router-dom'
import { useSesion } from './datos/ProveedorSesion.jsx'
import { puedeAcceder } from './domain/roles.js'
import { LayoutPublico } from './componentes/LayoutPublico.jsx'
import { LayoutApp } from './componentes/LayoutApp.jsx'
import Inicio from './paginas/Inicio.jsx'
import Servicios from './paginas/Servicios.jsx'
import { ContactoPublico } from './paginas/ContactoPublico.jsx'
import { Login } from './paginas/Login.jsx'
import { Recuperar } from './paginas/Recuperar.jsx'
import { PanelInicio } from './paginas/PanelInicio.jsx'
import { PacientesDoctor } from './paginas/PacientesDoctor.jsx'
import { FichaPaciente, PacientesAdmin } from './paginas/PacientesAdmin.jsx'
import { Atencion } from './paginas/Atencion.jsx'
import { Citas } from './paginas/Citas.jsx'
import { Empresas } from './paginas/Empresas.jsx'
import { Importacion } from './paginas/Importacion.jsx'
import { Cobranza } from './paginas/Cobranza.jsx'

function RutaPrivada({ children }) {
  const { usuario, cargando } = useSesion()
  if (cargando) return <p className="pagina-publica">Cargando sesión…</p>
  if (!usuario) return <Navigate to="/login" replace />
  return children
}

function Solo({ rol, ruta, children }) {
  const { usuario } = useSesion()
  if (!puedeAcceder(usuario.rol, ruta)) return <Navigate to="/app/inicio" replace state={{ denegado: true }} />
  if (rol && usuario.rol !== rol) return <Navigate to="/app/inicio" replace state={{ denegado: true }} />
  return children
}

export function App() {
  const { usuario } = useSesion()
  return (
    <Routes>
      <Route element={<LayoutPublico />}>
        <Route path="/" element={<Inicio />} />
        <Route path="/servicios" element={<Servicios />} />
        <Route path="/contacto" element={<ContactoPublico />} />
        <Route path="/login" element={<Login />} />
        <Route path="/recuperar" element={<Recuperar />} />
      </Route>
      <Route path="/app" element={<RutaPrivada><LayoutApp /></RutaPrivada>}>
        <Route index element={<Navigate to={usuario?.rol === 'doctor' ? '/app/pacientes' : '/app/inicio'} replace />} />
        <Route path="inicio" element={<PanelInicio />} />
        <Route path="pacientes" element={usuario?.rol === 'doctor' ? <PacientesDoctor /> : <PacientesAdmin />} />
        <Route path="pacientes/:empleadoId" element={<Solo rol="administrador" ruta="/app/pacientes"><FichaPaciente /></Solo>} />
        <Route path="atencion/:citaId" element={<Solo rol="doctor" ruta="/app/atencion"><Atencion /></Solo>} />
        <Route path="citas" element={<Citas />} />
        <Route path="empresas" element={<Solo rol="administrador" ruta="/app/empresas"><Empresas /></Solo>} />
        <Route path="importacion" element={<Solo rol="administrador" ruta="/app/importacion"><Importacion /></Solo>} />
        <Route path="cobranza" element={<Solo rol="administrador" ruta="/app/cobranza"><Cobranza /></Solo>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

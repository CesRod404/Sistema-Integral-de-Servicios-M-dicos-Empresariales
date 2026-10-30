// Página de inicio de DrakeJJ (José Eduardo Juárez Martínez).
import { Link } from 'react-router-dom'
import { Icono } from '../componentes/Iconos.jsx'
import { ModalAgendarCita } from '../componentes/ModalAgendarCita.jsx'

const PILARES = [
  ['pacientes', 'tono-azul', 'Atención integral', 'Todo el proceso médico en un solo sistema.'],
  ['citas', 'tono-naranja', 'Gestión inteligente', 'Programación de citas y control de asistencia.'],
  ['documento', 'tono-verde', 'Información segura', 'Expedientes digitales y acceso controlado.'],
  ['cobranza', 'tono-gris', 'Control empresarial', 'Seguimiento de estudios, cargos y pagos por empresa.']
]

export default function Inicio() {
  return (
    <main className="pagina-publica">
      <section className="hero">
        <div>
          <p className="ceja">GESTIÓN INTELIGENTE, SALUD LABORAL EFICIENTE</p>
          <h1>Cuidamos la salud de tu equipo, <span>impulsamos tu empresa</span></h1>
          <p>
            En SISME, facilitamos la atención médica de tus colaboradores integrando en un solo sistema
            la programación de citas, la atención médica, los estudios y el control de cuentas por empresa.
          </p>
          <div className="acciones">
            <ModalAgendarCita />
            <Link to="/servicios" className="btn btn-linea"><Icono nombre="documento" /> Conoce nuestros servicios</Link>
          </div>
        </div>
        <div className="hero-figura" aria-hidden="true">
          <div className="hero-tarjeta">
            <strong>Atención de salud laboral</strong>
            <p>El doctor registra la atención y el administrador controla el cobro.</p>
          </div>
        </div>
      </section>
      <section className="pilares">
        {PILARES.map(([icono, tono, titulo, desc]) => (
          <article key={titulo} className="tarjeta">
            <div className={`icono-circulo ${tono}`}><Icono nombre={icono} /></div>
            <h3>{titulo}</h3>
            <p>{desc}</p>
          </article>
        ))}
      </section>
    </main>
  )
}

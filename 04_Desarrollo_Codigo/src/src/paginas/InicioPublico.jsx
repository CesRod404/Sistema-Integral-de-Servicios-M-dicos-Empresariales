import { Link } from 'react-router-dom'
import { Icono } from '../componentes/Iconos.jsx'

export function InicioPublico() {
  return (
    <main className="pagina-publica">
      <section className="hero">
        <div>
          <p className="ceja">GESTIÓN INTELIGENTE, SALUD LABORAL EFICIENTE</p>
          <h1>Cuidamos la salud de tu equipo, <span>impulsamos tu empresa</span></h1>
          <p>
            En SISME facilitamos la atención médica de los colaboradores: empresas, listas de empleados,
            citas, asistencia, expediente clínico y cobranza quedan en un solo sistema.
          </p>
          <div className="acciones">
            <Link to="/login?cita=1" className="btn btn-naranja"><Icono nombre="citas" /> Agendar una cita</Link>
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
        {[
          ['pacientes', 'tono-azul', 'Atención integral', 'Empresas, citas, asistencia y expediente en el mismo flujo.'],
          ['citas', 'tono-naranja', 'Agenda del día', 'Programación de citas y registro de presente o ausente.'],
          ['documento', 'tono-verde', 'Expediente protegido', 'Estudios en PDF dentro de un repositorio privado.'],
          ['cobranza', 'tono-gris', 'Cobro por empresa', 'Cargos con precio histórico y pagos registrados por el administrador.']
        ].map(([icono, tono, titulo, texto]) => (
          <article key={titulo} className="tarjeta">
            <div className={`icono-circulo ${tono}`}><Icono nombre={icono} /></div>
            <h3>{titulo}</h3>
            <p>{texto}</p>
          </article>
        ))}
      </section>
    </main>
  )
}

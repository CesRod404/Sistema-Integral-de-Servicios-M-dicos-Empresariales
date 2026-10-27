// Página pública de servicios de DrakeJJ (José Eduardo Juárez Martínez).
// Las tarifas de esta vista no se reutilizan en las rutas del doctor.
import { Link } from 'react-router-dom'
import { Icono } from '../componentes/Iconos.jsx'

const SERVICIOS = [
  {
    icono: 'usuario',
    tono: 'tono-azul',
    titulo: 'Examen médico general',
    desc: 'Evaluación integral del estado de salud del empleado, ideal para ingreso, periódicos o de seguimiento.',
    costo: '$450.00 MXN',
    detalles: ['Historia clínica', 'Exploración física', 'Certificado médico']
  },
  {
    icono: 'documento',
    tono: 'tono-verde',
    titulo: 'Estudios de laboratorio',
    desc: 'Análisis clínicos para detectar y prevenir riesgos a la salud, con tecnología confiable y resultados precisos.',
    costo: 'desde $250.00 MXN',
    detalles: ['Biometría hemática', 'Química sanguínea', 'Examen general de orina', 'Perfil lipídico']
  },
  {
    icono: 'citas',
    tono: 'tono-naranja',
    titulo: 'Estudios de gabinete',
    desc: 'Diagnósticos por imagen para una evaluación completa y oportuna de la salud.',
    costo: 'desde $300.00 MXN',
    detalles: ['Rayos X (tórax)', 'Electrocardiograma (ECG)', 'Ultrasonido', 'Audiometría']
  }
]

export default function Servicios() {
  return (
    <main className="pagina-publica">
      <p className="ceja">SERVICIOS DE SALUD LABORAL</p>
      <h1 style={{ color: 'var(--navy)', fontSize: '2.4rem', margin: '8px 0' }}>Nuestros servicios</h1>
      <p className="nota">Ofrecemos una amplia gama de estudios y evaluaciones médicas.</p>
      <section className="rejilla-servicios">
        {SERVICIOS.map((servicio) => (
          <article key={servicio.titulo} className="tarjeta">
            <div className={`icono-circulo ${servicio.tono}`}><Icono nombre={servicio.icono} /></div>
            <h3>{servicio.titulo}</h3>
            <p>{servicio.desc}</p>
            <p className="nota">Costo</p>
            <h3>{servicio.costo}</h3>
            <ul>
              {servicio.detalles.map((detalle) => <li key={detalle}>{detalle}</li>)}
            </ul>
            <Link to="/contacto" className="btn btn-linea">Más información</Link>
          </article>
        ))}
      </section>
    </main>
  )
}

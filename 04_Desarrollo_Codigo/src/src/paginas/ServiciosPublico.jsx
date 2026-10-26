import { Link } from 'react-router-dom'

const SERVICIOS = [
  ['Examen médico general', 'Evaluación del estado de salud del empleado para ingreso, periódicos o seguimiento.', ['Historia clínica', 'Exploración física', 'Certificado médico']],
  ['Estudios de laboratorio', 'Análisis para detectar y prevenir riesgos, con registro del estudio realizado.', ['Biometría hemática', 'Química sanguínea', 'Examen general de orina']],
  ['Estudios de gabinete', 'Apoyo diagnóstico por imagen y pruebas complementarias.', ['Rayos X', 'Electrocardiograma', 'Audiometría']]
]

export function ServiciosPublico() {
  return (
    <main className="pagina-publica">
      <p className="ceja">SERVICIOS DE SALUD LABORAL</p>
      <h1 style={{ color: 'var(--navy)', fontSize: '2.4rem', margin: '8px 0' }}>Nuestros servicios</h1>
      <p className="nota">Información general para las empresas. Las tarifas de operación se administran en el catálogo interno y no se publican en este sitio.</p>
      <section className="rejilla-servicios">
        {SERVICIOS.map(([titulo, texto, puntos]) => (
          <article key={titulo} className="tarjeta">
            <h3>{titulo}</h3>
            <p>{texto}</p>
            <ul>
              {puntos.map((punto) => <li key={punto}>{punto}</li>)}
            </ul>
            <Link to="/contacto" className="btn btn-linea">Más información</Link>
          </article>
        ))}
      </section>
    </main>
  )
}

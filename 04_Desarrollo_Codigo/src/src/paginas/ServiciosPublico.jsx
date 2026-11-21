import { Link } from 'react-router-dom'
import { Icono } from '../componentes/Iconos.jsx'
import { IconoServicio } from '../componentes/IconosServicios.jsx'

const SERVICIOS = [
  {
    titulo: 'Examen Médico General',
    texto: 'Evaluación integral del estado de salud del empleado, ideal para ingreso, periódicos o de seguimiento.',
    imagen: '/imagenes/consulta-medica.png',
    costo: '$450.00 MXN',
    color: 'azul',
    icono: 'examen',
    detalles: [
      'Historia clínica',
      'Exploración física',
      'Certificado médico',
    ],
  },
  {
    titulo: 'Estudios de Laboratorio',
    texto: 'Análisis clínicos para detectar y prevenir riesgos a la salud, con tecnología confiable y resultados precisos.',
    imagen: '/imagenes/laboratorio.png',
    costo: '$250.00 MXN',
    color: 'naranja',
    icono: 'laboratorio',
    detalles: [
      'Biometría hemática',
      'Química sanguínea',
      'Examen general de orina',
      'Perfil lipídico',
    ],
  },
  {
    titulo: 'Estudios de Gabinete',
    texto: 'Diagnósticos por imagen para una evaluación completa y oportuna de la salud.',
    imagen: '/imagenes/diagnostico.png',
    costo: '$300.00 MXN',
    color: 'verde',
    icono: 'gabinete',
    detalles: [
      'Rayos X (tórax)',
      'Electrocardiograma (ECG)',
      'Ultrasonido',
      'Audiometría',
    ],
  },
]

export function ServiciosPublico() {
  return (
    <main className="pagina-publica pagina-servicios">

      {/* Encabezado con imagen de microscopio */}
      <section className="servicios-hero">
        <div className="servicios-hero-contenido">
          <h1>Nuestros Servicios</h1>

          <p>
            Ofrecemos una amplia gama de estudios y evaluaciones médicas
            para cuidar la salud de tu equipo de trabajo, con resultados
            confiables y atención profesional.
          </p>
        </div>

        <div className="servicios-hero-imagen" aria-hidden="true">
          <div className="servicios-hero-etiqueta">
            <Icono nombre="laboratorio" />
            <span>
              Resultados confiables
              <br />
              para empresas más saludables
            </span>
          </div>
        </div>
      </section>

      {/* Tarjetas de servicios */}
      <section className="rejilla-servicios">
        {SERVICIOS.map((servicio) => (
          <article
            key={servicio.titulo}
            className={`tarjeta-servicio tarjeta-servicio-${servicio.color}`}
          >
            <div className="servicio-imagen-contenedor">
              <img
                src={servicio.imagen}
                alt={servicio.titulo}
                className="servicio-imagen"
              />
            </div>

            <div className="servicio-icono">
              <IconoServicio tipo={servicio.icono} />
            </div>

            <div className="servicio-contenido">
              <h2>{servicio.titulo}</h2>

              <p className="servicio-descripcion">
                {servicio.texto}
              </p>

              <div className="servicio-informacion">
                <div className="servicio-costo">
                  <span className="servicio-label">Costo</span>
                  <strong>{servicio.costo}</strong>
                </div>

                <div className="servicio-detalles">
                  <span className="servicio-label">Detalles</span>

                  <ul>
                    {servicio.detalles.map((detalle) => (
                      <li key={detalle}>
                        <span className="servicio-check">✓</span>
                        {detalle}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <Link to="/contacto" className="btn-servicio">
                Más información
                <span aria-hidden="true">›</span>
              </Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  )
}
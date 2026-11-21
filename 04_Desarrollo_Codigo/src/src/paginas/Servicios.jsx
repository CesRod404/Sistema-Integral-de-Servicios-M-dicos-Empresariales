// Página pública de servicios de DrakeJJ (José Eduardo Juárez Martínez).
// Las tarifas de esta vista no se reutilizan en las rutas del doctor.
// Diseño visual dabaso en los mockups de Miguel Angel López (diseñador UX/UI).
import { Link } from 'react-router-dom'
import { Icono } from '../componentes/Iconos.jsx'

const SERVICIOS = [
  {
    icono: 'examen',
    tono: 'tono-azul',
    titulo: 'Examen médico general',
    desc: 'Evaluación integral del estado de salud del empleado, ideal para ingreso, periódicos o de seguimiento.',
    costo: '$450.00 MXN',
    etiquetaCosto: 'Costo',
    imagen: '/imagenes/consulta-medica.png',
    detalles: [
      'Historia clínica',
      'Exploración física',
      'Certificado médico'
    ]
  },
  {
    icono: 'matraz',
    tono: 'tono-verde',
    titulo: 'Estudios de laboratorio',
    desc: 'Análisis clínicos para detectar y prevenir riesgos a la salud, con tecnología confiable y resultados precisos.',
    costo: 'desde $250.00 MXN',
    etiquetaCosto: 'Costo desde',
    imagen: '/imagenes/laboratorio.png',
    detalles: [
      'Biometría hemática',
      'Química sanguínea',
      'Examen general de orina',
      'Perfil lipídico'
    ]
  },
  {
    icono: 'torax',
    tono: 'tono-naranja',
    titulo: 'Estudios de gabinete',
    desc: 'Diagnósticos por imagen para una evaluación completa y oportuna de la salud.',
    costo: 'desde $300.00 MXN',
    etiquetaCosto: 'Costo desde',
    imagen: '/imagenes/diagnostico.png',
    detalles: [
      'Rayos X (tórax)',
      'Electrocardiograma (ECG)',
      'Ultrasonido',
      'Audiometría'
    ]
  }
]

export default function Servicios() {
  return (
    <main className="pagina-publica pagina-servicios">

      {/* ENCABEZADO */}
      <section className="servicios-encabezado">

        <div className="servicios-titulo">
          <h1>Nuestros Servicios</h1>

          <p>
            Ofrecemos una amplia gama de estudios y evaluaciones médicas
            para cuidar la salud de tu equipo de trabajo, con resultados
            confiables y atención profesional.
          </p>
        </div>

        <div className="servicios-imagen-hero">
          <img
            src="/imagenes/microscopio.png"
            alt="Equipo de laboratorio médico"
          />

          <div className="servicios-mensaje">
            <Icono nombre="documento" />
            <strong>
              Resultados confiables
              <span>para empresas más saludables</span>
            </strong>
          </div>
        </div>

      </section>

      {/* TARJETAS */}
      <section className="rejilla-servicios">

        {SERVICIOS.map((servicio) => (
          <article
            key={servicio.titulo}
            className="tarjeta tarjeta-servicio"
          >

            <div className="servicio-imagen-contenedor">
              <img
                src={servicio.imagen}
                alt={servicio.titulo}
                className="servicio-imagen"
              />
            </div>

            <div className={`servicio-icono ${servicio.tono}`}>
              <Icono nombre={servicio.icono} />
            </div>

            <div className="servicio-contenido">

              <h3>{servicio.titulo}</h3>

              <p className="servicio-descripcion">
                {servicio.desc}
              </p>

              <div className="servicio-informacion">

                <div className="servicio-precio">
                  <span>{servicio.etiquetaCosto}</span>
                  <strong>{servicio.costo}</strong>
                </div>

                <div className="servicio-detalles">
                  <span className="servicio-detalles-titulo">
                    Detalles
                  </span>

                  <ul>
                    {servicio.detalles.map((detalle) => (
                      <li key={detalle}>
                        <span className={`detalle-check ${servicio.tono}`}>
                          <Icono nombre="checar" />
                        </span>
                        {detalle}
                      </li>
                    ))}
                  </ul>
                </div>

              </div>

              <Link
                to="/contacto"
                className="btn btn-linea servicio-boton"
              >
                Más información
                <span className="servicio-flecha">›</span>
              </Link>

            </div>
          </article>
        ))}

      </section>
    </main>
  )
}
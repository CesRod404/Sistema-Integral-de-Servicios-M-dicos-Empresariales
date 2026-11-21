
// Diseño visual basado en los mockups de Miguel Angel López (diseñador UX/UI).

export function ContactoPublico() {
  return (
    <main className="pagina-publica pagina-contacto">

      {/* ENCABEZADO */}
      <section className="contacto-hero">

        <div className="contacto-hero-texto">
          <span className="contacto-ceja">
            ESTAMOS PARA ATENDERTE
          </span>

          <h1>Contáctanos</h1>

          <h2>
            Estamos aquí para apoyarte
            en la atención de tu empresa.
          </h2>

          <p>
            Comunícate con nosotros para resolver tus dudas
            sobre nuestros servicios y el funcionamiento de SISME.
          </p>
        </div>

        <div className="contacto-hero-imagen">
          <img
            src="/imagenes/contacto-hero.png"
            alt="Representante de atención de SISME"
          />
        </div>

      </section>

      {/* TARJETAS DE CONTACTO */}
      <section className="contacto-grid">

        <article className="tarjeta contacto-card">
          <div className="contacto-icono contacto-azul">
            <svg viewBox="0 0 24 24">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72l.45 2.98a2 2 0 0 1-.57 1.7L7.2 10.2a16 16 0 0 0 6 6l1.8-1.79a2 2 0 0 1 1.7-.57l2.98.45a2 2 0 0 1 1.72 2.63Z"/>
            </svg>
          </div>

          <h3>Teléfono</h3>
          <p>Comunícate con nuestra clínica de salud laboral.</p>

          <div className="contacto-dato">
            492 000 0000
          </div>
        </article>

        <article className="tarjeta contacto-card">
          <div className="contacto-icono contacto-naranja">
            <svg viewBox="0 0 24 24">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="m22 6-10 7L2 6"/>
            </svg>
          </div>

          <h3>Correo electrónico</h3>
          <p>Envíanos tus consultas y solicitudes de información.</p>

          <div className="contacto-dato">
            contacto@sisme.local
          </div>
        </article>

        <article className="tarjeta contacto-card">
          <div className="contacto-icono contacto-verde">
            <svg viewBox="0 0 24 24">
              <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/>
              <circle cx="12" cy="10" r="2.5"/>
            </svg>
          </div>

          <h3>Ubicación</h3>
          <p>Visítanos en nuestra clínica de salud laboral.</p>

          <div className="contacto-dato">
            Zacatecas, México
          </div>
        </article>

      </section>

      {/* INFORMACIÓN OPERATIVA */}
      <section className="contacto-informacion">

        <div className="contacto-horario">
          <div className="contacto-icono contacto-azul contacto-icono-pequeno">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </div>

          <div>
            <h3>Horario de atención</h3>
            <p>Lunes a viernes, de 8:00 a 17:00 horas.</p>
          </div>
        </div>

        <div className="contacto-nota">
          <strong>Información sobre citas</strong>
          <p>
            La programación de citas la realiza el administrador
            con los empleados previamente importados.
            Este medio no crea citas públicas.
          </p>
        </div>

      </section>

      {/* ACCESO AL SISTEMA */}
      <section className="contacto-acceso">
        <h3>¿Necesitas acceder a SISME?</h3>
        <p>
          El sistema cuenta con dos perfiles de acceso:
          Administrador y Doctor. Si olvidaste tu contraseña,
          utiliza la opción de recuperación con tu correo registrado.
        </p>
      </section>

    </main>
  )
}
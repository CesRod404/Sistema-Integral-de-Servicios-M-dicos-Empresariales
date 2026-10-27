export function ContactoPublico() {
  return (
    <main className="pagina-publica">
      <h1 style={{ color: 'var(--navy)', fontSize: '2.2rem' }}>Contáctanos</h1>
      <p className="nota">La programación de citas la realiza el administrador con los empleados ya importados. Este medio no crea citas públicas.</p>
      <section className="contacto-grid">
        <article className="tarjeta">
          <h3>Clínica de salud laboral</h3>
          <p>Zacatecas, México</p>
          <p>Correo: contacto@sisme.local</p>
          <p>Teléfono: 492 000 0000</p>
          <p>Horario operativo de referencia: lunes a viernes, 8:00 a 17:00.</p>
        </article>
        <article className="tarjeta">
          <h3>Acceso al sistema</h3>
          <p>Solo existen dos perfiles: Administrador y Doctor. Si olvidó su contraseña, use la recuperación con el correo registrado.</p>
        </article>
      </section>
    </main>
  )
}

export function IconoServicio({ tipo }) {
  const iconos = {
    examen: (
      <>
        {/* Cabeza del paciente */}
        <circle cx="12" cy="9" r="4" />

        {/* Hombros y torso */}
        <path d="M5 22v-2.5a7 7 0 0 1 14 0V22" />

        {/* Cruz médica */}
        <path d="M23 8v8M19 12h8" />
      </>
    ),

    laboratorio: (
      <>
        {/* Matraz */}
        <path d="M10 3h8" />
        <path d="M12 3v7L5 21a2 2 0 0 0 1.8 3h14.4a2 2 0 0 0 1.8-3l-7-11V3" />

        {/* Nivel del líquido */}
        <path d="M8 18h12" />
        <path d="M11 15h6" />
      </>
    ),

    gabinete: (
      <>
        {/* Pulmón izquierdo */}
        <path d="M15 5v7c0 2-1 3-3 4l-3 2c-2 1-4 0-4-2 0-4 2-8 5-10 2-1 4 0 5 2" />

        {/* Pulmón derecho */}
        <path d="M15 5v7c0 2 1 3 3 4l3 2c2 1 4 0 4-2 0-4-2-8-5-10-2-1-4 0-5 2" />

        {/* Tráquea */}
        <path d="M15 3v11" />

        {/* Ramificaciones */}
        <path d="M15 14l-5 4M15 14l0 5" />
      </>
    ),
  }

  return (
    <svg
      className={`icono-servicio-svg icono-servicio-${tipo}`}
      viewBox="0 0 30 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {iconos[tipo]}
      </g>
    </svg>
  )
}
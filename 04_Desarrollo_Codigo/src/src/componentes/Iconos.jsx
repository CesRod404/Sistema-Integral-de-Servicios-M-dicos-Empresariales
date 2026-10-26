const trazos = {
  inicio: 'M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z',
  pacientes: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8.5 1.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM3.5 19c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4M13 15.2c1.6-.5 3.4-.2 4.6 1.1.8.8 1.2 1.8 1.2 2.7',
  citas: 'M7 3v2M17 3v2M4 8h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
  empresas: 'M4 20V6l6-3 6 3v14M9 20v-4h4v4M8 9h.01M12 9h.01M16 9h.01M8 13h.01M12 13h.01M16 13h.01',
  importacion: 'M12 4v10m0 0 4-4m-4 4-4-4M5 20h14',
  cobranza: 'M4 7h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7Zm0 4h16M8 4v3M16 4v3',
  buscar: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm10 3-4.3-4.3',
  mas: 'M12 5v14M5 12h14',
  checar: 'M5 12.5 9.2 17 19 7',
  cerrar: 'M6 6l12 12M18 6 6 18',
  ojo: 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  candado: 'M8 10V8a4 4 0 0 1 8 0v2M6 10h12v9H6v-9Z',
  usuario: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0',
  calendario: 'M7 3v2M17 3v2M4 8h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
  documento: 'M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm7 0v5h5',
  salir: 'M10 7V5a1 1 0 0 1 1-1h8v16h-8a1 1 0 0 1-1-1v-2M4 12h10M11 9l3 3-3 3',
  reloj: 'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
  lapiz: 'M4 20h4l10-10-4-4L4 16v4Zm9.5-13.5 4 4'
}

export function Icono({ nombre, tamano = 20 }) {
  const d = trazos[nombre] || trazos.documento
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

export function Logo({ compacto = false }) {
  return (
    <div className={`logo ${compacto ? 'logo-compacto' : ''}`}>
      <svg className="logo-marca" viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="24" cy="34" r="16" fill="#eef3f8" stroke="#1f4e89" strokeWidth="2" />
        <circle cx="40" cy="30" r="14" fill="#fff7ec" stroke="#f28c28" strokeWidth="2" />
        <path d="M24 26v16M18 32h12" stroke="#1f4e89" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M40 24c2 3 2 8 0 12" stroke="#2f9e6b" strokeWidth="2" fill="none" />
        <circle cx="40" cy="22" r="2" fill="#2f9e6b" />
      </svg>
      <div>
        <strong>SISME</strong>
        {compacto ? null : <small>Sistema Integral de Servicios Médicos Empresariales</small>}
      </div>
    </div>
  )
}

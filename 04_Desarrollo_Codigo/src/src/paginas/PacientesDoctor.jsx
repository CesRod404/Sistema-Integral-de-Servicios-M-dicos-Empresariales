import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSesion } from '../datos/ProveedorSesion.jsx'
import { columnaKanban } from '../domain/clinica.js'
import { hoyMexico, formatearHora } from '../domain/fecha.js'
import { Aviso, Campo } from '../componentes/Ui.jsx'

const COLUMNAS = [
  ['pendientes', 'Pendientes'],
  ['en_proceso', 'En proceso'],
  ['finalizado', 'Finalizado'],
  ['ausentes', 'Ausentes']
]

export function PacientesDoctor() {
  const { api } = useSesion()
  const navigate = useNavigate()
  const [fecha, setFecha] = useState(hoyMexico())
  const [empresa, setEmpresa] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [empresas, setEmpresas] = useState([])
  const [citas, setCitas] = useState([])
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    api.listarEmpresas().then((resultado) => { if (resultado.ok) setEmpresas(resultado.datos) })
  }, [api])

  useEffect(() => {
    let vivo = true
    api.listarCitas(fecha).then((resultado) => {
      if (!vivo) return
      if (!resultado.ok) setError(resultado.mensaje)
      else setCitas(resultado.datos)
    })
    return () => { vivo = false }
  }, [api, fecha])

  const visibles = useMemo(() => citas.filter((cita) => {
    const texto = `${cita.empleadoNombre} ${cita.empresaNombre}`.toLowerCase()
    if (busqueda && !texto.includes(busqueda.toLowerCase())) return false
    if (empresa && cita.empresaId !== empresa) return false
    return true
  }), [citas, busqueda, empresa])

  function abrir(cita) {
    const columna = columnaKanban(cita)
    if (columna === 'ausentes' || cita.estadoAsistencia === 'programada') {
      setAviso('La atención se abre cuando el administrador marca al paciente como presente.')
      return
    }
    if (cita.estadoAsistencia === 'cancelada') return
    navigate(`/app/atencion/${cita.id}`)
  }

  return (
    <section>
      <div className="encabezado-pagina">
        <div>
          <h1>Cola del día</h1>
          <p className="nota">Cola del día. El estado presente o ausente lo registra el administrador.</p>
        </div>
      </div>
      <Aviso tipo="error">{error}</Aviso>
      <Aviso tipo="info">{aviso}</Aviso>
      <div className="filtros">
        <Campo etiqueta="Fecha">
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </Campo>
        <Campo etiqueta="Empresa">
          <select value={empresa} onChange={(e) => setEmpresa(e.target.value)}>
            <option value="">Todas las empresas</option>
            {empresas.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Buscar paciente">
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Nombre del paciente" />
        </Campo>
      </div>
      <div className="kanban">
        {COLUMNAS.map(([id, titulo]) => {
          const tarjetas = visibles.filter((cita) => columnaKanban(cita) === id)
          return (
            <section key={id} className={`columna col-${id}`}>
              <header><span>{titulo}</span><span>{tarjetas.length}</span></header>
              {tarjetas.map((cita) => (
                <article key={cita.id} className="paciente-card">
                  <button type="button" onClick={() => abrir(cita)}>
                    <strong>{cita.empleadoNombre}</strong>
                    <small>{cita.empresaNombre}</small>
                    <small>{formatearHora(cita.fechaHora)}{cita.estadoAsistencia === 'programada' ? ' · Sin asistencia' : ''}</small>
                  </button>
                </article>
              ))}
            </section>
          )
        })}
      </div>
    </section>
  )
}

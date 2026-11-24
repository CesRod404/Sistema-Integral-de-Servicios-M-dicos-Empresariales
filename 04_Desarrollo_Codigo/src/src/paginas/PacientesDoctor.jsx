import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSesion } from '../datos/ProveedorSesion.jsx'
import { columnaKanban, puedeMarcarAsistencia } from '../domain/clinica.js'
import { hoyMexico, formatearHora } from '../domain/fecha.js'
import { Aviso, Boton, Campo } from '../componentes/Ui.jsx'

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

  async function cargar(dia = fecha) {
    const resultado = await api.listarCitas(dia)
    if (!resultado.ok) setError(resultado.mensaje)
    else setCitas(resultado.datos)
  }

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
      setAviso('Marque al paciente como presente para abrir la atención.')
      return
    }
    if (cita.estadoAsistencia === 'cancelada') return
    navigate(`/app/atencion/${cita.id}`)
  }

  async function asistencia(cita, estado, evento) {
    evento.stopPropagation()
    const resultado = await api.registrarAsistencia(cita.id, estado)
    if (!resultado.ok) {
      setError(resultado.mensaje)
      return
    }
    setError('')
    setAviso(estado === 'presente'
      ? 'El paciente quedó como presente. Ya puede abrir la atención.'
      : 'El paciente quedó como ausente.')
    await cargar(fecha)
  }

  return (
    <section>
      <div className="encabezado-pagina">
        <div>
          <h1>Cola del día</h1>
          <p className="nota">Cola del día. Puede marcar presente o ausente y, si está presente, abrir la atención. Programar, reprogramar o cancelar citas sigue a cargo del administrador.</p>
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
                  {puedeMarcarAsistencia(cita) ? (
                    <div className="acciones-tabla">
                      <Boton variante="linea" onClick={(evento) => asistencia(cita, 'presente', evento)}>Presente</Boton>
                      <Boton variante="linea" onClick={(evento) => asistencia(cita, 'ausente', evento)}>Ausente</Boton>
                    </div>
                  ) : null}
                </article>
              ))}
            </section>
          )
        })}
      </div>
    </section>
  )
}

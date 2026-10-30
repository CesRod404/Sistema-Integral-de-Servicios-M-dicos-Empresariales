import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useSesion } from '../datos/ProveedorSesion.jsx'
import { formatearFecha } from '../domain/fecha.js'
import { etiquetaEstado, tonoEstado } from '../componentes/etiquetas.js'
import { Aviso, Badge, Boton, Campo, Vacio } from '../componentes/Ui.jsx'

// S5-T14: el formulario solo captura nombre, empresa y estado (SDD §4.1).
const VACIO = { nombre: '', empresaId: '', estado: 'provisional' }

function CampoEstado({ valor, onCambio }) {
  return (
    <Campo etiqueta="Estado del registro">
      <select value={valor} onChange={(e) => onCambio(e.target.value)}>
        <option value="provisional">Provisional</option>
        <option value="activo">Activo</option>
        <option value="inactivo">Inactivo</option>
      </select>
    </Campo>
  )
}

export function PacientesAdmin() {
  const { api, usuario } = useSesion()
  const navigate = useNavigate()
  const esDoctor = usuario?.rol === 'doctor'
  const [pacientes, setPacientes] = useState([])
  const [empresas, setEmpresas] = useState([])
  const [texto, setTexto] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [estado, setEstado] = useState('')
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')

  async function cargar() {
    const [lista, catalogo] = await Promise.all([api.consultarPacientesAdmin(), api.listarEmpresas()])
    if (!lista.ok) setError(lista.mensaje)
    else setPacientes(lista.datos)
    if (catalogo.ok) setEmpresas(catalogo.datos)
  }

  useEffect(() => { cargar() }, [api])

  const visibles = useMemo(() => pacientes.filter((paciente) => {
    const blob = `${paciente.nombre} ${paciente.empresaNombre} ${paciente.curp || ''} ${paciente.folio || ''}`.toLowerCase()
    if (texto && !blob.includes(texto.toLowerCase())) return false
    if (empresa && paciente.empresaId !== empresa) return false
    if (estado && paciente.estadoCita !== estado && paciente.estado !== estado) return false
    return true
  }), [pacientes, texto, empresa, estado])

  return (
    <section className="seccion">
      <div className="encabezado-pagina">
        <div>
          <h1>Pacientes</h1>
          <p className="nota">{esDoctor
            ? 'Alta, edición y consulta de pacientes. Al registrar un paciente se abre su atención para adjuntar el examen en PDF.'
            : 'Alta manual o consulta. El expediente clínico se consulta en solo lectura, sin diagnóstico ni PDF.'}</p>
        </div>
        <Alta
          api={api}
          empresas={empresas}
          onGuardado={async (paciente) => {
            if (!esDoctor) return cargar()
            // S5-T14: el paciente que registra el doctor entra siempre a la Cola del
            // día como presente (sin cita previa) y desde ahí se atiende y se adjunta
            // el PDF del examen (SRS RF-14).
            const atencion = await api.abrirAtencionDoctor(paciente.id)
            if (!atencion.ok) { setError(atencion.mensaje); return cargar() }
            navigate('/app/pacientes?vista=cola')
          }}
          onAviso={setAviso}
          onError={setError}
        />
      </div>
      <Aviso tipo="error">{error}</Aviso>
      <Aviso tipo="ok">{aviso}</Aviso>
      <div className="filtros">
        <Campo etiqueta="Buscar"><input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Nombre, empresa o CURP" /></Campo>
        <Campo etiqueta="Empresa">
          <select value={empresa} onChange={(e) => setEmpresa(e.target.value)}>
            <option value="">Todas las empresas</option>
            {empresas.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Estado de cita">
          <select value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todos</option>
            {['programada', 'presente', 'ausente', 'cerrada'].map((item) => <option key={item} value={item}>{etiquetaEstado(item)}</option>)}
          </select>
        </Campo>
      </div>
      <div className="panel tabla-contenedor">
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Nombre</th><th>Edad</th><th>Empresa</th><th>Fecha de registro</th><th>Estudios</th><th>Estado</th><th>Última atención</th><th></th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((paciente) => (
              <tr key={paciente.id}>
                <td>{paciente.folio}</td>
                <td>{paciente.nombre}</td>
                <td>{paciente.edad ?? '—'}</td>
                <td>{paciente.empresaNombre}</td>
                <td>{formatearFecha(paciente.fechaRegistro)}</td>
                <td>{paciente.estudiosNombres || '—'}</td>
                <td>{paciente.estadoCita ? <Badge tono={tonoEstado(paciente.estadoCita)}>{etiquetaEstado(paciente.estadoCita)}</Badge> : '—'}</td>
                <td>{formatearFecha(paciente.fechaAtencion || paciente.ultimaCita, true)}</td>
                <td><Link className="btn btn-linea" to={`/app/pacientes/${paciente.id}`}>Consultar</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
        {visibles.length === 0 ? <Vacio>No hay pacientes con ese filtro.</Vacio> : null}
      </div>
    </section>
  )
}

function Alta({ api, empresas, onGuardado, onAviso, onError }) {
  const [abierto, setAbierto] = useState(false)
  const [form, setForm] = useState(VACIO)
  if (!abierto) return <Boton variante="azul" onClick={() => setAbierto(true)}>Nuevo paciente</Boton>
  return (
    <form className="panel" onSubmit={async (evento) => {
      evento.preventDefault()
      const resultado = await api.guardarEmpleado(form)
      if (!resultado.ok) onError(resultado.mensaje)
      else {
        onError('')
        onAviso('El paciente quedó registrado.')
        setForm(VACIO)
        setAbierto(false)
        onGuardado(resultado.datos)
      }
    }}>
      <h3>Alta manual</h3>
      <div className="form-grid">
        <Campo etiqueta="Nombre completo" requerido><input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required /></Campo>
        <Campo etiqueta="Empresa" requerido>
          <select value={form.empresaId} onChange={(e) => setForm({ ...form, empresaId: e.target.value })} required>
            <option value="">Seleccione</option>
            {empresas.filter((item) => item.estado === 'activo').map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
          </select>
        </Campo>
        <CampoEstado valor={form.estado} onCambio={(valor) => setForm({ ...form, estado: valor })} />
      </div>
      <div className="acciones">
        <Boton variante="azul" tipo="submit">Guardar</Boton>
        <Boton variante="linea" onClick={() => setAbierto(false)}>Cancelar</Boton>
      </div>
    </form>
  )
}

export function FichaPaciente() {
  const { empleadoId } = useParams()
  const { api, usuario } = useSesion()
  const navigate = useNavigate()
  const esDoctor = usuario?.rol === 'doctor'
  const [paciente, setPaciente] = useState(null)
  const [visitas, setVisitas] = useState([])
  const [empresas, setEmpresas] = useState([])
  const [form, setForm] = useState(VACIO)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let vivo = true
    Promise.all([api.consultarPacientesAdmin(), api.consultarVisitasAdmin(empleadoId), api.listarEmpresas()]).then(([lista, visitasRes, empresasRes]) => {
      if (!vivo) return
      if (!lista.ok) setError(lista.mensaje)
      const actual = lista.ok ? lista.datos.find((item) => item.id === empleadoId) : null
      setPaciente(actual || null)
      if (actual) {
        setForm({
          id: actual.id,
          nombre: actual.nombre,
          empresaId: actual.empresaId,
          estado: actual.estado
        })
      }
      if (visitasRes.ok) setVisitas(visitasRes.datos)
      if (empresasRes.ok) setEmpresas(empresasRes.datos)
    })
    return () => { vivo = false }
  }, [api, empleadoId])

  async function guardar(evento) {
    evento.preventDefault()
    const resultado = await api.guardarEmpleado(form)
    if (!resultado.ok) setError(resultado.mensaje)
    else setMensaje('Los datos del paciente se actualizaron. El expediente clínico no se modifica desde aquí.')
  }

  async function abrirAtencion() {
    // S5-T14 / SRS RF-14: atención del doctor para capturar el examen y adjuntar el PDF.
    const resultado = await api.abrirAtencionDoctor(empleadoId)
    if (!resultado.ok) setError(resultado.mensaje)
    else navigate(`/app/atencion/${resultado.datos.citaId}`)
  }

  if (!paciente && !error) return <p className="nota">Cargando paciente…</p>
  if (!paciente) return <Aviso tipo="error">{error || 'El paciente no existe.'}</Aviso>

  return (
    <section className="seccion">
      <div className="encabezado-pagina">
        <div>
          <h1>Consulta de paciente</h1>
          <p className="nota">{paciente.folio} · {paciente.nombre} · Fecha de registro: {formatearFecha(paciente.fechaRegistro)}</p>
        </div>
        <div className="acciones">
          {esDoctor ? <Boton variante="azul" onClick={abrirAtencion}>Atender y adjuntar PDF</Boton> : null}
          <Boton variante="linea" onClick={() => navigate('/app/pacientes')}>Regresar a pacientes</Boton>
        </div>
      </div>
      {esDoctor ? null : <Aviso tipo="info">Consulta de auditoría en solo lectura. El diagnóstico, las observaciones clínicas y los PDF no están disponibles para el administrador.</Aviso>}
      <Aviso tipo="error">{error}</Aviso>
      <Aviso tipo="ok">{mensaje}</Aviso>
      <form className="panel" onSubmit={guardar}>
        <h3>Datos del paciente</h3>
        <div className="form-grid">
          <Campo etiqueta="Nombre completo" requerido><input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></Campo>
          <Campo etiqueta="Empresa" requerido>
            <select value={form.empresaId} onChange={(e) => setForm({ ...form, empresaId: e.target.value })}>
              {empresas.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
            </select>
          </Campo>
          <CampoEstado valor={form.estado} onCambio={(valor) => setForm({ ...form, estado: valor })} />
        </div>
        <Boton variante="azul" tipo="submit">Guardar datos</Boton>
      </form>
      <div className="panel tabla-contenedor">
        <h3>Visitas</h3>
        <table>
          <thead><tr><th>Fecha</th><th>Asistencia</th><th>Expediente</th><th>Estudios</th>{esDoctor ? <th></th> : null}</tr></thead>
          <tbody>
            {visitas.map((visita) => (
              <tr key={visita.citaId}>
                <td>{formatearFecha(visita.fechaHora, true)}</td>
                <td><Badge tono={tonoEstado(visita.estadoAsistencia)}>{etiquetaEstado(visita.estadoAsistencia)}</Badge></td>
                <td>{visita.estadoExpediente ? etiquetaEstado(visita.estadoExpediente) : 'Sin expediente'}</td>
                <td>{visita.estudiosNombres || '—'}</td>
                {esDoctor ? (
                  <td>{['presente', 'cerrada'].includes(visita.estadoAsistencia)
                    ? <Link className="btn btn-linea" to={`/app/atencion/${visita.citaId}`}>Ver atención</Link>
                    : null}</td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
        {visitas.length === 0 ? <Vacio>Este paciente aún no tiene citas.</Vacio> : null}
      </div>
    </section>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useSesion } from '../datos/ProveedorSesion.jsx'
import { formatearFecha } from '../domain/fecha.js'
import { etiquetaEstado, tonoEstado } from '../componentes/etiquetas.js'
import { Aviso, Badge, Boton, Campo, Vacio } from '../componentes/Ui.jsx'

const VACIO = { nombre: '', edad: '', curp: '', claveEmpleado: '', email: '', telefono: '', empresaId: '', estado: 'provisional' }

export function PacientesAdmin() {
  const { api } = useSesion()
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
          <p className="nota">Alta manual o consulta. El expediente clínico se consulta en solo lectura, sin diagnóstico ni PDF.</p>
        </div>
        <Alta api={api} empresas={empresas} onGuardado={cargar} onAviso={setAviso} onError={setError} />
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
              <th>ID</th><th>Nombre</th><th>Edad</th><th>Empresa</th><th>Estudios</th><th>Estado</th><th>Última atención</th><th></th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((paciente) => (
              <tr key={paciente.id}>
                <td>{paciente.folio}</td>
                <td>{paciente.nombre}</td>
                <td>{paciente.edad ?? '—'}</td>
                <td>{paciente.empresaNombre}</td>
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
        onGuardado()
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
        <Campo etiqueta="CURP"><input value={form.curp} onChange={(e) => setForm({ ...form, curp: e.target.value })} /></Campo>
        <Campo etiqueta="Edad"><input value={form.edad} onChange={(e) => setForm({ ...form, edad: e.target.value })} /></Campo>
        <Campo etiqueta="Teléfono"><input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></Campo>
        <Campo etiqueta="Correo"><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Campo>
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
  const { api } = useSesion()
  const navigate = useNavigate()
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
          edad: actual.edad ?? '',
          curp: actual.curp || '',
          claveEmpleado: actual.claveEmpleado || '',
          email: actual.email || '',
          telefono: actual.telefono || '',
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
    else setMensaje('Los datos de contacto se actualizaron. El expediente clínico no se modifica desde aquí.')
  }

  if (!paciente && !error) return <p className="nota">Cargando paciente…</p>
  if (!paciente) return <Aviso tipo="error">{error || 'El paciente no existe.'}</Aviso>

  return (
    <section className="seccion">
      <div className="encabezado-pagina">
        <div>
          <h1>Consulta de paciente</h1>
          <p className="nota">{paciente.folio} · {paciente.nombre}</p>
        </div>
        <Boton variante="linea" onClick={() => navigate('/app/pacientes')}>Regresar a pacientes</Boton>
      </div>
      <Aviso tipo="info">Consulta de auditoría en solo lectura. El diagnóstico, las observaciones clínicas y los PDF no están disponibles para el administrador.</Aviso>
      <Aviso tipo="error">{error}</Aviso>
      <Aviso tipo="ok">{mensaje}</Aviso>
      <form className="panel" onSubmit={guardar}>
        <h3>Datos del paciente</h3>
        <div className="form-grid">
          <Campo etiqueta="Nombre completo" requerido><input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></Campo>
          <Campo etiqueta="Edad"><input value={form.edad} onChange={(e) => setForm({ ...form, edad: e.target.value })} /></Campo>
          <Campo etiqueta="Empresa" requerido>
            <select value={form.empresaId} onChange={(e) => setForm({ ...form, empresaId: e.target.value })}>
              {empresas.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="CURP"><input value={form.curp} onChange={(e) => setForm({ ...form, curp: e.target.value })} /></Campo>
          <Campo etiqueta="Teléfono"><input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></Campo>
          <Campo etiqueta="Correo"><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Campo>
          <Campo etiqueta="Estado del registro">
            <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
              <option value="provisional">Provisional</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </Campo>
        </div>
        <Boton variante="azul" tipo="submit">Guardar datos</Boton>
      </form>
      <div className="panel tabla-contenedor">
        <h3>Visitas</h3>
        <table>
          <thead><tr><th>Fecha</th><th>Asistencia</th><th>Expediente</th><th>Estudios</th></tr></thead>
          <tbody>
            {visitas.map((visita) => (
              <tr key={visita.citaId}>
                <td>{formatearFecha(visita.fechaHora, true)}</td>
                <td><Badge tono={tonoEstado(visita.estadoAsistencia)}>{etiquetaEstado(visita.estadoAsistencia)}</Badge></td>
                <td>{visita.estadoExpediente ? etiquetaEstado(visita.estadoExpediente) : 'Sin expediente'}</td>
                <td>{visita.estudiosNombres || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {visitas.length === 0 ? <Vacio>Este paciente aún no tiene citas.</Vacio> : null}
      </div>
    </section>
  )
}

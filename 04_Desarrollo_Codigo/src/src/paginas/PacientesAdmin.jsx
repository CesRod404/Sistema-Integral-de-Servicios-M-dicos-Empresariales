import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useSesion } from '../datos/ProveedorSesion.jsx'
import { formatearFecha } from '../domain/fecha.js'
import { etiquetaEstado, tonoEstado } from '../componentes/etiquetas.js'
import { Aviso, Badge, Boton, Campo, Vacio } from '../componentes/Ui.jsx'
import { normalizarEdad } from '../domain/validadores.js'
import { formularioPaciente, prepararCitaDeAlta } from '../domain/pacientes.js'
import { marcadorPlantilla } from '../domain/plantillaEmpresa.js'
import { cambiarEmpresaPaciente, inputDeCampo, payloadAltaPaciente, payloadEdicionPaciente, plantillaPredeterminada, resolverPlantilla, valoresDesdePaciente } from '../domain/plantillaCampos.js'

// S5-T14: el formulario captura nombre, empresa y estado (SDD §4.1).
// S7-T08: también captura la edad (opcional, entero de 0 a 120).
// S7-T09: el administrador puede asignar, de forma opcional, fecha y hora de cita.
// S7-T11: al elegir empresa se muestran los campos de su plantilla vigente.
// S7-T14: al editar, si cambia la empresa, los campos cambian a la plantilla de la empresa nueva.
const VACIO = { nombre: '', empresaId: '', estado: 'provisional', edad: '' }
const VACIO_ALTA = { ...VACIO, fechaHoraLocal: '', motivo: '' }

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

function CampoEdad({ valor, onCambio }) {
  const { error } = normalizarEdad(valor)
  return (
    <Campo etiqueta="Edad" error={error}>
      <input type="number" inputMode="numeric" min="0" max="120" step="1" value={valor ?? ''} onChange={(e) => onCambio(e.target.value)} placeholder="Opcional" />
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
            ? 'Alta, edición y consulta de pacientes. Al elegir la empresa aparecen los campos de su plantilla. Al registrar un paciente se abre su atención para adjuntar el examen en PDF.'
            : 'Alta manual o consulta. Al elegir la empresa aparecen los campos de su plantilla Excel. Si indica fecha y hora, la cita queda en la agenda y la doctora la ve en la Cola del día de esa fecha. El expediente clínico se consulta en solo lectura, sin diagnóstico ni PDF.'}</p>
        </div>
        <Alta
          api={api}
          empresas={empresas}
          puedeAgendarCita={!esDoctor}
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
              <th>ID</th><th>Nombre</th><th>Edad</th><th>Empresa</th><th>Plantilla</th><th>Fecha de registro</th><th>Estudios</th><th>Estado</th><th>Última atención</th><th></th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((paciente) => (
              <tr key={paciente.id}>
                <td>{paciente.folio}</td>
                <td>{paciente.nombre}</td>
                <td>{paciente.edad ?? '—'}</td>
                <td>{paciente.empresaNombre}</td>
                <td><MarcadorPlantilla paciente={paciente} /></td>
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

// S7-T15: «Plantilla v2», «Predeterminada» o «v1 · vigente v2» si quedó desactualizado.
function MarcadorPlantilla({ paciente }) {
  const marcador = marcadorPlantilla(paciente || {})
  return <span title={marcador.detalle}><Badge tono={marcador.tono}>{marcador.texto}</Badge></span>
}

function columnasDeAlta(plantilla) {
  return (plantilla?.columnas || []).filter((columna) => columna.clave !== 'nombre_completo')
}

function Alta({ api, empresas, puedeAgendarCita, onGuardado, onAviso, onError }) {
  const [abierto, setAbierto] = useState(false)
  const [form, setForm] = useState(VACIO_ALTA)
  const [plantilla, setPlantilla] = useState(null)
  const [valoresPlantilla, setValoresPlantilla] = useState({})

  useEffect(() => {
    if (!form.empresaId) {
      setPlantilla(null)
      setValoresPlantilla({})
      return
    }
    let vivo = true
    api.obtenerPlantillaEmpresa(form.empresaId).then((resultado) => {
      if (!vivo) return
      if (!resultado.ok) {
        onError(resultado.mensaje)
        const fallback = plantillaPredeterminada(form.empresaId)
        setPlantilla(fallback)
        setValoresPlantilla(valoresDesdePaciente(fallback, { nombre: form.nombre, edad: form.edad }))
        return
      }
      const vigente = resolverPlantilla(resultado.datos, form.empresaId)
      setPlantilla(vigente)
      setValoresPlantilla(valoresDesdePaciente(vigente, { nombre: form.nombre, edad: form.edad }))
    })
    return () => { vivo = false }
  }, [api, form.empresaId])

  function cambiarCampo(clave, valor) {
    setValoresPlantilla((actual) => ({ ...actual, [clave]: valor }))
    if (clave === 'edad') setForm((actual) => ({ ...actual, edad: valor }))
  }

  if (!abierto) return <Boton variante="azul" onClick={() => setAbierto(true)}>Nuevo paciente</Boton>
  const columnas = columnasDeAlta(plantilla)
  const etiquetaPlantilla = !form.empresaId
    ? null
    : (plantilla?.predeterminada || !plantilla?.version
      ? 'Plantilla predeterminada de la empresa. Complete los campos para el registro.'
      : `Campos de la plantilla vigente · versión ${plantilla.version}.`)

  return (
    <form className="panel" onSubmit={async (evento) => {
      evento.preventDefault()
      const vigente = plantilla || plantillaPredeterminada(form.empresaId)
      const valores = { ...valoresPlantilla, nombre_completo: form.nombre }
      if (!('edad' in valores) && form.edad !== '') valores.edad = form.edad
      const preparado = payloadAltaPaciente({
        empresaId: form.empresaId,
        estado: form.estado,
        valores,
        plantilla: vigente
      })
      if (!preparado.ok) {
        onError(preparado.mensaje)
        return
      }
      const citaPreparada = puedeAgendarCita ? prepararCitaDeAlta(form) : { ok: true, cita: null }
      if (!citaPreparada.ok) {
        onError(citaPreparada.mensaje)
        return
      }
      const resultado = await api.guardarEmpleado(preparado.payload)
      if (!resultado.ok) {
        onError(resultado.mensaje)
        return
      }
      if (citaPreparada.cita) {
        const cita = await api.guardarCita({ empleadoId: resultado.datos.id, ...citaPreparada.cita })
        if (!cita.ok) {
          onError(`El paciente quedó registrado, pero la cita no se pudo agendar: ${cita.mensaje}`)
          setForm(VACIO_ALTA)
          setPlantilla(null)
          setValoresPlantilla({})
          setAbierto(false)
          onGuardado(resultado.datos)
          return
        }
        onError('')
        onAviso('El paciente quedó registrado y la cita quedó en la agenda. La doctora la verá en la Cola del día de esa fecha. Márquela como presente cuando llegue.')
      } else {
        onError('')
        onAviso('El paciente quedó registrado.')
      }
      setForm(VACIO_ALTA)
      setPlantilla(null)
      setValoresPlantilla({})
      setAbierto(false)
      onGuardado(resultado.datos)
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
        {!form.empresaId ? <CampoEdad valor={form.edad} onCambio={(valor) => setForm({ ...form, edad: valor })} /> : null}
        <CampoEstado valor={form.estado} onCambio={(valor) => setForm({ ...form, estado: valor })} />
        {columnas.map((columna) => {
          const input = inputDeCampo(columna)
          return (
            <Campo key={columna.clave} etiqueta={columna.etiqueta} requerido={columna.obligatorio}>
              <input
                type={input.type}
                step={input.step}
                value={valoresPlantilla[columna.clave] ?? ''}
                onChange={(e) => cambiarCampo(columna.clave, e.target.value)}
              />
            </Campo>
          )
        })}
        {puedeAgendarCita ? (
          <>
            <Campo etiqueta="Fecha y hora de la cita">
              <input type="datetime-local" value={form.fechaHoraLocal} onChange={(e) => setForm({ ...form, fechaHoraLocal: e.target.value })} />
            </Campo>
            <Campo etiqueta="Motivo">
              <input value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} placeholder="Opcional" />
            </Campo>
          </>
        ) : null}
      </div>
      {etiquetaPlantilla ? <p className="nota">{etiquetaPlantilla}</p> : <p className="nota">Seleccione la empresa para ver los campos de su plantilla.</p>}
      {puedeAgendarCita ? <p className="nota">La fecha y la hora son opcionales. Si las indica, la cita queda programada y aparece en la Cola del día de la doctora. El paciente también se puede registrar sin cita.</p> : null}
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
  const [plantilla, setPlantilla] = useState(null)
  const [valoresPlantilla, setValoresPlantilla] = useState({})
  const [descartados, setDescartados] = useState([])
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')

  async function plantillaDe(empresaId) {
    const resultado = await api.obtenerPlantillaEmpresa(empresaId)
    if (!resultado.ok) {
      setError(resultado.mensaje)
      return plantillaPredeterminada(empresaId)
    }
    return resolverPlantilla(resultado.datos, empresaId)
  }

  // S7-T14: se cargan los datos completos del paciente (con datos_extra) y la
  // plantilla vigente de su empresa para mostrar sus campos en la edición.
  async function cargarPaciente(base) {
    const completo = await api.obtenerEmpleado(empleadoId)
    const actual = completo.ok ? { ...base, ...completo.datos, empresaNombre: base.empresaNombre } : base
    setPaciente(actual)
    setForm(formularioPaciente(actual))
    const vigente = await plantillaDe(actual.empresaId)
    setPlantilla(vigente)
    setValoresPlantilla(valoresDesdePaciente(vigente, actual))
    setDescartados([])
  }

  useEffect(() => {
    let vivo = true
    Promise.all([api.consultarPacientesAdmin(), api.consultarVisitasAdmin(empleadoId), api.listarEmpresas()]).then(([lista, visitasRes, empresasRes]) => {
      if (!vivo) return
      if (!lista.ok) setError(lista.mensaje)
      const actual = lista.ok ? lista.datos.find((item) => item.id === empleadoId) : null
      setPaciente(actual || null)
      if (actual) cargarPaciente(actual)
      if (visitasRes.ok) setVisitas(visitasRes.datos)
      if (empresasRes.ok) setEmpresas(empresasRes.datos)
    })
    return () => { vivo = false }
  }, [api, empleadoId])

  async function cambiarEmpresa(empresaId) {
    setForm((actual) => ({ ...actual, empresaId }))
    if (!empresaId) return
    const nueva = await plantillaDe(empresaId)
    const cambio = cambiarEmpresaPaciente({ valoresActuales: valoresPlantilla, plantillaAnterior: plantilla, plantillaNueva: nueva, paciente })
    setPlantilla(nueva)
    setValoresPlantilla(cambio.valores)
    setDescartados(empresaId === paciente?.empresaId ? [] : cambio.descartados)
  }

  function cambiarCampo(clave, valor) {
    setValoresPlantilla((actual) => ({ ...actual, [clave]: valor }))
    if (clave === 'edad') setForm((actual) => ({ ...actual, edad: valor }))
  }

  async function guardar(evento) {
    evento.preventDefault()
    const preparado = payloadEdicionPaciente({
      paciente,
      nombre: form.nombre,
      empresaId: form.empresaId,
      estado: form.estado,
      edad: form.edad,
      plantilla,
      valores: valoresPlantilla
    })
    if (!preparado.ok) {
      setMensaje('')
      setError(preparado.mensaje)
      return
    }
    const resultado = await api.guardarEmpleado(preparado.payload)
    if (!resultado.ok) {
      setMensaje('')
      setError(resultado.mensaje)
    } else {
      setError('')
      const empresaNombre = empresas.find((item) => item.id === resultado.datos.empresaId)?.nombre || resultado.datos.empresaNombre
      const actualizado = { ...paciente, ...resultado.datos, empresaNombre, plantillaVersionVigente: Number(plantilla?.version) || 0 }
      setPaciente(actualizado)
      setForm(formularioPaciente(actualizado))
      setValoresPlantilla(valoresDesdePaciente(plantilla, actualizado))
      setDescartados([])
      setMensaje('Los datos del paciente se actualizaron. El expediente clínico no se modifica desde aquí.')
    }
  }

  async function abrirAtencion() {
    // S5-T14 / SRS RF-14: atención del doctor para capturar el examen y adjuntar el PDF.
    const resultado = await api.abrirAtencionDoctor(empleadoId)
    if (!resultado.ok) setError(resultado.mensaje)
    else navigate(`/app/atencion/${resultado.datos.citaId}`)
  }

  const columnasEdicion = columnasDeAlta(plantilla)

  if (!paciente && !error) return <p className="nota">Cargando paciente…</p>
  if (!paciente) return <Aviso tipo="error">{error || 'El paciente no existe.'}</Aviso>

  return (
    <section className="seccion">
      <div className="encabezado-pagina">
        <div>
          <h1>Consulta de paciente</h1>
          <p className="nota">{paciente.folio} · {paciente.nombre} · Edad: {paciente.edad ?? '—'} · Fecha de registro: {formatearFecha(paciente.fechaRegistro)}</p>
          <p><MarcadorPlantilla paciente={paciente} /> <small className="nota">{marcadorPlantilla(paciente).detalle}</small></p>
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
            <select value={form.empresaId} onChange={(e) => cambiarEmpresa(e.target.value)}>
              {empresas.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
            </select>
          </Campo>
          {!columnasEdicion.some((columna) => columna.clave === 'edad')
            ? <CampoEdad valor={form.edad} onCambio={(valor) => setForm({ ...form, edad: valor })} />
            : null}
          <CampoEstado valor={form.estado} onCambio={(valor) => setForm({ ...form, estado: valor })} />
          {columnasEdicion.map((columna) => {
            const input = inputDeCampo(columna)
            return (
              <Campo key={columna.clave} etiqueta={columna.etiqueta} requerido={columna.obligatorio}>
                <input
                  type={input.type}
                  step={input.step}
                  value={valoresPlantilla[columna.clave] ?? ''}
                  onChange={(e) => cambiarCampo(columna.clave, e.target.value)}
                />
              </Campo>
            )
          })}
        </div>
        <p className="nota">{plantilla?.predeterminada || !plantilla?.version
          ? 'Campos de la plantilla predeterminada de la empresa.'
          : `Campos de la plantilla vigente de la empresa · versión ${plantilla.version}.`}</p>
        {descartados.length
          ? <Aviso tipo="pendiente">{`La empresa nueva no usa estos campos de la plantilla anterior y se quitarán al guardar: ${descartados.join(', ')}.`}</Aviso>
          : null}
        <div className="acciones">
          <Boton variante="azul" tipo="submit">Guardar datos</Boton>
        </div>
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

import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useSesion } from '../datos/ProveedorSesion.jsx'
import { aMexicoInput, formatearFecha } from '../domain/fecha.js'
import { etiquetaEstado, tonoEstado } from '../componentes/etiquetas.js'
import { Aviso, Badge, Boton, Campo, CasillaTodos, Modal, Vacio } from '../componentes/Ui.jsx'
import { alternarSeleccion, alternarTodos, estadoSeleccion, resumenNombres, seleccionVisible } from '../domain/seleccion.js'
import { normalizarEdad } from '../domain/validadores.js'
import { citaEditable, formularioEdicionCita, formularioPaciente, prepararCitaDeAlta, prepararEdicionCita } from '../domain/pacientes.js'
import { marcadorPlantilla } from '../domain/plantillaEmpresa.js'
import { cambiarEmpresaPaciente, inputDeCampo, payloadAltaPaciente, payloadEdicionPaciente, plantillaPredeterminada, resolverPlantilla, valoresDesdePaciente } from '../domain/plantillaCampos.js'

// S5-T14: el formulario captura nombre, empresa y estado (SDD §4.1).
// S7-T08: también captura la edad (opcional, entero de 0 a 120).
// S7-T09: el administrador puede asignar, de forma opcional, fecha y hora de cita.
// S7-T11: al elegir empresa se muestran los campos de su plantilla vigente.
// S7-T14: al editar, si cambia la empresa, los campos cambian a la plantilla de la empresa nueva.
// S7-T20: en la ficha, el administrador edita fecha, hora y motivo de las citas abiertas.
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
  // S7-T16: el alta se abre debajo del encabezado, centrada, y no a un lado del título.
  const [altaAbierta, setAltaAbierta] = useState(false)
  // S7-T17: selección múltiple para dar de baja varios pacientes (solo Administrador).
  const [seleccion, setSeleccion] = useState(() => new Set())
  const [confirmarBaja, setConfirmarBaja] = useState(false)

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

  const puedeSeleccionar = !esDoctor
  const idsVisibles = useMemo(() => visibles.map((paciente) => paciente.id), [visibles])
  useEffect(() => { setSeleccion((actual) => seleccionVisible(actual, idsVisibles)) }, [idsVisibles])
  const seleccionados = visibles.filter((paciente) => seleccion.has(paciente.id))
  const aDarDeBaja = seleccionados.filter((paciente) => paciente.estado !== 'inactivo')

  async function darDeBaja() {
    const resultado = await api.darDeBajaPacientes(aDarDeBaja.map((paciente) => paciente.id))
    setConfirmarBaja(false)
    if (!resultado.ok) {
      setAviso('')
      setError(resultado.mensaje)
      return
    }
    setError('')
    setAviso(`${resultado.datos.actualizados} paciente(s) dados de baja (quedan inactivos). Sus citas, expedientes y cobros se conservan; se pueden reactivar desde su ficha.`)
    setSeleccion(new Set())
    await cargar()
  }

  return (
    <section className="seccion">
      <div className="encabezado-pagina">
        <div>
          <h1>Pacientes</h1>
          <p className="nota">{esDoctor
            ? 'Alta, edición y consulta de pacientes. Al elegir la empresa aparecen los campos de su plantilla. Al registrar un paciente se abre su atención para adjuntar el examen en PDF.'
            : 'Alta manual o consulta. Al elegir la empresa aparecen los campos de su plantilla Excel. Si indica fecha y hora, la cita queda en la agenda y la doctora la ve en la Cola del día de esa fecha. El expediente clínico se consulta en solo lectura, sin diagnóstico ni PDF.'}</p>
        </div>
        {!altaAbierta ? <Boton variante="azul" onClick={() => setAltaAbierta(true)}>Nuevo paciente</Boton> : null}
      </div>
      <Aviso tipo="error">{error}</Aviso>
      <Aviso tipo="ok">{aviso}</Aviso>
      {altaAbierta ? (
        <Alta
          onCerrar={() => setAltaAbierta(false)}
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
      ) : null}
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
            <option value="inactivo">Paciente inactivo (baja)</option>
          </select>
        </Campo>
      </div>
      <div className="panel tabla-contenedor">
        {puedeSeleccionar && seleccion.size ? (
          <div className="barra-seleccion" role="status">
            <span>{seleccion.size} paciente(s) seleccionado(s)</span>
            <div className="acciones">
              <Boton variante="peligro" disabled={!aDarDeBaja.length} onClick={() => setConfirmarBaja(true)}>Dar de baja seleccionados</Boton>
              <Boton variante="linea" onClick={() => setSeleccion(new Set())}>Quitar selección</Boton>
            </div>
          </div>
        ) : null}
        <table>
          <thead>
            <tr>
              {puedeSeleccionar ? (
                <th className="col-casilla">
                  <CasillaTodos
                    estado={estadoSeleccion(seleccion, idsVisibles)}
                    etiqueta="Seleccionar todos los pacientes del filtro"
                    disabled={!idsVisibles.length}
                    onCambio={() => setSeleccion((actual) => alternarTodos(actual, idsVisibles))}
                  />
                </th>
              ) : null}
              <th>ID</th><th>Nombre</th><th>Edad</th><th>Empresa</th><th>Plantilla</th><th>Fecha de registro</th><th>Estudios</th><th>Estado</th><th>Última atención</th><th></th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((paciente) => (
              <tr key={paciente.id} className={seleccion.has(paciente.id) ? 'seleccionada' : undefined}>
                {puedeSeleccionar ? (
                  <td className="col-casilla">
                    <input
                      type="checkbox"
                      className="casilla-seleccion"
                      aria-label={`Seleccionar a ${paciente.nombre}`}
                      checked={seleccion.has(paciente.id)}
                      onChange={() => setSeleccion((actual) => alternarSeleccion(actual, paciente.id))}
                    />
                  </td>
                ) : null}
                <td>{paciente.folio}</td>
                <td>{paciente.nombre}{paciente.estado === 'inactivo' ? <> <Badge tono="rojo">Inactivo</Badge></> : null}</td>
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
      <Modal titulo="Dar de baja pacientes" abierto={confirmarBaja} onCerrar={() => setConfirmarBaja(false)}>
        <p>Se dará de baja a {aDarDeBaja.length} paciente(s): {resumenNombres(aDarDeBaja)}.</p>
        {seleccionados.length > aDarDeBaja.length ? <p className="nota">{seleccionados.length - aDarDeBaja.length} ya estaban inactivos y no cambian.</p> : null}
        <p className="nota">Es una baja lógica: el paciente queda «Inactivo» y su historial (citas, expedientes y cobros) se conserva. Se puede reactivar desde su ficha, en «Estado del registro».</p>
        <div className="acciones">
          <Boton variante="peligro" onClick={darDeBaja}>Confirmar baja</Boton>
          <Boton variante="linea" onClick={() => setConfirmarBaja(false)}>Volver</Boton>
        </div>
      </Modal>
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

function Alta({ api, empresas, puedeAgendarCita, onGuardado, onAviso, onError, onCerrar }) {
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

  const columnas = columnasDeAlta(plantilla)
  const etiquetaPlantilla = !form.empresaId
    ? null
    : (plantilla?.predeterminada || !plantilla?.version
      ? 'Plantilla predeterminada de la empresa. Complete los campos para el registro.'
      : `Campos de la plantilla vigente · versión ${plantilla.version}.`)

  return (
    <form className="panel formulario-centrado" onSubmit={async (evento) => {
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
          onCerrar()
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
      onCerrar()
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
        <Boton variante="linea" onClick={() => onCerrar()}>Cancelar</Boton>
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
  const [edicionCita, setEdicionCita] = useState(null)

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

  async function recargarVisitas() {
    const resultado = await api.consultarVisitasAdmin(empleadoId)
    if (resultado.ok) setVisitas(resultado.datos)
  }

  // S7-T20: reprograma la cita con la misma RPC de la agenda (programar_cita).
  async function guardarCita(evento) {
    evento.preventDefault()
    const preparado = prepararEdicionCita({ ...edicionCita, empleadoId })
    if (!preparado.ok) {
      setMensaje('')
      setError(preparado.mensaje)
      return
    }
    const resultado = await api.guardarCita(preparado.cita)
    if (!resultado.ok) {
      setMensaje('')
      setError(resultado.mensaje)
      return
    }
    setError('')
    setEdicionCita(null)
    setMensaje('La cita se actualizó. Si cambió la fecha o la hora, la asistencia vuelve a «Programada» y la doctora la verá en la Cola del día de esa fecha.')
    await recargarVisitas()
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
      <form className="panel formulario-centrado" onSubmit={guardar}>
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
      {edicionCita ? (
        <form className="panel formulario-centrado" onSubmit={guardarCita}>
          <h3>Editar cita</h3>
          <div className="form-grid">
            <Campo etiqueta="Fecha y hora de la cita" requerido>
              <input type="datetime-local" value={edicionCita.fechaHoraLocal} onChange={(e) => setEdicionCita({ ...edicionCita, fechaHoraLocal: e.target.value })} required />
            </Campo>
            <Campo etiqueta="Motivo">
              <input value={edicionCita.motivo} onChange={(e) => setEdicionCita({ ...edicionCita, motivo: e.target.value })} placeholder="Opcional" />
            </Campo>
          </div>
          <p className="nota">Si cambia la fecha o la hora, la asistencia vuelve a «Programada». Las citas cerradas o canceladas no se editan.</p>
          <div className="acciones">
            <Boton variante="azul" tipo="submit">Guardar cita</Boton>
            <Boton variante="linea" onClick={() => setEdicionCita(null)}>Cancelar</Boton>
          </div>
        </form>
      ) : null}
      <div className="panel tabla-contenedor">
        <h3>Visitas</h3>
        <table>
          <thead><tr><th>Fecha</th><th>Motivo</th><th>Asistencia</th><th>Expediente</th><th>Estudios</th><th></th></tr></thead>
          <tbody>
            {visitas.map((visita) => (
              <tr key={visita.citaId}>
                <td>{formatearFecha(visita.fechaHora, true)}</td>
                <td>{visita.motivo || '—'}</td>
                <td><Badge tono={tonoEstado(visita.estadoAsistencia)}>{etiquetaEstado(visita.estadoAsistencia)}</Badge></td>
                <td>{visita.estadoExpediente ? etiquetaEstado(visita.estadoExpediente) : 'Sin expediente'}</td>
                <td>{visita.estudiosNombres || '—'}</td>
                {esDoctor ? (
                  <td>{['presente', 'cerrada'].includes(visita.estadoAsistencia)
                    ? <Link className="btn btn-linea" to={`/app/atencion/${visita.citaId}`}>Ver atención</Link>
                    : null}</td>
                ) : (
                  <td>{citaEditable(visita, usuario?.rol)
                    ? <Boton variante="linea" onClick={() => { setMensaje(''); setEdicionCita(formularioEdicionCita(visita, aMexicoInput)) }}>Editar cita</Boton>
                    : null}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {visitas.length === 0 ? <Vacio>Este paciente aún no tiene citas.</Vacio> : null}
      </div>
    </section>
  )
}

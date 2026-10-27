import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useSesion } from '../datos/ProveedorSesion.jsx'
import { aMexicoInput, formatearFecha } from '../domain/fecha.js'
import { Aviso, Boton, Campo } from '../componentes/Ui.jsx'

export function Atencion() {
  const { citaId } = useParams()
  const { api } = useSesion()
  const [atencion, setAtencion] = useState(null)
  const [estudios, setEstudios] = useState([])
  const [form, setForm] = useState({ diagnostico: '', observaciones: '', fechaAtencionLocal: '', estudios: [] })
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')

  async function cargar() {
    const [detalle, catalogo] = await Promise.all([api.obtenerAtencion(citaId), api.listarEstudios()])
    if (!detalle.ok) {
      setError(detalle.mensaje)
      return
    }
    setAtencion(detalle.datos)
    if (catalogo.ok) setEstudios(catalogo.datos.filter((item) => item.vigente !== false))
    const expediente = detalle.datos.expediente
    setForm({
      diagnostico: expediente?.diagnostico || '',
      observaciones: expediente?.observaciones || '',
      fechaAtencionLocal: expediente?.fechaAtencion ? aMexicoInput(expediente.fechaAtencion).slice(0, 10) : '',
      estudios: (expediente?.estudios || []).map((item) => item.id)
    })
  }

  useEffect(() => { cargar() }, [api, citaId])

  if (!atencion && !error) return <p className="nota">Cargando atención…</p>
  if (!atencion) return <Aviso tipo="error">{error}</Aviso>

  const cerrado = atencion.expediente?.estadoExpediente === 'cerrado'
  const puedeCapturar = atencion.cita.estadoAsistencia === 'presente' && !cerrado
  const estudiosMarcados = new Set(form.estudios)

  function alternar(id) {
    setForm((actual) => ({
      ...actual,
      estudios: actual.estudios.includes(id) ? actual.estudios.filter((item) => item !== id) : [...actual.estudios, id]
    }))
  }

  async function guardar(evento) {
    evento.preventDefault()
    const resultado = await api.guardarAtencion(citaId, form)
    if (!resultado.ok) setError(resultado.mensaje)
    else {
      setError('')
      setMensaje('La atención se guardó. El cierre sigue bloqueado si faltan la fecha o el diagnóstico.')
      setAtencion(resultado.datos)
    }
  }

  async function cerrar() {
    const guardado = await api.guardarAtencion(citaId, form)
    if (!guardado.ok) {
      setError(guardado.mensaje)
      return
    }
    const expedienteId = guardado.datos?.expediente?.id
    if (!expedienteId) {
      setError('No se pudo preparar el expediente para el cierre.')
      return
    }
    const resultado = await api.cerrarExpediente(expedienteId)
    if (!resultado.ok) setError(resultado.mensaje)
    else {
      setError('')
      setMensaje('El expediente quedó cerrado. La cita pasó a finalizada y se generó el cargo con el precio vigente.')
      await cargar()
    }
  }

  async function subir(evento) {
    const archivo = evento.target.files?.[0]
    evento.target.value = ''
    if (!archivo || !atencion.expediente) {
      setError('Guarde la atención antes de adjuntar el PDF.')
      return
    }
    const resultado = await api.subirPdf(atencion.expediente.id, archivo)
    if (!resultado.ok) setError(resultado.mensaje)
    else {
      setError('')
      setMensaje('El PDF quedó en el repositorio privado.')
      await cargar()
    }
  }

  async function ver(archivoId) {
    const resultado = await api.abrirPdf(archivoId)
    if (!resultado.ok) setError(resultado.mensaje)
    else window.open(resultado.datos.url, '_blank', 'noopener')
  }

  return (
    <section className="seccion">
      <div className="encabezado-pagina">
        <div>
          <h1>Atención médica</h1>
          <p className="nota">{atencion.cita.empleadoNombre} · {atencion.cita.empresaNombre} · {formatearFecha(atencion.cita.fechaHora, true)}</p>
        </div>
        <Link className="btn btn-linea" to="/app/pacientes">Regresar a pacientes</Link>
      </div>
      <Aviso tipo="error">{error}</Aviso>
      <Aviso tipo="ok">{mensaje}</Aviso>
      {!puedeCapturar && !cerrado ? <Aviso tipo="info">Solo se captura la atención de un paciente presente.</Aviso> : null}
      {cerrado ? <Aviso tipo="info">El expediente está cerrado y ya no admite cambios.</Aviso> : null}
      <form className="dos-columnas" onSubmit={guardar}>
        <div className="panel">
          <h3>Datos clínicos</h3>
          <Campo etiqueta="Fecha de atención" requerido>
            <input type="date" value={form.fechaAtencionLocal} disabled={!puedeCapturar} onChange={(e) => setForm({ ...form, fechaAtencionLocal: e.target.value })} />
          </Campo>
          <Campo etiqueta="Diagnóstico" requerido>
            <textarea value={form.diagnostico} disabled={!puedeCapturar} onChange={(e) => setForm({ ...form, diagnostico: e.target.value })} />
          </Campo>
          <Campo etiqueta="Observaciones">
            <textarea value={form.observaciones} disabled={!puedeCapturar} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} />
          </Campo>
          <h3>Estudios realizados</h3>
          <div className="check-lista">
            {estudios.map((estudio) => (
              <label key={estudio.id}>
                <input type="checkbox" checked={estudiosMarcados.has(estudio.id)} disabled={!puedeCapturar} onChange={() => alternar(estudio.id)} />
                {estudio.nombre}
              </label>
            ))}
          </div>
          {puedeCapturar ? <div className="acciones"><Boton variante="azul" tipo="submit">Guardar atención</Boton><Boton variante="naranja" onClick={cerrar}>Cerrar expediente</Boton></div> : null}
        </div>
        <div className="panel">
          <h3>Examen médico PDF</h3>
          <p className="nota">Solo PDF, máximo 5 MB. El acceso se entrega con una liga temporal y no queda público.</p>
          {puedeCapturar ? <input type="file" accept="application/pdf,.pdf" onChange={subir} /> : null}
          <ul>
            {(atencion.expediente?.archivos || []).map((archivo) => (
              <li key={archivo.id}>
                {archivo.nombre} ({Math.ceil(archivo.tamano / 1024)} KB)
                <button type="button" className="btn btn-texto" onClick={() => ver(archivo.id)}>Ver</button>
              </li>
            ))}
          </ul>
          {(atencion.expediente?.archivos || []).length === 0 ? <p className="nota">Aún no hay archivos.</p> : null}
        </div>
      </form>
    </section>
  )
}

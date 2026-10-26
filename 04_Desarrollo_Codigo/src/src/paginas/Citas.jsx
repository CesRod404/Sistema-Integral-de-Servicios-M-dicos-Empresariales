import { useEffect, useState } from 'react'
import { useSesion } from '../datos/ProveedorSesion.jsx'
import { aMexicoInput, formatearHora, hoyMexico } from '../domain/fecha.js'
import { etiquetaEstado, tonoEstado } from '../componentes/etiquetas.js'
import { Aviso, Badge, Boton, Campo, Vacio } from '../componentes/Ui.jsx'

const VACIO = { id: null, empleadoId: '', fechaHoraLocal: '', motivo: '' }

export function Citas() {
  const { api, usuario } = useSesion()
  const admin = usuario.rol === 'administrador'
  const [fecha, setFecha] = useState(hoyMexico())
  const [citas, setCitas] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [empresa, setEmpresa] = useState('')
  const [form, setForm] = useState({ ...VACIO, fechaHoraLocal: `${hoyMexico()}T09:00` })
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')

  async function cargar(dia = fecha) {
    const lista = await api.listarCitas(dia)
    if (!lista.ok) setError(lista.mensaje)
    else setCitas(lista.datos)
    if (admin) {
      const personas = await api.listarEmpleados()
      if (personas.ok) setEmpleados(personas.datos.filter((item) => item.estado !== 'inactivo'))
    }
  }

  useEffect(() => { cargar(fecha) }, [api, fecha])
  useEffect(() => api.suscribirCitas(() => cargar(fecha)), [api, fecha])

  function moverDia(delta) {
    const base = new Date(`${fecha}T12:00:00-06:00`)
    base.setUTCDate(base.getUTCDate() + delta)
    const dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).format(base)
    setFecha(dia)
  }

  async function guardar(evento) {
    evento.preventDefault()
    const resultado = await api.guardarCita(form)
    if (!resultado.ok) setError(resultado.mensaje)
    else {
      setError('')
      setMensaje(form.id ? 'La cita se reprogramó.' : 'La cita quedó en la agenda.')
      setForm({ ...VACIO, fechaHoraLocal: `${fecha}T09:00` })
      await cargar(fecha)
    }
  }

  async function asistencia(cita, estado) {
    const resultado = await api.registrarAsistencia(cita.id, estado)
    if (!resultado.ok) setError(resultado.mensaje)
    else {
      setError('')
      setMensaje(`Asistencia actualizada: ${etiquetaEstado(estado)}.`)
      await cargar(fecha)
    }
  }

  async function cancelar(cita) {
    const resultado = await api.cancelarCita(cita.id)
    if (!resultado.ok) setError(resultado.mensaje)
    else {
      setMensaje('La cita se canceló. El historial se conserva.')
      await cargar(fecha)
    }
  }

  const empresas = [...new Map(empleados.map((item) => [item.empresaId, item.empresaNombre])).entries()]
  const candidatos = empleados.filter((item) => !empresa || item.empresaId === empresa)

  return (
    <section className="seccion">
      <div className="encabezado-pagina">
        <div>
          <h1>Citas</h1>
          <p className="nota">{admin ? 'Agenda, reprogramación y sala de espera.' : 'Consulta de la agenda. La asistencia la registra el administrador.'}</p>
        </div>
        <div className="acciones">
          <Boton variante="linea" onClick={() => moverDia(-1)}>Día anterior</Boton>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          <Boton variante="linea" onClick={() => setFecha(hoyMexico())}>Hoy</Boton>
          <Boton variante="linea" onClick={() => moverDia(1)}>Día siguiente</Boton>
        </div>
      </div>
      <Aviso tipo="error">{error}</Aviso>
      <Aviso tipo="ok">{mensaje}</Aviso>
      <div className={admin ? 'dos-columnas' : ''}>
        <div className="panel sala">
          <h3>Sala de espera</h3>
          {citas.length === 0 ? <Vacio>No hay citas en esta fecha.</Vacio> : null}
          {citas.map((cita) => (
            <article key={cita.id} className="cita-item">
              <span className="hora">{formatearHora(cita.fechaHora)}</span>
              <div>
                <strong>{cita.empleadoNombre}</strong>
                <div className="nota">{cita.empresaNombre}</div>
              </div>
              <Badge tono={tonoEstado(cita.estadoAsistencia)}>{etiquetaEstado(cita.estadoAsistencia)}</Badge>
              {admin ? (
                <div className="acciones-tabla">
                  {['programada', 'presente', 'ausente'].includes(cita.estadoAsistencia) ? (
                    <>
                      <Boton variante="linea" onClick={() => asistencia(cita, 'presente')}>Presente</Boton>
                      <Boton variante="linea" onClick={() => asistencia(cita, 'ausente')}>Ausente</Boton>
                      <Boton variante="texto" onClick={() => setForm({ id: cita.id, empleadoId: cita.empleadoId, fechaHoraLocal: aMexicoInput(cita.fechaHora), motivo: cita.motivo })}>Reprogramar</Boton>
                      <Boton variante="peligro" onClick={() => cancelar(cita)}>Cancelar</Boton>
                    </>
                  ) : null}
                </div>
              ) : <span />}
            </article>
          ))}
        </div>
        {admin ? (
          <form className="panel" onSubmit={guardar}>
            <h3>{form.id ? 'Reprogramar cita' : 'Nueva cita'}</h3>
            <Campo etiqueta="Empresa">
              <select value={empresa} onChange={(e) => setEmpresa(e.target.value)}>
                <option value="">Todas</option>
                {empresas.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
              </select>
            </Campo>
            <Campo etiqueta="Paciente" requerido>
              <select value={form.empleadoId} onChange={(e) => setForm({ ...form, empleadoId: e.target.value })} required>
                <option value="">Seleccione un empleado</option>
                {candidatos.map((item) => <option key={item.id} value={item.id}>{item.nombre} · {item.empresaNombre}</option>)}
              </select>
            </Campo>
            <Campo etiqueta="Fecha y hora" requerido>
              <input type="datetime-local" value={form.fechaHoraLocal} onChange={(e) => setForm({ ...form, fechaHoraLocal: e.target.value })} required />
            </Campo>
            <Campo etiqueta="Motivo">
              <input value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} />
            </Campo>
            <div className="acciones">
              <Boton variante="azul" tipo="submit">Guardar cita</Boton>
              {form.id ? <Boton variante="linea" onClick={() => setForm({ ...VACIO, fechaHoraLocal: `${fecha}T09:00` })}>Limpiar</Boton> : null}
            </div>
          </form>
        ) : null}
      </div>
    </section>
  )
}

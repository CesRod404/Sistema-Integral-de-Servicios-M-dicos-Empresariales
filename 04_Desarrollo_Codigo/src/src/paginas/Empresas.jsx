import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSesion } from '../datos/ProveedorSesion.jsx'
import { consolidarPorEmpresa, moneda } from '../domain/cobranza.js'
import { etiquetaEstado, tonoEstado } from '../componentes/etiquetas.js'
import { plantillaExcelEmpresa } from '../domain/excelArchivo.js'
import { nombreArchivoPlantilla } from '../domain/plantillaEmpresa.js'
import { EMPRESA_VACIA, FILTROS_ESTADO_EMPRESA, filtrarEmpresas, formularioDesdeEmpresa, resumenEmpresas } from '../domain/empresas.js'
import { validarEmpresa } from '../domain/validadores.js'
import { descargarXlsx } from '../componentes/descarga.js'
import { Aviso, Badge, Boton, Campo, Modal, Vacio } from '../componentes/Ui.jsx'

const VACIO = EMPRESA_VACIA

export function Empresas() {
  const { api } = useSesion()
  const [empresas, setEmpresas] = useState([])
  const [cuentas, setCuentas] = useState([])
  const [texto, setTexto] = useState('')
  const [form, setForm] = useState(VACIO)
  const [erroresForm, setErroresForm] = useState({})
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [baja, setBaja] = useState(null)
  const [filtroEstado, setFiltroEstado] = useState('todas')
  const [consulta, setConsulta] = useState(null)

  async function cargar() {
    const lista = await api.listarEmpresas()
    if (!lista.ok) {
      setError(lista.mensaje)
      return
    }
    setEmpresas(lista.datos)
    const cargos = await api.listarCargos()
    if (cargos.ok) setCuentas(consolidarPorEmpresa(lista.datos, cargos.datos.cargos, cargos.datos.pagos))
  }

  useEffect(() => { cargar() }, [api])

  function cambiar(campo, valor) {
    setForm({ ...form, [campo]: valor })
    if (erroresForm[campo]) setErroresForm({ ...erroresForm, [campo]: undefined })
  }

  // US-EMP-02 / RF-05: carga solo los campos editables de la empresa elegida.
  function editar(empresa) {
    setForm(formularioDesdeEmpresa(empresa))
    setErroresForm({})
    setError('')
    setMensaje('')
    if (typeof window !== 'undefined' && window.scrollTo) window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelarEdicion() {
    setForm(VACIO)
    setErroresForm({})
  }

  async function guardar(evento) {
    evento.preventDefault()
    const errores = validarEmpresa(form)
    setErroresForm(errores)
    if (Object.keys(errores).length) {
      setMensaje('')
      setError(Object.values(errores)[0])
      return
    }
    const resultado = await api.guardarEmpresa(form)
    if (!resultado.ok) {
      setMensaje('')
      setError(resultado.mensaje)
    } else {
      setError('')
      if (resultado.sinCambios) setMensaje('No hubo cambios en los datos de la empresa.')
      else setMensaje(form.id ? 'Los datos de contacto se actualizaron.' : 'La empresa se dio de alta.')
      setForm(VACIO)
      setErroresForm({})
      await cargar()
    }
  }

  async function confirmarBaja() {
    const resultado = await api.cambiarEstadoEmpresa(baja.id, 'inactivo')
    setBaja(null)
    if (!resultado.ok) setError(resultado.mensaje)
    else {
      setMensaje('La empresa quedó inactiva. El historial de citas, expedientes y cobros se conserva.')
      await cargar()
    }
  }

  async function reactivar(empresa) {
    const resultado = await api.cambiarEstadoEmpresa(empresa.id, 'activo')
    if (!resultado.ok) setError(resultado.mensaje)
    else {
      setMensaje('La empresa volvió a estar activa.')
      await cargar()
    }
  }

  async function descargarPlantilla(empresa) {
    // CRQ-004: plantilla propia de la empresa o, si no tiene, la predeterminada.
    const plantilla = await api.obtenerPlantillaEmpresa(empresa.id)
    if (!plantilla.ok) {
      setError(plantilla.mensaje)
      return
    }
    const buffer = await plantillaExcelEmpresa({ empresa, plantilla: plantilla.datos })
    descargarXlsx(buffer, nombreArchivoPlantilla(empresa, plantilla.datos))
  }

  // US-EMP-03 / RF-06: consulta con filtro por estado y búsqueda por texto.
  const visibles = filtrarEmpresas(empresas, { texto, estado: filtroEstado })
  const resumen = resumenEmpresas(empresas)
  const cuentaConsulta = consulta ? cuentas.find((item) => item.empresaId === consulta.id) : null
  const enEdicion = form.id ? empresas.find((empresa) => empresa.id === form.id) : null

  return (
    <section className="seccion">
      <div className="encabezado-pagina">
        <div>
          <h1>Empresas</h1>
          <p className="nota">Catálogo de clientes y datos de contacto. La baja es lógica.</p>
        </div>
        <Link className="btn btn-naranja" to="/app/importacion">Importar empleados</Link>
      </div>
      <Aviso tipo="error">{error}</Aviso>
      <Aviso tipo="ok">{mensaje}</Aviso>
      {/* S7-T16: formulario centrado; la búsqueda pasa a una barra de filtros. */}
      <form className="panel formulario-centrado" onSubmit={guardar} noValidate>
        <h3>{form.id ? 'Editar datos de contacto' : 'Nueva empresa'}</h3>
        {enEdicion ? <p className="nota">{enEdicion.folio} · {enEdicion.nombre} ({etiquetaEstado(enEdicion.estado)})</p> : null}
        <div className="form-grid">
          <Campo etiqueta="Nombre" requerido error={erroresForm.nombre}><input value={form.nombre} onChange={(e) => cambiar('nombre', e.target.value)} required /></Campo>
          <Campo etiqueta="Contacto" requerido error={erroresForm.contacto}><input value={form.contacto} onChange={(e) => cambiar('contacto', e.target.value)} required /></Campo>
          <Campo etiqueta="Correo" requerido error={erroresForm.email}><input type="email" value={form.email} onChange={(e) => cambiar('email', e.target.value)} required /></Campo>
          <Campo etiqueta="Teléfono" error={erroresForm.telefono}><input value={form.telefono} onChange={(e) => cambiar('telefono', e.target.value)} placeholder="10 dígitos" /></Campo>
          <Campo etiqueta="Dirección"><input value={form.direccion} onChange={(e) => cambiar('direccion', e.target.value)} /></Campo>
          <Campo etiqueta="Notas"><input value={form.notas} onChange={(e) => cambiar('notas', e.target.value)} /></Campo>
        </div>
        <div className="acciones">
          <Boton variante="azul" tipo="submit">{form.id ? 'Guardar cambios' : 'Registrar empresa'}</Boton>
          {form.id ? <Boton variante="linea" onClick={cancelarEdicion}>Cancelar edición</Boton> : null}
        </div>
      </form>
      <div className="panel">
        <h3>Consultar empresas</h3>
        <div className="filtros">
          <Campo etiqueta="Buscar"><input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Folio, nombre, contacto, correo o teléfono" /></Campo>
          <Campo etiqueta="Estado">
            <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
              {FILTROS_ESTADO_EMPRESA.map((opcion) => <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>)}
            </select>
          </Campo>
        </div>
        <div className="resumen-previa">
          <span>{resumen.total} registradas</span>
          <span>{resumen.activas} activas</span>
          <span>{resumen.inactivas} inactivas</span>
        </div>
      </div>
      <div className="panel tabla-contenedor">
        <table>
          <thead>
            <tr><th>ID</th><th>Empresa</th><th>Estado</th><th>Contacto</th><th>Teléfono</th><th>Correo</th><th>Total a cobrar</th><th>Estado de cuenta</th><th></th></tr>
          </thead>
          <tbody>
            {visibles.map((empresa) => {
              const cuenta = cuentas.find((item) => item.empresaId === empresa.id)
              return (
                <tr key={empresa.id}>
                  <td>{empresa.folio}</td>
                  <td>{empresa.nombre}</td>
                  <td><Badge tono={tonoEstado(empresa.estado)}>{etiquetaEstado(empresa.estado)}</Badge></td>
                  <td>{empresa.contacto}</td>
                  <td>{empresa.telefono || '—'}</td>
                  <td>{empresa.email}</td>
                  <td>{moneda(cuenta?.saldo || 0)}</td>
                  <td><Badge tono={tonoEstado(cuenta?.estadoCuenta || 'al_corriente')}>{etiquetaEstado(cuenta?.estadoCuenta || 'al_corriente')}</Badge></td>
                  <td className="acciones-tabla">
                    <Boton variante="texto" onClick={() => setConsulta(empresa)}>Consultar</Boton>
                    <Boton variante="linea" onClick={() => editar(empresa)}>Editar</Boton>
                    {empresa.estado === 'activo' ? <Link className="btn btn-linea" to={`/app/empresas/${empresa.id}/plantilla`}>Plantilla Excel</Link> : null}
                    {empresa.estado === 'activo' ? <Boton variante="texto" onClick={() => descargarPlantilla(empresa)}>Descargar plantilla</Boton> : null}
                    {empresa.estado === 'activo'
                      ? <Boton variante="peligro" onClick={() => setBaja(empresa)}>Dar de baja</Boton>
                      : <Boton variante="texto" onClick={() => reactivar(empresa)}>Reactivar</Boton>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {visibles.length === 0 ? <Vacio>No hay empresas con ese filtro.</Vacio> : null}
      </div>
      <Modal titulo="Consulta de empresa" abierto={Boolean(consulta)} onCerrar={() => setConsulta(null)}>
        {consulta ? (
          <dl className="detalle-empresa">
            <dt>ID</dt><dd>{consulta.folio}</dd>
            <dt>Empresa</dt><dd>{consulta.nombre}</dd>
            <dt>Estado</dt><dd><Badge tono={tonoEstado(consulta.estado)}>{etiquetaEstado(consulta.estado)}</Badge></dd>
            <dt>Contacto</dt><dd>{consulta.contacto}</dd>
            <dt>Correo</dt><dd>{consulta.email}</dd>
            <dt>Teléfono</dt><dd>{consulta.telefono || '—'}</dd>
            <dt>Dirección</dt><dd>{consulta.direccion || '—'}</dd>
            <dt>Notas</dt><dd>{consulta.notas || '—'}</dd>
            <dt>Total a cobrar</dt><dd>{moneda(cuentaConsulta?.saldo || 0)}</dd>
          </dl>
        ) : null}
        {consulta?.estado === 'inactivo' ? <p className="nota">Empresa dada de baja (baja lógica). Su historial de citas, expedientes y cobros se conserva.</p> : null}
        <div className="acciones">
          <Boton variante="linea" onClick={() => setConsulta(null)}>Cerrar</Boton>
        </div>
      </Modal>
      <Modal titulo="Baja lógica" abierto={Boolean(baja)} onCerrar={() => setBaja(null)}>
        <p>Se dará de baja a {baja?.nombre}. Las citas, expedientes y cobros permanecen.</p>
        <p className="nota">Mientras esté inactiva no se agendan citas ni se importan empleados para ella. Se puede reactivar después.</p>
        <div className="acciones">
          <Boton variante="peligro" onClick={confirmarBaja}>Confirmar baja</Boton>
          <Boton variante="linea" onClick={() => setBaja(null)}>Volver</Boton>
        </div>
      </Modal>
    </section>
  )
}
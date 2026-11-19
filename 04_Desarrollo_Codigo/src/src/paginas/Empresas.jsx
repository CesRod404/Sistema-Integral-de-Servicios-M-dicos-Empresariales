import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSesion } from '../datos/ProveedorSesion.jsx'
import { consolidarPorEmpresa, moneda } from '../domain/cobranza.js'
import { etiquetaEstado, tonoEstado } from '../componentes/etiquetas.js'
import { plantillaExcelEmpresa } from '../domain/excelArchivo.js'
import { nombreArchivoPlantilla } from '../domain/plantillaEmpresa.js'
import { EMPRESA_VACIA, formularioDesdeEmpresa } from '../domain/empresas.js'
import { validarEmpresa } from '../domain/validadores.js'
import { descargarXlsx } from '../componentes/descarga.js'
import { Aviso, Badge, Boton, Campo, Modal } from '../componentes/Ui.jsx'

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

  const visibles = empresas.filter((empresa) => empresa.nombre.toLowerCase().includes(texto.toLowerCase()) || empresa.contacto.toLowerCase().includes(texto.toLowerCase()))
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
      <div className="dos-columnas">
        <form className="panel" onSubmit={guardar} noValidate>
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
          <Campo etiqueta="Buscar"><input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Nombre o contacto" /></Campo>
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
      </div>
      <Modal titulo="Baja lógica" abierto={Boolean(baja)} onCerrar={() => setBaja(null)}>
        <p>Se dará de baja a {baja?.nombre}. Las citas, expedientes y cobros permanecen.</p>
        <div className="acciones">
          <Boton variante="peligro" onClick={confirmarBaja}>Confirmar baja</Boton>
          <Boton variante="linea" onClick={() => setBaja(null)}>Volver</Boton>
        </div>
      </Modal>
    </section>
  )
}
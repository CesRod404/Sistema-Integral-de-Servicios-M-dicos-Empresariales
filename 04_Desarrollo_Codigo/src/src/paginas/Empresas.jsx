import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSesion } from '../datos/ProveedorSesion.jsx'
import { consolidarPorEmpresa, moneda } from '../domain/cobranza.js'
import { etiquetaEstado, tonoEstado } from '../componentes/etiquetas.js'
import { Aviso, Badge, Boton, Campo, Modal } from '../componentes/Ui.jsx'

const VACIO = { nombre: '', contacto: '', email: '', telefono: '', direccion: '', notas: '' }

export function Empresas() {
  const { api } = useSesion()
  const [empresas, setEmpresas] = useState([])
  const [cuentas, setCuentas] = useState([])
  const [texto, setTexto] = useState('')
  const [form, setForm] = useState(VACIO)
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

  async function guardar(evento) {
    evento.preventDefault()
    const resultado = await api.guardarEmpresa(form)
    if (!resultado.ok) setError(resultado.mensaje)
    else {
      setError('')
      setMensaje(form.id ? 'Los datos de contacto se actualizaron.' : 'La empresa se dio de alta.')
      setForm(VACIO)
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

  const visibles = empresas.filter((empresa) => empresa.nombre.toLowerCase().includes(texto.toLowerCase()) || empresa.contacto.toLowerCase().includes(texto.toLowerCase()))

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
        <form className="panel" onSubmit={guardar}>
          <h3>{form.id ? 'Editar empresa' : 'Nueva empresa'}</h3>
          <div className="form-grid">
            <Campo etiqueta="Nombre" requerido><input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required /></Campo>
            <Campo etiqueta="Contacto" requerido><input value={form.contacto} onChange={(e) => setForm({ ...form, contacto: e.target.value })} required /></Campo>
            <Campo etiqueta="Correo" requerido><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></Campo>
            <Campo etiqueta="Teléfono"><input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></Campo>
            <Campo etiqueta="Dirección"><input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} /></Campo>
            <Campo etiqueta="Notas"><input value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} /></Campo>
          </div>
          <div className="acciones">
            <Boton variante="azul" tipo="submit">{form.id ? 'Guardar cambios' : 'Registrar empresa'}</Boton>
            {form.id ? <Boton variante="linea" onClick={() => setForm(VACIO)}>Limpiar</Boton> : null}
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
                    <Boton variante="linea" onClick={() => setForm(empresa)}>Editar</Boton>
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

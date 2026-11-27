import { useEffect, useMemo, useState } from 'react'
import { useSesion } from '../datos/ProveedorSesion.jsx'
import { LEYENDA_REPORTE_PERIODO, filtrarCargos, moneda, prepararPagoLote, saldoCargo } from '../domain/cobranza.js'
import { alternarSeleccion, alternarTodos, estadoSeleccion, seleccionVisible } from '../domain/seleccion.js'
import { formatearFecha, hoyMexico } from '../domain/fecha.js'
import { etiquetaEstado, tonoEstado } from '../componentes/etiquetas.js'
import { Aviso, Badge, Boton, Campo, CasillaTodos, Modal, Vacio } from '../componentes/Ui.jsx'

export function Cobranza() {
  const { api } = useSesion()
  const [pestaña, setPestaña] = useState('cargos')
  const [cargos, setCargos] = useState([])
  const [pagos, setPagos] = useState([])
  const [estudios, setEstudios] = useState([])
  const [empresas, setEmpresas] = useState([])
  const [empresa, setEmpresa] = useState('')
  const [texto, setTexto] = useState('')
  const [estudio, setEstudio] = useState({ nombre: '', precio: '', vigente: true })
  const [pago, setPago] = useState(null)
  const [monto, setMonto] = useState('')
  const [referencia, setReferencia] = useState('')
  const [fechaPago, setFechaPago] = useState(hoyMexico())
  const [desde, setDesde] = useState(`${hoyMexico().slice(0, 8)}01`)
  const [hasta, setHasta] = useState(hoyMexico())
  const [reporte, setReporte] = useState(null)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  // S7-T18: selección de varios cargos para marcarlos como pagados.
  const [estatus, setEstatus] = useState('')
  const [seleccion, setSeleccion] = useState(() => new Set())
  const [lote, setLote] = useState(false)
  const [referenciaLote, setReferenciaLote] = useState('')
  const [fechaLote, setFechaLote] = useState(hoyMexico())

  async function cargar() {
    const [lista, catalogo, clientes] = await Promise.all([api.listarCargos(), api.listarEstudios(), api.listarEmpresas()])
    if (!lista.ok) setError(lista.mensaje)
    else {
      setCargos(lista.datos.cargos)
      setPagos(lista.datos.pagos)
    }
    if (catalogo.ok) setEstudios(catalogo.datos)
    if (clientes.ok) setEmpresas(clientes.datos)
  }

  useEffect(() => { cargar() }, [api])

  useEffect(() => {
    if (pestaña !== 'periodo') return
    api.reportePeriodo(desde, hasta).then((resultado) => {
      if (resultado.ok) setReporte(resultado.datos)
      else setError(resultado.mensaje)
    })
  }, [api, pestaña, desde, hasta])

  const visibles = useMemo(() => filtrarCargos(cargos, pagos, { empresa, texto, estatus }), [cargos, pagos, empresa, texto, estatus])
  // Solo se seleccionan cargos con saldo; «todos» = todos los del filtro actual.
  const idsConSaldo = useMemo(() => visibles.filter((cargo) => saldoCargo(cargo, pagos).saldo > 0.001).map((cargo) => cargo.id), [visibles, pagos])
  useEffect(() => { setSeleccion((actual) => seleccionVisible(actual, idsConSaldo)) }, [idsConSaldo])
  const previaLote = useMemo(() => prepararPagoLote({ cargos, pagos, ids: [...seleccion], referencia: 'previa', fecha: 'previa' }), [cargos, pagos, seleccion])

  async function guardarLote(evento) {
    evento.preventDefault()
    const preparado = prepararPagoLote({ cargos, pagos, ids: [...seleccion], referencia: referenciaLote, fecha: fechaLote })
    if (!preparado.ok) {
      setError(preparado.mensaje)
      return
    }
    const resultado = await api.registrarPagosLote({ cargoIds: preparado.pagos.map((pago) => pago.cargoId), referencia: preparado.referencia, fecha: preparado.fecha })
    if (!resultado.ok) {
      setMensaje('')
      setError(resultado.mensaje)
      return
    }
    setError('')
    setMensaje(`${resultado.datos.pagados} cargo(s) quedaron pagados por ${moneda(resultado.datos.total)} con la referencia ${preparado.referencia}. El precio histórico no cambia.`)
    setLote(false)
    setReferenciaLote('')
    setSeleccion(new Set())
    await cargar()
  }

  const porEmpresa = useMemo(() => {
    const mapa = new Map()
    for (const cargo of cargos) {
      const actual = mapa.get(cargo.empresaId) || { nombre: cargo.empresaNombre, total: 0, pagado: 0 }
      const saldo = saldoCargo(cargo, pagos)
      actual.total += Number(cargo.precioHistorico)
      actual.pagado += saldo.pagado
      mapa.set(cargo.empresaId, actual)
    }
    return [...mapa.entries()].map(([id, valor]) => ({ id, ...valor, saldo: valor.total - valor.pagado }))
  }, [cargos, pagos])

  async function guardarPago(evento) {
    evento.preventDefault()
    const resultado = await api.registrarPago({ cargoId: pago.id, monto, referencia, fecha: fechaPago })
    if (!resultado.ok) setError(resultado.mensaje)
    else {
      setError('')
      setMensaje('El pago quedó registrado. El precio histórico no cambia.')
      setPago(null)
      setMonto('')
      setReferencia('')
      await cargar()
    }
  }

  async function guardarEstudio(evento) {
    evento.preventDefault()
    const resultado = await api.guardarEstudio(estudio)
    if (!resultado.ok) setError(resultado.mensaje)
    else {
      setError('')
      setMensaje('El catálogo se actualizó. Los cargos anteriores conservan su precio histórico.')
      setEstudio({ nombre: '', precio: '', vigente: true })
      await cargar()
    }
  }

  return (
    <section className="seccion">
      <div className="encabezado-pagina">
        <div>
          <h1>Cobranza</h1>
          <p className="nota">Cálculo del adeudo, historial por paciente y por empresa, y catálogo de tarifas. No incluye facturación electrónica ni pagos en línea.</p>
        </div>
      </div>
      <Aviso tipo="error">{error}</Aviso>
      <Aviso tipo="ok">{mensaje}</Aviso>
      <div className="tabs">
        {[['cargos', 'Cargos'], ['empresas', 'Por empresa'], ['catalogo', 'Catálogo'], ['periodo', 'Periodo']].map(([id, etiqueta]) => (
          <button key={id} type="button" className={pestaña === id ? 'activa' : undefined} onClick={() => setPestaña(id)}>{etiqueta}</button>
        ))}
      </div>
      {pestaña === 'cargos' ? (
        <div className="panel tabla-contenedor">
          <div className="filtros">
            <Campo etiqueta="Empresa">
              <select value={empresa} onChange={(e) => setEmpresa(e.target.value)}>
                <option value="">Todas</option>
                {empresas.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
              </select>
            </Campo>
            <Campo etiqueta="Paciente o estudio"><input value={texto} onChange={(e) => setTexto(e.target.value)} /></Campo>
            <Campo etiqueta="Estatus">
              <select value={estatus} onChange={(e) => setEstatus(e.target.value)}>
                <option value="">Todos</option>
                <option value="con_saldo">Con saldo (pendiente o parcial)</option>
                <option value="pendiente">Pendiente</option>
                <option value="parcial">Pago parcial</option>
                <option value="pagado">Pagado</option>
              </select>
            </Campo>
          </div>
          <div className="barra-seleccion" role="status">
            <span>{seleccion.size
              ? `${seleccion.size} cargo(s) seleccionado(s) · saldo ${moneda(previaLote.ok ? previaLote.total : 0)}`
              : `${idsConSaldo.length} cargo(s) con saldo en este filtro`}</span>
            <div className="acciones">
              <Boton variante="linea" disabled={!idsConSaldo.length || estadoSeleccion(seleccion, idsConSaldo) === 'todos'} onClick={() => setSeleccion(new Set(idsConSaldo))}>Seleccionar todos los del filtro ({idsConSaldo.length})</Boton>
              <Boton variante="azul" disabled={!seleccion.size} onClick={() => { setError(''); setLote(true) }}>Marcar como pagados</Boton>
              {seleccion.size ? <Boton variante="linea" onClick={() => setSeleccion(new Set())}>Quitar selección</Boton> : null}
            </div>
          </div>
          <table>
            <thead><tr>
              <th className="col-casilla">
                <CasillaTodos
                  estado={estadoSeleccion(seleccion, idsConSaldo)}
                  etiqueta="Seleccionar todos los cargos con saldo del filtro"
                  disabled={!idsConSaldo.length}
                  onCambio={() => setSeleccion((actual) => alternarTodos(actual, idsConSaldo))}
                />
              </th>
              <th>Fecha</th><th>Paciente</th><th>Empresa</th><th>Concepto</th><th>Precio histórico</th><th>Saldo</th><th>Estatus</th><th></th>
            </tr></thead>
            <tbody>
              {visibles.map((cargo) => {
                const saldo = saldoCargo(cargo, pagos)
                return (
                  <tr key={cargo.id} className={seleccion.has(cargo.id) ? 'seleccionada' : undefined}>
                    <td className="col-casilla">
                      <input
                        type="checkbox"
                        className="casilla-seleccion"
                        aria-label={`Seleccionar cargo de ${cargo.pacienteNombre} · ${cargo.concepto}`}
                        title={saldo.saldo > 0 ? undefined : 'El cargo ya está pagado'}
                        disabled={saldo.saldo <= 0.001}
                        checked={seleccion.has(cargo.id)}
                        onChange={() => setSeleccion((actual) => alternarSeleccion(actual, cargo.id))}
                      />
                    </td>
                    <td>{formatearFecha(cargo.fechaCargo)}</td>
                    <td>{cargo.pacienteNombre}</td>
                    <td>{cargo.empresaNombre}</td>
                    <td>{cargo.concepto}</td>
                    <td>{moneda(cargo.precioHistorico)}</td>
                    <td>{moneda(saldo.saldo)}</td>
                    <td><Badge tono={tonoEstado(cargo.estatus)}>{etiquetaEstado(cargo.estatus)}</Badge></td>
                    <td>{saldo.saldo > 0 ? <Boton variante="azul" onClick={() => { setPago(cargo); setMonto(String(saldo.saldo)) }}>Registrar pago</Boton> : null}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {visibles.length === 0 ? <Vacio>No hay cargos con ese filtro. El cargo se genera al cerrar el expediente.</Vacio> : null}
        </div>
      ) : null}
      {pestaña === 'empresas' ? (
        <div className="panel tabla-contenedor">
          <table>
            <thead><tr><th>Empresa</th><th>Cargos</th><th>Pagado</th><th>Saldo</th></tr></thead>
            <tbody>
              {porEmpresa.map((fila) => (
                <tr key={fila.id}><td>{fila.nombre}</td><td>{moneda(fila.total)}</td><td>{moneda(fila.pagado)}</td><td>{moneda(fila.saldo)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {pestaña === 'catalogo' ? (
        <div className="seccion">
          <form className="panel formulario-centrado" onSubmit={guardarEstudio}>
            <h3>{estudio.id ? 'Editar estudio' : 'Nuevo estudio'}</h3>
            <div className="form-grid">
              <Campo etiqueta="Nombre" requerido><input value={estudio.nombre} onChange={(e) => setEstudio({ ...estudio, nombre: e.target.value })} required /></Campo>
              <Campo etiqueta="Precio unitario" requerido><input type="number" min="0" step="0.01" value={estudio.precio} onChange={(e) => setEstudio({ ...estudio, precio: e.target.value })} required /></Campo>
            </div>
            <label><input type="checkbox" checked={estudio.vigente !== false} onChange={(e) => setEstudio({ ...estudio, vigente: e.target.checked })} /> Vigente</label>
            <div className="acciones">
              <Boton variante="azul" tipo="submit">Guardar tarifa</Boton>
              {estudio.id ? <Boton variante="linea" onClick={() => setEstudio({ nombre: '', precio: '', vigente: true })}>Limpiar</Boton> : null}
            </div>
          </form>
          <div className="panel tabla-contenedor">
            <table>
              <thead><tr><th>Estudio</th><th>Precio</th><th>Vigencia</th><th></th></tr></thead>
              <tbody>
                {estudios.map((item) => (
                  <tr key={item.id}>
                    <td>{item.nombre}</td>
                    <td>{moneda(item.precio)}</td>
                    <td>{item.vigente ? 'Activo' : 'Inactivo'}</td>
                    <td><Boton variante="linea" onClick={() => setEstudio(item)}>Editar</Boton></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
      {pestaña === 'periodo' ? (
        <div className="panel">
          <p className="nota">{LEYENDA_REPORTE_PERIODO}</p>
          <div className="filtros">
            <Campo etiqueta="Desde"><input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></Campo>
            <Campo etiqueta="Hasta"><input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} /></Campo>
          </div>
          <table>
            <thead><tr><th>Empresa</th><th>Cargos del periodo</th><th>Pagos del periodo</th><th>Saldo del periodo</th></tr></thead>
            <tbody>
              {(reporte?.filas || []).map((fila) => (
                <tr key={fila.empresaId}><td>{fila.empresa}</td><td>{moneda(fila.cargos)}</td><td>{moneda(fila.pagos)}</td><td>{moneda(fila.saldo)}</td></tr>
              ))}
            </tbody>
          </table>
          {(reporte?.filas || []).length === 0 ? <Vacio>No hay movimientos en el periodo.</Vacio> : null}
        </div>
      ) : null}
      <Modal titulo="Marcar cargos como pagados" abierto={lote} onCerrar={() => setLote(false)}>
        <p>Se registrará el pago del saldo completo de {previaLote.ok ? previaLote.pagos.length : 0} cargo(s) por un total de {moneda(previaLote.ok ? previaLote.total : 0)}. Todos quedan «Pagado».</p>
        {previaLote.ok && previaLote.omitidos ? <p className="nota">{previaLote.omitidos} cargo(s) seleccionados ya estaban pagados y se omiten.</p> : null}
        <form onSubmit={guardarLote}>
          <Campo etiqueta="Referencia del depósito o transferencia" requerido><input value={referenciaLote} onChange={(e) => setReferenciaLote(e.target.value)} required /></Campo>
          <Campo etiqueta="Fecha del pago" requerido><input type="date" value={fechaLote} onChange={(e) => setFechaLote(e.target.value)} required /></Campo>
          <p className="nota">Se usa la misma referencia y fecha para todos. Si un cargo no se puede registrar, no se guarda ninguno.</p>
          <div className="acciones">
            <Boton variante="azul" tipo="submit">Confirmar pagos</Boton>
            <Boton variante="linea" onClick={() => setLote(false)}>Volver</Boton>
          </div>
        </form>
      </Modal>
      <Modal titulo="Registrar pago" abierto={Boolean(pago)} onCerrar={() => setPago(null)}>
        <p>{pago?.pacienteNombre} · {pago?.concepto} · histórico {pago ? moneda(pago.precioHistorico) : ''}</p>
        <form onSubmit={guardarPago}>
          <Campo etiqueta="Monto" requerido><input type="number" min="0.01" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} required /></Campo>
          <Campo etiqueta="Referencia" requerido><input value={referencia} onChange={(e) => setReferencia(e.target.value)} required /></Campo>
          <Campo etiqueta="Fecha" requerido><input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} required /></Campo>
          <Boton variante="azul" tipo="submit">Guardar pago</Boton>
        </form>
      </Modal>
    </section>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSesion } from '../datos/ProveedorSesion.jsx'
import { moneda } from '../domain/cobranza.js'
import { Aviso } from '../componentes/Ui.jsx'

export function PanelInicio() {
  const { api, usuario } = useSesion()
  const [citas, setCitas] = useState([])
  const [saldo, setSaldo] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let vivo = true
    const fecha = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
    api.listarCitas(fecha).then((resultado) => {
      if (!vivo) return
      if (!resultado.ok) setError(resultado.mensaje)
      else setCitas(resultado.datos)
    })
    if (usuario.rol === 'administrador') {
      api.listarCargos().then((resultado) => {
        if (!vivo || !resultado.ok) return
        const total = resultado.datos.cargos.reduce((suma, cargo) => suma + Number(cargo.precioHistorico), 0)
        const pagado = resultado.datos.pagos.reduce((suma, pago) => suma + Number(pago.monto), 0)
        setSaldo({ total, pagado, saldo: total - pagado })
      })
    }
    return () => { vivo = false }
  }, [api, usuario.rol])

  const contar = (estado) => citas.filter((cita) => cita.estadoAsistencia === estado).length

  return (
    <section>
      <div className="encabezado-pagina">
        <div>
          <h1>Inicio</h1>
          <p className="nota">Resumen operativo del día. El sistema está previsto para responder las consultas habituales en menos de 5 segundos.</p>
        </div>
      </div>
      <Aviso tipo="error">{error}</Aviso>
      <div className="resumen">
        <article className="tarjeta"><span>Programadas</span><strong>{contar('programada')}</strong></article>
        <article className="tarjeta"><span>Presentes</span><strong>{contar('presente')}</strong></article>
        <article className="tarjeta"><span>Ausentes</span><strong>{contar('ausente')}</strong></article>
        <article className="tarjeta"><span>Finalizadas</span><strong>{contar('cerrada')}</strong></article>
      </div>
      {usuario.rol === 'administrador' && saldo ? (
        <article className="tarjeta" style={{ marginTop: 16 }}>
          <h3>Cobranza</h3>
          <p>Cargos históricos {moneda(saldo.total)} · Pagos {moneda(saldo.pagado)} · Saldo {moneda(saldo.saldo)}</p>
          <div className="acciones">
            <Link className="btn btn-azul" to="/app/citas">Abrir agenda</Link>
            <Link className="btn btn-linea" to="/app/importacion">Importar empleados</Link>
            <Link className="btn btn-linea" to="/app/cobranza">Ir a cobranza</Link>
          </div>
        </article>
      ) : (
        <article className="tarjeta" style={{ marginTop: 16 }}>
          <h3>Cola clínica</h3>
          <p>Consulte a los pacientes presentes y capture el expediente. Este perfil no consulta precios ni cobranza.</p>
          <Link className="btn btn-azul" to="/app/pacientes">Ver pacientes</Link>
        </article>
      )}
    </section>
  )
}

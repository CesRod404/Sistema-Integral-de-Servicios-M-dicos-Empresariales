import { diaMexico } from './fecha.js'

export function redondear(valor) {
  return Math.round((Number(valor) + Number.EPSILON) * 100) / 100
}

export const LEYENDA_REPORTE_PERIODO = 'PENDIENTE DE VALIDAR CONTRA SRS'

export function generarCargos({ empresaId, citaId, estudios, catalogo, fecha }) {
  return estudios.map((id) => {
    const item = catalogo.find((estudio) => estudio.id === id)
    if (!item || item.vigente === false) {
      throw new Error('SISME: Hay un estudio sin tarifa vigente. No se generó el cargo.')
    }
    return {
      id: globalThis.crypto.randomUUID(),
      empresaId,
      citaId,
      catalogoEstudioId: item.id,
      concepto: item.nombre,
      precioHistorico: Number(item.precio),
      estatus: 'pendiente',
      fechaCargo: fecha
    }
  })
}

export function saldoCargo(cargo, pagos) {
  const pagado = (pagos || [])
    .filter((pago) => pago.cargoId === cargo.id)
    .reduce((suma, pago) => suma + Number(pago.monto), 0)
  return {
    pagado: redondear(pagado),
    saldo: redondear(Number(cargo.precioHistorico) - pagado)
  }
}

export function aplicarPago(cargo, pagosDelCargo, { monto, referencia, fecha }) {
  if (!String(referencia || '').trim()) {
    return { ok: false, mensaje: 'Capture la referencia del depósito o transferencia.' }
  }
  const cantidad = Number(monto)
  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    return { ok: false, mensaje: 'El monto del pago debe ser mayor a cero.' }
  }
  const pagado = (pagosDelCargo || []).reduce((suma, pago) => suma + Number(pago.monto), 0)
  const saldo = redondear(Number(cargo.precioHistorico) - pagado)
  if (cantidad - saldo > 0.001) return { ok: false, mensaje: 'El pago excede el saldo del cargo.' }
  const nuevoPagado = redondear(pagado + cantidad)
  const estatus = Math.abs(nuevoPagado - Number(cargo.precioHistorico)) < 0.01 ? 'pagado' : 'parcial'
  return {
    ok: true,
    estatus,
    pago: {
      monto: redondear(cantidad),
      referencia: String(referencia).trim(),
      fecha
    }
  }
}

export function consolidarPorEmpresa(empresas, cargos, pagos) {
  return empresas.map((empresa) => {
    const propios = cargos.filter((cargo) => cargo.empresaId === empresa.id)
    const ids = new Set(propios.map((cargo) => cargo.id))
    const total = redondear(propios.reduce((suma, cargo) => suma + Number(cargo.precioHistorico), 0))
    const pagado = redondear(
      pagos.filter((pago) => ids.has(pago.cargoId)).reduce((suma, pago) => suma + Number(pago.monto), 0)
    )
    const saldo = redondear(total - pagado)
    return {
      empresaId: empresa.id,
      empresa: empresa.nombre,
      total,
      pagado,
      saldo,
      estadoCuenta: saldo <= 0.001 ? 'al_corriente' : 'pendiente'
    }
  })
}

function dentro(valor, desde, hasta) {
  const dia = diaMexico(valor)
  if (!dia) return false
  if (desde && dia < desde) return false
  if (hasta && dia > hasta) return false
  return true
}

export function reportePeriodo({ empresas, cargos, pagos, desde, hasta }) {
  const cargosRango = cargos.filter((cargo) => dentro(cargo.fechaCargo, desde, hasta))
  const pagosRango = pagos.filter((pago) => dentro(pago.fecha, desde, hasta))
  const filas = empresas
    .map((empresa) => {
      const deEmpresa = cargosRango.filter((cargo) => cargo.empresaId === empresa.id)
      const pagados = pagosRango.filter((pago) => pago.empresaId === empresa.id)
      const totalCargos = redondear(deEmpresa.reduce((suma, cargo) => suma + Number(cargo.precioHistorico), 0))
      const totalPagos = redondear(pagados.reduce((suma, pago) => suma + Number(pago.monto), 0))
      return {
        empresaId: empresa.id,
        empresa: empresa.nombre,
        cargos: totalCargos,
        pagos: totalPagos,
        saldo: redondear(totalCargos - totalPagos)
      }
    })
    .filter((fila) => fila.cargos !== 0 || fila.pagos !== 0)
  return { leyenda: LEYENDA_REPORTE_PERIODO, filas }
}

export function moneda(valor) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(valor) || 0)
}

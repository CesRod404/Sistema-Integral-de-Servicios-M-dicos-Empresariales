export function etiquetaEstado(estado) {
  const mapa = {
    programada: 'Programada',
    presente: 'Presente',
    ausente: 'Ausente',
    cerrada: 'Finalizada',
    cancelada: 'Cancelada',
    abierto: 'En proceso',
    cerrado: 'Finalizado',
    provisional: 'Provisional',
    activo: 'Activa',
    inactivo: 'Inactiva',
    pendiente: 'Pendiente',
    parcial: 'Pago parcial',
    pagado: 'Pagado',
    al_corriente: 'Al corriente'
  }
  return mapa[estado] || '—'
}

export function tonoEstado(estado) {
  if (['presente', 'pagado', 'al_corriente', 'activo', 'cerrado'].includes(estado)) return 'verde'
  if (['ausente', 'inactivo', 'cancelada'].includes(estado)) return 'rojo'
  if (['programada', 'pendiente', 'provisional', 'parcial'].includes(estado)) return 'ambar'
  if (['abierto', 'cerrada'].includes(estado)) return 'azul'
  return 'neutro'
}

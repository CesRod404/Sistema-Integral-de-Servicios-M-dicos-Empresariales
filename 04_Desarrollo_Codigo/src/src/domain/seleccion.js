// S7-T17 / S7-T18: selección múltiple con casillas en las tablas (pacientes,
// empresas y cargos de cobranza). Funciones puras; la UI guarda un Set de ids.
// Regla: la selección solo incluye filas visibles con el filtro actual; al
// cambiar el filtro se descartan las que dejaron de verse, para no aplicar una
// acción a registros que el usuario ya no tiene en pantalla.

export function alternarSeleccion(seleccion, id) {
  const nueva = new Set(seleccion)
  if (nueva.has(id)) nueva.delete(id)
  else nueva.add(id)
  return nueva
}

export function estadoSeleccion(seleccion, ids) {
  const lista = [...new Set(ids)]
  if (!lista.length) return 'ninguno'
  const marcados = lista.filter((id) => seleccion.has(id)).length
  if (marcados === 0) return 'ninguno'
  return marcados === lista.length ? 'todos' : 'algunos'
}

// Casilla del encabezado: si todos los visibles están marcados los desmarca;
// si no, marca todos los visibles (seleccionar todo con el filtro actual).
export function alternarTodos(seleccion, ids) {
  const nueva = new Set(seleccion)
  if (estadoSeleccion(seleccion, ids) === 'todos') ids.forEach((id) => nueva.delete(id))
  else ids.forEach((id) => nueva.add(id))
  return nueva
}

export function seleccionVisible(seleccion, ids) {
  const visibles = new Set(ids)
  const nueva = new Set([...seleccion].filter((id) => visibles.has(id)))
  return nueva.size === seleccion.size ? seleccion : nueva
}

export function resumenNombres(registros, campo = 'nombre', maximo = 8) {
  const nombres = registros.map((item) => item[campo]).filter(Boolean)
  if (nombres.length <= maximo) return nombres.join(', ')
  return `${nombres.slice(0, maximo).join(', ')} y ${nombres.length - maximo} más`
}

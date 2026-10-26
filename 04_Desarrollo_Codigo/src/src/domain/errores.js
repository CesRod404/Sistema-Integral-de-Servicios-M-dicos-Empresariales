export function mensajeAmigable(error) {
  const texto = String(error?.message || error || '')
  const marca = texto.indexOf('SISME:')
  if (marca >= 0) return texto.slice(marca + 6).trim()
  if (/failed to fetch|networkerror|network request|timeout|load failed/i.test(texto)) {
    return 'No hay conexión con el servidor. Intente de nuevo.'
  }
  return 'No se pudo completar la operación. Revise los datos e intente de nuevo.'
}

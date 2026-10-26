const url = import.meta.env.VITE_SUPABASE_URL || ''
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export function supabaseConfigurado() {
  return Boolean(
    url.startsWith('https://') &&
      anonKey &&
      !anonKey.includes('REEMPLAZAR') &&
      !anonKey.toLowerCase().includes('placeholder')
  )
}

export function leerConfiguracionPublica() {
  return { url, anonKey: supabaseConfigurado() ? anonKey : '' }
}

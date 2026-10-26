import { createClient } from '@supabase/supabase-js'
import { supabaseConfigurado } from './configuracion.js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const storage = {
  getItem(clave) {
    return window.localStorage.getItem(clave) ?? window.sessionStorage.getItem(clave)
  },
  setItem(clave, valor) {
    const persistir = window.localStorage.getItem('sisme.recordarme') !== '0'
    const destino = persistir ? window.localStorage : window.sessionStorage
    destino.setItem(clave, valor)
  },
  removeItem(clave) {
    window.localStorage.removeItem(clave)
    window.sessionStorage.removeItem(clave)
  }
}

export const supabase = supabaseConfigurado()
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, storage, detectSessionInUrl: false }
    })
  : null

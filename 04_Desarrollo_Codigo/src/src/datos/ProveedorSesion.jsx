import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabaseConfigurado } from './configuracion.js'
import { crearApiDemo } from './demoApi.js'
import { crearApiSupabase } from './supabaseApi.js'

const Contexto = createContext(null)

export function ProveedorSesion({ children }) {
  const api = useMemo(() => (supabaseConfigurado() ? crearApiSupabase() : crearApiDemo()), [])
  const [usuario, setUsuario] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let vivo = true
    api.obtenerSesion().then((resultado) => {
      if (!vivo) return
      setUsuario(resultado.ok ? resultado.datos : null)
      setCargando(false)
    })
    return () => {
      vivo = false
    }
  }, [api])

  const valor = useMemo(() => ({
    api,
    usuario,
    cargando,
    modo: api.modo,
    async entrar(email, password, recordarme) {
      const resultado = await api.iniciarSesion(email, password, recordarme)
      if (resultado.ok) setUsuario(resultado.usuario)
      return resultado
    },
    async salir() {
      await api.cerrarSesion()
      setUsuario(null)
    }
  }), [api, usuario, cargando])

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useSesion() {
  return useContext(Contexto)
}

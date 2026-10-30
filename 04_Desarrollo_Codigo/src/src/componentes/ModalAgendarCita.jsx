// Botón y modal "Agendar una cita" de la página pública (S5-T03).
// Formulario simulado: no envía correo ni navega al login o al panel.
// SRS US-ACC-01: un usuario no autenticado no accede a ningún módulo;
// SRS US-CLI-01: las citas las programa el Administrador dentro del sistema.
import { useState } from 'react'
import { Icono } from './Iconos.jsx'
import { Aviso, Boton, Campo, Modal } from './Ui.jsx'
import { validarCorreo } from '../domain/validadores.js'

const VACIO = { nombre: '', empresa: '', correo: '', mensaje: '' }

export function ModalAgendarCita() {
  const [abierto, setAbierto] = useState(false)
  const [form, setForm] = useState(VACIO)
  const [error, setError] = useState('')
  const [enviado, setEnviado] = useState(false)

  function abrir() {
    setForm(VACIO)
    setError('')
    setEnviado(false)
    setAbierto(true)
  }

  function enviar(evento) {
    evento.preventDefault()
    if (!form.nombre.trim()) return setError('Capture su nombre.')
    if (!validarCorreo(form.correo)) return setError('Capture un correo electrónico válido.')
    setError('')
    setEnviado(true)
  }

  return (
    <>
      <button type="button" className="btn btn-naranja" onClick={abrir}><Icono nombre="citas" /> Agendar una cita</button>
      <Modal titulo="Agendar una cita" abierto={abierto} onCerrar={() => setAbierto(false)}>
        {enviado ? (
          <>
            <Aviso tipo="ok">Solicitud registrada en modo demostración. No se envió ningún correo.</Aviso>
            <div className="acciones">
              <Boton variante="azul" onClick={() => setAbierto(false)}>Cerrar</Boton>
            </div>
          </>
        ) : (
          <form onSubmit={enviar} noValidate>
            <p className="nota">Demostración: este formulario es simulado y no envía correos.</p>
            <Campo etiqueta="Nombre" requerido><input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></Campo>
            <Campo etiqueta="Empresa"><input value={form.empresa} onChange={(e) => setForm({ ...form, empresa: e.target.value })} /></Campo>
            <Campo etiqueta="Correo" requerido><input type="email" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} /></Campo>
            <Campo etiqueta="Mensaje"><textarea rows={3} value={form.mensaje} onChange={(e) => setForm({ ...form, mensaje: e.target.value })} /></Campo>
            <Aviso tipo="error">{error}</Aviso>
            <div className="acciones">
              <Boton variante="linea" onClick={() => setAbierto(false)}>Cancelar</Boton>
              <Boton variante="naranja" tipo="submit">Enviar solicitud</Boton>
            </div>
          </form>
        )}
      </Modal>
    </>
  )
}

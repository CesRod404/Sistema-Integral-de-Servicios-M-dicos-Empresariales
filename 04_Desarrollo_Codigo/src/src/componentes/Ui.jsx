import { Icono } from './Iconos.jsx'

export function Boton({ variante = 'azul', children, tipo = 'button', ...props }) {
  return (
    <button type={tipo} className={`btn btn-${variante}`} {...props}>
      {children}
    </button>
  )
}

export function Campo({ etiqueta, error, children, requerido = false }) {
  return (
    <label className="campo">
      <span>{etiqueta}{requerido ? ' *' : ''}</span>
      {children}
      {error ? <small className="campo-error">{error}</small> : null}
    </label>
  )
}

export function Aviso({ tipo = 'info', children }) {
  if (!children) return null
  return <div className={`aviso aviso-${tipo}`} role={tipo === 'error' ? 'alert' : 'status'}>{children}</div>
}

export function Badge({ tono = 'neutro', children }) {
  return <span className={`badge badge-${tono}`}>{children}</span>
}

export function Modal({ titulo, abierto, onCerrar, children }) {
  if (!abierto) return null
  return (
    <div className="modal-fondo" role="presentation" onClick={onCerrar}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={titulo} onClick={(evento) => evento.stopPropagation()}>
        <header>
          <h3>{titulo}</h3>
          <button type="button" className="icono-btn" onClick={onCerrar} aria-label="Cerrar">
            <Icono nombre="cerrar" />
          </button>
        </header>
        {children}
      </div>
    </div>
  )
}

export function Vacio({ children }) {
  return <p className="vacio">{children}</p>
}

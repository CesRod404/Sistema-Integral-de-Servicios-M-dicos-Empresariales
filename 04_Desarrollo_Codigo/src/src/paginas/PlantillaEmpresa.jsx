// CRQ-004 · US-IMP-07 / RF-21: configuración de la plantilla Excel de empleados
// de una empresa. Solo Administrador (ruta protegida y API con permiso).
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useSesion } from '../datos/ProveedorSesion.jsx'
import {
  ETIQUETA_TIPO,
  TIPOS_CAMPO,
  agregarCampo,
  agregarCampoBase,
  camposBaseDisponibles,
  editarCampo,
  moverCampo,
  ordenarColumnas,
  plantillaPredeterminada,
  puedeCambiarObligatorio,
  puedeQuitarse,
  quitarCampo,
  validarPlantilla
} from '../domain/plantillaEmpresa.js'
import { Aviso, Badge, Boton, Campo, Vacio } from '../componentes/Ui.jsx'

const NUEVO = { etiqueta: '', tipo: 'texto', obligatorio: false }

export function PlantillaEmpresa() {
  const { empresaId } = useParams()
  const { api } = useSesion()
  const [empresa, setEmpresa] = useState(null)
  const [vigente, setVigente] = useState(null)
  const [columnas, setColumnas] = useState([])
  const [nuevo, setNuevo] = useState(NUEVO)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)

  async function cargar() {
    setCargando(true)
    const [lista, plantilla] = await Promise.all([api.listarEmpresas(), api.obtenerPlantillaEmpresa(empresaId)])
    setCargando(false)
    if (!lista.ok) {
      setError(lista.mensaje)
      return
    }
    setEmpresa(lista.datos.find((item) => item.id === empresaId) || null)
    if (!plantilla.ok) {
      setError(plantilla.mensaje)
      return
    }
    const actual = plantilla.datos || plantillaPredeterminada(empresaId)
    setVigente(actual)
    setColumnas(ordenarColumnas(actual.columnas))
  }

  useEffect(() => { cargar() }, [api, empresaId])

  const validacion = useMemo(() => validarPlantilla(columnas), [columnas])
  const disponibles = camposBaseDisponibles(columnas)
  const sinCambios = vigente && JSON.stringify(ordenarColumnas(vigente.columnas)) === JSON.stringify(ordenarColumnas(columnas))

  function agregar(evento) {
    evento.preventDefault()
    if (!nuevo.etiqueta.trim()) {
      setError('Escriba el nombre de la columna nueva.')
      return
    }
    setError('')
    setColumnas((actual) => agregarCampo(actual, nuevo))
    setNuevo(NUEVO)
  }

  async function guardar() {
    if (!validacion.ok) {
      setError(validacion.errores[0])
      return
    }
    const resultado = await api.guardarPlantillaEmpresa(empresaId, validacion.columnas)
    if (!resultado.ok) {
      setError(resultado.mensaje)
      return
    }
    setError('')
    setVigente(resultado.datos)
    setColumnas(ordenarColumnas(resultado.datos.columnas))
    setMensaje(`Plantilla guardada. Versión vigente: ${resultado.datos.version}. Los archivos de versiones anteriores ya no se aceptan al importar.`)
  }

  if (cargando) return <p className="vacio">Cargando plantilla…</p>
  if (!empresa) {
    return (
      <section className="seccion">
        <Aviso tipo="error">{error || 'La empresa no existe.'}</Aviso>
        <Link className="enlace" to="/app/empresas">Volver a Empresas</Link>
      </section>
    )
  }

  return (
    <section className="seccion">
      <div className="encabezado-pagina">
        <div>
          <h1>Plantilla Excel · {empresa.nombre}</h1>
          <p className="nota">
            Defina qué columnas lleva el Excel de empleados de esta empresa, en qué orden y cuáles son obligatorias.
            Cada vez que guarda se crea una versión nueva.
          </p>
          <p>
            {vigente?.version
              ? <Badge tono="azul">Versión vigente: {vigente.version}</Badge>
              : <Badge tono="neutro">Sin plantilla propia: se usa la plantilla predeterminada</Badge>}
          </p>
        </div>
        <div className="acciones">
          <Link className="btn btn-linea" to="/app/empresas">Volver</Link>
        </div>
      </div>
      <Aviso tipo="error">{error}</Aviso>
      <Aviso tipo="ok">{mensaje}</Aviso>
      {!validacion.ok ? validacion.errores.map((texto) => <Aviso key={texto} tipo="pendiente">{texto}</Aviso>) : null}
      <div className="panel tabla-contenedor">
        <h3>Columnas</h3>
        <table>
          <thead>
            <tr><th>Orden</th><th>Nombre de la columna</th><th>Clave</th><th>Tipo</th><th>Obligatoria</th><th>Origen</th><th></th></tr>
          </thead>
          <tbody>
            {columnas.map((columna, indice) => (
              <tr key={columna.clave}>
                <td className="acciones-tabla">
                  <span>{columna.orden}</span>
                  <Boton variante="texto" aria-label={`Subir ${columna.etiqueta}`} disabled={indice === 0} onClick={() => setColumnas((actual) => moverCampo(actual, columna.clave, -1))}>↑</Boton>
                  <Boton variante="texto" aria-label={`Bajar ${columna.etiqueta}`} disabled={indice === columnas.length - 1} onClick={() => setColumnas((actual) => moverCampo(actual, columna.clave, 1))}>↓</Boton>
                </td>
                <td>
                  <input
                    aria-label={`Nombre de ${columna.clave}`}
                    value={columna.etiqueta}
                    maxLength={60}
                    onChange={(e) => setColumnas((actual) => editarCampo(actual, columna.clave, { etiqueta: e.target.value }))}
                  />
                </td>
                <td><code>{columna.clave}</code></td>
                <td>
                  {columna.personalizado ? (
                    <select value={columna.tipo} onChange={(e) => setColumnas((actual) => editarCampo(actual, columna.clave, { tipo: e.target.value }))}>
                      {TIPOS_CAMPO.map((tipo) => <option key={tipo} value={tipo}>{ETIQUETA_TIPO[tipo]}</option>)}
                    </select>
                  ) : ETIQUETA_TIPO[columna.tipo]}
                </td>
                <td>
                  <input
                    type="checkbox"
                    aria-label={`Obligatoria ${columna.etiqueta}`}
                    checked={columna.obligatorio}
                    disabled={!puedeCambiarObligatorio(columna)}
                    onChange={(e) => setColumnas((actual) => editarCampo(actual, columna.clave, { obligatorio: e.target.checked }))}
                  />
                </td>
                <td>{columna.personalizado ? <Badge tono="ambar">Personalizada</Badge> : <Badge tono="neutro">Campo del empleado</Badge>}</td>
                <td>
                  {puedeQuitarse(columna)
                    ? <Boton variante="peligro" onClick={() => setColumnas((actual) => quitarCampo(actual, columna.clave))}>Quitar</Boton>
                    : <small className="nota">Fija</small>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {columnas.length === 0 ? <Vacio>La plantilla no tiene columnas.</Vacio> : null}
        <div className="acciones">
          <Boton variante="azul" disabled={!validacion.ok || sinCambios} onClick={guardar}>Guardar plantilla</Boton>
          <Boton variante="linea" disabled={sinCambios} onClick={() => setColumnas(ordenarColumnas(vigente.columnas))}>Descartar cambios</Boton>
        </div>
      </div>
      <div className="dos-columnas">
        <form className="panel" onSubmit={agregar}>
          <h3>Agregar columna personalizada</h3>
          <div className="form-grid">
            <Campo etiqueta="Nombre de la columna" requerido>
              <input value={nuevo.etiqueta} maxLength={60} onChange={(e) => setNuevo({ ...nuevo, etiqueta: e.target.value })} placeholder="Ej. Puesto, Área, Turno" />
            </Campo>
            <Campo etiqueta="Tipo de dato">
              <select value={nuevo.tipo} onChange={(e) => setNuevo({ ...nuevo, tipo: e.target.value })}>
                {TIPOS_CAMPO.map((tipo) => <option key={tipo} value={tipo}>{ETIQUETA_TIPO[tipo]}</option>)}
              </select>
            </Campo>
          </div>
          <label className="campo">
            <span><input type="checkbox" checked={nuevo.obligatorio} onChange={(e) => setNuevo({ ...nuevo, obligatorio: e.target.checked })} /> Obligatoria</span>
          </label>
          <Boton variante="linea" tipo="submit">Agregar columna</Boton>
        </form>
        <div className="panel">
          <h3>Campos del empleado sin usar</h3>
          {disponibles.length ? disponibles.map((campo) => (
            <p key={campo.clave} className="acciones-tabla">
              <span>{campo.etiqueta}</span>
              <Boton variante="texto" onClick={() => setColumnas((actual) => agregarCampoBase(actual, campo.clave))}>Agregar</Boton>
            </p>
          )) : <Vacio>Todos los campos del empleado están en la plantilla.</Vacio>}
          <p className="nota">«Nombre completo» siempre es obligatorio. «CURP» y «Clave de empleado» no se pueden quitar porque se usan para detectar duplicados.</p>
        </div>
      </div>
    </section>
  )
}

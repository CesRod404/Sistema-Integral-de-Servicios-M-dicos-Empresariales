import { useEffect, useMemo, useState } from 'react'
import { useSesion } from '../datos/ProveedorSesion.jsx'
import { CAMPOS_IMPORTACION, MENSAJES_IMPORTACION } from '../domain/excelImport.js'
import { plantillaExcel } from '../domain/excelArchivo.js'
import { excelIngestionValidator } from '../domain/excelIngestionValidator.js'
import { filasDesdeOperaciones, leerEmpleadosDesdeExcel } from '../domain/ingestaEmpleados.js'
import { Aviso, Boton, Campo, Vacio } from '../componentes/Ui.jsx'

const COLUMNAS_PREVIEW = ['nombre', 'curp', 'claveEmpleado', 'email', 'telefono', 'edad']

export function Importacion() {
  const { api } = useSesion()
  const [empresas, setEmpresas] = useState([])
  const [empresaId, setEmpresaId] = useState('')
  const [nombreArchivo, setNombreArchivo] = useState('')
  const [encabezados, setEncabezados] = useState([])
  const [registros, setRegistros] = useState([])
  const [mapa, setMapa] = useState({ nombre: '', curp: '', claveEmpleado: '', email: '', telefono: '', edad: '' })
  const [valores, setValores] = useState([])
  const [decisiones, setDecisiones] = useState({})
  const [sobrescribir, setSobrescribir] = useState(false)
  const [existentes, setExistentes] = useState([])
  const [historial, setHistorial] = useState([])
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [sobre, setSobre] = useState(false)

  async function cargarBase() {
    const [lista, personas, lotes] = await Promise.all([api.listarEmpresas(), api.listarEmpleados(), api.listarImportaciones()])
    if (lista.ok) setEmpresas(lista.datos.filter((item) => item.estado === 'activo'))
    if (personas.ok) {
      setExistentes(personas.datos.map((item) => ({
        id: item.id,
        empresaId: item.empresaId,
        nombre: item.nombre,
        curp: item.curp,
        claveEmpleado: item.claveEmpleado
      })))
    }
    if (lotes.ok) setHistorial(lotes.datos)
  }

  useEffect(() => { cargarBase() }, [api])

  const vista = useMemo(
    () => (valores.length ? excelIngestionValidator.vistaPrevia({ valores, existentes, empresaId, decisiones, sobrescribir }) : null),
    [valores, existentes, empresaId, decisiones, sobrescribir]
  )
  const clasificadas = vista?.filas ?? []
  const evaluacion = vista?.evaluacion ?? null
  const resumen = vista?.resumen ?? null

  async function leerArchivo(archivo) {
    if (!archivo) return
    setError('')
    setMensaje('')
    const lectura = await leerEmpleadosDesdeExcel(archivo)
    if (!lectura.ok) {
      setNombreArchivo('')
      setEncabezados([])
      setRegistros([])
      setValores([])
      setDecisiones({})
      setError(lectura.mensaje)
      return
    }
    const sugerido = excelIngestionValidator.sugerirMapa(lectura.encabezados)
    setNombreArchivo(lectura.nombreArchivo)
    setEncabezados(lectura.encabezados)
    setRegistros(lectura.registros)
    setMapa(sugerido)
    setDecisiones({})
    setSobrescribir(false)
    setValores(excelIngestionValidator.aplicar(lectura.registros, sugerido))
    if (excelIngestionValidator.columnasFaltantes(sugerido).length) {
      setError(MENSAJES_IMPORTACION.FALTA_COLUMNA_NOMBRE)
    }
  }

  function aplicarMapeo() {
    setDecisiones({})
    setValores(excelIngestionValidator.aplicar(registros, mapa))
    setError(excelIngestionValidator.columnasFaltantes(mapa).length ? MENSAJES_IMPORTACION.FALTA_COLUMNA_NOMBRE : '')
  }

  function editar(indice, campo, valor) {
    setValores((actual) => actual.map((fila, i) => (i === indice ? { ...fila, [campo]: valor } : fila)))
    setDecisiones((actual) => ({ ...actual, [indice]: undefined }))
  }

  async function confirmar() {
    if (!empresaId) {
      setError('Seleccione la empresa que recibe la lista.')
      return
    }
    if (!evaluacion?.ok) {
      setError(evaluacion?.mensajes?.[0] || 'Revise el archivo antes de confirmar.')
      return
    }
    const resultado = await api.confirmarImportacion({
      empresaId,
      nombreArchivo,
      sobrescribir,
      filas: filasDesdeOperaciones(evaluacion.operaciones)
    })
    if (!resultado.ok) {
      setError(resultado.mensaje)
      return
    }
    setError('')
    setMensaje(`Importación confirmada. Insertados: ${resultado.datos.insertados}. Actualizados: ${resultado.datos.actualizados}. Descartados: ${resultado.datos.descartados}.`)
    setValores([])
    setRegistros([])
    setEncabezados([])
    await cargarBase()
  }

  async function descargar() {
    const buffer = await plantillaExcel()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = 'plantilla_empleados_sisme.xlsx'
    enlace.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="seccion">
      <div className="encabezado-pagina">
        <div>
          <h1>Importación</h1>
          <p className="nota">Cargue un .xlsx, revise la vista previa y confirme solo cuando no queden errores ni duplicados sin decisión.</p>
        </div>
        <Boton variante="linea" onClick={descargar}>Descargar plantilla</Boton>
      </div>
      <Aviso tipo="error">{error}</Aviso>
      <Aviso tipo="ok">{mensaje}</Aviso>
      <div className="panel">
        <Campo etiqueta="Empresa" requerido>
          <select value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>
            <option value="">Seleccione una empresa</option>
            {empresas.map((empresa) => <option key={empresa.id} value={empresa.id}>{empresa.nombre}</option>)}
          </select>
        </Campo>
        <div
          className={sobre ? 'dropzone sobre' : 'dropzone'}
          onDragOver={(e) => { e.preventDefault(); setSobre(true) }}
          onDragLeave={() => setSobre(false)}
          onDrop={(e) => { e.preventDefault(); setSobre(false); leerArchivo(e.dataTransfer.files?.[0]) }}
        >
          <p>Arrastre el Excel o selecciónelo.</p>
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => {
              const archivo = e.target.files?.[0]
              e.target.value = ''
              if (archivo) leerArchivo(archivo)
            }}
          />
        </div>
      </div>
      {encabezados.length ? (
        <div className="panel">
          <h3>Mapeo de columnas</h3>
          {excelIngestionValidator.columnasFaltantes(mapa).length ? <Aviso tipo="pendiente">{MENSAJES_IMPORTACION.FALTA_COLUMNA_NOMBRE}</Aviso> : null}
          <div className="mapa-columnas">
            {CAMPOS_IMPORTACION.map((campo) => (
              <Campo key={campo.id} etiqueta={campo.etiqueta} requerido={campo.obligatorio}>
                <select value={mapa[campo.id]} onChange={(e) => setMapa({ ...mapa, [campo.id]: e.target.value })}>
                  <option value="">No usar</option>
                  {encabezados.map((encabezado) => <option key={encabezado} value={encabezado}>{encabezado}</option>)}
                </select>
              </Campo>
            ))}
          </div>
          <Boton variante="linea" onClick={aplicarMapeo}>Actualizar vista previa</Boton>
        </div>
      ) : null}
      {clasificadas.length ? (
        <div className="panel tabla-contenedor vista-importacion">
          <h3>Vista previa</h3>
          {resumen ? (
            <p className="resumen-previa">
              <span>Filas: {resumen.total}</span>
              <span>Válidas: {resumen.validas}</span>
              <span>Con error: {resumen.conError}</span>
              <span>Duplicadas: {resumen.duplicadas}</span>
            </p>
          ) : null}
          {evaluacion && !evaluacion.ok ? evaluacion.mensajes.map((texto) => <Aviso key={texto} tipo="pendiente">{texto}</Aviso>) : <Aviso tipo="ok">La carga puede confirmarse.</Aviso>}
          <table>
            <thead>
              <tr><th>#</th><th>Nombre</th><th>CURP</th><th>Clave</th><th>Correo</th><th>Teléfono</th><th>Edad</th><th>Resultado</th><th>Decisión</th></tr>
            </thead>
            <tbody>
              {clasificadas.map((fila) => {
                const clase = fila.marca === 'error' ? 'incompleto' : fila.marca === 'duplicado' ? 'duplicado' : 'valido'
                const camposError = new Set(fila.camposConError)
                return (
                  <tr key={fila.indice} className={clase} data-marca={fila.marca}>
                    <td>{fila.indice + 1}</td>
                    {COLUMNAS_PREVIEW.map((campo) => (
                      <td key={campo}>
                        <input
                          aria-invalid={camposError.has(campo) || undefined}
                          className={camposError.has(campo) ? 'celda-error' : undefined}
                          value={valores[fila.indice]?.[campo] ?? ''}
                          onChange={(e) => editar(fila.indice, campo, e.target.value)}
                        />
                      </td>
                    ))}
                    <td>
                      {fila.incompleta ? 'Incompleto' : null}
                      {fila.errores.map((item) => item.mensaje).join(' ')}
                      {fila.duplicadoBd ? ` Duplicado: ${fila.duplicadoBd.nombre}.` : null}
                      {fila.duplicadoArchivo ? ' Duplicado en el archivo.' : null}
                      {!fila.incompleta && !fila.errores.length && !fila.duplicadoBd && !fila.duplicadoArchivo ? 'Válido' : null}
                    </td>
                    <td>
                      {(fila.duplicadoBd || fila.duplicadoArchivo || fila.incompleta || fila.errores.length) ? (
                        <select value={decisiones[fila.indice] || ''} onChange={(e) => setDecisiones({ ...decisiones, [fila.indice]: e.target.value || undefined })}>
                          <option value="">Elegir</option>
                          <option value="descartar">Descartar</option>
                          {fila.duplicadoBd ? <option value="actualizar">Actualizar</option> : null}
                          {!fila.duplicadoBd && fila.duplicadoArchivo ? <option value="conservar">Conservar</option> : null}
                        </select>
                      ) : 'Se insertará'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {clasificadas.some((fila) => decisiones[fila.indice] === 'actualizar') ? (
            <label className="campo">
              <span><input type="checkbox" checked={sobrescribir} onChange={(e) => setSobrescribir(e.target.checked)} /> Confirmo la actualización de los registros existentes.</span>
            </label>
          ) : null}
          <Boton variante="azul" disabled={!evaluacion?.ok || !empresaId} onClick={confirmar}>Confirmar carga</Boton>
        </div>
      ) : <Vacio>La vista previa aparecerá después de leer el archivo.</Vacio>}
      <div className="panel tabla-contenedor">
        <h3>Lotes importados</h3>
        <table>
          <thead><tr><th>Archivo</th><th>Empresa</th><th>Insertados</th><th>Actualizados</th><th>Descartados</th></tr></thead>
          <tbody>
            {historial.map((lote) => (
              <tr key={lote.id}><td>{lote.nombreArchivo}</td><td>{lote.empresa}</td><td>{lote.insertados}</td><td>{lote.actualizados}</td><td>{lote.descartados}</td></tr>
            ))}
          </tbody>
        </table>
        {historial.length === 0 ? <Vacio>Todavía no hay lotes confirmados.</Vacio> : null}
      </div>
    </section>
  )
}

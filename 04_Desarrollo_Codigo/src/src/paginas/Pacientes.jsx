// S5-T14: Administrador y Doctor ven la misma lista de pacientes (decisión del
// propietario, 30/10/2026). El doctor conserva su cola del día en otra pestaña
// (/app/pacientes?vista=cola), sin mezclarla con la lista.
import { useSearchParams } from 'react-router-dom'
import { useSesion } from '../datos/ProveedorSesion.jsx'
import { PacientesAdmin } from './PacientesAdmin.jsx'
import { PacientesDoctor } from './PacientesDoctor.jsx'

export function Pacientes() {
  const { usuario } = useSesion()
  const [params, setParams] = useSearchParams()
  if (usuario?.rol !== 'doctor') return <PacientesAdmin />
  const vista = params.get('vista') === 'cola' ? 'cola' : 'lista'
  return (
    <>
      <div className="tabs" role="tablist" aria-label="Vista de pacientes">
        <button type="button" role="tab" aria-selected={vista === 'lista'} className={vista === 'lista' ? 'activa' : ''} onClick={() => setParams({})}>Lista de pacientes</button>
        <button type="button" role="tab" aria-selected={vista === 'cola'} className={vista === 'cola' ? 'activa' : ''} onClick={() => setParams({ vista: 'cola' })}>Cola del día</button>
      </div>
      {vista === 'cola' ? <PacientesDoctor /> : <PacientesAdmin />}
    </>
  )
}

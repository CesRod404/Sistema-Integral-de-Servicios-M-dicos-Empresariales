import React, { useState, useEffect } from 'react';
import {supabase} from '../../supabaseClient';

export default function ExcelIngestionValidator({ datosParseados, empresaId }) {
    const [duplicados, setDuplicados] = useState([]);
    const [bloqueoActivo,setBloqueoActivo] = useState(false);
    const [autorizaSobreescritura, setAutorizaSobreescritura] = useState(false);

    const [indicesIncompletos, setIndicesIncompletos] = useState([]);

    useEffect(() =>{ 
        validarDuplicados(datosParseados);
        validarDatosIncompletos(datosParseados);
    }, [datosParseados]);


    const validarDatosIncompletos = (datos) => {
        const errores = [];
        datos.ForEach((fila, index) => {
            if (fila.nombre || fila.nombre.trim() === ''){
                errores.push(index);
            }
        });
        setIndicesIncompletos(errores);
    };

    const validarDuplicados = async (datos) => {
        // Extraer curps del excel
        const curpsLote = datos.map(row => row.curp).filter(Boolean); 

        if (curpsLote.length === 0) return;

        //consulta supabase curps existentes
        const {data: existentes, error} = await supabase
            .from('empleados')
            .select("curp")
            .eq('empresa_id', empresaId)
            .in('curp', curpsLote)
        
        if (existentes && existentes.length > 0) {
            const curpsExistentes = existentes.map(e => e.curp);
            setDuplicados(curpsExistentes);
            setBloqueoActivo(true); // se activa un bloqueo 
        }        
    };

    const procesarCarga = async () => {
        console.log("cargando datos con sobresescritura: ", autorizaSobreescritura);
    };

    const tieneIncompletos = indicesIncompletos.length > 0;
    const botonBloqueado = (bloqueoActivo && !autorizaSobreescritura) || tieneIncompletos;


    return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold text-blue-900 mb-4">Vista Previa de Importación</h2>
      
      {/* Datos Incompletos*/}
      {tieneIncompletos && (
        <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mb-4 flex">
          <span className="material-icons text-orange-500 mr-2">error_outline</span>
          <div>
            <h3 className="text-orange-800 font-bold">Datos obligatorios faltantes</h3>
            <p className="text-orange-700 text-sm">
              Se encontraron {indicesIncompletos.length} registro(s) sin nombre. Debes corregir el archivo Excel y volver a subirlo para continuar.
            </p>
          </div>
        </div>
      )}

      {/* Bloqueo por Duplicados */}
      {bloqueoActivo && !autorizaSobreescritura && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 flex">
          <span className="material-icons text-red-500 mr-2">warning</span>
          <div>
            <h3 className="text-red-800 font-bold">Bloqueo de seguridad activo</h3>
            <p className="text-red-700 text-sm">
              Se detectaron {duplicados.length} registro(s) que ya existen.
            </p>
            <button 
              onClick={() => setAutorizaSobreescritura(true)}
              className="mt-3 bg-red-600 text-white px-4 py-2 rounded shadow hover:bg-red-700 text-sm font-semibold"
            >
              Autorizar sobreescritura de duplicados
            </button>
          </div>
        </div>
      )}

      {/* Vista Previa de la Matriz */}
      <div className="overflow-x-auto mb-4">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-4 py-2">Fila</th>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">CURP</th>
            </tr>
          </thead>
          <tbody>
            {datosParseados.map((fila, index) => {
              const esDuplicado = duplicados.includes(fila.curp);
              const esIncompleto = indicesIncompletos.includes(index);
              
              // Prioridad visual: Rojo/Naranja para incompletos, Amarillo para duplicados
              const rowClass = esIncompleto ? 'bg-orange-100' : (esDuplicado ? 'bg-yellow-100' : 'bg-white');

              return (
                <tr key={index} className={`border-b ${rowClass}`}>
                  <td className="px-4 py-2 font-mono text-gray-400">{index + 1}</td>
                  <td className={`px-4 py-2 ${!fila.nombre ? 'border-2 border-orange-400' : ''}`}>
                    {fila.nombre || <span className="text-orange-600 font-bold text-xs">REQUERIDO</span>}
                  </td>
                  <td className="px-4 py-2 font-mono">{fila.curp}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button 
        onClick={procesarCarga}
        disabled={botonBloqueado}
        className="w-full bg-blue-900 text-white font-bold py-3 rounded hover:bg-blue-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
      >
        Confirmar Importación
      </button>
    </div>
  );
}

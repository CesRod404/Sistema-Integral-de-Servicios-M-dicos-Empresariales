import React from 'react';
import Navbar from './NavBar';

export default function Servicios() {
    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <Navbar activeTab="servicios"/>
            {/* Cabecera de Servicios */}
            <header className="px-16 py-12 flex relative overflow-hidden">
                <div className="w-1/2 z-10 pr-8">
                    <h1 className="text-5xl font-extrabold text-blue-900 mb-4">Nuestros Servicios</h1>
                    <p className="text-gray-600 leading-relaxed max-w-lg" >
                        Ofrecemos una amplia gama de estudios y evaluaciones medicas
                    </p>
                </div>
                <div className="absolute right-0 top-0 w-1/2 h-full rounded-l-[150px] overflow-hidden">
                    <img src="/microscope-bg.jpg" alt="Laboratorio" className="object-cover w-full h-full"/>
                    <div className="absolute top-8 right-8 bg-white/90 backdrop-blur px-4 py-2 rounded-lg flex items-center gap-2 shadow text-sm font-semibold text-blue-900">
                        <span className="material-icons text-blue-500">
                            Ciencia
                        </span> Resultados confiables para empresas más saludables
                    </div>
                </div>
            </header>
            {/*tarjeta 1*/}
            <ServiceCard
                img="/general-exam.jpg" icon="person" title="Examen medico general"
                desc="Evaluación integral del estado de salud del empleado, ideal para ingreso, periódicos o de seguimiento."
                cost="$450.00 MXN"
                details={['Historia clínica', 'Exploración física', 'Certificado médico']}
            />
            {/*tarjeta 2*/}
            <ServiceCard
              img="/lab-exam.jpg" icon="science" title="Estudios de Laboratorio"
                desc="Análisis clínicos para detectar y prevenir riesgos a la salud, con tecnología confiable y resultados precisos."
                cost="desde $250.00 MXN"
                details={['Biometría hemática', 'Química sanguínea', 'Examen general de orina', 'Perfil lipídico']}        
            />
            {/*tarjeta 3 */}
            <ServiceCard
               img="/gabinet-exam.jpg" icon="monitor_heart" title="Estudios de Gabinete"
               desc="Diagnósticos por imagen para una evaluación completa y oportuna de la salud."
               cost="desde $300.00 MXN"
               details={['Rayos X (tórax)', 'Electrocardiograma (ECG)', 'Ultrasonido', 'Audiometría']}           
            />
        </div>
    );
}

function ServiceCard({ img, icon, title, desc, cost, details }) {
  return (
    <div className="bg-white rounded-3xl shadow-md overflow-hidden border border-gray-100 flex flex-col">
      <div className="h-48 relative">
        <img src={img} alt={title} className="w-full h-full object-cover" />
        <div className="absolute -bottom-6 left-6 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
          <span className="material-icons text-blue-500">{icon}</span>
        </div>
      </div>
      <div className="p-8 pt-10 flex-grow flex flex-col">
        <h3 className="text-xl font-bold text-blue-900 mb-3">{title}</h3>
        <p className="text-sm text-gray-500 mb-6 flex-grow">{desc}</p>
        
        <div className="flex justify-between items-start mb-6">
          <div>
            <span className="text-xs text-gray-400 block mb-1">Costo</span>
            <span className="text-lg font-extrabold text-blue-900">{cost}</span>
          </div>
          <div>
            <span className="text-xs text-gray-400 block mb-2">Detalles</span>
            <ul className="text-sm text-gray-600 space-y-1">
              {details.map((item, i) => (
                <li key={i} className="flex items-center gap-1">
                  <span className="material-icons text-orange-500 text-sm">check_circle</span> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <button className="w-full py-3 border-2 border-blue-900 text-blue-900 rounded-full font-semibold hover:bg-blue-50 flex items-center justify-center gap-2 transition">
          Más información <span className="material-icons text-sm">chevron_right</span>
        </button>
      </div>
    </div>
  );
}
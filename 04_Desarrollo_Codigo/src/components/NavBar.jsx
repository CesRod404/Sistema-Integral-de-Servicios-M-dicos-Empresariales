import React from 'react';


export default function NavBar({ actiiveTab }) {
    return(
        <nav className= "flex items-center justify-between px-8 py-4 bg-white shadows-sm ">
            {/* Logo */}
            <div className="flex items-center">
                <img src="/logo-sisme.png" alt="SISME logo" className="h-12"/>
            </div>
            
            {/* Enlace de navegacion */}
            <div className="flex items-center gap-8 text-sm font-semibod text-gray-600">
                <a href="#inicio" className={`flex items-center gap-2 pb-1 ${activeTab === 'inicio' ? 'text-blue-800 border-b-2 border-orange-500' : 'hover:text-blue-800'}`}>
                    <span className="material-icons text-base">Home</span> Incio
                </a>
                <a href="#servicios" className={`flex items-center gap-2 pb-1 ${activeTab === 'servicios' ? 'text-blue-800 border-b-2 border-orange-500' : 'hover:text-blue-800'}`}>
                    <span className="material-icons text-base">medical_services</span> Nuestros Servicios
                </a>
                <a href="#cita" className={`flex items-center gap-2 'hover:text-blue-800'}`}>
                    <span className="material-icons text-base">calendar_today</span> Cita
                </a>
                <a href="#contacto" className={`flex items-center gap-2 'hover:text-blue-800'}`}>
                    <span className="material-icons text-base">phone</span> Contactanos
                </a>
            </div>
            {/* Boton de Autentificacion */}
            <button className="flex item-center gap-2 bg-blue-900 text-white px-6 py-2 rounded-full font-medium hover:bg-blue-800 transition">
                <span className="material-icons text-sm">person</span> Iniciar de sesion
            </button>
        </nav>
    )
}

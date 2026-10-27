import Rect from 'react';
import NavBar from './NavBar';

export default function Inicio() {
    return (
        <div className="relative min-h-screen bg-slate-50 front-sans">

            <NavBar activeTab="inicio" />
            {/* Hero Section */}
            <main className="relative flex items-center px-16 py-20 overflow-hidden">
                {/*Contenido de texto*/}
                <div className="w-1/2 z-10">
                    <p className="text-gray-400 text-sm font-bold tracking-widest upper-case mb-4" >
                        Gestion inteligente, salud laboral eficiente
                    </p>
                    <h1 className="text-5xl font-extrabold text-blue-900 leading-tight mb-4">
                        Cuidamos la salud <br /> de tu equipo <br />
                        <span className="text-orange-500">impulsamos tu empresa</span>
                    </h1>
                    <p className="text-gray-600 mb-8 max-w-lg leading-relaxed">
                        En SISME, facilitamos la atencion medica de tus colaboradores integrando en un solo sistema la programación de citas, la atención médica, los estudios y el control de cuentas por empresa.                        
                    </p>
                    <div className="flex gap-4">
                        <button className="bg-orange-500 text-white px-6 py-3 rounded-full font-semibold flex items-center gap-2 hover:bg-orange-600">
                            <span className="material-icons text-sm">calendar_month</span> Agendar una cita <span className="material-icons text-sm">chevron_right</span>
                        </button>
                        <button className="border-2 border-blue-900 text-blue-900 px-6 py-3 rounded-full font-semibold flex items-center gap-2 hover:bg-blue-50">
                            <span className="material-icons text-sm">description</span> Conoce nuestros servicios
                        </button>
                    </div>
                </div>
                {/*Imagen de fondo*/}
                <div className="absolute right-0 top-0 w-1/2 h-full bg-blue-100 rounded-l-[200px] overflow-hidden">
                    <img src="/hero-doctor.jpg" alt="Doctor y Paciente" className="object-cover w-full h-full opacity-90"/>
                </div>
            </main>
            {/* Sección de servicios */}
            <section className="px-16 pb-20">
                <div className="grid grid-cols-4 gap-6">
                    <FeatureCard
                        icon="people" bgClass="bg-blue-100" textClass="text-blue-900"
                        title="Atencion Integral" desc="Todo el proceso medicos en un solo sistema"
                    >
                    </FeatureCard>
                    <FeatureCard
                        icon="calendar_today" bgClass="bg-orange-100" textClass="text-orange-500"
                        title="Gestion Inteligente" desc="Programacion de citas y control de asistencia"
                    >
                    </FeatureCard>
                    <FeatureCard
                        icon="security" bgClass="bg-green-100" textClass="text-green-600"
                        title="informacion Segura" desc="Expedientes digitales y acceso controlado"
                    >
                    </FeatureCard>

                    <FeatureCard
                        icon="bar_chart" bgClass="bg-gray-200" textClass="text-gray-600"
                        title="Control Empresarial" desc="Seguimiento de estudios, cargos y pagos por empresa."
                    >
                    </FeatureCard>
                </div>
            </section>
        </div>
    );
}

function FeatureCard({ icon, bgClass, textClass, title, desc }) {
    return (
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center flex flex-col items-center">
            <div className={'w-16 h-16 rounded-full flex items-center justify-center mb-4 ' + bgClass + ' ' + textClass}>
                <span className="material-icons text-3xl">{icon}</span>
            </div>
            <h3 className="font-bold text-blue-900 mb-2">{title}</h3>
            <p className="text-sm text-gray-500">{desc}</p>
        </div>
    );
}
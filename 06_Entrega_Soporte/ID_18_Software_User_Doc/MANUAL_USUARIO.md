# ID 18 — Manual de usuario

SISME se usa en español. Hay dos perfiles: Administrador y Doctor.

## Entrar y recuperar el acceso

1. Abra **Inicio de sesión**.
2. Escriba el correo y la contraseña. La contraseña tiene al menos 8 caracteres, con letras y números.
3. **Recordarme** conserva la sesión en este navegador. Si lo deja sin marcar, la sesión termina al cerrar el navegador.
4. Tras cinco contraseñas incorrectas la cuenta queda bloqueada 15 minutos.
5. **¿Olvidaste tu contraseña?** pide un código al correo registrado. El mensaje es el mismo si el correo no existe. El código vence en 15 minutos. En demostración aparece en la bandeja de esta pantalla y no se envía fuera del navegador.

## Sitio público

**Inicio**, **Nuestros servicios** y **Contáctanos** informan a la empresa. Las tarifas no se publican. **Agendar una cita** pide inicio de sesión: la cita la programa el Administrador para un empleado ya registrado.

## Administrador

- **Inicio.** Conteos del día y saldo de cobranza.
- **Pacientes.** Busca por nombre, empresa o CURP. Puede dar de alta un paciente. **Consultar** abre datos de contacto y la lista de visitas. No muestra diagnóstico, observaciones ni PDF. Puede corregir datos de contacto; no el expediente clínico.
- **Citas.** Elija el día, el empleado y la hora. En la sala de espera use **Presente**, **Ausente**, **Reprogramar** o **Cancelar**. Cancelar conserva el historial.
- **Empresas.** Alta y edición con contacto, correo, teléfono y dirección. **Dar de baja** deja la empresa inactiva sin borrar citas, expedientes ni cobros.
- **Importación.** Descargue la plantilla o cargue un `.xlsx`. Elija la empresa, revise el mapeo y la vista previa. Las filas incompletas, con formato inválido o duplicadas impiden confirmar hasta descartarlas, corregirlas o, si ya existen, actualizarlas con la casilla de confirmación. Un empleado puede entrar solo con nombre.
- **Cobranza.**
  - **Cargos:** deuda por atención y registro de pago (total o parcial). El precio histórico no cambia.
  - **Por empresa:** totales.
  - **Catálogo:** nombre, precio mayor o igual a cero y vigencia.
  - **Periodo:** resumen del plan de proyecto. La leyenda `PENDIENTE DE VALIDAR CONTRA SRS` indica que el SRS no define este reporte.

## Doctor

- El menú muestra Inicio, Pacientes y Citas.
- **Pacientes** es el tablero del día: Pendientes, En proceso, Finalizado y Ausentes. No hay precios.
- La atención se abre cuando el Administrador marcó **Presente**. Capture fecha, diagnóstico, observaciones y estudios por nombre. Adjunte uno o más PDF de hasta 5 MB. **Guardar atención** deja el expediente abierto. **Cerrar expediente** exige fecha y diagnóstico, pasa la cita a finalizada y genera el cargo para el Administrador.
- En **Citas** solo consulta la agenda.

## Qué no hace el sistema

No hay facturación electrónica, pago en línea, ni pantallas de Reportes o Configuración. El Doctor no registra asistencia ni consulta cobranza.

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
- **Pacientes.** Busca por nombre, empresa o CURP. Puede dar de alta un paciente. Al seleccionar la empresa en el alta aparecen automáticamente los campos de su plantilla Excel vigente (o la predeterminada), con los mismos tipos y obligatoriedad (S7-T11, RF-21). Esos datos se guardan en el empleado. En el alta el administrador puede indicar, de forma opcional, la fecha, la hora y el motivo de la cita (S7-T09, RF-12). Si lo hace, la cita queda programada y la doctora la ve en la Cola del día de esa fecha. El paciente también se puede registrar sin cita. **Consultar** abre datos de contacto y la lista de visitas. No muestra diagnóstico, observaciones ni PDF. Puede corregir datos de contacto; no el expediente clínico. **Nuevo paciente** abre el alta en un formulario centrado (S7-T16). En la ficha, al cambiar la empresa se muestran los campos de la plantilla de la nueva empresa y se avisa qué datos personalizados se quitarán al guardar (S7-T14). La columna **Plantilla** indica con qué versión se registró cada paciente («Plantilla v2», «Predeterminada») y avisa si ya hay una versión vigente más nueva (S7-T15). Con las casillas puede elegir varios pacientes, o todos los del filtro, y darlos de baja tras confirmar; quedan inactivos sin borrar su historia (S7-T17).
- **Citas.** Elija el día, el empleado y la hora. En la sala de espera use **Presente**, **Ausente**, **Reprogramar** o **Cancelar**. Cancelar conserva el historial.
- **Empresas.** Alta y edición con contacto, correo, teléfono y dirección. **Dar de baja** deja la empresa inactiva sin borrar citas, expedientes ni cobros. Con las casillas puede dar de baja varias empresas activas a la vez (S7-T17). En la plantilla basta con conservar CURP o Clave de empleado; si renombra la columna CURP (por ejemplo «Mina a la que va»), se guarda como un campo de texto y ya no se valida como CURP (S7-T13).
- **Importación.** Descargue la plantilla o cargue un `.xlsx`. Elija la empresa, revise el mapeo y la vista previa. Las filas incompletas, con formato inválido o duplicadas impiden confirmar hasta descartarlas, corregirlas o, si ya existen, actualizarlas con la casilla de confirmación. Un empleado puede entrar solo con nombre.
- **Cobranza.**
  - **Cargos:** deuda por atención y registro de pago (total o parcial). El precio histórico no cambia. Filtre por empresa, texto y estatus. Marque varios cargos, o pulse **Seleccionar todos los del filtro**, y luego **Marcar como pagados**: con una referencia y una fecha se paga el saldo completo de cada uno (S7-T18).
  - **Por empresa:** totales.
  - **Catálogo:** nombre, precio mayor o igual a cero y vigencia.
  - **Periodo:** resumen del plan de proyecto. La leyenda `PENDIENTE DE VALIDAR CONTRA SRS` indica que el SRS no define este reporte.

## Doctor

- El menú muestra Inicio, Pacientes y Citas.
- **Pacientes** es el tablero del día: Pendientes, En proceso, Finalizado y Ausentes. No hay precios. Desde la Cola del día puede marcar **Presente** o **Ausente** (S7-T12). Si el paciente está presente, abre la atención. No programa, reprograma ni cancela citas.
- La atención se abre cuando el paciente está marcado **Presente** (lo puede hacer el Administrador o la doctora; SRS v1.7, RF-13). En **Datos del paciente** aparecen los mismos campos de la plantilla Excel vigente de la empresa, ya llenos, y se pueden editar (S7-T10, RF-21). Los obligatorios de la plantilla se validan al guardar o cerrar. Capture también fecha, diagnóstico, observaciones y estudios por nombre. Adjunte uno o más PDF de hasta 5 MB. **Guardar atención** deja el expediente abierto. **Cerrar expediente** exige fecha y diagnóstico, pasa la cita a finalizada y genera el cargo para el Administrador.
- En **Citas** consulta la agenda y puede marcar presente o ausente. Programar, reprogramar o cancelar sigue a cargo del Administrador.

## Qué no hace el sistema

No hay facturación electrónica, pago en línea, ni pantallas de Reportes o Configuración. El Doctor no consulta cobranza. El Doctor no programa, reprograma ni cancela citas.

## Historial de cambios
- **24/11/2026 — S7-T09.** El alta del administrador permite asignar fecha y hora de cita (opcional, RF-12) para que aparezca en la Cola del día de la doctora. Fusionada a develop en el PR #8 (e393b85).
- **24/11/2026 — S7-T10.** La pantalla de Atención muestra y deja editar los campos de la plantilla vigente de la empresa (RF-21). Los obligatorios se validan al guardar o cerrar. Fusionada a develop en el PR #9 (714bbe2).
- **24/11/2026 — S7-T11.** Al registrar un paciente, al elegir la empresa aparecen los campos de su plantilla Excel para llenarlos (RF-21). Aplica al administrador y al doctor. Fusionada a develop en el PR #10 (926cb2b).
- **24/11/2026 — S7-T12.** La doctora puede marcar presente o ausente en la Cola del día y en Citas. El SRS se actualiza a v1.7 para que el RF-13 incluya al Doctor. La migración `202611240001_doctora_marca_asistencia.sql` se aplica en Supabase tras fusionar. Rama `feature/S7-T12-doctora-marca-asistencia`.
- **25/11/2026 — S7-T13 a S7-T18.** CURP renombrada como campo libre, cambio de empresa con campos de plantilla, marcador de versión de plantilla, formularios centrados, bajas lógicas en lote y pagos en lote. Rama `feature/s7-lote2-pacientes-cobranza`.

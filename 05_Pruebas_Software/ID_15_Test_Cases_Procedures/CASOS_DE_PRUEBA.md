# ID 15 — Casos y procedimientos de prueba

Herramienta automática: Vitest (`npm test` desde la raíz). Los casos manuales se ejecutan en el navegador con el modo demostración (sin clave anon).

## Casos automáticos

Archivos: `04_Desarrollo_Codigo/src/src/domain/reglas.test.js`, `excelImport.test.js`, `pacientes.test.js`, `atencionPlantilla.test.js`, `plantillaCampos.test.js`, `asistencia.test.js`, `curpReutilizada.test.js`, `edicionPacientePlantilla.test.js`, `versionPlantillaPaciente.test.js`, `seleccion.test.js` y `pagoLote.test.js`.

| ID | Qué se comprueba |
| --- | --- |
| AUT-01 | Solo existen los roles administrador y doctor |
| AUT-02 | El doctor no entra a cobranza, empresas, importación, catálogo, reportes ni configuración |
| AUT-03 | La vista de estudio quita el precio al doctor y la de expediente quita diagnóstico, observaciones y archivos al administrador |
| AUT-04 | Contraseña de 8 caracteres con letras y números |
| AUT-05 | Cinco fallos bloquean 15 minutos; el mensaje de recuperación no revela si el correo existe |
| AUT-06 | El administrador o el doctor cambian la asistencia; una cita cerrada o cancelada no cambia (S7-T12) |
| AUT-07 | El cierre exige fecha de atención y diagnóstico |
| AUT-08 | El cargo congela el precio aunque el catálogo cambie después |
| AUT-09 | El pago parcial y el rechazo de un pago mayor al saldo |
| AUT-10 | CURP, teléfono y PDF de más de 5 MB |
| AUT-11 | Excel: duplicado por CURP, fila incompleta, formato inválido y confirmación bloqueada |
| AUT-12 | Clasificación de 500 filas en menos de 2 segundos (RNF de lote) |

## Casos manuales

Datos de demostración. Contraseñas en el README. La fecha de las citas sembradas es el día actual en `America/Mexico_City`.

| ID | Procedimiento | Resultado esperado |
| --- | --- | --- |
| MAN-01 | Abrir `/`, `/servicios` y `/contacto` sin sesión | Textos en español. Servicios sin importes. Agendar una cita lleva a `/login` |
| MAN-02 | Entrar con contraseña incorrecta y luego con el administrador | Error en español. El menú muestra Inicio, Pacientes, Citas, Empresas, Importación y Cobranza |
| MAN-03 | Con el administrador, abrir `/app/cobranza` directo y, en otra sesión de doctor, la misma URL | El doctor vuelve a Inicio con aviso de acceso denegado. No ve importes en Pacientes ni en Atención |
| MAN-04 | En Citas, con el administrador o con la doctora, marcar presente a un paciente programado | El estado cambia en la sala. En el tablero del doctor ese paciente se puede atender |
| MAN-05 | Abrir la ficha de un paciente con expediente cerrado | No aparece el diagnóstico ni un enlace para descargar el PDF |
| MAN-06 | En Cobranza, localizar el cargo de Carlos Martínez (biometría, 200). Cambiar la tarifa de Biometría hemática. Volver a Cargos | El histórico sigue en 200.00 |
| MAN-07 | Abrir la pestaña Periodo | Se lee exactamente `PENDIENTE DE VALIDAR CONTRA SRS` |
| MAN-08 | Dar de baja lógica una empresa de prueba | Pasa a inactivo. Sigue en el listado. No se borra su historia |
| MAN-09 | Importar un `.xlsx` con una fila nueva, un CURP ya existente, un CURP inválido y un nombre sin CURP | La vista previa resalta duplicado e inválido. Confirmar permanece deshabilitado hasta descartar o corregir. El nombre solo puede insertarse |
| MAN-10 | Recuperar la contraseña de `admin@sisme.local` y de un correo inexistente | El código de demostración solo aparece si el correo está registrado. El mensaje público es el mismo |
| MAN-11 | Cerrar sesión | Regresa al sitio público y `/app` pide de nuevo el acceso |
| AUT-13 | S7-T09: el alta sin fecha no crea cita; con fecha y hora la cita queda programada en Pendientes |
| MAN-12 | Con el administrador, dar de alta un paciente con fecha y hora de cita. Entrar como doctor y abrir la Cola del día en esa fecha | El paciente aparece en Pendientes como programada. La atención se abre cuando se marca presente |
| AUT-14 | S7-T10: la atención expone los campos de la plantilla vigente y permite editarlos, incluidos los personalizados |
| MAN-13 | Configurar un campo personalizado en la plantilla de una empresa. Abrir la atención de un paciente presente de esa empresa | Aparece «Datos del paciente» con esos campos, editables. Un obligatorio vacío impide guardar |
| AUT-15 | S7-T11: al alta, la plantilla de la empresa (o la predeterminada) arma el payload; un obligatorio vacío se rechaza; el doctor también consulta la plantilla |
| MAN-14 | En el alta de pacientes, elegir una empresa con plantilla propia y otra con la predeterminada | Al cambiar la empresa se redibujan los campos. Los valores se guardan en el empleado, incluidos los personalizados |
| AUT-16 | S7-T12: el doctor marca presente o ausente; no puede cancelar; una cita cerrada no cambia |
| MAN-15 | Con la doctora, en la Cola del día, marcar presente a un paciente programado y abrir la atención | El paciente pasa a presente y la atención se abre. Ausente lo mueve a Ausentes. No aparecen Reprogramar ni Cancelar |
| MAN-16 | Si en Supabase aún no se aplica `202611240001_doctora_marca_asistencia.sql`, marcar presente como doctora | El sistema muestra el mensaje de rechazo de la RPC y no cambia el estado |
| AUT-17 | S7-T13: una columna CURP renombrada («Mina a la que va») se guarda y se valida como texto libre; se exige CURP o Clave de empleado |
| MAN-17 | En la plantilla de Cantera, con la columna renombrada «Mina a la que va», dar de alta un paciente con una mina | Se guarda sin el error de formato de CURP. El valor aparece en la ficha |
| AUT-18 | S7-T14: al cambiar la empresa se conservan las claves comunes y se descartan los personalizados de la empresa anterior |
| MAN-18 | Abrir la ficha de un paciente con campos personalizados y cambiarle la empresa | Se redibujan los campos de la nueva plantilla y se avisa qué datos se quitarán al guardar |
| AUT-19 | S7-T15: el paciente guarda la versión de plantilla; el marcador indica «Plantilla vN», «Predeterminada» o si hay una vigente más nueva |
| MAN-19 | Editar la plantilla de una empresa y volver a Pacientes | Los pacientes anteriores muestran su versión y «vigente vN»; al guardar su ficha pasan a la vigente |
| MAN-20 | Abrir Pacientes, Empresas y Cobranza → Catálogo | El formulario queda centrado, sin un hueco grande al centro |
| AUT-20 | S7-T17: selección por casillas, «todos» sobre lo visible y baja lógica en lote; el doctor no puede |
| MAN-21 | Marcar varios pacientes (o empresas) y pulsar dar de baja | Se pide confirmación. Quedan inactivos y siguen en el listado con su historia |
| AUT-21 | S7-T18: el lote paga el saldo completo, omite los pagados, exige referencia y fecha, y no paga nada si un cargo no existe |
| MAN-22 | En Cobranza → Cargos, filtrar «Con saldo», pulsar «Seleccionar todos los del filtro» y «Marcar como pagados» con una referencia | Se confirma el total. Los cargos pasan a Pagado con saldo 0 y el precio histórico no cambia |
| AUT-22 | S7-T20: solo el administrador edita citas programadas, presentes o ausentes; valida fecha y hora; al cambiar la fecha la asistencia vuelve a programada; no reprograma una cita cerrada; el doctor no puede; el panel elige la próxima cita abierta y, sin cita abierta, agenda una nueva |
| MAN-23 | Como administrador, en Pacientes pulsar «Cita» en un paciente con cita programada, presente o ausente, pulsar «Editar cita», cambiar fecha, hora y motivo y guardar; repetir con un paciente sin cita abierta usando «Agendar cita» | La visita muestra la nueva fecha y el motivo; la cita aparece en Citas y en la Cola del día de la doctora en la nueva fecha. Con la sesión de la doctora no aparece el botón |

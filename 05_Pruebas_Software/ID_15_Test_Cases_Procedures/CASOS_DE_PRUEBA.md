# ID 15 — Casos y procedimientos de prueba

Herramienta automática: Vitest (`npm test` desde la raíz). Los casos manuales se ejecutan en el navegador con el modo demostración (sin clave anon).

## Casos automáticos

Archivos: `04_Desarrollo_Codigo/src/src/domain/reglas.test.js` y `excelImport.test.js`.

| ID | Qué se comprueba |
| --- | --- |
| AUT-01 | Solo existen los roles administrador y doctor |
| AUT-02 | El doctor no entra a cobranza, empresas, importación, catálogo, reportes ni configuración |
| AUT-03 | La vista de estudio quita el precio al doctor y la de expediente quita diagnóstico, observaciones y archivos al administrador |
| AUT-04 | Contraseña de 8 caracteres con letras y números |
| AUT-05 | Cinco fallos bloquean 15 minutos; el mensaje de recuperación no revela si el correo existe |
| AUT-06 | Solo el administrador cambia la asistencia; una cita cerrada o cancelada no cambia |
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
| MAN-04 | En Citas, marcar presente a un paciente programado | El estado cambia en la sala. En el tablero del doctor ese paciente deja de estar bloqueado |
| MAN-05 | Abrir la ficha de un paciente con expediente cerrado | No aparece el diagnóstico ni un enlace para descargar el PDF |
| MAN-06 | En Cobranza, localizar el cargo de Carlos Martínez (biometría, 200). Cambiar la tarifa de Biometría hemática. Volver a Cargos | El histórico sigue en 200.00 |
| MAN-07 | Abrir la pestaña Periodo | Se lee exactamente `PENDIENTE DE VALIDAR CONTRA SRS` |
| MAN-08 | Dar de baja lógica una empresa de prueba | Pasa a inactivo. Sigue en el listado. No se borra su historia |
| MAN-09 | Importar un `.xlsx` con una fila nueva, un CURP ya existente, un CURP inválido y un nombre sin CURP | La vista previa resalta duplicado e inválido. Confirmar permanece deshabilitado hasta descartar o corregir. El nombre solo puede insertarse |
| MAN-10 | Recuperar la contraseña de `admin@sisme.local` y de un correo inexistente | El código de demostración solo aparece si el correo está registrado. El mensaje público es el mismo |
| MAN-11 | Cerrar sesión | Regresa al sitio público y `/app` pide de nuevo el acceso |

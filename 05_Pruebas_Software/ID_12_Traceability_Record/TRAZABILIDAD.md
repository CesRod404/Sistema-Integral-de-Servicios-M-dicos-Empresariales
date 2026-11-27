# ID 12 — Registro de trazabilidad

Cada historia del SRS v1.5 apunta a la pantalla, a la regla de dominio y, cuando aplica, al control en PostgreSQL.

| Historia | Requisito | Pantalla | Regla o prueba | Control en base de datos |
| --- | --- | --- | --- | --- |
| US-ACC-01 | RF-01 | `/login` | `acceso.js`, `roles.js` | `estado_acceso`, `perfiles.rol` |
| US-ACC-02 | RF-02 | `/recuperar` | `solicitarCodigo`, `verificarCodigo` | OTP de Supabase Auth |
| US-ACC-03 | RF-03 | Menú por rol | `puedeAcceder`, `vistaEstudio`, `vistaExpediente` | RLS y vistas sin precio o sin diagnóstico |
| US-EMP-01 | RF-04 | `/app/empresas` | `validarEmpresa` | Políticas de `empresas`; sin `DELETE` |
| US-EMP-02 | RF-05 | `/app/empresas` | Contacto, correo, teléfono y dirección | Columnas de contacto en `empresas` |
| US-EMP-03 | RF-06 | Filtro y baja lógica | Estado `inactivo` | `fn_impedir_eliminacion` |
| US-IMP-01 | RF-07 | `/app/importacion` | `excelImport.test.js` | `importar_empleados` |
| US-IMP-02 | — | Vista previa y mapeo | `evaluarConfirmacion` | La confirmación vuelve a validar en el RPC |
| US-IMP-03 | RF-08 | Filas duplicadas resaltadas | `buscarDuplicado` | Misma clave CURP, clave o nombre |
| US-IMP-04 | RF-09 | Casilla de sobrescritura | Decisión `actualizar` | El RPC exige `sobrescribir` |
| US-IMP-05 | RF-10, RF-11 | Filas incompletas o con formato inválido | `clasificarFilas` | El RPC rechaza el lote |
| US-IMP-07 | RF-21 | Alta en `/app/pacientes` y `/app/empresas/:id/plantilla` | `payloadAltaPaciente` (S7-T11) | `empleados.datos_extra`, `plantillas_empresa` |
| US-IMP-07 (S7-T13) | RF-21 | `/app/empresas/:id/plantilla` | `convertirCurpReutilizada`, `curpReutilizada.test.js` | `guardar_plantilla_empresa` (migración `202611250001`) |
| US-IMP-07 (S7-T14, S7-T15) | RF-21 | Ficha del paciente en `/app/pacientes` | `cambiarEmpresaPaciente`, `payloadEdicionPaciente`, `marcadorPlantilla` | `empleados.plantilla_version`, `fn_empleado_plantilla_version`, `v_pacientes_admin` (migración `202611250002`) |
| US-EMP-03 (S7-T17) | RF-06, RNF-10 | Casillas en Pacientes y Empresas | `seleccion.js`, `darDeBajaPacientes`, `darDeBajaEmpresas` | Estado `inactivo`; `fn_impedir_eliminacion` |
| US-EMP-03 (S7-T21) | RF-06, RNF-10 | Filtro «Estado de cita» en `/app/pacientes`: inactivos solo con «Paciente inactivo (baja)» | `filtrarPacientes`, `pacientesInactivos.test.js` (AUT-23, MAN-24) | `empleados.estado` en `v_pacientes_admin` (sin migración) |
| US-CLI-01 | RF-12 | `/app/citas` y alta en `/app/pacientes` | `validarCita`, `prepararCitaDeAlta` (S7-T09) | `programar_cita` |
| US-CLI-01 (S7-T20) | RF-12 | Botón «Cita» en la lista y panel «Cita» en la ficha del paciente (`/app/pacientes/:id?cita=1`) | `citaAbierta`, `citaEditable`, `formularioEdicionCita`, `formularioNuevaCita`, `prepararEdicionCita`, `edicionCitaPaciente.test.js` | `programar_cita` con `p_id` (sin migración) |
| US-CLI-02 | RF-13 | Botones Presente y Ausente en Citas y en la Cola del día | `cambiarAsistencia` (S7-T12: administrador o doctor) | `registrar_asistencia` si `es_admin()` o `es_doctor()` (migración `202611240001`). El SRS v1.7 actualiza el RF-13: el Doctor también marca asistencia; programar, reprogramar y cancelar sigue siendo del Administrador. |
| US-CLI-03 | RF-14, RNF-05, RF-21 | `/app/atencion/:citaId` | `validarPdf` (5 MB), `payloadGuardarPaciente` (S7-T10) | `registrar_archivo_pdf`, `empleados.datos_extra`, plantilla vigente |
| US-CLI-04 | RF-15 | Cerrar expediente | `validarCierre` | `cerrar_expediente` |
| US-COB-01 | RF-16 | Registrar pago | `aplicarPago` | `registrar_pago` |
| US-COB-01 (S7-T18) | RF-16 | Casillas y «Seleccionar todos los del filtro» en Cargos | `prepararPagoLote`, `filtrarCargos`, `pagoLote.test.js` | `registrar_pagos_lote` (migración `202611250003`) |
| US-COB-02 | RF-17 | Cargos y pestaña Por empresa | `consolidarPorEmpresa` | `cargos_detalle` |
| US-COB-03 | RF-18 | Precio histórico | `generarCargos` | `fn_precio_historico` |
| US-COB-04 | Catálogo en §4.5 | Pestaña Catálogo | `validarEstudio` | `catalogo_estudios` solo Administrador |
| Plan 4.1 | Fuera del SRS | Pestaña Periodo | `LEYENDA_REPORTE_PERIODO` | No hay módulo adicional |

RNF-01 (menos de 5 s), RNF-06, RNF-07, RNF-08 y RNF-10 se cubren en `reglas.test.js` y en la migración SQL. El detalle de casos está en ID 15.

## Historial de cambios (ramas pendientes de fusionar)

- **24/11/2026 — S7-T09.** El alta del administrador puede llamar a `programar_cita` con fecha y hora opcionales. Rama `feature/S7-T09-cita-en-alta-paciente`, fusionada a develop en el PR #8 (e393b85).
- **24/11/2026 — S7-T10.** La atención muestra y edita los campos de la plantilla vigente (RF-21). Rama `feature/S7-T10-campos-plantilla-en-atencion`, fusionada a develop en el PR #9 (714bbe2).
- **24/11/2026 — S7-T11.** El alta de pacientes (administrador y doctor) muestra los campos de la plantilla de la empresa elegida. Rama `feature/S7-T11-campos-plantilla-en-alta-paciente`, fusionada a develop en el PR #10 (926cb2b).
- **24/11/2026 — S7-T12.** La doctora puede marcar presente o ausente. El SRS se actualiza a v1.7 para que el RF-13 incluya al Doctor. Rama `feature/S7-T12-doctora-marca-asistencia`. La migración `202611240001_doctora_marca_asistencia.sql` se aplica en Supabase tras fusionar.
- **25/11/2026 — S7-T13 a S7-T18.** CURP renombrada, cambio de empresa al editar, versión de plantilla en pacientes, formularios centrados, bajas lógicas en lote y pagos en lote. Rama `feature/s7-lote2-pacientes-cobranza`.
- **25/11/2026 — S7-T20.** El administrador reprograma desde la ficha del paciente con la misma RPC `programar_cita`; AUT-22 y MAN-23. CRQ-011. Rama `feature/s7-t20-editar-cita-paciente-admin` (PR #14) y ajuste en `feature/s7-t20-editar-cita-fix` (PR #15, 115e58a: botón «Cita» en la lista, panel arriba de la ficha y «Agendar cita» sin cita abierta).
- **25/11/2026 — S7-T21.** La lista de Pacientes oculta a los inactivos salvo con el filtro de inactivos; AUT-23 y MAN-24. CR-45. Rama `feature/s7-t21-ocultar-pacientes-inactivos`.

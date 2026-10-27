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
| US-CLI-01 | RF-12 | `/app/citas` | `validarCita` | `programar_cita` |
| US-CLI-02 | RF-13 | Botones Presente y Ausente | `cambiarAsistencia` | `registrar_asistencia` solo si `es_admin()` |
| US-CLI-03 | RF-14, RNF-05 | `/app/atencion/:citaId` | `validarPdf` (5 MB) | `registrar_archivo_pdf` y bucket privado |
| US-CLI-04 | RF-15 | Cerrar expediente | `validarCierre` | `cerrar_expediente` |
| US-COB-01 | RF-16 | Registrar pago | `aplicarPago` | `registrar_pago` |
| US-COB-02 | RF-17 | Cargos y pestaña Por empresa | `consolidarPorEmpresa` | `cargos_detalle` |
| US-COB-03 | RF-18 | Precio histórico | `generarCargos` | `fn_precio_historico` |
| US-COB-04 | Catálogo en §4.5 | Pestaña Catálogo | `validarEstudio` | `catalogo_estudios` solo Administrador |
| Plan 4.1 | Fuera del SRS | Pestaña Periodo | `LEYENDA_REPORTE_PERIODO` | No hay módulo adicional |

RNF-01 (menos de 5 s), RNF-06, RNF-07, RNF-08 y RNF-10 se cubren en `reglas.test.js` y en la migración SQL. El detalle de casos está en ID 15.

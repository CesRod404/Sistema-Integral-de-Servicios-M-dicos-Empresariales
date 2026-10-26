# Decisiones de diseño — SISME

Fuente de verdad funcional: SRS v1.5. Cuando el SDD o el plan de proyecto contradicen el SRS, se sigue el SRS. Esta bitácora registra cada desviación aplicada en la primera versión ejecutable.

Los ocho mockups se usaron solo como referencia visual (color, tipografía y composición). No definen módulos, roles ni reglas.

## Roles

| Tema | Documentos | Decisión |
| --- | --- | --- |
| Tercer perfil de recepción | El SDD 5.3 describe un perfil de recepción. El SRS reconoce exactamente Administrador y Doctor (US-ACC-01, RF-03). | No se implementa un tercer rol. La sala de espera la opera el Administrador. |
| Quién marca presente o ausente | El SRS RF-13 y US-CLI-02 asignan la asistencia al Administrador. Una secuencia del SDD la atribuye al consultorio. | Solo el Administrador cambia `presente` / `ausente`. El Doctor consulta el estado y no lo modifica. |
| Inicio de sesión | El mockup sugiere usuario. Supabase Auth identifica por correo. | El acceso es por correo y contraseña. |

## Clínica y confidencialidad

| Tema | Documentos | Decisión |
| --- | --- | --- |
| Precios para el Doctor | RF-03 impide que el Doctor vea precios y cobranza. El SDD otorga lectura del catálogo al Doctor. | El Doctor consulta nombres de estudios vigentes mediante la vista `v_estudios_nombres` (sin precio). RLS niega `SELECT` sobre `catalogo_estudios`, `cargos_detalle` y `pagos`. La interfaz no muestra tarifas ni el módulo Cobranza. |
| Expediente del Administrador | RN-02: el Administrador no edita datos clínicos ni descarga PDF. No ve diagnósticos detallados. | `expedientes_clinicos` solo es legible por el Doctor. El Administrador usa `v_pacientes_admin` y `v_visitas_admin` (`security_invoker = false`), que omiten diagnóstico, observaciones y ruta del PDF. |
| Diagnóstico obligatorio | El SDD marca diagnóstico como NOT NULL. RF-15 exige fecha y diagnóstico al cerrar; el expediente puede guardarse abierto. | `diagnostico` admite nulo mientras el expediente está abierto. El cierre lo exige, junto con la fecha de atención. |
| Varios PDF | US-CLI-03 permite uno o más PDF. El SDD muestra una sola `ruta_pdf`. | Tabla `expediente_archivos`. Bucket privado `expedientes_medicos`, solo PDF, máximo 5 MB, políticas de Storage solo para Doctor, URL firmada de 120 segundos (RNF-05). |
| Quién captura | El SDD sugiere un `doctor_id` exclusivo. El SRS no restringe el consultorio a un médico dueño del expediente. | Cualquier usuario con rol Doctor puede capturar un paciente ya marcado presente. |
| Columnas del tablero | El mockup del Doctor muestra un tablero. El SRS no crea un rol ni un estado extra por columna. | Las columnas Pendientes, En proceso, Finalizado y Ausentes se derivan de la cita y del expediente. |
| Agenda | El mockup insinúa tres consultorios. El SRS agenda por fecha y hora del empleado importado. | Una agenda del día, sin consultorios separados. |
| Sitio público | Los mockups de inicio, servicios y contacto son la portada. El SRS no permite agendar sin sesión ni empleado importado. | El sitio público no publica tarifas ni agenda citas. «Agendar una cita» lleva al inicio de sesión. Solo el Administrador programa empleados ya registrados. |

## Cobranza y alcance

| Tema | Documentos | Decisión |
| --- | --- | --- |
| Reporte del periodo | El plan, alcance 4.1, menciona reportes financieros del periodo. El SRS no define un módulo Reportes. | Resumen mínimo dentro de Cobranza, pestaña Periodo. La interfaz y la constante `LEYENDA_REPORTE_PERIODO` muestran exactamente `PENDIENTE DE VALIDAR CONTRA SRS`. No hay módulos Reportes ni Configuración. |
| Catálogo de estudios | US-COB-04 está en el SRS §4.5 y no tiene un RF-19. | El catálogo (alta, edición de tarifa y vigencia) vive en Cobranza. |
| Precio histórico | RF-18 / US-COB-03. | El cargo copia precio y concepto al cerrar el expediente. Un disparador impide cambiar `precio_historico`, concepto, estudio, cita y empresa. La semilla muestra la biometría de Carlos Martínez en 200 aunque el catálogo vigente es 250. |
| Estatus de pago | El diagrama del SDD incluye pago parcial. | `pendiente`, `parcial`, `pagado` y `cancelado`. |
| Cargo | El cobro nace del servicio prestado. | Los cargos se crean al cerrar el expediente, no al agendar. |

## Importación

| Tema | Documentos | Decisión |
| --- | --- | --- |
| Campos obligatorios | RN-05 / el modelo exigen nombre. La clínica recibe listas solo con nombre. RF-10 y RF-11 rechazan formatos inválidos. | Una fila con nombre y sin CURP puede importarse como empleado provisional. CURP, correo, teléfono o edad con formato inválido bloquean la confirmación hasta corregir o descartar. |
| Duplicados | RF-09 y US-IMP-03. | Orden de coincidencia: CURP global, luego clave dentro de la empresa, luego nombre normalizado dentro de la empresa. Contra la base hay que descartar o actualizar; actualizar exige la casilla de sobrescritura. Dentro del archivo se conserva un registro y se descarta el resto. |
| Empresa del empleado | La lista pertenece a la empresa elegida. | La actualización no cambia `empresa_id`. |
| Motor Excel | La librería comunitaria `xlsx` publica avisos de seguridad sin parche en la edición libre. | Se usa ExcelJS. La clasificación es pura y está probada sin leer el archivo. |

## Requisitos no funcionales

| Tema | Documentos | Decisión |
| --- | --- | --- |
| Tiempo de respuesta | RNF-01 del SRS: 95 % de las consultas en menos de 5 s. El SDD cita menos de 2 s. | Se adopta el umbral del SRS (menos de 5 s). |
| Numeración RNF | El SDD reordena algunos RNF. | Se usa la numeración del SRS. Disponibilidad RNF-04 (99.5 %). Tamaño de PDF RNF-03. |
| Tamaño del PDF | El mockup admite 10 MB. RNF-03 admite 5 MB. | Máximo 5 MB (`5242880` bytes) en validación, Storage y base de datos. |
| Contraseñas | RNF-06: mínimo 8 caracteres, letras y números, almacenadas con hash. | Supabase Auth aplica el hash. La demostración local guarda la contraseña solo en `localStorage` de ese navegador y no es el modo de producción. |
| Bloqueo | RNF-07: bloqueo temporal tras 5 intentos. El SRS no fija la duración. | 15 minutos. El mismo plazo aplica a cinco códigos de recuperación inválidos. |
| Mensajes | RNF-08: errores claros en español, sin códigos técnicos. | Los mensajes de negocio van prefijados con `SISME:` para mostrarlos tal cual. El resto se sustituye por un texto genérico. |
| Borrado | RNF-10: solo bajas lógicas. | Disparador que impide `DELETE` físico de registros con historia. Empresas y empleados pasan a `inactivo`. |
| Zona horaria | Operación en Zacatecas. | `America/Mexico_City`, desplazamiento fijo UTC−6 al armar la fecha local. |
| Versión del SRS citada por el SDD | El SDD menciona SRS v1.6. El archivo de requisitos entregado es v1.5. | Se implementa SRS v1.5. |

## Vistas con `security_invoker = false`

El Administrador necesita columnas demográficas sin poder leer la tabla clínica. PostgreSQL no filtra columnas con RLS. Las vistas de administración se definen con `security_invoker = false` y exigen `es_admin()` dentro de la vista. Es intencional: no es un descuido de la opción de seguridad.

Las escrituras de negocio (cita, asistencia, atención, cierre, PDF, pago e importación) pasan por funciones `security definer`. El rol de la sesión se lee de `auth.users.raw_app_meta_data`, no de metadatos editables por el usuario. El valor por defecto al crear el perfil es `doctor`.

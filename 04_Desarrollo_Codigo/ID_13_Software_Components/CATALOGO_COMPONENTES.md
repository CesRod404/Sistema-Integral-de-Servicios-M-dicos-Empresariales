# ID 13 — Componentes de software

Versión de trabajo de la primera entrega ejecutable. El código vive en `04_Desarrollo_Codigo/src`. La base de datos vive en `04_Desarrollo_Codigo/database`.

## Aplicación

| Componente | Ruta | Responsabilidad |
| --- | --- | --- |
| Arranque | `src/main.jsx`, `src/App.jsx` | React, rutas públicas y rutas `/app` protegidas por sesión y por rol |
| Sesión | `src/datos/ProveedorSesion.jsx` | Elige API de demostración o Supabase y publica usuario, entrada y salida |
| Configuración | `src/datos/configuracion.js` | Considera Supabase activo solo si la URL es HTTPS y la clave anon no es un marcador |
| API demo | `src/datos/demoApi.js`, `src/datos/semilla.js` | Reglas de negocio sobre datos locales |
| API Supabase | `src/datos/supabaseApi.js`, `src/datos/supabaseCliente.js` | Misma forma de respuesta `{ ok, datos \| mensaje }` contra Postgres, Auth y Storage |
| Roles | `src/domain/roles.js` | Dos roles, menú y recorte de precio o diagnóstico |
| Acceso | `src/domain/acceso.js` | Cinco fallos y bloqueo de 15 minutos; recuperación sin revelar si el correo existe |
| Validadores | `src/domain/validadores.js` | Contraseña, correo, CURP, teléfono, edad, empresa, empleado, PDF y cita |
| Clínica | `src/domain/clinica.js` | Asistencia, cancelación, cierre y columna del tablero |
| Cobranza | `src/domain/cobranza.js` | Cargo con precio histórico, pago, consolidado y resumen de periodo |
| Importación | `src/domain/excelImport.js`, `src/domain/excelArchivo.js` | Clasificación pura y lectura ExcelJS |
| Fechas y errores | `src/domain/fecha.js`, `src/domain/errores.js` | Zona `America/Mexico_City` y mensajes en español |
| Interfaz | `src/componentes`, `src/paginas`, `src/estilos.css` | Pantallas en español |

## Pantallas

| Ruta | Rol | Historia |
| --- | --- | --- |
| `/`, `/servicios`, `/contacto` | Público | Portada. Servicios sin tarifas. Contacto |
| `/login`, `/recuperar` | Público | US-ACC-01, US-ACC-02 |
| `/app/inicio` | Ambos | Resumen del día. El saldo solo lo ve el Administrador |
| `/app/pacientes` | Doctor | Tablero del día |
| `/app/atencion/:citaId` | Doctor | US-CLI-03, US-CLI-04 |
| `/app/pacientes` y `/app/pacientes/:id` | Administrador | Consulta y datos de contacto. Visitas sin diagnóstico ni PDF |
| `/app/citas` | Ambos; escritura solo Administrador | US-CLI-01, US-CLI-02 |
| `/app/empresas` | Administrador | US-EMP-01, US-EMP-02, US-EMP-03 |
| `/app/importacion` | Administrador | US-IMP-01 a US-IMP-05 |
| `/app/cobranza` | Administrador | US-COB-01 a US-COB-04 y resumen de periodo marcado pendiente |

No existen rutas de Reportes ni de Configuración. Esas direcciones se rechazan.

## Base de datos

Tablas: `perfiles`, `empresas`, `empleados`, `citas`, `expedientes_clinicos`, `catalogo_estudios`, `estudios_realizados`, `expediente_archivos`, `cargos_detalle`, `pagos`, `importaciones`.

Vistas: `v_estudios_nombres`, `v_pacientes_admin`, `v_visitas_admin`.

Funciones de negocio: `estado_acceso`, `registrar_intento_fallido`, `registrar_acceso_exitoso`, `programar_cita`, `registrar_asistencia`, `cancelar_cita`, `guardar_atencion`, `cerrar_expediente`, `registrar_archivo_pdf`, `registrar_pago`, `importar_empleados`.

Almacén: bucket privado `expedientes_medicos`.

# ID 19 — Documentación de mantenimiento

## Arquitectura

El navegador ejecuta React (Vite). Si la clave anon es válida, `@supabase/supabase-js` habla con Auth, PostgREST y Storage. Si no, `demoApi` aplica las funciones de `src/domain` sobre `localStorage`.

La frontera de seguridad en producción es PostgreSQL: RLS, vistas y funciones `security definer`. Ocultar una columna solo en React no basta.

## Modelo

| Tabla | Notas de mantenimiento |
| --- | --- |
| `perfiles` | Una fila por `auth.users`. Rol `administrador` o `doctor`. Lo crea `fn_crear_perfil` |
| `empresas` | Folio `EMP-`. Nombre único sin distinguir mayúsculas. Estado activo o inactivo |
| `empleados` | Folio `P-`. CURP única si existe. Estado provisional, activo o inactivo. Edad 0 a 120 |
| `citas` | `programada`, `presente`, `ausente`, `cerrada`, `cancelada` |
| `expedientes_clinicos` | Uno por cita. `diagnostico` nulo hasta el cierre. Estados abierto y cerrado |
| `catalogo_estudios` | Precio ≥ 0. Nombre único. Vigencia |
| `estudios_realizados` | Único por expediente y estudio. Bandera `activo` en lugar de borrar |
| `expediente_archivos` | Tamaño ≤ 5 MB. La ruta vive en Storage |
| `cargos_detalle` | `precio_historico` y concepto congelados. Único por cita y estudio |
| `pagos` | No modifican el precio histórico |
| `importaciones` | Bitácora del lote |

Vistas `v_pacientes_admin` y `v_visitas_admin` usan `security_invoker = false` a propósito. `v_estudios_nombres` no incluye precio.

## Reglas que no deben relajarse

- No otorgar `SELECT` de `expedientes_clinicos` al Administrador.
- No otorgar `SELECT` de `catalogo_estudios`, `cargos_detalle` ni `pagos` al Doctor.
- No leer el rol desde `user_metadata`.
- No habilitar `DELETE` de tablas con historia. El disparador `fn_impedir_eliminacion` lo bloquea.
- No actualizar `precio_historico` después de creado. Lo bloquea `fn_precio_historico`.
- Los mensajes mostrados al usuario salen de textos `SISME:` o del traductor `mensajeAmigable`.

## Cómo cambiar el código

1. Regla de negocio nueva: función pura en `src/domain` y caso en `reglas.test.js` o `excelImport.test.js`.
2. Misma regla en `demoApi.js` y en una función SQL, para que demostración y producción coincidan.
3. Pantalla en `src/paginas` y ruta en `App.jsx` solo si el SRS la pide. Si el plan pide algo que el SRS no tiene, márquelo `PENDIENTE DE VALIDAR CONTRA SRS` y anótelo en `DECISIONES.md`.
4. `npm test` y `npm run build` antes de integrar.

## Storage

Bucket `expedientes_medicos`, privado, PDF, 5 MB. Ruta `{usuario}/{expediente}/{uuid}.pdf`. Lectura con URL firmada de 120 segundos.

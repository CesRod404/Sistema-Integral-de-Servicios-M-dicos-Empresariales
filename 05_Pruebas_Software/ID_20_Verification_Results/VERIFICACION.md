# ID 20 — Resultados de verificación

Revisión técnica de la primera versión contra SRS v1.5, el modelo del SDD y las decisiones de `DECISIONES.md`.

| Verificación | Evidencia | Estado |
| --- | --- | --- |
| Dos roles y ningún tercer perfil de recepción | `ROLES` en `roles.js`; menú filtrado; búsqueda del término de ese perfil ausente en el código de la aplicación | Cumple |
| Doctor sin precios ni cobranza | `vistaEstudio`, rutas prohibidas, RLS de catálogo y cargos, pantalla de atención solo con nombre de estudio | Cumple. Confirmado en navegador el 2026-10-27 |
| Administrador sin diagnóstico ni PDF | `vistaExpediente` y vistas SQL sin esas columnas | Cumple. Confirmado en la ficha de Carlos Martínez |
| Asistencia solo del Administrador | `cambiarAsistencia` y `registrar_asistencia` | Cumple |
| RNF-01 en 5 segundos, PDF en 5 MB, bloqueo 15 minutos | Pruebas de dominio y restricciones SQL | Cumple |
| Sin módulos Reportes ni Configuración | `RUTAS_AUSENTES` y ausencia de pantallas | Cumple |
| Reporte de periodo mínimo y rotulado | `LEYENDA_REPORTE_PERIODO` | Cumple |
| Importación con duplicados e incompletos | 7 pruebas de Excel y vista previa en el navegador | Cumple |
| Secretos fuera del repositorio | `.env.example` solo con URL pública y `REEMPLAZAR_CON_ANON_KEY` | Cumple |
| Compilación | `npm run build` | Cumple |

La corrida manual quedó registrada en el reporte ID 16. Los casos MAN-01 a MAN-11 pasaron en modo demostración.

# ID 21 — Resultados de validación

Validación de la primera versión contra las historias del SRS v1.5. El modo de referencia es la demostración local, que aplica las mismas reglas de dominio que la API de Supabase. La seguridad de producción la cierra la migración SQL cuando se configura la clave anon.

| Historia | ¿El usuario puede completar la historia? | Observación |
| --- | --- | --- |
| US-ACC-01 | Sí | Credenciales, dos roles y bloqueo de rutas sin sesión |
| US-ACC-02 | Sí en demostración | El código se muestra solo en la bandeja local. En Supabase sale por el correo OTP |
| US-ACC-03 | Sí | Menús distintos. Doctor sin cobranza ni precios. Administrador en lectura clínica |
| US-EMP-01 | Sí | Alta, consulta, edición y baja lógica (el SRS pide no perder el historial, RNF-10) |
| US-EMP-02 | Sí | Contacto, correo, teléfono y dirección |
| US-EMP-03 | Sí | Filtro y estado inactivo |
| US-IMP-01 | Sí | `.xlsx` asociado a una empresa activa |
| US-IMP-02 | Sí | Vista previa antes de confirmar |
| US-IMP-03 | Sí | Duplicados resaltados y confirmación bloqueada |
| US-IMP-04 | Sí | Actualizar exige casilla explícita |
| US-IMP-05 | Sí | Incompletos y formatos inválidos se revisan antes de cargar. Un nombre sin más datos puede ser provisional |
| US-CLI-01 | Sí | Cita para un empleado ya registrado |
| US-CLI-02 | Sí | Presente y ausente solo con el Administrador |
| US-CLI-03 | Sí | Captura, estudios por nombre y uno o más PDF |
| US-CLI-04 | Sí | No cierra sin fecha y diagnóstico |
| US-COB-01 | Sí | El cargo nace al cerrar; el pago se registra en Cobranza |
| US-COB-02 | Sí | Historial por paciente y consolidado por empresa |
| US-COB-03 | Sí | Precio histórico. La semilla de Carlos Martínez lo muestra en 200 |
| US-COB-04 | Sí | Catálogo dentro de Cobranza |

El resumen financiero del periodo, pedido por el plan y ausente del SRS, está disponible y marcado `PENDIENTE DE VALIDAR CONTRA SRS`. No se valida como requisito del SRS.

Pendiente de operación real: ejecutar la migración en el proyecto Supabase `hjwuvvppxpwrryznhvox` y repetir el acceso con usuarios creados en Auth. Esa corrida depende de la clave anon, que no se versiona.

# ID 16 — Reporte de pruebas

Fecha de la corrida automática: 2026-10-26.

## Automáticas

Comando: `npm test` en la raíz del repositorio.

| Resultado | Detalle |
| --- | --- |
| Archivos | 2 pasaron |
| Casos | 24 pasaron, 0 fallaron |
| Vitest | 2.1.9 |
| Archivos | `src/domain/reglas.test.js` (17), `src/domain/excelImport.test.js` (7) |

Compilación: `npm run build` terminó sin error. El paquete de la aplicación y ExcelJS quedan en fragmentos separados. La salida es `04_Desarrollo_Codigo/src/dist`.

## Manuales

Fecha: 2026-10-27. Modo demostración en `http://localhost:5173/`.

| Caso | Resultado |
| --- | --- |
| MAN-01 | Inicio y servicios en español, sin tarifas. Agendar una cita abre el inicio de sesión |
| MAN-02 | El administrador entra y ve Inicio, Pacientes, Citas, Empresas, Importación y Cobranza |
| MAN-03 | `/app/atencion` y `/app/cobranza` redirigen al rol que no corresponde, con el aviso de acceso denegado. El doctor no ve importes |
| MAN-04 | María Ramírez pasó de Programada a Presente con el mensaje «Asistencia actualizada: Presente.» |
| MAN-05 | La ficha de Carlos Martínez no muestra el diagnóstico ni un enlace al PDF |
| MAN-06 | El cargo de biometría sigue en $200.00 después de cambiar el catálogo a $260.00 |
| MAN-07 | La pestaña Periodo muestra `PENDIENTE DE VALIDAR CONTRA SRS` |
| MAN-08 | Transportes Siglo XXI quedó Inactiva y sigue en el listado. Alimentos del Norte ya estaba Inactiva |
| MAN-09 | La vista previa bloqueó duplicado y formato inválido. Tras descartarlos, la carga insertó 2 y descartó 2 |
| MAN-10 | Un correo inexistente no muestra código. `admin@sisme.local` muestra la bandeja de demostración con un código de 6 dígitos. La contraseña no se cambió |
| MAN-11 | Cerrar sesión devuelve al acceso y `/app/inicio` pide de nuevo el inicio de sesión |

El doctor solo ve Inicio, Pacientes y Citas. En atención los estudios aparecen por nombre, con diagnóstico, y sin botones de asistencia en la agenda. A 390 px el tablero se apila y sigue legible.

Después de esa corrida se quitó el aviso de login y la frase «El personal autorizado programa la cita.» de la tarjeta de inicio. Esas dos líneas ya no forman parte de la interfaz.

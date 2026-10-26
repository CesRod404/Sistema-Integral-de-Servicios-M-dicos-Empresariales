# ID 03 — Comprobación de respaldo del repositorio

El repositorio Git es la copia de trabajo del código, de la migración SQL y de la documentación ISO. La rama de integración de esta entrega es `cursor/sisme-mvp-eae8`, con destino `main`.

## Qué se respalda en Git

- Aplicación en `04_Desarrollo_Codigo/src` (sin `node_modules` ni `dist`).
- Migración y esquema en `04_Desarrollo_Codigo/database`.
- `.env.example` con la URL pública `https://hjwuvvppxpwrryznhvox.supabase.co` y el marcador `REEMPLAZAR_CON_ANON_KEY`.
- Documentación de diseño, pruebas y entrega.

## Qué no entra al respaldo de Git

- `.env` y cualquier clave anon o `service_role`.
- Datos de demostración del navegador (`localStorage`).
- Binarios de PDF de expedientes. En producción viven en el bucket privado de Supabase.
- Dependencias instaladas y la carpeta `dist`.

## Respaldo de producción

Cuando la migración esté aplicada en el proyecto Supabase, el respaldo de datos y del bucket corresponde a las copias del propio proyecto Supabase, no a este repositorio. Restaurar solo el código no recupera expedientes ni cargos.

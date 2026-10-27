# ID 17 — Guía de operación del producto

## Instalación local

1. Instale Node.js 22.
2. En la raíz del repositorio:

```bash
npm install --prefix 04_Desarrollo_Codigo/src
cp .env.example .env
npm run dev
```

3. Mientras `VITE_SUPABASE_ANON_KEY` sea `REEMPLAZAR_CON_ANON_KEY`, el sistema trabaja en demostración. Use `admin@sisme.local` / `Admin1234` o `doctor@sisme.local` / `Doctor1234`.

## Puesta en marcha con Supabase

1. Confirme que `VITE_SUPABASE_URL` sea `https://hjwuvvppxpwrryznhvox.supabase.co`.
2. Sustituya en `.env` solo la clave anon public. No guarde la clave `service_role`.
3. Ejecute en el editor SQL la migración `04_Desarrollo_Codigo/database/migrations/202610260001_sisme_inicial.sql`.
4. Desactive el registro público de correo.
5. Cree los usuarios en Authentication. Quedan como Doctor. Promueva al administrador con:

```sql
update public.perfiles
set rol = 'administrador'
where id = (select id from auth.users where email = 'correo@dominio.mx');
```

6. Reinicie el servidor de desarrollo.

## Despliegue

Vercel usa `vercel.json`: instala `04_Desarrollo_Codigo/src`, ejecuta `npm run build` y publica `04_Desarrollo_Codigo/src/dist`.

Configure en Vercel las dos variables `VITE_*` anteriores. Agregue el dominio de Vercel en las URL permitidas de Supabase Auth.

## Operación diaria

- El Administrador importa o da de alta empleados, agenda, marca presente o ausente y registra pagos.
- El Doctor atiende solo a quien ya está presente, adjunta PDF y cierra el expediente. El cierre genera el cargo con la tarifa vigente.
- Una empresa inactiva conserva citas, expedientes y cobros. No se eliminan registros con historia.
- Los PDF no tienen URL permanente. El Doctor obtiene una liga firmada de dos minutos.

## Respaldo operativo

El respaldo de producción es el de Supabase (base y bucket `expedientes_medicos`). La demostración del navegador no se respalda en el servidor: vive en ese equipo.

# SISME — Sistema Integral de Servicios Médicos Empresariales

Aplicación web para la gestión de empresas cliente, importación de empleados, agenda clínica y cobranza por empresa. Proyecto universitario (UAZ) alineado al perfil básico de ISO/IEC 29110.

La interfaz está en español. Hay exactamente dos roles: **Administrador** y **Doctor**.

## Requisitos locales

- Node.js 22
- npm 10

## Arranque en modo demostración

Si `VITE_SUPABASE_ANON_KEY` sigue como marcador, la aplicación no llama a Supabase. Los datos de ejemplo viven en `localStorage` del navegador (`sisme.demo.v1`).

```bash
npm install --prefix 04_Desarrollo_Codigo/src
npm run dev
```

Abra `http://localhost:5173`.

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Administrador | `admin@sisme.local` | `Admin1234` |
| Doctor | `doctor@sisme.local` | `Doctor1234` |

Estas cuentas solo existen en la demostración. En Supabase hay que crear usuarios reales.

Comandos desde la raíz:

| Comando | Efecto |
| --- | --- |
| `npm run dev` | Servidor de desarrollo Vite |
| `npm test` | Pruebas de dominio (Vitest) |
| `npm run build` | Compilación de producción |
| `npm run preview` | Sirve el resultado de `dist` |

## Conexión a Supabase

El proyecto del propietario es:

`https://hjwuvvppxpwrryznhvox.supabase.co`

1. Copie `.env.example` a `.env` en la raíz del repositorio (Vite lee las variables desde ahí).
2. Deje la URL de ejemplo:

```bash
VITE_SUPABASE_URL=https://hjwuvvppxpwrryznhvox.supabase.co
VITE_SUPABASE_ANON_KEY=REEMPLAZAR_CON_ANON_KEY
```

3. En el panel de Supabase, **Settings → API**, copie solo la clave **anon public** y sustituya `REEMPLAZAR_CON_ANON_KEY`.
4. No copie la clave `service_role`. No la ponga en `.env`, en Vercel ni en el repositorio. El archivo `.env` está en `.gitignore`.
5. En el editor SQL de Supabase ejecute, en este orden, el contenido de:

`04_Desarrollo_Codigo/database/migrations/202610260001_sisme_inicial.sql`

La copia de referencia del mismo esquema está en `04_Desarrollo_Codigo/database/schema/sisme_esquema.sql`.
6. En **Authentication → Providers → Email**, desactive el registro público. Los usuarios los crea un administrador del proyecto.
7. Cree cada usuario en **Authentication → Users** (correo y contraseña; mínimo 8 caracteres con letras y números). El disparador `fn_crear_perfil` inserta `public.perfiles` con rol `doctor`.
8. Para promover a un administrador, ejecute en SQL (sustituya el correo):

```sql
update public.perfiles
set rol = 'administrador'
where id = (select id from auth.users where email = 'correo@dominio.mx');
```

El rol se toma de `raw_app_meta_data` al crear el perfil. No use `user_metadata` para el rol: el usuario podría modificarlo.
9. Reinicie `npm run dev`. Si la clave anon es válida, desaparece el aviso de modo demostración.

La recuperación de contraseña en producción usa el código OTP de Supabase Auth (`signInWithOtp` y `verifyOtp`). En demostración el código solo aparece en la pantalla, dentro de la bandeja local.

## Despliegue en Vercel

`vercel.json` instala las dependencias de `04_Desarrollo_Codigo/src`, ejecuta `npm run build` y publica `04_Desarrollo_Codigo/src/dist`. Las rutas de la aplicación se reescriben a `index.html`.

En el proyecto de Vercel defina las mismas variables públicas:

- `VITE_SUPABASE_URL` = `https://hjwuvvppxpwrryznhvox.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = clave anon del panel (nunca `service_role`)

En Supabase, **Authentication → URL Configuration**, agregue el dominio de Vercel como sitio permitido y como URL de redirección.

## Dónde está cada pieza

| Pieza | Ubicación |
| --- | --- |
| Aplicación React | `04_Desarrollo_Codigo/src` |
| Migración y RLS | `04_Desarrollo_Codigo/database` |
| Decisiones ante contradicciones de documentos | `03_Diseno_Software/ID_11_Software_Design/DECISIONES.md` |
| Pruebas, trazabilidad y verificación | `05_Pruebas_Software` |
| Configuración, operación, manual y mantenimiento | `06_Entrega_Soporte` |

Las reglas de negocio probadas están en `04_Desarrollo_Codigo/src/src/domain`. La base de datos es el límite de seguridad cuando la aplicación apunta a Supabase: el doctor no lee precios ni cobranza, y el administrador no lee diagnósticos ni archivos PDF.

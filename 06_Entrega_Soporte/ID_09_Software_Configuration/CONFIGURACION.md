# ID 09 — Configuración de software

Inventario de la línea de trabajo entregada. No incluye secretos.

## Piezas

| Elemento | Identificación |
| --- | --- |
| Aplicación | React 18, React Router 6, Vite 5 |
| Pruebas | Vitest 2 |
| Hojas de cálculo | ExcelJS |
| Backend | Supabase (PostgreSQL, Auth, Storage, RLS) |
| Alojamiento previsto | Vercel |
| Proyecto Supabase | `https://hjwuvvppxpwrryznhvox.supabase.co` |
| Migración | `04_Desarrollo_Codigo/database/migrations/202610260001_sisme_inicial.sql` |
| Esquema de referencia | `04_Desarrollo_Codigo/database/schema/sisme_esquema.sql` |
| Variables públicas | `.env.example` |
| Construcción | `vercel.json` y `.github/workflows/ci.yml` (Node 22, pruebas y build) |

## Variables

| Nombre | Valor en el ejemplo | Secreto |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | `https://hjwuvvppxpwrryznhvox.supabase.co` | No. Es la URL pública del proyecto |
| `VITE_SUPABASE_ANON_KEY` | `REEMPLAZAR_CON_ANON_KEY` | La clave real no se versiona. No usar `service_role` |

`.env`, `.env.local` y `.env.*.local` están ignorados por Git.

## Entorno de ejecución

- Node.js 22 para desarrollo y CI.
- Navegador actual con `localStorage` para el modo demostración.
- Zona de negocio: `America/Mexico_City`.

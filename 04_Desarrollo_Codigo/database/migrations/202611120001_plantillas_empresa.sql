-- =============================================================================
-- SISME — Migración CRQ-004: plantillas Excel por empresa (US-IMP-07 / RF-21).
-- Se ejecuta DESPUÉS de 202610260001_sisme_inicial.sql y de
-- 202610300001_pacientes_doctor.sql, completo, en el editor SQL de Supabase.
-- No modifica cobranza ni expedientes. No incluye llaves ni usuarios.
--
-- Decisiones de diseño (PM, 12/11/2026):
--   1) Cada empresa tiene su propia plantilla: columnas base del empleado y
--      columnas personalizadas que define el Administrador (agregar, quitar,
--      renombrar, ordenar y marcar obligatorias).
--   2) «nombre_completo» siempre va y es obligatorio (identidad, RN-05);
--      «curp» y «clave_empleado» no se pueden quitar (duplicados, RN-06).
--   3) Cada guardado crea una versión nueva (1, 2, 3...). El .xlsx descargado
--      lleva una hoja oculta «_sisme» con empresa_id y versión; al importar se
--      rechaza un archivo de otra empresa o de una versión anterior.
--   Sin plantilla propia se usa la plantilla predeterminada (la de siempre).
--   Solo el Administrador configura. El Doctor no tiene acceso a la pantalla.
-- =============================================================================

-- 1) Tabla de plantillas. Se conserva el historial de versiones; solo una
--    versión activa por empresa.
create table if not exists public.plantillas_empresa (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete restrict,
  version integer not null check (version > 0),
  columnas jsonb not null check (jsonb_typeof(columnas) = 'array' and jsonb_array_length(columnas) between 1 and 30),
  activa boolean not null default true,
  actualizado_por uuid references auth.users (id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, version)
);

create unique index if not exists plantillas_empresa_activa_unica
  on public.plantillas_empresa (empresa_id) where activa;

drop trigger if exists trg_plantillas_empresa_updated_at on public.plantillas_empresa;
create trigger trg_plantillas_empresa_updated_at before update on public.plantillas_empresa
for each row execute function public.fn_set_updated_at();

drop trigger if exists trg_plantillas_empresa_no_delete on public.plantillas_empresa;
create trigger trg_plantillas_empresa_no_delete before delete on public.plantillas_empresa
for each row execute function public.fn_impedir_eliminacion();

-- 2) RLS: lectura para usuarios autenticados; escritura solo Administrador.
alter table public.plantillas_empresa enable row level security;

drop policy if exists plantillas_empresa_select on public.plantillas_empresa;
create policy plantillas_empresa_select on public.plantillas_empresa
for select to authenticated
using (public.es_admin() or public.es_doctor());

drop policy if exists plantillas_empresa_insert on public.plantillas_empresa;
create policy plantillas_empresa_insert on public.plantillas_empresa
for insert to authenticated
with check (public.es_admin());

drop policy if exists plantillas_empresa_update on public.plantillas_empresa;
create policy plantillas_empresa_update on public.plantillas_empresa
for update to authenticated
using (public.es_admin())
with check (public.es_admin());

revoke all on table public.plantillas_empresa from public, anon, authenticated;
grant select, insert, update on table public.plantillas_empresa to authenticated;

-- 3) Guardar la plantilla de una empresa: valida las columnas, desactiva la
--    versión vigente y crea la versión siguiente (versión + 1).
--    Cada columna: {clave, etiqueta, tipo (texto|numero|fecha|email),
--    obligatorio, orden, personalizado}.
create or replace function public.guardar_plantilla_empresa(
  p_empresa_id uuid,
  p_columnas jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado text;
  v_version integer;
  v_columnas jsonb;
  v_id uuid;
  v_actualizado timestamptz;
  v_bases constant text[] := array['nombre_completo', 'curp', 'clave_empleado', 'email', 'telefono', 'edad'];
  v_tipos_base constant jsonb := '{"nombre_completo":"texto","curp":"texto","clave_empleado":"texto","email":"email","telefono":"texto","edad":"numero"}'::jsonb;
  r record;
begin
  if not public.es_admin() then
    raise exception 'SISME: Solo el Administrador puede configurar la plantilla de una empresa.';
  end if;
  select estado into v_estado from public.empresas where id = p_empresa_id for update;
  if v_estado is null then
    raise exception 'SISME: La empresa no existe.';
  end if;
  if v_estado <> 'activo' then
    raise exception 'SISME: No se configura la plantilla de una empresa inactiva.';
  end if;
  if p_columnas is null or jsonb_typeof(p_columnas) <> 'array' or jsonb_array_length(p_columnas) = 0 then
    raise exception 'SISME: La plantilla debe tener al menos una columna.';
  end if;
  if jsonb_array_length(p_columnas) > 30 then
    raise exception 'SISME: La plantilla admite como máximo 30 columnas.';
  end if;

  for r in
    select
      btrim(coalesce(value->>'clave', '')) as clave,
      regexp_replace(btrim(coalesce(value->>'etiqueta', '')), '\s+', ' ', 'g') as etiqueta,
      btrim(coalesce(value->>'tipo', '')) as tipo,
      coalesce(value->>'personalizado', 'false') as personalizado
    from jsonb_array_elements(p_columnas)
  loop
    if r.clave !~ '^[a-z][a-z0-9_]{0,39}$' then
      raise exception 'SISME: La clave interna de una columna no es válida.';
    end if;
    if r.etiqueta = '' or length(r.etiqueta) > 60 then
      raise exception 'SISME: Cada columna necesita un nombre visible de hasta 60 caracteres.';
    end if;
    if r.tipo not in ('texto', 'numero', 'fecha', 'email') then
      raise exception 'SISME: El tipo de dato de una columna no es válido.';
    end if;
    if r.clave = any (v_bases) then
      if r.tipo <> v_tipos_base->>r.clave or r.personalizado = 'true' then
        raise exception 'SISME: No se puede cambiar el tipo de un campo base del empleado.';
      end if;
    end if;
  end loop;

  if exists (
    select 1 from jsonb_array_elements(p_columnas)
    group by btrim(value->>'clave') having count(*) > 1
  ) then
    raise exception 'SISME: Hay dos columnas con la misma clave interna.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_columnas)
    group by lower(regexp_replace(btrim(value->>'etiqueta'), '\s+', ' ', 'g')) having count(*) > 1
  ) then
    raise exception 'SISME: Hay dos columnas con el mismo nombre visible.';
  end if;
  if not exists (
    select 1 from jsonb_array_elements(p_columnas)
    where value->>'clave' = 'nombre_completo' and coalesce((value->>'obligatorio')::boolean, false)
  ) then
    raise exception 'SISME: La columna «Nombre completo» siempre va en la plantilla y es obligatoria.';
  end if;
  if (select count(*) from jsonb_array_elements(p_columnas) where value->>'clave' in ('curp', 'clave_empleado')) <> 2 then
    raise exception 'SISME: Las columnas «CURP» y «Clave de empleado» no se pueden quitar: se usan para detectar duplicados.';
  end if;

  -- Normaliza: orden 1..n según «orden» recibido; personalizado = no es campo base.
  select jsonb_agg(
           jsonb_build_object(
             'clave', c.clave,
             'etiqueta', c.etiqueta,
             'tipo', c.tipo,
             'obligatorio', c.obligatorio,
             'orden', c.posicion,
             'personalizado', not (c.clave = any (v_bases))
           ) order by c.posicion
         )
    into v_columnas
  from (
    select
      btrim(value->>'clave') as clave,
      regexp_replace(btrim(value->>'etiqueta'), '\s+', ' ', 'g') as etiqueta,
      btrim(value->>'tipo') as tipo,
      case when value->>'clave' = 'nombre_completo' then true
           else coalesce((value->>'obligatorio')::boolean, false) end as obligatorio,
      row_number() over (order by coalesce((value->>'orden')::integer, 0), ordinality) as posicion
    from jsonb_array_elements(p_columnas) with ordinality
  ) c;

  select coalesce(max(version), 0) + 1 into v_version
  from public.plantillas_empresa where empresa_id = p_empresa_id;

  update public.plantillas_empresa set activa = false
  where empresa_id = p_empresa_id and activa;

  insert into public.plantillas_empresa (empresa_id, version, columnas, activa, actualizado_por)
  values (p_empresa_id, v_version, v_columnas, true, auth.uid())
  returning id, updated_at into v_id, v_actualizado;

  return jsonb_build_object(
    'id', v_id,
    'empresa_id', p_empresa_id,
    'version', v_version,
    'columnas', v_columnas,
    'updated_at', v_actualizado
  );
end;
$$;

revoke all on function public.guardar_plantilla_empresa(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.guardar_plantilla_empresa(uuid, jsonb) to authenticated;

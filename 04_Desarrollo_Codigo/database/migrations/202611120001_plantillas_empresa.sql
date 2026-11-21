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


-- 4) Valores de columnas personalizadas en el empleado y versión usada en el lote.
alter table public.empleados
  add column if not exists datos_extra jsonb not null default '{}'::jsonb;

do $$
begin
  alter table public.empleados
    add constraint empleados_datos_extra_objeto check (jsonb_typeof(datos_extra) = 'object');
exception
  when duplicate_object then null;
end $$;

alter table public.importaciones
  add column if not exists plantilla_version integer;

-- 5) importar_empleados acepta datos_extra por fila y la versión de plantilla
--    (p_plantilla_version, opcional). Misma lógica que la migración inicial más
--    las reglas de CRQ-004. Se cambia la firma: se elimina la de 4 parámetros.
drop function if exists public.importar_empleados(uuid, text, boolean, jsonb);

create or replace function public.importar_empleados(
  p_empresa_id uuid,
  p_nombre_archivo text,
  p_sobrescribir boolean,
  p_filas jsonb,
  p_plantilla_version integer default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado text;
  r record;
  v_existente uuid;
  v_insertados integer := 0;
  v_actualizados integer := 0;
  v_descartados integer := 0;
  v_total integer := 0;
  v_edad integer;
  v_telefono text;
  v_plantilla public.plantillas_empresa%rowtype;
  v_extra jsonb;
  v_columna jsonb;
  v_valor text;
begin
  if not public.es_admin() then
    raise exception 'SISME: Solo el administrador puede importar empleados.';
  end if;
  select estado into v_estado from public.empresas where id = p_empresa_id;
  if v_estado is null then
    raise exception 'SISME: La empresa no existe.';
  end if;
  if v_estado <> 'activo' then
    raise exception 'SISME: No se puede importar a una empresa inactiva.';
  end if;
  if p_filas is null or jsonb_typeof(p_filas) <> 'array' or jsonb_array_length(p_filas) = 0 then
    raise exception 'SISME: El archivo no contiene registros para importar.';
  end if;

  -- CRQ-004: si la empresa tiene plantilla propia, el lote debe venir de su
  -- versión vigente; sin plantilla propia se usa la predeterminada.
  select * into v_plantilla from public.plantillas_empresa
  where empresa_id = p_empresa_id and activa;
  if v_plantilla.id is not null then
    if p_plantilla_version is null or p_plantilla_version <> v_plantilla.version then
      raise exception 'SISME: La plantilla de la empresa cambió (versión vigente: %). Descargue la plantilla vigente y vuelva a cargar el archivo.', v_plantilla.version;
    end if;
  elsif p_plantilla_version is not null then
    raise exception 'SISME: La versión de plantilla del archivo no existe para esta empresa. Descargue la plantilla vigente.';
  end if;

  if exists (
    select 1 from (
      select nullif(upper(btrim(coalesce(value->>'curp', ''))), '') as curp,
             coalesce(value->>'accion', 'insertar') as accion
      from jsonb_array_elements(p_filas)
    ) f
    where accion <> 'descartar' and curp is not null
    group by curp having count(*) > 1
  ) then
    raise exception 'SISME: Hay duplicados dentro del archivo. Conserve un solo registro de cada grupo y descarte el resto.';
  end if;

  if exists (
    select 1 from (
      select nullif(btrim(coalesce(value->>'clave_empleado', '')), '') as clave,
             coalesce(value->>'accion', 'insertar') as accion,
             nullif(upper(btrim(coalesce(value->>'curp', ''))), '') as curp
      from jsonb_array_elements(p_filas)
    ) f
    where accion <> 'descartar' and curp is null and clave is not null
    group by clave having count(*) > 1
  ) then
    raise exception 'SISME: Hay duplicados dentro del archivo. Conserve un solo registro de cada grupo y descarte el resto.';
  end if;

  if exists (
    select 1 from (
      select public.fn_normalizar_nombre(value->>'nombre') as nombre,
             coalesce(value->>'accion', 'insertar') as accion,
             nullif(upper(btrim(coalesce(value->>'curp', ''))), '') as curp,
             nullif(btrim(coalesce(value->>'clave_empleado', '')), '') as clave
      from jsonb_array_elements(p_filas)
    ) f
    where accion <> 'descartar' and curp is null and clave is null and nombre <> ''
    group by nombre having count(*) > 1
  ) then
    raise exception 'SISME: Hay duplicados dentro del archivo. Conserve un solo registro de cada grupo y descarte el resto.';
  end if;

  for r in
    select
      coalesce(value->>'accion', 'insertar') as accion,
      btrim(coalesce(value->>'nombre', '')) as nombre,
      nullif(upper(regexp_replace(coalesce(value->>'curp', ''), '\s', '', 'g')), '') as curp,
      nullif(btrim(coalesce(value->>'clave_empleado', '')), '') as clave,
      nullif(lower(btrim(coalesce(value->>'email', ''))), '') as email,
      nullif(btrim(coalesce(value->>'telefono', '')), '') as telefono,
      nullif(btrim(coalesce(value->>'edad', '')), '') as edad_txt,
      coalesce(value->'datos_extra', '{}'::jsonb) as datos_extra
    from jsonb_array_elements(p_filas)
  loop
    v_total := v_total + 1;
    if r.accion = 'descartar' then
      v_descartados := v_descartados + 1;
      continue;
    end if;
    if r.nombre = '' then
      raise exception 'SISME: Hay registros incompletos. La importación no se confirmó.';
    end if;
    if r.curp is not null and r.curp !~ '^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[A-Z0-9][0-9]$' then
      raise exception 'SISME: Hay datos con formato inválido. La importación no se confirmó.';
    end if;
    if r.email is not null and r.email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
      raise exception 'SISME: Hay datos con formato inválido. La importación no se confirmó.';
    end if;
    v_telefono := null;
    if r.telefono is not null then
      v_telefono := regexp_replace(r.telefono, '\D', '', 'g');
      if length(v_telefono) = 12 and left(v_telefono, 2) = '52' then
        v_telefono := substring(v_telefono from 3);
      end if;
      if length(v_telefono) <> 10 then
        raise exception 'SISME: Hay datos con formato inválido. La importación no se confirmó.';
      end if;
    end if;
    v_edad := null;
    if r.edad_txt is not null then
      if r.edad_txt !~ '^[0-9]+$' or r.edad_txt::int > 120 then
        raise exception 'SISME: Hay datos con formato inválido. La importación no se confirmó.';
      end if;
      v_edad := r.edad_txt::int;
    end if;

    -- CRQ-004: columnas personalizadas. Solo claves de la plantilla vigente,
    -- obligatorias con valor y tipo correcto. Sin plantilla, no se aceptan.
    if jsonb_typeof(r.datos_extra) <> 'object' then
      raise exception 'SISME: Hay datos con formato inválido. La importación no se confirmó.';
    end if;
    v_extra := '{}'::jsonb;
    if v_plantilla.id is null then
      if r.datos_extra <> '{}'::jsonb then
        raise exception 'SISME: El lote trae columnas que no están en la plantilla de la empresa.';
      end if;
    else
      if exists (
        select 1 from jsonb_object_keys(r.datos_extra) k
        where not exists (
          select 1 from jsonb_array_elements(v_plantilla.columnas) c
          where c->>'clave' = k and coalesce((c->>'personalizado')::boolean, false)
        )
      ) then
        raise exception 'SISME: El lote trae columnas que no están en la plantilla de la empresa.';
      end if;
      for v_columna in
        select c from jsonb_array_elements(v_plantilla.columnas) c
        where coalesce((c->>'personalizado')::boolean, false)
      loop
        v_valor := nullif(btrim(coalesce(r.datos_extra->>(v_columna->>'clave'), '')), '');
        if v_valor is null then
          if coalesce((v_columna->>'obligatorio')::boolean, false) then
            raise exception 'SISME: Hay registros incompletos. La importación no se confirmó.';
          end if;
          continue;
        end if;
        if (v_columna->>'tipo' = 'numero' and v_valor !~ '^-?[0-9]+(\.[0-9]+)?$')
          or (v_columna->>'tipo' = 'fecha' and v_valor !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
          or (v_columna->>'tipo' = 'email' and v_valor !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
          or (v_columna->>'tipo' = 'texto' and length(v_valor) > 250) then
          raise exception 'SISME: Hay datos con formato inválido. La importación no se confirmó.';
        end if;
        v_extra := v_extra || jsonb_build_object(
          v_columna->>'clave',
          case when v_columna->>'tipo' = 'numero' then to_jsonb(v_valor::numeric) else to_jsonb(v_valor) end
        );
      end loop;
    end if;

    v_existente := null;
    if r.curp is not null then
      select id into v_existente from public.empleados where curp = r.curp limit 1;
    end if;
    if v_existente is null and r.clave is not null then
      select id into v_existente from public.empleados
      where empresa_id = p_empresa_id and clave_empleado = r.clave
        and (curp is null or r.curp is null or curp = r.curp)
      limit 1;
    end if;
    if v_existente is null then
      select id into v_existente from public.empleados
      where empresa_id = p_empresa_id
        and public.fn_normalizar_nombre(nombre) = public.fn_normalizar_nombre(r.nombre)
        and (curp is null or r.curp is null or curp = r.curp)
      limit 1;
    end if;

    if r.accion = 'actualizar' then
      if not coalesce(p_sobrescribir, false) then
        raise exception 'SISME: La actualización de registros existentes requiere su confirmación explícita.';
      end if;
      if v_existente is null then
        raise exception 'SISME: No se encontró el registro a actualizar.';
      end if;
      update public.empleados
        set nombre = r.nombre,
            curp = coalesce(r.curp, curp),
            clave_empleado = coalesce(r.clave, clave_empleado),
            email = coalesce(r.email, email),
            telefono = coalesce(v_telefono, telefono),
            edad = coalesce(v_edad, edad),
            datos_extra = coalesce(datos_extra, '{}'::jsonb) || v_extra,
            updated_at = now()
        where id = v_existente;
      v_actualizados := v_actualizados + 1;
    else
      if v_existente is not null then
        raise exception 'SISME: Hay duplicados sin decisión. La importación no se confirmó.';
      end if;
      insert into public.empleados (empresa_id, nombre, curp, clave_empleado, email, telefono, edad, datos_extra, estado)
      values (p_empresa_id, r.nombre, r.curp, r.clave, r.email, v_telefono, v_edad, v_extra, 'provisional');
      v_insertados := v_insertados + 1;
    end if;
  end loop;

  insert into public.importaciones (empresa_id, administrador_id, nombre_archivo, total_filas, insertados, actualizados, descartados, plantilla_version)
  values (p_empresa_id, auth.uid(), left(coalesce(p_nombre_archivo, 'lista.xlsx'), 180), v_total, v_insertados, v_actualizados, v_descartados, v_plantilla.version);

  return jsonb_build_object(
    'insertados', v_insertados,
    'actualizados', v_actualizados,
    'descartados', v_descartados
  );
end;
$$;


revoke all on function public.importar_empleados(uuid, text, boolean, jsonb, integer) from public, anon, authenticated;
grant execute on function public.importar_empleados(uuid, text, boolean, jsonb, integer) to authenticated;

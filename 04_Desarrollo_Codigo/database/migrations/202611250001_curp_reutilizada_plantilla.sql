-- =============================================================================
-- SISME — S7-T13: corregir la validación de CURP en columnas renombradas.
-- Se ejecuta DESPUÉS de 202611240001_doctora_marca_asistencia.sql.
--
-- Bug reportado por el PM (25/11/2026): en la empresa «Cantera» la columna
-- base «curp» se renombró a «MIna a la que va». La clave interna seguía siendo
-- «curp», así que el alta validaba ese dato como CURP y fallaba con
-- «MIna a la que va: La CURP no tiene el formato de 18 caracteres.»
--
-- Causa raíz: la validación (y el guardado en empleados.curp) depende de la
-- clave interna de la columna, no de su nombre visible. El editor permitía
-- renombrar la CURP a cualquier cosa, pero no quitarla (regla «CURP y Clave
-- de empleado no se pueden quitar»), así que renombrarla era la única salida.
--
-- Corrección:
--   1) guardar_plantilla_empresa: basta con conservar «CURP» o «Clave de
--      empleado» (RN-06 sigue con al menos un identificador) y se rechaza
--      una columna «curp» cuyo nombre ya no menciona la CURP. La aplicación
--      convierte ese caso en columna personalizada antes de guardar.
--   2) Datos: cada plantilla vigente con la columna «curp» renombrada a otro
--      dato recibe una versión nueva donde esa columna pasa a ser personalizada
--      de texto (misma etiqueta, orden y obligatoriedad; clave derivada del
--      nombre, p. ej. «mina_a_la_que_va»). Las versiones anteriores se
--      conservan como historial. No se tocan empleados.
-- No modifica RLS ni permisos.
-- =============================================================================

-- 1) Regla de identificadores y de la columna «curp».
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
  -- S7-T13: debe quedar al menos uno de los dos identificadores (RN-06).
  if not exists (select 1 from jsonb_array_elements(p_columnas) where value->>'clave' in ('curp', 'clave_empleado')) then
    raise exception 'SISME: La plantilla debe conservar al menos «CURP» o «Clave de empleado»: se usan para detectar duplicados.';
  end if;
  -- S7-T13: la clave «curp» solo guarda CURP; su nombre visible debe mencionarla.
  if exists (
    select 1 from jsonb_array_elements(p_columnas)
    where value->>'clave' = 'curp'
      and translate(lower(coalesce(value->>'etiqueta', '')), 'áéíóúüñ', 'aeiouun') !~ '(curp|clave unica de registro)'
  ) then
    raise exception 'SISME: La columna «CURP» solo guarda la CURP (18 caracteres) y su nombre debe mencionarla. Para otro dato, quite la CURP y agregue una columna personalizada.';
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


-- 2) Conversión de plantillas vigentes con la columna «curp» renombrada.
do $$
declare
  p record;
  v_col jsonb;
  v_etiqueta text;
  v_clave text;
  v_base text;
  v_n integer;
  v_usadas text[];
  v_nuevas jsonb;
  v_version integer;
begin
  for p in
    select pe.* from public.plantillas_empresa pe
    where pe.activa
      and (select count(*) from jsonb_array_elements(pe.columnas) c where c->>'clave' = 'curp') = 1
      and exists (select 1 from jsonb_array_elements(pe.columnas) c where c->>'clave' = 'clave_empleado')
      and exists (
        select 1 from jsonb_array_elements(pe.columnas) c
        where c->>'clave' = 'curp'
          and translate(lower(coalesce(c->>'etiqueta', '')), 'áéíóúüñ', 'aeiouun') !~ '(curp|clave unica de registro)'
      )
  loop
    select c into v_col from jsonb_array_elements(p.columnas) c where c->>'clave' = 'curp';
    v_etiqueta := regexp_replace(btrim(v_col->>'etiqueta'), '\s+', ' ', 'g');
    -- Misma regla que claveDesdeEtiqueta() en plantillaEmpresa.js.
    v_base := regexp_replace(translate(lower(v_etiqueta), 'áéíóúüñàèìòù', 'aeiouunaeiou'), '[^a-z0-9]+', '_', 'g');
    v_base := regexp_replace(v_base, '^_+|_+$', '', 'g');
    if v_base !~ '^[a-z]' then v_base := 'campo_' || v_base; end if;
    v_base := regexp_replace(left(v_base, 40), '_+$', '');
    if v_base = '' then v_base := 'campo'; end if;
    select array_agg(c->>'clave') into v_usadas from jsonb_array_elements(p.columnas) c where c->>'clave' <> 'curp';
    v_usadas := v_usadas || array['nombre_completo', 'curp', 'clave_empleado', 'email', 'telefono', 'edad'];
    v_clave := v_base;
    v_n := 2;
    while v_clave = any (v_usadas) loop
      v_clave := left(v_base, 36) || '_' || v_n;
      v_n := v_n + 1;
    end loop;

    select jsonb_agg(
             case when c->>'clave' = 'curp' then jsonb_build_object(
                    'clave', v_clave,
                    'etiqueta', v_etiqueta,
                    'tipo', 'texto',
                    'obligatorio', coalesce((c->>'obligatorio')::boolean, false),
                    'orden', (c->>'orden')::integer,
                    'personalizado', true)
                  else c end
             order by ord)
      into v_nuevas
    from jsonb_array_elements(p.columnas) with ordinality as t(c, ord);

    select coalesce(max(version), 0) + 1 into v_version from public.plantillas_empresa where empresa_id = p.empresa_id;
    update public.plantillas_empresa set activa = false where id = p.id;
    insert into public.plantillas_empresa (empresa_id, version, columnas, activa, actualizado_por)
    values (p.empresa_id, v_version, v_nuevas, true, null);
    raise notice 'SISME S7-T13: empresa % · plantilla v% -> v% (columna «%» ahora es personalizada «%»).', p.empresa_id, p.version, v_version, v_etiqueta, v_clave;
  end loop;
end $$;

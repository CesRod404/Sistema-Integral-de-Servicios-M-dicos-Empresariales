-- =============================================================================
-- SISME — S7-T15: versión de plantilla con la que se capturó cada paciente.
-- Se ejecuta DESPUÉS de 202611250001_curp_reutilizada_plantilla.sql.
--
-- Petición del PM (25/11/2026): si se edita la plantilla de una empresa, los
-- pacientes deben llevar un marcador «Plantilla v1», «v2», etc.
--
-- Antecedente: desde CRQ-004 cada guardado de la plantilla ya crea la versión
-- siguiente en plantillas_empresa (guardar_plantilla_empresa). Lo nuevo es
-- registrar en el paciente con qué versión se capturaron sus datos.
--
-- Diseño:
--   1) empleados.plantilla_version (entero >= 0; 0 = plantilla predeterminada,
--      la empresa aún no tenía plantilla propia).
--   2) Trigger trg_empleados_plantilla_version:
--      - INSERT sin versión (importación, altas anteriores): toma la versión
--        vigente de la empresa (0 si no tiene plantilla propia).
--      - UPDATE que cambia la empresa o los datos extra sin indicar versión:
--        toma la versión vigente de la empresa del paciente.
--      - Rechaza una versión mayor a la última de la empresa.
--      La aplicación envía la versión que usó el formulario (alta, edición y
--      atención).
--   3) Respaldo de datos: a los pacientes existentes se les asigna la versión
--      que estaba vigente cuando se registraron (created_at); 0 si no había.
--      Es una inferencia: antes de esta migración no se guardaba el dato.
--   4) v_pacientes_admin agrega al final plantilla_version y
--      plantilla_version_vigente (versión activa de la empresa, 0 si no tiene).
-- No modifica políticas RLS ni permisos. La vista conserva su definición y su
-- filtro es_admin() or es_doctor().
-- =============================================================================

alter table public.empleados
  add column if not exists plantilla_version integer;

do $$
begin
  alter table public.empleados
    add constraint empleados_plantilla_version_valida check (plantilla_version is null or plantilla_version >= 0);
exception
  when duplicate_object then null;
end $$;

comment on column public.empleados.plantilla_version is
  'S7-T15: versión de plantillas_empresa con la que se capturaron los datos del paciente (0 = plantilla predeterminada).';

create or replace function public.fn_empleado_plantilla_version()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_vigente integer;
  v_maxima integer;
begin
  if tg_op = 'INSERT' then
    if new.plantilla_version is null then
      select version into v_vigente from public.plantillas_empresa where empresa_id = new.empresa_id and activa;
      new.plantilla_version := coalesce(v_vigente, 0);
    end if;
  elsif new.plantilla_version is not distinct from old.plantilla_version
        and (new.empresa_id is distinct from old.empresa_id or new.datos_extra is distinct from old.datos_extra) then
    select version into v_vigente from public.plantillas_empresa where empresa_id = new.empresa_id and activa;
    new.plantilla_version := coalesce(v_vigente, 0);
  end if;

  if new.plantilla_version is not null and new.plantilla_version > 0 then
    select max(version) into v_maxima from public.plantillas_empresa where empresa_id = new.empresa_id;
    if v_maxima is null or new.plantilla_version > v_maxima then
      raise exception 'SISME: La versión de plantilla % no existe para la empresa del paciente.', new.plantilla_version;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.fn_empleado_plantilla_version() from public, anon, authenticated;

drop trigger if exists trg_empleados_plantilla_version on public.empleados;
create trigger trg_empleados_plantilla_version
before insert or update on public.empleados
for each row execute function public.fn_empleado_plantilla_version();

-- Respaldo: versión vigente al registrarse el paciente (inferida por fecha).
update public.empleados e
set plantilla_version = coalesce((
  select p.version
  from public.plantillas_empresa p
  where p.empresa_id = e.empresa_id and p.created_at <= e.created_at
  order by p.version desc
  limit 1
), 0)
where e.plantilla_version is null;

-- Vista: mismas columnas y filtro; dos columnas nuevas al final.
create or replace view public.v_pacientes_admin
with (security_invoker = false) as
select
  e.id,
  e.folio,
  e.nombre,
  e.edad,
  e.curp,
  e.clave_empleado,
  e.email,
  e.telefono,
  e.estado,
  e.empresa_id,
  emp.nombre as empresa_nombre,
  c.estado_asistencia as estado_cita,
  c.fecha_hora as ultima_cita,
  ex.estado_expediente,
  ex.fecha_atencion,
  (
    select string_agg(cat.nombre, ', ' order by cat.nombre)
    from public.estudios_realizados er
    join public.catalogo_estudios cat on cat.id = er.catalogo_estudio_id
    where er.expediente_id = ex.id and er.activo
  ) as estudios_nombres,
  e.created_at as fecha_registro,
  e.plantilla_version,
  coalesce((
    select pe.version from public.plantillas_empresa pe
    where pe.empresa_id = e.empresa_id and pe.activa
  ), 0) as plantilla_version_vigente
from public.empleados e
join public.empresas emp on emp.id = e.empresa_id
left join lateral (
  select ci.id, ci.estado_asistencia, ci.fecha_hora
  from public.citas ci
  where ci.empleado_id = e.id
  order by ci.fecha_hora desc
  limit 1
) c on true
left join public.expedientes_clinicos ex on ex.cita_id = c.id
where public.es_admin() or public.es_doctor();

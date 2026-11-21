-- =============================================================================
-- SISME — Migración S5-T14: CRUD de pacientes del doctor con examen PDF.
-- Se ejecuta DESPUÉS de 202610260001_sisme_inicial.sql, completo, en el
-- editor SQL de Supabase. No modifica cobranza. No incluye llaves ni usuarios.
--
-- Respaldo documental:
--   Project Plan §1: "El Doctor gestionará la cola clínica, datos del paciente,
--     pdf del examen y estudios realizados".
--   Project Plan (alcance): "Registro provisional, empresa vinculada, examen
--     médico en pdf y estado".
--   SRS RF-14: "permitir al doctor capturar los datos de atención médica y
--     adjuntar uno o múltiples archivos en formato PDF al expediente del paciente".
--   SDD §4.1 (Empleado: Id, empresa_id, nombre, estado).
-- Decisión del propietario (30/10/2026): Administrador y Doctor ven la misma
-- lista de pacientes y el doctor puede darlos de alta y editarlos.
-- =============================================================================

-- 1) RLS: el doctor también da de alta y edita pacientes.
drop policy if exists empleados_insert on public.empleados;
create policy empleados_insert on public.empleados
for insert to authenticated
with check (public.es_admin() or public.es_doctor());

drop policy if exists empleados_update on public.empleados;
create policy empleados_update on public.empleados
for update to authenticated
using (public.es_admin() or public.es_doctor())
with check (public.es_admin() or public.es_doctor());

-- 2) Misma lista y misma ficha para ambos roles. Las columnas no cambian;
--    las vistas siguen sin diagnóstico, observaciones ni PDF (RN-02).
--    v_pacientes_admin agrega al final fecha_registro (empleados.created_at, que
--    ya existe en la migración inicial: not null default now(); no requiere
--    respaldo de datos). "create or replace view" solo permite columnas nuevas
--    al final.
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
  e.created_at as fecha_registro
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

create or replace view public.v_visitas_admin
with (security_invoker = false) as
select
  c.id as cita_id,
  c.empleado_id,
  c.fecha_hora,
  c.estado_asistencia,
  c.motivo,
  ex.id as expediente_id,
  ex.estado_expediente,
  ex.fecha_atencion,
  (
    select string_agg(cat.nombre, ', ' order by cat.nombre)
    from public.estudios_realizados er
    join public.catalogo_estudios cat on cat.id = er.catalogo_estudio_id
    where er.expediente_id = ex.id and er.activo
  ) as estudios_nombres
from public.citas c
left join public.expedientes_clinicos ex on ex.cita_id = c.id
where public.es_admin() or public.es_doctor();

-- 3) Atención directa del doctor. Crea una cita ya "presente" para que el
--    doctor pueda capturar la atención y adjuntar el PDF del examen sin
--    esperar el registro de asistencia del administrador (SRS Anexo A.2).
--    La cita se crea con now(), así que aparece en la "Cola del día" de hoy
--    (America/Mexico_City) como presente. Si el paciente ya tiene HOY una cita
--    presente con expediente abierto (o sin expediente), la reutiliza.
create or replace function public.abrir_atencion_doctor(p_empleado_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empleado public.empleados%rowtype;
  v_empresa_estado text;
  v_cita_id uuid;
begin
  if not public.es_doctor() then
    raise exception 'SISME: Solo el doctor puede abrir una atención directa.';
  end if;
  select * into v_empleado from public.empleados where id = p_empleado_id;
  if v_empleado.id is null then
    raise exception 'SISME: El paciente no existe.';
  end if;
  if v_empleado.estado = 'inactivo' then
    raise exception 'SISME: El paciente está inactivo.';
  end if;
  select estado into v_empresa_estado from public.empresas where id = v_empleado.empresa_id;
  if v_empresa_estado <> 'activo' then
    raise exception 'SISME: La empresa del paciente está inactiva.';
  end if;
  select c.id into v_cita_id
  from public.citas c
  left join public.expedientes_clinicos ex on ex.cita_id = c.id
  where c.empleado_id = p_empleado_id
    and c.estado_asistencia = 'presente'
    and (c.fecha_hora at time zone 'America/Mexico_City')::date = (now() at time zone 'America/Mexico_City')::date
    and (ex.id is null or ex.estado_expediente = 'abierto')
  order by c.fecha_hora desc
  limit 1;
  if v_cita_id is not null then
    return v_cita_id;
  end if;
  insert into public.citas (empleado_id, fecha_hora, motivo, estado_asistencia)
  values (p_empleado_id, now(), 'Atención registrada por el doctor', 'presente')
  returning id into v_cita_id;
  return v_cita_id;
end;
$$;

revoke all on function public.abrir_atencion_doctor(uuid) from public, anon, authenticated;
grant execute on function public.abrir_atencion_doctor(uuid) to authenticated;

-- =============================================================================
-- SISME — Sistema Integral de Servicios Médicos Empresariales
-- Migración inicial. PostgreSQL 15 (Supabase).
-- Cubre el modelo del SDD y las reglas del SRS v1.5: dos roles, RLS,
-- precio histórico, expediente sin diagnóstico para el administrador y
-- PDF solo en bucket privado.
-- Ejecutar completo en el editor SQL de Supabase. No incluye llaves ni usuarios.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Tablas
-- -----------------------------------------------------------------------------

create table if not exists public.perfiles (
  id uuid primary key references auth.users (id) on delete restrict,
  nombre text not null,
  email text not null unique,
  rol text not null check (rol in ('administrador', 'doctor')),
  intentos_fallidos integer not null default 0,
  bloqueado_hasta timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence if not exists public.seq_folio_empresa;
create sequence if not exists public.seq_folio_empleado;

create table if not exists public.empresas (
  id uuid primary key default gen_random_uuid(),
  folio text unique,
  nombre varchar(150) not null check (length(btrim(nombre)) > 0),
  contacto varchar(150) not null check (length(btrim(contacto)) > 0),
  email varchar(150) not null check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  telefono varchar(20),
  direccion varchar(250),
  notas text,
  estado varchar(20) not null default 'activo' check (estado in ('activo', 'inactivo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists empresas_nombre_unico on public.empresas (lower(nombre));

create table if not exists public.empleados (
  id uuid primary key default gen_random_uuid(),
  folio text unique,
  empresa_id uuid not null references public.empresas (id) on delete restrict,
  curp varchar(18) unique,
  clave_empleado varchar(50),
  nombre varchar(150) not null check (length(btrim(nombre)) > 0),
  email varchar(150),
  telefono varchar(20),
  edad smallint check (edad is null or (edad between 0 and 120)),
  estado varchar(20) not null default 'provisional' check (estado in ('provisional', 'activo', 'inactivo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.citas (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references public.empleados (id) on delete restrict,
  fecha_hora timestamptz not null,
  estado_asistencia varchar(20) not null default 'programada'
    check (estado_asistencia in ('programada', 'presente', 'ausente', 'cerrada', 'cancelada')),
  motivo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.expedientes_clinicos (
  id uuid primary key default gen_random_uuid(),
  cita_id uuid not null unique references public.citas (id) on delete restrict,
  doctor_id uuid not null references auth.users (id) on delete restrict,
  diagnostico text,
  observaciones text,
  estado_expediente varchar(20) not null default 'abierto' check (estado_expediente in ('abierto', 'cerrado')),
  fecha_atencion timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.catalogo_estudios (
  id uuid primary key default gen_random_uuid(),
  nombre varchar(150) not null unique,
  precio decimal(10, 2) not null check (precio >= 0),
  vigente boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.estudios_realizados (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid not null references public.expedientes_clinicos (id) on delete restrict,
  catalogo_estudio_id uuid not null references public.catalogo_estudios (id) on delete restrict,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (expediente_id, catalogo_estudio_id)
);

create table if not exists public.expediente_archivos (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid not null references public.expedientes_clinicos (id) on delete restrict,
  ruta text not null,
  nombre text not null,
  tamano_bytes integer not null check (tamano_bytes > 0 and tamano_bytes <= 5242880),
  created_at timestamptz not null default now()
);

create table if not exists public.cargos_detalle (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete restrict,
  cita_id uuid not null references public.citas (id) on delete restrict,
  catalogo_estudio_id uuid references public.catalogo_estudios (id) on delete restrict,
  concepto text not null,
  precio_historico decimal(10, 2) not null check (precio_historico >= 0),
  estatus_pago varchar(20) not null default 'pendiente'
    check (estatus_pago in ('pendiente', 'parcial', 'pagado', 'cancelado')),
  fecha_cargo timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cita_id, catalogo_estudio_id)
);

create table if not exists public.pagos (
  id uuid primary key default gen_random_uuid(),
  cargo_id uuid not null references public.cargos_detalle (id) on delete restrict,
  empresa_id uuid not null references public.empresas (id) on delete restrict,
  monto decimal(10, 2) not null check (monto > 0),
  referencia text not null check (length(btrim(referencia)) > 0),
  fecha_pago date not null,
  registrado_por uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.importaciones (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete restrict,
  administrador_id uuid not null references auth.users (id) on delete restrict,
  nombre_archivo text,
  total_filas integer not null default 0,
  insertados integer not null default 0,
  actualizados integer not null default 0,
  descartados integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_empleados_empresa on public.empleados (empresa_id);
create index if not exists idx_empleados_curp on public.empleados (curp);
create index if not exists idx_empleados_nombre on public.empleados (empresa_id, lower(nombre));
create index if not exists idx_citas_empleado on public.citas (empleado_id);
create index if not exists idx_citas_fecha_estado on public.citas (fecha_hora, estado_asistencia);
create index if not exists idx_expedientes_cita on public.expedientes_clinicos (cita_id);
create index if not exists idx_cargos_empresa_estatus on public.cargos_detalle (empresa_id, estatus_pago);
create index if not exists idx_pagos_cargo on public.pagos (cargo_id);

-- -----------------------------------------------------------------------------
-- Funciones de apoyo
-- -----------------------------------------------------------------------------

create or replace function public.fn_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.fn_folio_empresa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.folio is null or btrim(new.folio) = '' then
    new.folio := 'EMP-' || lpad(nextval('public.seq_folio_empresa')::text, 3, '0');
  end if;
  return new;
end;
$$;

create or replace function public.fn_folio_empleado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.folio is null or btrim(new.folio) = '' then
    new.folio := 'P-' || lpad(nextval('public.seq_folio_empleado')::text, 3, '0');
  end if;
  return new;
end;
$$;

create or replace function public.fn_impedir_eliminacion()
returns trigger
language plpgsql
as $$
begin
  raise exception 'SISME: No se permite la eliminación física. Use la baja lógica para conservar citas, expedientes y pagos.';
end;
$$;

create or replace function public.fn_precio_historico()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_precio decimal(10, 2);
  v_nombre text;
begin
  if tg_op = 'INSERT' then
    select precio, nombre into v_precio, v_nombre
    from public.catalogo_estudios
    where id = new.catalogo_estudio_id;
    if new.precio_historico is null then
      new.precio_historico := v_precio;
    end if;
    if new.concepto is null or btrim(new.concepto) = '' then
      new.concepto := v_nombre;
    end if;
    if new.precio_historico is null or new.concepto is null then
      raise exception 'SISME: No se puede generar el cargo sin precio de catálogo.';
    end if;
    return new;
  end if;
  if new.precio_historico is distinct from old.precio_historico
     or new.concepto is distinct from old.concepto
     or new.catalogo_estudio_id is distinct from old.catalogo_estudio_id
     or new.cita_id is distinct from old.cita_id
     or new.empresa_id is distinct from old.empresa_id then
    raise exception 'SISME: El precio histórico y el concepto del cargo no pueden modificarse.';
  end if;
  return new;
end;
$$;

create or replace function public.fn_normalizar_nombre(p_texto text)
returns text
language sql
immutable
as $$
  select lower(regexp_replace(translate(coalesce(p_texto, ''), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'), '\s+', ' ', 'g'));
$$;

create or replace function public.rol_actual()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select rol from public.perfiles where id = auth.uid();
$$;

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.rol_actual() = 'administrador', false);
$$;

create or replace function public.es_doctor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.rol_actual() = 'doctor', false);
$$;

create or replace function public.fn_crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol text;
begin
  v_rol := lower(coalesce(new.raw_app_meta_data->>'rol', ''));
  if v_rol not in ('administrador', 'doctor') then
    v_rol := 'doctor';
  end if;
  insert into public.perfiles (id, nombre, email, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    new.email,
    v_rol
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------

drop trigger if exists trg_perfiles_updated_at on public.perfiles;
create trigger trg_perfiles_updated_at before update on public.perfiles
for each row execute function public.fn_set_updated_at();

drop trigger if exists trg_empresas_updated_at on public.empresas;
create trigger trg_empresas_updated_at before update on public.empresas
for each row execute function public.fn_set_updated_at();

drop trigger if exists trg_empleados_updated_at on public.empleados;
create trigger trg_empleados_updated_at before update on public.empleados
for each row execute function public.fn_set_updated_at();

drop trigger if exists trg_citas_updated_at on public.citas;
create trigger trg_citas_updated_at before update on public.citas
for each row execute function public.fn_set_updated_at();

drop trigger if exists trg_expedientes_updated_at on public.expedientes_clinicos;
create trigger trg_expedientes_updated_at before update on public.expedientes_clinicos
for each row execute function public.fn_set_updated_at();

drop trigger if exists trg_catalogo_updated_at on public.catalogo_estudios;
create trigger trg_catalogo_updated_at before update on public.catalogo_estudios
for each row execute function public.fn_set_updated_at();

drop trigger if exists trg_cargos_updated_at on public.cargos_detalle;
create trigger trg_cargos_updated_at before update on public.cargos_detalle
for each row execute function public.fn_set_updated_at();

drop trigger if exists trg_folio_empresa on public.empresas;
create trigger trg_folio_empresa before insert on public.empresas
for each row execute function public.fn_folio_empresa();

drop trigger if exists trg_folio_empleado on public.empleados;
create trigger trg_folio_empleado before insert on public.empleados
for each row execute function public.fn_folio_empleado();

drop trigger if exists trg_empresas_no_delete on public.empresas;
create trigger trg_empresas_no_delete before delete on public.empresas
for each row execute function public.fn_impedir_eliminacion();

drop trigger if exists trg_empleados_no_delete on public.empleados;
create trigger trg_empleados_no_delete before delete on public.empleados
for each row execute function public.fn_impedir_eliminacion();

drop trigger if exists trg_citas_no_delete on public.citas;
create trigger trg_citas_no_delete before delete on public.citas
for each row execute function public.fn_impedir_eliminacion();

drop trigger if exists trg_expedientes_no_delete on public.expedientes_clinicos;
create trigger trg_expedientes_no_delete before delete on public.expedientes_clinicos
for each row execute function public.fn_impedir_eliminacion();

drop trigger if exists trg_cargos_no_delete on public.cargos_detalle;
create trigger trg_cargos_no_delete before delete on public.cargos_detalle
for each row execute function public.fn_impedir_eliminacion();

drop trigger if exists trg_pagos_no_delete on public.pagos;
create trigger trg_pagos_no_delete before delete on public.pagos
for each row execute function public.fn_impedir_eliminacion();

drop trigger if exists trg_catalogo_no_delete on public.catalogo_estudios;
create trigger trg_catalogo_no_delete before delete on public.catalogo_estudios
for each row execute function public.fn_impedir_eliminacion();

drop trigger if exists trg_precio_historico on public.cargos_detalle;
create trigger trg_precio_historico before insert or update on public.cargos_detalle
for each row execute function public.fn_precio_historico();

drop trigger if exists trg_sisme_nuevo_usuario on auth.users;
create trigger trg_sisme_nuevo_usuario
after insert on auth.users
for each row execute function public.fn_crear_perfil();

-- -----------------------------------------------------------------------------
-- Acceso: bloqueo temporal (RNF-07) y recuperación delegada a Supabase Auth
-- -----------------------------------------------------------------------------

create or replace function public.estado_acceso(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_perfil public.perfiles%rowtype;
begin
  select * into v_perfil from public.perfiles where lower(email) = lower(btrim(coalesce(p_email, '')));
  if v_perfil.id is null then
    return jsonb_build_object('bloqueado', false);
  end if;
  if v_perfil.bloqueado_hasta is not null and v_perfil.bloqueado_hasta <= now() then
    update public.perfiles
      set bloqueado_hasta = null, intentos_fallidos = 0, updated_at = now()
      where id = v_perfil.id;
    return jsonb_build_object('bloqueado', false);
  end if;
  return jsonb_build_object(
    'bloqueado', v_perfil.bloqueado_hasta is not null and v_perfil.bloqueado_hasta > now(),
    'bloqueado_hasta', v_perfil.bloqueado_hasta
  );
end;
$$;

create or replace function public.registrar_intento_fallido(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_perfil public.perfiles%rowtype;
  v_intentos integer;
begin
  select * into v_perfil from public.perfiles where lower(email) = lower(btrim(coalesce(p_email, '')));
  if v_perfil.id is null then
    return jsonb_build_object('bloqueado', false);
  end if;
  if v_perfil.bloqueado_hasta is not null and v_perfil.bloqueado_hasta > now() then
    return jsonb_build_object('bloqueado', true, 'bloqueado_hasta', v_perfil.bloqueado_hasta);
  end if;
  v_intentos := coalesce(v_perfil.intentos_fallidos, 0) + 1;
  if v_intentos >= 5 then
    update public.perfiles
      set intentos_fallidos = 0,
          bloqueado_hasta = now() + interval '15 minutes',
          updated_at = now()
      where id = v_perfil.id;
    return jsonb_build_object('bloqueado', true);
  end if;
  update public.perfiles
    set intentos_fallidos = v_intentos, bloqueado_hasta = null, updated_at = now()
    where id = v_perfil.id;
  return jsonb_build_object('bloqueado', false, 'intentos', v_intentos);
end;
$$;

create or replace function public.registrar_acceso_exitoso()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.perfiles
    set intentos_fallidos = 0, bloqueado_hasta = null, updated_at = now()
    where id = auth.uid();
end;
$$;

-- -----------------------------------------------------------------------------
-- Operación clínica y financiera
-- -----------------------------------------------------------------------------

create or replace function public.programar_cita(
  p_id uuid,
  p_empleado_id uuid,
  p_fecha_hora timestamptz,
  p_motivo text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empleado public.empleados%rowtype;
  v_empresa_estado text;
  v_cita public.citas%rowtype;
  v_estado text;
begin
  if not public.es_admin() then
    raise exception 'SISME: Solo el administrador puede agendar citas.';
  end if;
  if p_fecha_hora is null then
    raise exception 'SISME: Indique la fecha y la hora de la cita.';
  end if;
  select * into v_empleado from public.empleados where id = p_empleado_id;
  if v_empleado.id is null then
    raise exception 'SISME: Seleccione un empleado ya registrado.';
  end if;
  if v_empleado.estado = 'inactivo' then
    raise exception 'SISME: El empleado está inactivo y no se le puede agendar.';
  end if;
  select estado into v_empresa_estado from public.empresas where id = v_empleado.empresa_id;
  if v_empresa_estado <> 'activo' then
    raise exception 'SISME: No se agendan citas de una empresa inactiva.';
  end if;
  if p_id is null then
    insert into public.citas (empleado_id, fecha_hora, motivo, estado_asistencia)
    values (p_empleado_id, p_fecha_hora, nullif(btrim(coalesce(p_motivo, '')), ''), 'programada')
    returning * into v_cita;
  else
    select * into v_cita from public.citas where id = p_id;
    if v_cita.id is null then
      raise exception 'SISME: La cita no existe.';
    end if;
    if v_cita.estado_asistencia in ('cerrada', 'cancelada') then
      raise exception 'SISME: La cita ya no se puede reprogramar.';
    end if;
    v_estado := v_cita.estado_asistencia;
    if v_cita.fecha_hora is distinct from p_fecha_hora then
      v_estado := 'programada';
    end if;
    update public.citas
      set empleado_id = p_empleado_id,
          fecha_hora = p_fecha_hora,
          motivo = nullif(btrim(coalesce(p_motivo, '')), ''),
          estado_asistencia = v_estado,
          updated_at = now()
      where id = p_id
      returning * into v_cita;
  end if;
  return jsonb_build_object('id', v_cita.id, 'estado_asistencia', v_cita.estado_asistencia);
end;
$$;

create or replace function public.registrar_asistencia(p_cita_id uuid, p_estado text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cita public.citas%rowtype;
begin
  if not public.es_admin() then
    raise exception 'SISME: Solo el administrador puede registrar la asistencia.';
  end if;
  if p_estado not in ('presente', 'ausente') then
    raise exception 'SISME: El estado de asistencia debe ser presente o ausente.';
  end if;
  select * into v_cita from public.citas where id = p_cita_id;
  if v_cita.id is null then
    raise exception 'SISME: La cita no existe.';
  end if;
  if v_cita.estado_asistencia in ('cerrada', 'cancelada') then
    raise exception 'SISME: La cita ya no admite cambio de asistencia.';
  end if;
  update public.citas
    set estado_asistencia = p_estado, updated_at = now()
    where id = p_cita_id;
  return jsonb_build_object('id', p_cita_id, 'estado_asistencia', p_estado);
end;
$$;

create or replace function public.cancelar_cita(p_cita_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado text;
begin
  if not public.es_admin() then
    raise exception 'SISME: Solo el administrador puede cancelar la cita.';
  end if;
  select estado_asistencia into v_estado from public.citas where id = p_cita_id;
  if v_estado is null then
    raise exception 'SISME: La cita no existe.';
  end if;
  if v_estado = 'cerrada' then
    raise exception 'SISME: No se puede cancelar una cita ya atendida.';
  end if;
  if v_estado = 'cancelada' then
    raise exception 'SISME: La cita ya está cancelada.';
  end if;
  update public.citas set estado_asistencia = 'cancelada', updated_at = now() where id = p_cita_id;
  return jsonb_build_object('id', p_cita_id, 'estado_asistencia', 'cancelada');
end;
$$;

create or replace function public.guardar_atencion(
  p_cita_id uuid,
  p_diagnostico text,
  p_observaciones text,
  p_fecha_atencion timestamptz,
  p_estudios uuid[]
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cita public.citas%rowtype;
  v_exp public.expedientes_clinicos%rowtype;
begin
  if not public.es_doctor() then
    raise exception 'SISME: Solo el doctor puede capturar la atención médica.';
  end if;
  select * into v_cita from public.citas where id = p_cita_id;
  if v_cita.id is null then
    raise exception 'SISME: La cita no existe.';
  end if;
  if v_cita.estado_asistencia <> 'presente' then
    raise exception 'SISME: Solo se captura la atención de un paciente presente.';
  end if;
  if exists (
    select 1
    from unnest(coalesce(p_estudios, array[]::uuid[])) as estudio(id)
    left join public.catalogo_estudios c on c.id = estudio.id
    where c.id is null or c.vigente = false
  ) then
    raise exception 'SISME: Uno de los estudios no está vigente.';
  end if;
  select * into v_exp from public.expedientes_clinicos where cita_id = p_cita_id;
  if v_exp.id is not null and v_exp.estado_expediente = 'cerrado' then
    raise exception 'SISME: El expediente está cerrado y no admite cambios.';
  end if;
  if v_exp.id is null then
    insert into public.expedientes_clinicos (cita_id, doctor_id, diagnostico, observaciones, fecha_atencion)
    values (
      p_cita_id,
      auth.uid(),
      nullif(btrim(coalesce(p_diagnostico, '')), ''),
      nullif(btrim(coalesce(p_observaciones, '')), ''),
      p_fecha_atencion
    )
    returning * into v_exp;
  else
    update public.expedientes_clinicos
      set diagnostico = nullif(btrim(coalesce(p_diagnostico, '')), ''),
          observaciones = nullif(btrim(coalesce(p_observaciones, '')), ''),
          fecha_atencion = p_fecha_atencion,
          updated_at = now()
      where id = v_exp.id
      returning * into v_exp;
  end if;

  update public.estudios_realizados
    set activo = false
    where expediente_id = v_exp.id
      and catalogo_estudio_id <> all (coalesce(p_estudios, array[]::uuid[]));

  update public.estudios_realizados
    set activo = true
    where expediente_id = v_exp.id
      and catalogo_estudio_id = any (coalesce(p_estudios, array[]::uuid[]));

  insert into public.estudios_realizados (expediente_id, catalogo_estudio_id, activo)
  select v_exp.id, estudio.id, true
  from unnest(coalesce(p_estudios, array[]::uuid[])) as estudio(id)
  where not exists (
    select 1 from public.estudios_realizados er
    where er.expediente_id = v_exp.id and er.catalogo_estudio_id = estudio.id
  );
  return v_exp.id;
end;
$$;

create or replace function public.cerrar_expediente(p_expediente_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exp public.expedientes_clinicos%rowtype;
  v_cita public.citas%rowtype;
  v_empresa uuid;
begin
  if not public.es_doctor() then
    raise exception 'SISME: Solo el doctor puede cerrar el expediente.';
  end if;
  select * into v_exp from public.expedientes_clinicos where id = p_expediente_id;
  if v_exp.id is null then
    raise exception 'SISME: El expediente no existe.';
  end if;
  if v_exp.estado_expediente = 'cerrado' then
    raise exception 'SISME: El expediente ya está cerrado.';
  end if;
  if v_exp.fecha_atencion is null or btrim(coalesce(v_exp.diagnostico, '')) = '' then
    raise exception 'SISME: No se puede cerrar el expediente porque faltan la fecha de atención o el diagnóstico.';
  end if;
  select * into v_cita from public.citas where id = v_exp.cita_id;
  if v_cita.estado_asistencia <> 'presente' then
    raise exception 'SISME: Solo se puede cerrar la atención de un paciente presente.';
  end if;
  if exists (
    select 1
    from public.estudios_realizados er
    join public.catalogo_estudios c on c.id = er.catalogo_estudio_id
    where er.expediente_id = v_exp.id and er.activo and c.vigente = false
  ) then
    raise exception 'SISME: Hay un estudio sin tarifa vigente. No se cerró el expediente.';
  end if;
  select e.empresa_id into v_empresa
  from public.empleados e
  where e.id = v_cita.empleado_id;

  update public.expedientes_clinicos
    set estado_expediente = 'cerrado', updated_at = now()
    where id = v_exp.id;
  update public.citas
    set estado_asistencia = 'cerrada', updated_at = now()
    where id = v_cita.id;

  insert into public.cargos_detalle (empresa_id, cita_id, catalogo_estudio_id, concepto, precio_historico, estatus_pago)
  select v_empresa, v_cita.id, c.id, c.nombre, c.precio, 'pendiente'
  from public.estudios_realizados er
  join public.catalogo_estudios c on c.id = er.catalogo_estudio_id
  where er.expediente_id = v_exp.id and er.activo;

  return v_exp.id;
end;
$$;

create or replace function public.registrar_archivo_pdf(
  p_expediente_id uuid,
  p_ruta text,
  p_nombre text,
  p_tamano integer
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado text;
  v_id uuid;
begin
  if not public.es_doctor() then
    raise exception 'SISME: Solo el doctor puede adjuntar el examen médico.';
  end if;
  if split_part(coalesce(p_ruta, ''), '/', 1) <> auth.uid()::text or right(lower(coalesce(p_ruta, '')), 4) <> '.pdf' then
    raise exception 'SISME: Solo se permiten archivos PDF del expediente.';
  end if;
  if p_tamano is null or p_tamano <= 0 or p_tamano > 5242880 then
    raise exception 'SISME: El PDF supera el tamaño máximo de 5 MB.';
  end if;
  select estado_expediente into v_estado from public.expedientes_clinicos where id = p_expediente_id;
  if v_estado is null then
    raise exception 'SISME: El expediente no existe.';
  end if;
  if v_estado <> 'abierto' then
    raise exception 'SISME: El expediente está cerrado y no admite archivos.';
  end if;
  insert into public.expediente_archivos (expediente_id, ruta, nombre, tamano_bytes)
  values (p_expediente_id, p_ruta, left(coalesce(nullif(btrim(p_nombre), ''), 'examen.pdf'), 180), p_tamano)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.registrar_pago(
  p_cargo_id uuid,
  p_monto numeric,
  p_referencia text,
  p_fecha date
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cargo public.cargos_detalle%rowtype;
  v_pagado numeric;
  v_id uuid;
  v_estatus text;
begin
  if not public.es_admin() then
    raise exception 'SISME: Solo el administrador puede registrar pagos.';
  end if;
  if p_monto is null or p_monto <= 0 then
    raise exception 'SISME: El monto del pago debe ser mayor a cero.';
  end if;
  if btrim(coalesce(p_referencia, '')) = '' then
    raise exception 'SISME: Capture la referencia del depósito o transferencia.';
  end if;
  if p_fecha is null then
    raise exception 'SISME: Indique la fecha del pago.';
  end if;
  select * into v_cargo from public.cargos_detalle where id = p_cargo_id for update;
  if v_cargo.id is null then
    raise exception 'SISME: El cargo no existe.';
  end if;
  select coalesce(sum(monto), 0) into v_pagado from public.pagos where cargo_id = p_cargo_id;
  if v_pagado + p_monto > v_cargo.precio_historico + 0.001 then
    raise exception 'SISME: El pago excede el saldo del cargo.';
  end if;
  insert into public.pagos (cargo_id, empresa_id, monto, referencia, fecha_pago, registrado_por)
  values (v_cargo.id, v_cargo.empresa_id, p_monto, btrim(p_referencia), p_fecha, auth.uid())
  returning id into v_id;
  v_estatus := case
    when abs((v_pagado + p_monto) - v_cargo.precio_historico) < 0.01 then 'pagado'
    else 'parcial'
  end;
  update public.cargos_detalle
    set estatus_pago = v_estatus, updated_at = now()
    where id = v_cargo.id;
  return v_id;
end;
$$;

create or replace function public.importar_empleados(
  p_empresa_id uuid,
  p_nombre_archivo text,
  p_sobrescribir boolean,
  p_filas jsonb
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
      nullif(btrim(coalesce(value->>'edad', '')), '') as edad_txt
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
            updated_at = now()
        where id = v_existente;
      v_actualizados := v_actualizados + 1;
    else
      if v_existente is not null then
        raise exception 'SISME: Hay duplicados sin decisión. La importación no se confirmó.';
      end if;
      insert into public.empleados (empresa_id, nombre, curp, clave_empleado, email, telefono, edad, estado)
      values (p_empresa_id, r.nombre, r.curp, r.clave, r.email, v_telefono, v_edad, 'provisional');
      v_insertados := v_insertados + 1;
    end if;
  end loop;

  insert into public.importaciones (empresa_id, administrador_id, nombre_archivo, total_filas, insertados, actualizados, descartados)
  values (p_empresa_id, auth.uid(), left(coalesce(p_nombre_archivo, 'lista.xlsx'), 180), v_total, v_insertados, v_actualizados, v_descartados);

  return jsonb_build_object(
    'insertados', v_insertados,
    'actualizados', v_actualizados,
    'descartados', v_descartados
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Vistas: el administrador no ve diagnóstico, observaciones ni ruta de PDF.
-- El doctor consulta estudios por nombre, sin precio (RF-03).
-- security_invoker = false para leer columnas seguras sin abrir la tabla base.
-- -----------------------------------------------------------------------------

drop view if exists public.v_estudios_nombres;
create view public.v_estudios_nombres
with (security_invoker = false) as
select id, nombre, vigente
from public.catalogo_estudios;

drop view if exists public.v_pacientes_admin;
create view public.v_pacientes_admin
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
  ) as estudios_nombres
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
where public.es_admin();

drop view if exists public.v_visitas_admin;
create view public.v_visitas_admin
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
where public.es_admin();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------

alter table public.perfiles enable row level security;
alter table public.empresas enable row level security;
alter table public.empleados enable row level security;
alter table public.citas enable row level security;
alter table public.expedientes_clinicos enable row level security;
alter table public.catalogo_estudios enable row level security;
alter table public.estudios_realizados enable row level security;
alter table public.expediente_archivos enable row level security;
alter table public.cargos_detalle enable row level security;
alter table public.pagos enable row level security;
alter table public.importaciones enable row level security;

drop policy if exists perfiles_select on public.perfiles;
create policy perfiles_select on public.perfiles
for select to authenticated
using (id = auth.uid() or public.es_admin());

drop policy if exists empresas_select on public.empresas;
create policy empresas_select on public.empresas
for select to authenticated
using (public.es_admin() or public.es_doctor());

drop policy if exists empresas_insert on public.empresas;
create policy empresas_insert on public.empresas
for insert to authenticated
with check (public.es_admin());

drop policy if exists empresas_update on public.empresas;
create policy empresas_update on public.empresas
for update to authenticated
using (public.es_admin())
with check (public.es_admin());

drop policy if exists empleados_select on public.empleados;
create policy empleados_select on public.empleados
for select to authenticated
using (public.es_admin() or public.es_doctor());

drop policy if exists empleados_insert on public.empleados;
create policy empleados_insert on public.empleados
for insert to authenticated
with check (public.es_admin());

drop policy if exists empleados_update on public.empleados;
create policy empleados_update on public.empleados
for update to authenticated
using (public.es_admin())
with check (public.es_admin());

drop policy if exists citas_select on public.citas;
create policy citas_select on public.citas
for select to authenticated
using (public.es_admin() or public.es_doctor());

drop policy if exists exp_select_doctor on public.expedientes_clinicos;
create policy exp_select_doctor on public.expedientes_clinicos
for select to authenticated
using (public.es_doctor());

drop policy if exists estudios_select_doctor on public.estudios_realizados;
create policy estudios_select_doctor on public.estudios_realizados
for select to authenticated
using (public.es_doctor());

drop policy if exists archivos_select_doctor on public.expediente_archivos;
create policy archivos_select_doctor on public.expediente_archivos
for select to authenticated
using (public.es_doctor());

drop policy if exists catalogo_admin on public.catalogo_estudios;
create policy catalogo_admin on public.catalogo_estudios
for all to authenticated
using (public.es_admin())
with check (public.es_admin());

drop policy if exists cargos_admin_select on public.cargos_detalle;
create policy cargos_admin_select on public.cargos_detalle
for select to authenticated
using (public.es_admin());

drop policy if exists pagos_admin_select on public.pagos;
create policy pagos_admin_select on public.pagos
for select to authenticated
using (public.es_admin());

drop policy if exists importaciones_admin_select on public.importaciones;
create policy importaciones_admin_select on public.importaciones
for select to authenticated
using (public.es_admin());

revoke all on table public.perfiles from public, anon, authenticated;
grant select on table public.perfiles to authenticated;

revoke all on table public.empresas from public, anon, authenticated;
grant select, insert, update on table public.empresas to authenticated;

revoke all on table public.empleados from public, anon, authenticated;
grant select, insert, update on table public.empleados to authenticated;

revoke all on table public.citas from public, anon, authenticated;
grant select on table public.citas to authenticated;

revoke all on table public.expedientes_clinicos from public, anon, authenticated;
grant select on table public.expedientes_clinicos to authenticated;

revoke all on table public.estudios_realizados from public, anon, authenticated;
grant select on table public.estudios_realizados to authenticated;

revoke all on table public.expediente_archivos from public, anon, authenticated;
grant select on table public.expediente_archivos to authenticated;

revoke all on table public.catalogo_estudios from public, anon, authenticated;
grant select, insert, update on table public.catalogo_estudios to authenticated;

revoke all on table public.cargos_detalle from public, anon, authenticated;
grant select on table public.cargos_detalle to authenticated;

revoke all on table public.pagos from public, anon, authenticated;
grant select on table public.pagos to authenticated;

revoke all on table public.importaciones from public, anon, authenticated;
grant select on table public.importaciones to authenticated;

revoke all on table public.v_estudios_nombres from public, anon, authenticated;
grant select on table public.v_estudios_nombres to authenticated;

revoke all on table public.v_pacientes_admin from public, anon, authenticated;
grant select on table public.v_pacientes_admin to authenticated;

revoke all on table public.v_visitas_admin from public, anon, authenticated;
grant select on table public.v_visitas_admin to authenticated;

revoke all on function public.estado_acceso(text) from public, anon, authenticated;
revoke all on function public.registrar_intento_fallido(text) from public, anon, authenticated;
revoke all on function public.registrar_acceso_exitoso() from public, anon, authenticated;
revoke all on function public.programar_cita(uuid, uuid, timestamptz, text) from public, anon, authenticated;
revoke all on function public.registrar_asistencia(uuid, text) from public, anon, authenticated;
revoke all on function public.cancelar_cita(uuid) from public, anon, authenticated;
revoke all on function public.guardar_atencion(uuid, text, text, timestamptz, uuid[]) from public, anon, authenticated;
revoke all on function public.cerrar_expediente(uuid) from public, anon, authenticated;
revoke all on function public.registrar_archivo_pdf(uuid, text, text, integer) from public, anon, authenticated;
revoke all on function public.registrar_pago(uuid, numeric, text, date) from public, anon, authenticated;
revoke all on function public.importar_empleados(uuid, text, boolean, jsonb) from public, anon, authenticated;
revoke all on function public.es_admin() from public, anon, authenticated;
revoke all on function public.es_doctor() from public, anon, authenticated;
revoke all on function public.rol_actual() from public, anon, authenticated;

grant execute on function public.estado_acceso(text) to anon, authenticated;
grant execute on function public.registrar_intento_fallido(text) to anon, authenticated;
grant execute on function public.registrar_acceso_exitoso() to authenticated;
grant execute on function public.es_admin() to authenticated;
grant execute on function public.es_doctor() to authenticated;
grant execute on function public.rol_actual() to authenticated;
grant execute on function public.programar_cita(uuid, uuid, timestamptz, text) to authenticated;
grant execute on function public.registrar_asistencia(uuid, text) to authenticated;
grant execute on function public.cancelar_cita(uuid) to authenticated;
grant execute on function public.guardar_atencion(uuid, text, text, timestamptz, uuid[]) to authenticated;
grant execute on function public.cerrar_expediente(uuid) to authenticated;
grant execute on function public.registrar_archivo_pdf(uuid, text, text, integer) to authenticated;
grant execute on function public.registrar_pago(uuid, numeric, text, date) to authenticated;
grant execute on function public.importar_empleados(uuid, text, boolean, jsonb) to authenticated;

-- -----------------------------------------------------------------------------
-- Storage privado de PDF (RNF-05). Sin URLs públicas permanentes.
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('expedientes_medicos', 'expedientes_medicos', false, 5242880, array['application/pdf']::text[])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists sisme_pdf_doctor_lectura on storage.objects;
create policy sisme_pdf_doctor_lectura on storage.objects
for select to authenticated
using (bucket_id = 'expedientes_medicos' and public.es_doctor());

drop policy if exists sisme_pdf_doctor_alta on storage.objects;
create policy sisme_pdf_doctor_alta on storage.objects
for insert to authenticated
with check (
  bucket_id = 'expedientes_medicos'
  and public.es_doctor()
  and coalesce((storage.foldername(name))[1], '') = auth.uid()::text
);

do $$
begin
  alter publication supabase_realtime add table public.citas;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

-- Catálogo inicial. El precio vigente no reescribe cargos ya generados.
insert into public.catalogo_estudios (nombre, precio, vigente) values
  ('Biometría hemática', 250.00, true),
  ('Química sanguínea', 280.00, true),
  ('Examen general de orina', 180.00, true),
  ('Perfil lipídico', 320.00, true),
  ('Rayos X (tórax)', 300.00, true),
  ('Electrocardiograma (ECG)', 250.00, true),
  ('Audiometría', 200.00, true),
  ('Espirometría', 220.00, true)
on conflict (nombre) do nothing;

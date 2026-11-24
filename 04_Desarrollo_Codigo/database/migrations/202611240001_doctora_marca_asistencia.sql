-- =============================================================================
-- SISME — S7-T12: la doctora también puede marcar presente o ausente.
-- Se ejecuta DESPUÉS de 202611120001_plantillas_empresa.sql, completo, en el
-- editor SQL de Supabase. No aplicar en automático.
--
-- Decisión del equipo (PM, 24/11/2026):
--   El SRS v1.6, RF-13 / US-CLI-02, asigna el registro de asistencia al
--   Administrador. El equipo acordó que el Doctor también pueda marcar
--   presente o ausente desde la Cola del día, para abrir la atención.
--   El Doctor NO programa, reprograma ni cancela citas: esas facultades
--   siguen restringidas con es_admin() en programar_cita y cancelar_cita.
--
-- Impacto en RLS:
--   No se modifican políticas de la tabla citas. El cambio ocurre solo en la
--   función security definer registrar_asistencia: ahora admite es_admin()
--   o es_doctor(). El EXECUTE de la función ya estaba otorgado a authenticated.
-- =============================================================================

create or replace function public.registrar_asistencia(p_cita_id uuid, p_estado text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cita public.citas%rowtype;
begin
  if not (public.es_admin() or public.es_doctor()) then
    raise exception 'SISME: Solo el administrador o el doctor pueden registrar la asistencia.';
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

revoke all on function public.registrar_asistencia(uuid, text) from public, anon, authenticated;
grant execute on function public.registrar_asistencia(uuid, text) to authenticated;

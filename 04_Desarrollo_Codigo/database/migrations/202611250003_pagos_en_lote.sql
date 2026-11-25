-- =============================================================================
-- SISME — S7-T18: marcar varios cargos como pagados en una sola operación.
-- Se ejecuta DESPUÉS de 202611250002_version_plantilla_pacientes.sql.
--
-- Petición del PM (25/11/2026): en Cobranza seleccionar varios cargos (o todos
-- los del filtro) y marcarlos como pagados.
--
-- Diseño: registrar_pagos_lote aplica las mismas reglas de registrar_pago a
-- cada cargo, en una sola transacción (todo o nada):
--   - Solo el Administrador.
--   - Referencia y fecha obligatorias (las mismas para todo el lote).
--   - Cada cargo con saldo recibe un pago por su saldo completo y queda
--     «pagado». Los cargos ya pagados se omiten. El precio histórico no cambia.
--   - Máximo 500 cargos por lote.
-- No modifica tablas, políticas RLS ni registrar_pago.
-- =============================================================================

create or replace function public.registrar_pagos_lote(
  p_cargo_ids uuid[],
  p_referencia text,
  p_fecha date
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cargo public.cargos_detalle%rowtype;
  v_pagado numeric;
  v_saldo numeric;
  v_pagados integer := 0;
  v_omitidos integer := 0;
  v_total numeric := 0;
  v_ids uuid[];
begin
  if not public.es_admin() then
    raise exception 'SISME: Solo el administrador puede registrar pagos.';
  end if;
  if btrim(coalesce(p_referencia, '')) = '' then
    raise exception 'SISME: Capture la referencia del depósito o transferencia.';
  end if;
  if p_fecha is null then
    raise exception 'SISME: Indique la fecha del pago.';
  end if;
  select array_agg(distinct x) into v_ids from unnest(coalesce(p_cargo_ids, '{}'::uuid[])) as x where x is not null;
  if v_ids is null or array_length(v_ids, 1) is null then
    raise exception 'SISME: Seleccione al menos un cargo.';
  end if;
  if array_length(v_ids, 1) > 500 then
    raise exception 'SISME: Se pueden marcar como máximo 500 cargos a la vez.';
  end if;
  if (select count(*) from public.cargos_detalle where id = any (v_ids)) <> array_length(v_ids, 1) then
    raise exception 'SISME: Uno de los cargos seleccionados no existe.';
  end if;

  for v_cargo in
    select * from public.cargos_detalle where id = any (v_ids) order by id for update
  loop
    select coalesce(sum(monto), 0) into v_pagado from public.pagos where cargo_id = v_cargo.id;
    v_saldo := round(v_cargo.precio_historico - v_pagado, 2);
    if v_saldo <= 0.001 then
      v_omitidos := v_omitidos + 1;
      continue;
    end if;
    insert into public.pagos (cargo_id, empresa_id, monto, referencia, fecha_pago, registrado_por)
    values (v_cargo.id, v_cargo.empresa_id, v_saldo, btrim(p_referencia), p_fecha, auth.uid());
    update public.cargos_detalle set estatus_pago = 'pagado', updated_at = now() where id = v_cargo.id;
    v_pagados := v_pagados + 1;
    v_total := v_total + v_saldo;
  end loop;

  return jsonb_build_object('pagados', v_pagados, 'omitidos', v_omitidos, 'total', v_total);
end;
$$;

revoke all on function public.registrar_pagos_lote(uuid[], text, date) from public, anon, authenticated;
grant execute on function public.registrar_pagos_lote(uuid[], text, date) to authenticated;

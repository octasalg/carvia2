-- ============================================================
-- CARVÍA — Garantía de agencia para autos
-- Ejecuta este archivo completo en el SQL Editor de Supabase.
-- Es idempotente: no borra datos ni falla si ya se ejecutó antes.
-- ============================================================

begin;

alter table public.autos
  add column if not exists garantia_agencia boolean not null default false;
alter table public.autos
  add column if not exists garantia_ultimo_servicio date;
alter table public.autos
  add column if not exists garantia_proximo_servicio_fecha date;
alter table public.autos
  add column if not exists garantia_proximo_servicio_km integer;
alter table public.autos
  add column if not exists garantia_intervalo_servicio text;

-- El kilometraje del próximo servicio sólo admite valores positivos.
alter table public.autos
  drop constraint if exists autos_garantia_proximo_servicio_km_valido;
alter table public.autos
  add constraint autos_garantia_proximo_servicio_km_valido
  check (garantia_proximo_servicio_km is null or garantia_proximo_servicio_km >= 0);

-- Los detalles de garantía sólo pueden existir si el auto conserva garantía.
alter table public.autos
  drop constraint if exists autos_garantia_detalles_validos;
alter table public.autos
  add constraint autos_garantia_detalles_validos
  check (
    garantia_agencia = true
    or (
      garantia_ultimo_servicio is null
      and garantia_proximo_servicio_fecha is null
      and garantia_proximo_servicio_km is null
      and garantia_intervalo_servicio is null
    )
  );

commit;

-- Verificación rápida: deben aparecer las cinco columnas nuevas.
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'autos'
  and column_name like 'garantia%'
order by column_name;

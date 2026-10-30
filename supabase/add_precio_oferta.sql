-- ============================================================
-- CARVÍA — Precio de oferta para autos
-- Ejecuta este archivo completo en el SQL Editor de Supabase.
-- Es idempotente: no borra datos ni falla si ya se ejecutó antes.
--
-- precio         = precio de lista (obligatorio desde el panel)
-- precio_oferta  = 0 → sin oferta; > 0 y < precio → oferta activa
-- Los autos ya registrados quedan con precio_oferta = 0 (sin oferta).
-- ============================================================

begin;

alter table public.autos
  add column if not exists precio_oferta numeric not null default 0;

-- Por si la columna existía con valores nulos.
update public.autos set precio_oferta = 0 where precio_oferta is null;

-- La oferta es 0 (sin oferta) o un monto mayor que 0 y menor al precio de lista.
alter table public.autos
  drop constraint if exists autos_precio_oferta_valido;
alter table public.autos
  add constraint autos_precio_oferta_valido
  check (
    precio_oferta = 0
    or (precio_oferta > 0 and precio is not null and precio_oferta < precio)
  );

commit;

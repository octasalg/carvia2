-- Clasificación interna de vehículos para una base de datos Carvía existente.
-- Ejecuta todo este archivo una sola vez en Supabase > SQL Editor.

create table if not exists public.auto_control_interno (
  auto_id        uuid primary key references public.autos(id) on delete cascade,
  clasificacion  text not null check (
    clasificacion in ('stock_propio', 'consignacion_propia', 'aliado')
  ),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.auto_control_interno enable row level security;

-- Defensa adicional: el cliente público no tiene privilegios sobre esta tabla.
revoke all on table public.auto_control_interno from anon;
grant select, insert, update, delete on table public.auto_control_interno to authenticated;

drop policy if exists "Auth puede ver control interno de autos"
  on public.auto_control_interno;
create policy "Auth puede ver control interno de autos"
  on public.auto_control_interno for select
  to authenticated
  using (true);

drop policy if exists "Auth puede gestionar control interno de autos"
  on public.auto_control_interno;
create policy "Auth puede gestionar control interno de autos"
  on public.auto_control_interno
  for all
  to authenticated
  using (true)
  with check (true);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists auto_control_interno_updated_at
  on public.auto_control_interno;
create trigger auto_control_interno_updated_at
  before update on public.auto_control_interno
  for each row execute function public.set_updated_at();

-- Verificación rápida: debe indicar RLS habilitado (true).
select relname, relrowsecurity
from pg_class
where oid = 'public.auto_control_interno'::regclass;

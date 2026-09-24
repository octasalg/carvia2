-- ============================================================
-- CARVÍA — Clasificaciones internas personalizables
-- Ejecuta este archivo completo en el SQL Editor de Supabase.
-- Conserva las clasificaciones existentes y no expone los datos al público.
-- ============================================================

begin;

create table if not exists public.clasificaciones_internas (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  clave_legacy  text unique,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint clasificaciones_internas_nombre_valido
    check (char_length(trim(nombre)) between 1 and 80)
);

create unique index if not exists clasificaciones_internas_nombre_unico
  on public.clasificaciones_internas (lower(trim(nombre)));

insert into public.clasificaciones_internas (nombre, clave_legacy)
values
  ('Stock propio', 'stock_propio'),
  ('Consignación propia', 'consignacion_propia'),
  ('Aliado', 'aliado')
on conflict (clave_legacy) do update set nombre = excluded.nombre;

alter table public.auto_control_interno
  add column if not exists clasificacion_id uuid;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'auto_control_interno'
      and column_name = 'clasificacion'
  ) then
    execute $migration$
      update public.auto_control_interno as control
      set clasificacion_id = opciones.id
      from public.clasificaciones_internas as opciones
      where opciones.clave_legacy = control.clasificacion
        and control.clasificacion_id is null
    $migration$;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from public.auto_control_interno
    where clasificacion_id is null
  ) then
    raise exception 'Hay vehículos sin una clasificación válida. Revisa auto_control_interno antes de continuar.';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'auto_control_interno_clasificacion_id_fkey'
      and conrelid = 'public.auto_control_interno'::regclass
  ) then
    alter table public.auto_control_interno
      add constraint auto_control_interno_clasificacion_id_fkey
      foreign key (clasificacion_id)
      references public.clasificaciones_internas(id)
      on delete restrict;
  end if;
end $$;

alter table public.auto_control_interno
  alter column clasificacion_id set not null;

alter table public.auto_control_interno
  drop column if exists clasificacion;

alter table public.clasificaciones_internas enable row level security;
revoke all on table public.clasificaciones_internas from anon;
grant select, insert, update, delete on table public.clasificaciones_internas to authenticated;

drop policy if exists "Auth puede ver clasificaciones internas" on public.clasificaciones_internas;
create policy "Auth puede ver clasificaciones internas"
  on public.clasificaciones_internas for select
  to authenticated
  using (true);

drop policy if exists "Auth puede gestionar clasificaciones internas" on public.clasificaciones_internas;
create policy "Auth puede gestionar clasificaciones internas"
  on public.clasificaciones_internas
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

drop trigger if exists clasificaciones_internas_updated_at on public.clasificaciones_internas;
create trigger clasificaciones_internas_updated_at
  before update on public.clasificaciones_internas
  for each row execute function public.set_updated_at();

commit;

notify pgrst, 'reload schema';

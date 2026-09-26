-- ============================================================
-- CARVÍA — Roles y permisos del panel administrativo
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase.
-- Es idempotente: se puede volver a ejecutar sin perder datos.
-- ------------------------------------------------------------
-- Modelo:
--   · admin_profiles: 1 fila por cada usuario de auth.users que
--     puede entrar al panel. Guarda username, nombre, rol y estado.
--   · roles: 'superadmin' (administra usuarios) | 'admin' (usa el
--     portal pero NO administra usuarios).
--   · La cuenta `diego.olivas` se marca `protected = true`: no se
--     puede eliminar, desactivar ni degradar (defensa a nivel BD).
--   · Las contraseñas NUNCA viven aquí: las gestiona Supabase Auth
--     (hash bcrypt en auth.users).
-- ============================================================

-- ------------------------------------------------------------
-- TABLAS
-- ------------------------------------------------------------

create table if not exists public.admin_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text not null,
  full_name   text,
  role        text not null default 'admin' check (role in ('superadmin', 'admin')),
  active      boolean not null default true,
  protected   boolean not null default false,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint admin_profiles_username_valido
    check (char_length(trim(username)) between 3 and 40)
);

create unique index if not exists admin_profiles_username_unico
  on public.admin_profiles (lower(trim(username)));

-- Bitácora de acciones administrativas sensibles.
create table if not exists public.admin_audit_log (
  id              bigint generated always as identity primary key,
  actor_id        uuid references auth.users(id) on delete set null,
  actor_username  text,
  action          text not null,   -- create_user | activate_user | deactivate_user | reset_password
  target_id       uuid,
  target_username text,
  details         jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists admin_audit_log_created_at_idx
  on public.admin_audit_log (created_at desc);

-- ------------------------------------------------------------
-- HELPER: ¿el usuario actual es superadmin activo?
-- security definer para poder leer admin_profiles saltando RLS
-- sin exponer la tabla completa a los clientes.
-- ------------------------------------------------------------
create or replace function public.is_superadmin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.admin_profiles
    where id = auth.uid()
      and role = 'superadmin'
      and active = true
  );
$$;

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- Todas las MUTACIONES reales se hacen desde el servidor con la
-- service_role key (que salta RLS). Aquí solo se abre la LECTURA
-- mínima necesaria para el frontend.
-- ------------------------------------------------------------
alter table public.admin_profiles enable row level security;
alter table public.admin_audit_log enable row level security;

revoke all on table public.admin_profiles from anon;
revoke all on table public.admin_audit_log from anon;
grant select on table public.admin_profiles to authenticated;
grant select on table public.admin_audit_log to authenticated;

-- Cada usuario lee su propio perfil; el superadmin lee todos.
drop policy if exists "Perfil propio o superadmin" on public.admin_profiles;
create policy "Perfil propio o superadmin"
  on public.admin_profiles for select
  to authenticated
  using (id = auth.uid() or public.is_superadmin());

-- Solo el superadmin lee la bitácora.
drop policy if exists "Superadmin lee bitacora" on public.admin_audit_log;
create policy "Superadmin lee bitacora"
  on public.admin_audit_log for select
  to authenticated
  using (public.is_superadmin());

-- No se crean políticas de INSERT/UPDATE/DELETE para clientes:
-- esas operaciones solo ocurren vía service_role desde el servidor.

-- ------------------------------------------------------------
-- TRIGGER updated_at
-- (definición idempotente por si este script corre antes que schema.sql)
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists admin_profiles_updated_at on public.admin_profiles;
create trigger admin_profiles_updated_at
  before update on public.admin_profiles
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- PROTECCIÓN DE LA CUENTA FUNDADORA (defensa en profundidad)
-- Impide, incluso con la service_role key, degradar/desactivar/
-- eliminar una cuenta marcada como `protected`.
-- ------------------------------------------------------------
create or replace function public.protect_founder_account()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    if old.protected then
      raise exception 'La cuenta protegida % no puede eliminarse', old.username;
    end if;
    return old;
  end if;

  -- UPDATE
  if old.protected then
    if new.role is distinct from 'superadmin' then
      raise exception 'La cuenta protegida % no puede perder el rol superadmin', old.username;
    end if;
    if new.active = false then
      raise exception 'La cuenta protegida % no puede desactivarse', old.username;
    end if;
    if new.protected = false then
      raise exception 'No se puede quitar la protección de la cuenta %', old.username;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists admin_profiles_protect_founder on public.admin_profiles;
create trigger admin_profiles_protect_founder
  before update or delete on public.admin_profiles
  for each row execute function public.protect_founder_account();

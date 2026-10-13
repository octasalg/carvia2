-- ============================================================
-- CARVÍA — Endurecimiento de RLS (Hallazgo #1 de la revisión)
-- ------------------------------------------------------------
-- PROBLEMA: las políticas de escritura usaban `to authenticated
-- using(true)`, por lo que CUALQUIER sesión con un JWT válido del
-- proyecto Supabase (no solo un admin de Carvía) podía modificar
-- autos, settings, storage y leer los contactos (PII). La barrera
-- real era "tener cualquier cuenta en el proyecto", no "ser admin".
--
-- SOLUCIÓN: las mutaciones y las lecturas sensibles ahora exigen
-- ser un admin ACTIVO (fila en admin_profiles con active = true),
-- verificado en la base de datos vía una función security definer.
--
-- Requiere haber ejecutado antes:
--   * schema.sql
--   * admin_users_roles.sql  (crea admin_profiles e is_superadmin)
--
-- Es idempotente: se puede volver a ejecutar sin perder datos.
-- Lo que NO cambia:
--   * anon sigue viendo autos visibles y leyendo settings (hero).
--   * anon sigue pudiendo crear contactos (formulario público).
--   * update/delete de clasificaciones sigue siendo solo superadmin.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- HELPER: ¿el usuario actual es un admin ACTIVO?
-- security definer para leer admin_profiles saltando RLS sin
-- exponer la tabla. search_path fijo para evitar secuestro de
-- resolución de nombres.
-- ------------------------------------------------------------
create or replace function public.is_active_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.admin_profiles
    where id = auth.uid()
      and active = true
  );
$$;

revoke all on function public.is_active_admin() from public, anon;
grant execute on function public.is_active_admin() to authenticated;

-- ============================================================
-- AUTOS
-- ============================================================
-- Lectura: anon ve visibles (sin cambios). Admin activo ve TODOS.
drop policy if exists "Auth puede ver todos los autos" on public.autos;
create policy "Auth puede ver todos los autos"
  on public.autos for select
  to authenticated
  using (public.is_active_admin());

-- Escritura (insert/update/delete): solo admin activo.
drop policy if exists "Auth puede gestionar autos" on public.autos;
create policy "Auth puede gestionar autos"
  on public.autos for all
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

-- ============================================================
-- SETTINGS
-- ============================================================
-- Lectura pública (hero images) sin cambios. Escritura: admin activo.
drop policy if exists "Auth puede gestionar settings" on public.settings;
create policy "Auth puede gestionar settings"
  on public.settings for all
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

-- ============================================================
-- CONTACTOS  (PII: nombre, teléfono, correo)
-- ============================================================
-- Inserción anónima (formulario) sin cambios. Lectura: admin activo.
drop policy if exists "Auth puede leer contactos" on public.contactos;
create policy "Auth puede leer contactos"
  on public.contactos for select
  to authenticated
  using (public.is_active_admin());

-- ============================================================
-- CONTROL INTERNO DE AUTOS  (datos privados de inventario)
-- ============================================================
drop policy if exists "Auth puede ver control interno de autos" on public.auto_control_interno;
create policy "Auth puede ver control interno de autos"
  on public.auto_control_interno for select
  to authenticated
  using (public.is_active_admin());

drop policy if exists "Auth puede gestionar control interno de autos" on public.auto_control_interno;
create policy "Auth puede gestionar control interno de autos"
  on public.auto_control_interno for all
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

-- ============================================================
-- CLASIFICACIONES INTERNAS
-- ============================================================
-- Catálogo interno: solo admin activo lo ve. (No hay política anon,
-- así que el catálogo público nunca lo lee.)
drop policy if exists "Auth puede ver clasificaciones internas" on public.clasificaciones_internas;
create policy "Auth puede ver clasificaciones internas"
  on public.clasificaciones_internas for select
  to authenticated
  using (public.is_active_admin());

-- Elimina la política heredada "gestionar" (for all) de schema.sql
-- si aún existe: la escritura ya está separada en insert/update/delete.
drop policy if exists "Auth puede gestionar clasificaciones internas" on public.clasificaciones_internas;

-- Insertar: admin activo (antes era cualquier JWT con check(true)).
drop policy if exists "Auth puede agregar clasificaciones internas" on public.clasificaciones_internas;
create policy "Auth puede agregar clasificaciones internas"
  on public.clasificaciones_internas for insert
  to authenticated
  with check (public.is_active_admin());

-- update/delete siguen siendo exclusivos de superadmin
-- (definidos en restrict_classifications_superadmin.sql). No se tocan.

-- ============================================================
-- STORAGE  (bucket "autos")
-- ============================================================
-- Lectura pública de imágenes sin cambios. Subir/eliminar: admin activo.
drop policy if exists "Auth puede subir imágenes" on storage.objects;
create policy "Auth puede subir imágenes"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'autos' and public.is_active_admin());

drop policy if exists "Auth puede eliminar imágenes" on storage.objects;
create policy "Auth puede eliminar imágenes"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'autos' and public.is_active_admin());

commit;

notify pgrst, 'reload schema';

-- ============================================================
-- VERIFICACIÓN (opcional): revisa que las políticas de escritura
-- ya no sean permisivas. Las columnas qual/with_check deben
-- mencionar is_active_admin() (o is_superadmin() en clasif.).
-- ============================================================
select tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname in ('public', 'storage')
  and tablename in ('autos','settings','contactos','auto_control_interno','clasificaciones_internas','objects')
order by tablename, cmd, policyname;

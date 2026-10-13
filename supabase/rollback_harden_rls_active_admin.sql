-- ============================================================
-- CARVÍA — ROLLBACK de harden_rls_active_admin.sql
-- Restaura las políticas al estado previo (to authenticated
-- using(true)). Úsalo SOLO si la migración causó algún problema.
-- NOTA: esto reabre el hallazgo #1; es un salvavidas temporal.
-- ============================================================
begin;

-- AUTOS
drop policy if exists "Auth puede ver todos los autos" on public.autos;
create policy "Auth puede ver todos los autos"
  on public.autos for select to authenticated using (true);
drop policy if exists "Auth puede gestionar autos" on public.autos;
create policy "Auth puede gestionar autos"
  on public.autos for all to authenticated using (true) with check (true);

-- SETTINGS
drop policy if exists "Auth puede gestionar settings" on public.settings;
create policy "Auth puede gestionar settings"
  on public.settings for all to authenticated using (true) with check (true);

-- CONTACTOS
drop policy if exists "Auth puede leer contactos" on public.contactos;
create policy "Auth puede leer contactos"
  on public.contactos for select to authenticated using (true);

-- CONTROL INTERNO
drop policy if exists "Auth puede ver control interno de autos" on public.auto_control_interno;
create policy "Auth puede ver control interno de autos"
  on public.auto_control_interno for select to authenticated using (true);
drop policy if exists "Auth puede gestionar control interno de autos" on public.auto_control_interno;
create policy "Auth puede gestionar control interno de autos"
  on public.auto_control_interno for all to authenticated using (true) with check (true);

-- CLASIFICACIONES (vuelve el insert permisivo; update/delete siguen en superadmin)
drop policy if exists "Auth puede ver clasificaciones internas" on public.clasificaciones_internas;
create policy "Auth puede ver clasificaciones internas"
  on public.clasificaciones_internas for select to authenticated using (true);
drop policy if exists "Auth puede agregar clasificaciones internas" on public.clasificaciones_internas;
create policy "Auth puede agregar clasificaciones internas"
  on public.clasificaciones_internas for insert to authenticated with check (true);

-- STORAGE
drop policy if exists "Auth puede subir imágenes" on storage.objects;
create policy "Auth puede subir imágenes"
  on storage.objects for insert to authenticated with check (bucket_id = 'autos');
drop policy if exists "Auth puede eliminar imágenes" on storage.objects;
create policy "Auth puede eliminar imágenes"
  on storage.objects for delete to authenticated using (bucket_id = 'autos');

commit;
notify pgrst, 'reload schema';

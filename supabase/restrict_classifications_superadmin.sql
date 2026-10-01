-- ============================================================
-- CARVÍA — Clasificaciones internas: editar/eliminar solo superadmin
-- Ejecuta este archivo completo en el SQL Editor de Supabase.
-- Requiere haber ejecutado antes:
--   * add_dynamic_vehicle_classifications.sql
--   * admin_users_roles.sql (define public.is_superadmin())
--
-- Resultado:
--   * Cualquier admin autenticado puede VER y AGREGAR clasificaciones.
--   * Solo un superadmin activo puede RENOMBRAR o ELIMINAR.
--   * No se puede eliminar una clasificación con autos asignados
--     (la llave foránea es ON DELETE RESTRICT).
-- ============================================================

begin;

drop policy if exists "Auth puede gestionar clasificaciones internas" on public.clasificaciones_internas;
drop policy if exists "Auth puede agregar clasificaciones internas" on public.clasificaciones_internas;
drop policy if exists "Superadmin puede editar clasificaciones internas" on public.clasificaciones_internas;
drop policy if exists "Superadmin puede eliminar clasificaciones internas" on public.clasificaciones_internas;

create policy "Auth puede agregar clasificaciones internas"
  on public.clasificaciones_internas for insert
  to authenticated
  with check (true);

create policy "Superadmin puede editar clasificaciones internas"
  on public.clasificaciones_internas for update
  to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

create policy "Superadmin puede eliminar clasificaciones internas"
  on public.clasificaciones_internas for delete
  to authenticated
  using (public.is_superadmin());

commit;

notify pgrst, 'reload schema';

-- Verificación: deben aparecer 4 políticas (select, insert, update, delete).
select policyname, cmd
from pg_policies
where schemaname = 'public' and tablename = 'clasificaciones_internas'
order by cmd;

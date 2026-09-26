/* ============================================================
   CARVÍA — Cliente de administración de usuarios
   Llama a /api/admin/users con el JWT del superadmin. La
   autorización real la valida el servidor (roles en la BD).
   ============================================================ */
import { supabase } from "../lib/supabase";

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error("Tu sesión expiró. Inicia sesión nuevamente.");
  return { Authorization: `Bearer ${token}` };
}

async function parse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Operación no permitida");
  return payload;
}

/** Lista los usuarios administrativos (solo superadmin). */
export async function listAdminUsers() {
  const response = await fetch("/api/admin/users", { headers: await authHeader() });
  const { users } = await parse(response);
  return users || [];
}

/** Crea un usuario con rol `admin`. */
export async function createAdminUser({ username, fullName, password }) {
  const response = await fetch("/api/admin/users", {
    method: "POST",
    headers: { ...(await authHeader()), "Content-Type": "application/json" },
    body: JSON.stringify({ username, fullName, password }),
  });
  const { user } = await parse(response);
  return user;
}

/** Activa o desactiva un usuario. */
export async function setAdminUserActive(id, active) {
  const response = await fetch(`/api/admin/users?id=${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { ...(await authHeader()), "Content-Type": "application/json" },
    body: JSON.stringify({ action: active ? "activate" : "deactivate" }),
  });
  return parse(response);
}

/** Restablece la contraseña de un usuario. */
export async function resetAdminUserPassword(id, password) {
  const response = await fetch(`/api/admin/users?id=${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { ...(await authHeader()), "Content-Type": "application/json" },
    body: JSON.stringify({ action: "reset_password", password }),
  });
  return parse(response);
}

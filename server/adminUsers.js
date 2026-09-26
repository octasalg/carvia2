/* global process */
/* ============================================================
   CARVÍA — API de administración de usuarios (roles y permisos)
   ------------------------------------------------------------
   Toda la autorización se resuelve EN EL SERVIDOR:
     1. Se verifica el JWT del llamante contra Supabase Auth.
     2. Se carga su perfil (rol) desde `admin_profiles`.
     3. Las operaciones de gestión exigen rol `superadmin`.
   El frontend solo oculta botones; la seguridad vive aquí.

   Requiere SUPABASE_SERVICE_ROLE_KEY (secreta, SOLO servidor).
   Las contraseñas las hashea Supabase Auth (bcrypt); nunca se
   guardan en texto plano ni en `admin_profiles`.
   ============================================================ */

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

function jsonResponse(status, payload) {
  return { status, headers: JSON_HEADERS, body: JSON.stringify(payload) };
}

const USERNAME_RE = /^[a-z0-9._-]{3,40}$/;

function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

/** Verifica el JWT del llamante y devuelve su usuario de auth, o null. */
async function getRequestUser({ authorization, supabaseUrl, anonKey, fetchImpl }) {
  if (!authorization?.startsWith("Bearer ") || !supabaseUrl || !anonKey) return null;
  try {
    const res = await fetchImpl(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: authorization },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Lee un perfil de admin_profiles usando la service_role key (salta RLS). */
async function fetchProfile({ id, supabaseUrl, serviceKey, fetchImpl }) {
  const res = await fetchImpl(
    `${supabaseUrl}/rest/v1/admin_profiles?id=eq.${encodeURIComponent(id)}&select=*&limit=1`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
  );
  if (!res.ok) return null;
  const rows = await res.json().catch(() => []);
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function fetchProfileByUsername({ username, supabaseUrl, serviceKey, fetchImpl }) {
  const res = await fetchImpl(
    `${supabaseUrl}/rest/v1/admin_profiles?username=eq.${encodeURIComponent(username)}&select=id&limit=1`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
  );
  if (!res.ok) return null;
  const rows = await res.json().catch(() => []);
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function writeAudit({ supabaseUrl, serviceKey, fetchImpl, actor, action, target, details = {} }) {
  try {
    await fetchImpl(`${supabaseUrl}/rest/v1/admin_audit_log`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        actor_id: actor?.id ?? null,
        actor_username: actor?.username ?? null,
        action,
        target_id: target?.id ?? null,
        target_username: target?.username ?? null,
        details,
      }),
    });
  } catch {
    // La bitácora es best-effort: nunca debe tumbar la operación principal.
  }
}

/* ---------- Operaciones ---------- */

async function listUsers({ supabaseUrl, serviceKey, fetchImpl }) {
  const res = await fetchImpl(
    `${supabaseUrl}/rest/v1/admin_profiles?select=id,username,full_name,role,active,protected,created_at,created_by&order=created_at.asc`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return jsonResponse(502, { error: `No se pudo leer la lista de usuarios${detail ? `: ${detail.slice(0, 160)}` : ""}` });
  }
  const rows = await res.json().catch(() => []);
  return jsonResponse(200, { users: Array.isArray(rows) ? rows : [] });
}

async function createUser({ body, actor, env, supabaseUrl, serviceKey, fetchImpl }) {
  const username = normalizeUsername(body.username);
  const fullName = String(body.fullName || body.full_name || "").trim();
  const password = String(body.password || "");

  if (!USERNAME_RE.test(username)) {
    return jsonResponse(400, { error: "Usuario inválido: 3-40 caracteres (minúsculas, números, . _ -)" });
  }
  if (fullName.length < 2 || fullName.length > 80) {
    return jsonResponse(400, { error: "El nombre completo debe tener entre 2 y 80 caracteres" });
  }
  if (password.length < 8) {
    return jsonResponse(400, { error: "La contraseña inicial debe tener al menos 8 caracteres" });
  }

  const existing = await fetchProfileByUsername({ username, supabaseUrl, serviceKey, fetchImpl });
  if (existing) return jsonResponse(409, { error: "Ese nombre de usuario ya existe" });

  const domain = env.AUTH_EMAIL_DOMAIN || "carvia.mx";
  const email = `${username}@${domain}`;

  // 1) Crear el usuario en Supabase Auth (Supabase hashea la contraseña).
  const createRes = await fetchImpl(`${supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { username, full_name: fullName },
    }),
  });
  if (!createRes.ok) {
    const detail = await createRes.text().catch(() => "");
    if (createRes.status === 422 || /registered|exists/i.test(detail)) {
      return jsonResponse(409, { error: "Ese usuario ya está registrado" });
    }
    return jsonResponse(502, { error: `No se pudo crear el usuario en Auth${detail ? `: ${detail.slice(0, 160)}` : ""}` });
  }
  const authUser = await createRes.json();

  // 2) Crear el perfil con rol `admin`. Nunca se crea otro superadmin desde aquí.
  const profileRes = await fetchImpl(`${supabaseUrl}/rest/v1/admin_profiles`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      id: authUser.id,
      username,
      full_name: fullName,
      role: "admin",
      active: true,
      protected: false,
      created_by: actor.id,
    }),
  });
  if (!profileRes.ok) {
    // Rollback: si el perfil falla, borra el usuario de Auth para no dejar huérfanos.
    await fetchImpl(`${supabaseUrl}/auth/v1/admin/users/${authUser.id}`, {
      method: "DELETE",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    }).catch(() => {});
    const detail = await profileRes.text().catch(() => "");
    return jsonResponse(502, { error: `No se pudo crear el perfil${detail ? `: ${detail.slice(0, 160)}` : ""}` });
  }
  const created = (await profileRes.json().catch(() => []))?.[0] || null;

  await writeAudit({
    supabaseUrl, serviceKey, fetchImpl, actor, action: "create_user",
    target: { id: authUser.id, username },
    details: { full_name: fullName, role: "admin", email },
  });

  return jsonResponse(201, { user: created });
}

async function patchUser({ targetId, body, actor, supabaseUrl, serviceKey, fetchImpl }) {
  const action = String(body.action || "");
  if (!targetId) return jsonResponse(400, { error: "Falta el id del usuario" });

  const target = await fetchProfile({ id: targetId, supabaseUrl, serviceKey, fetchImpl });
  if (!target) return jsonResponse(404, { error: "Usuario no encontrado" });

  // Protección de la cuenta fundadora (req. 10). La BD también lo bloquea.
  if (target.protected) {
    return jsonResponse(403, { error: "La cuenta fundadora está protegida y no puede modificarse" });
  }
  // Nadie degrada/desactiva/resetea a otro superadmin desde esta API.
  if (target.role === "superadmin") {
    return jsonResponse(403, { error: "No se puede modificar una cuenta superadmin" });
  }

  if (action === "activate" || action === "deactivate") {
    const active = action === "activate";
    const updateRes = await fetchImpl(
      `${supabaseUrl}/rest/v1/admin_profiles?id=eq.${encodeURIComponent(targetId)}`,
      {
        method: "PATCH",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ active }),
      },
    );
    if (!updateRes.ok) {
      const detail = await updateRes.text().catch(() => "");
      return jsonResponse(502, { error: `No se pudo actualizar el estado${detail ? `: ${detail.slice(0, 160)}` : ""}` });
    }
    // Refuerzo en Auth: banear/desbanear para invalidar el acceso de inmediato.
    await fetchImpl(`${supabaseUrl}/auth/v1/admin/users/${targetId}`, {
      method: "PUT",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ban_duration: active ? "none" : "876000h" }),
    }).catch(() => {});

    await writeAudit({
      supabaseUrl, serviceKey, fetchImpl, actor,
      action: active ? "activate_user" : "deactivate_user",
      target: { id: target.id, username: target.username },
    });
    return jsonResponse(200, { ok: true });
  }

  if (action === "reset_password") {
    const password = String(body.password || "");
    if (password.length < 8) {
      return jsonResponse(400, { error: "La nueva contraseña debe tener al menos 8 caracteres" });
    }
    const res = await fetchImpl(`${supabaseUrl}/auth/v1/admin/users/${targetId}`, {
      method: "PUT",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return jsonResponse(502, { error: `No se pudo restablecer la contraseña${detail ? `: ${detail.slice(0, 160)}` : ""}` });
    }
    await writeAudit({
      supabaseUrl, serviceKey, fetchImpl, actor,
      action: "reset_password",
      target: { id: target.id, username: target.username },
    });
    return jsonResponse(200, { ok: true });
  }

  return jsonResponse(400, { error: "Acción no reconocida" });
}

/* ---------- Punto de entrada ---------- */

export async function createAdminUsersResponse({
  method,
  requestUrl,
  authorization,
  body = "",
  env = process.env,
  fetchImpl = fetch,
}) {
  const supabaseUrl = String(env.SUPABASE_URL || env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
  const anonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || "";
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!supabaseUrl || !anonKey) return jsonResponse(503, { error: "Supabase no está configurado" });
  if (!serviceKey) return jsonResponse(503, { error: "La administración de usuarios no está configurada (falta SUPABASE_SERVICE_ROLE_KEY)" });

  // 1) Autenticación
  const authUser = await getRequestUser({ authorization, supabaseUrl, anonKey, fetchImpl });
  if (!authUser?.id) return jsonResponse(401, { error: "Sesión inválida" });

  // 2) Autorización: debe existir un perfil, estar activo y ser superadmin.
  const profile = await fetchProfile({ id: authUser.id, supabaseUrl, serviceKey, fetchImpl });
  if (!profile) return jsonResponse(403, { error: "No tienes un perfil administrativo" });
  if (!profile.active) return jsonResponse(403, { error: "Tu cuenta está desactivada" });
  if (profile.role !== "superadmin") {
    return jsonResponse(403, { error: "Se requiere rol superadmin para administrar usuarios" });
  }

  const actor = { id: profile.id, username: profile.username };
  const url = new URL(requestUrl);

  let parsedBody = {};
  if (body) {
    try { parsedBody = JSON.parse(body); }
    catch { return jsonResponse(400, { error: "Cuerpo JSON inválido" }); }
  }

  const ctx = { supabaseUrl, serviceKey, anonKey, fetchImpl, env };

  if (method === "GET") return listUsers(ctx);
  if (method === "POST") return createUser({ ...ctx, body: parsedBody, actor });
  if (method === "PATCH") {
    return patchUser({ ...ctx, targetId: url.searchParams.get("id"), body: parsedBody, actor });
  }
  return jsonResponse(405, { error: "Método no permitido" });
}

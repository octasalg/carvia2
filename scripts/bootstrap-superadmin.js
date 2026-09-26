/* global process */
/* ============================================================
   CARVÍA — Alta ÚNICA de la cuenta superadmin fundadora.
   ------------------------------------------------------------
   Crea (o repara) al usuario `diego.olivas` como `superadmin`
   protegido. Se ejecuta UNA sola vez, en local, con la
   service_role key. NO se despliega ni se llama desde la web.

   Uso (PowerShell):
     $env:SUPABASE_URL="https://xxxx.supabase.co"
     $env:SUPABASE_SERVICE_ROLE_KEY="eyJ..."   # service_role (secreta)
     $env:SUPERADMIN_USERNAME="diego.olivas"    # opcional
     $env:SUPERADMIN_PASSWORD="ContraseñaFuerte123"
     $env:AUTH_EMAIL_DOMAIN="carvia.mx"         # opcional
     node scripts/bootstrap-superadmin.js
   ============================================================ */

const SUPABASE_URL = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const USERNAME = String(process.env.SUPERADMIN_USERNAME || "diego.olivas").trim().toLowerCase();
const PASSWORD = process.env.SUPERADMIN_PASSWORD || "";
const DOMAIN = process.env.AUTH_EMAIL_DOMAIN || "carvia.mx";
const EMAIL = `${USERNAME}@${DOMAIN}`;

function die(msg) {
  console.error(`\n[bootstrap] ERROR: ${msg}\n`);
  process.exit(1);
}

if (!SUPABASE_URL) die("Falta SUPABASE_URL.");
if (!SERVICE_KEY) die("Falta SUPABASE_SERVICE_ROLE_KEY.");
if (PASSWORD.length < 8) die("Define SUPERADMIN_PASSWORD (mínimo 8 caracteres).");

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

async function findAuthUserByEmail() {
  // El Admin API permite filtrar por email.
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(EMAIL)}`, { headers });
  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  const list = data.users || data || [];
  return Array.isArray(list) ? list.find((u) => u.email === EMAIL) || null : null;
}

async function main() {
  console.log(`[bootstrap] Cuenta fundadora: ${USERNAME} <${EMAIL}>`);

  let authUser = await findAuthUserByEmail();

  if (!authUser) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        email: EMAIL,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { username: USERNAME, full_name: "Diego Olivas" },
      }),
    });
    if (!res.ok) die(`No se pudo crear el usuario en Auth: ${await res.text()}`);
    authUser = await res.json();
    console.log(`[bootstrap] Usuario de Auth creado: ${authUser.id}`);
  } else {
    // Ya existía: reajusta la contraseña por si acaso.
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${authUser.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ password: PASSWORD, ban_duration: "none" }),
    });
    console.log(`[bootstrap] Usuario de Auth ya existía: ${authUser.id} (contraseña actualizada)`);
  }

  // Upsert del perfil superadmin protegido.
  const res = await fetch(`${SUPABASE_URL}/rest/v1/admin_profiles?on_conflict=id`, {
    method: "POST",
    headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      id: authUser.id,
      username: USERNAME,
      full_name: "Diego Olivas",
      role: "superadmin",
      active: true,
      protected: true,
    }),
  });
  if (!res.ok) die(`No se pudo crear el perfil superadmin: ${await res.text()}`);

  console.log(`\n[bootstrap] ✅ Listo. ${USERNAME} es superadmin protegido.`);
  console.log(`[bootstrap]    Login: usuario "${USERNAME}" + la contraseña que definiste.\n`);
}

main().catch((e) => die(e.message));

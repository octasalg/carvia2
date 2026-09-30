/* ============================================================
   CARVÍA — Envío de leads a HubSpot (Forms API v3)
   ------------------------------------------------------------
   Cada envío del formulario de contacto se manda a un formulario
   de HubSpot. HubSpot crea o actualiza el contacto y lo registra
   como envío de formulario (notificaciones, flujos, etc.).

   El endpoint NO requiere token: solo el Hub ID (portal) y el ID
   del formulario, ambos datos públicos. Por eso puede llamarse
   directo desde el navegador.
   Docs: https://developers.hubspot.com/docs/api-reference/legacy/marketing/forms/v3-legacy/submit-data-unauthenticated
   ============================================================ */

const env = import.meta.env ?? {};

export const PORTAL_ID = String(env.VITE_HUBSPOT_PORTAL_ID || "").trim();
export const FORM_ID = String(env.VITE_HUBSPOT_FORM_ID || "").trim();
/** Nombre interno de la propiedad de contacto "Auto de interés". */
export const AUTO_FIELD = String(env.VITE_HUBSPOT_AUTO_FIELD || "auto_de_interes").trim();

export const isConfigured = !!(PORTAL_ID && FORM_ID);

const CONTACT_OBJECT = "0-1";

function clean(value) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

/** Lee la cookie de seguimiento de HubSpot (si el script de tracking está instalado). */
function readHubspotCookie() {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)hubspotutk=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

/**
 * Arma el cuerpo de la petición a HubSpot. Los campos vacíos se omiten
 * para que HubSpot no rechace, por ejemplo, un correo vacío.
 */
export function buildHubspotSubmission(
  { nombre, telefono, correo, autoInteres, mensaje },
  { autoField = AUTO_FIELD, hutk = "", pageUri = "", pageName = "" } = {},
) {
  const fields = [
    ["firstname", nombre],
    ["phone", telefono],
    ["email", correo],
    ["message", mensaje],
    [autoField, autoInteres],
  ]
    .map(([name, value]) => ({ objectTypeId: CONTACT_OBJECT, name, value: clean(value) }))
    .filter((field) => field.name && field.value);

  const context = {};
  if (hutk) context.hutk = hutk;
  if (pageUri) context.pageUri = pageUri;
  if (pageName) context.pageName = pageName;

  return Object.keys(context).length ? { fields, context } : { fields };
}

/**
 * Envía el lead a HubSpot. Nunca lanza excepción: devuelve { error }
 * si algo falla, para no interrumpir el correo ni el guardado en Supabase.
 */
export async function sendHubspotLead(data) {
  if (!isConfigured) {
    console.info("[HubSpot] No configurado. Lead no enviado:", { nombre: data?.nombre });
    return { status: "demo", error: null };
  }

  const body = buildHubspotSubmission(data, {
    hutk: readHubspotCookie(),
    pageUri: typeof window !== "undefined" ? window.location.href : "",
    pageName: typeof document !== "undefined" ? document.title : "",
  });

  try {
    const res = await fetch(
      `https://api.hsforms.com/submissions/v3/integration/submit/${encodeURIComponent(PORTAL_ID)}/${encodeURIComponent(FORM_ID)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      const detail = await res.json().catch(() => null);
      console.warn("[HubSpot] Envío rechazado:", res.status, detail);
      return { error: detail || { status: res.status } };
    }
    return { status: "ok", error: null };
  } catch (error) {
    console.warn("[HubSpot] Error de red:", error);
    return { error };
  }
}

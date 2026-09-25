/* global process */
import { createHash } from "node:crypto";

const ALLOWED_EVENTS = new Set(["PageView", "ViewContent", "Contact", "Lead"]);
const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

function response(status, body) {
  return { status, headers: JSON_HEADERS, body: JSON.stringify(body) };
}

function text(value, maxLength = 500) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeEmail(value) {
  return text(value, 320).toLowerCase();
}

function normalizePhone(value) {
  const digits = text(value, 40).replace(/\D/g, "");
  return digits.length === 10 ? `52${digits}` : digits;
}

function normalizeName(value) {
  return text(value, 100).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "");
}

function hashed(value, normalizer) {
  const normalized = normalizer(value);
  return normalized ? [sha256(normalized)] : undefined;
}

function parseCookies(cookieHeader = "") {
  return String(cookieHeader).split(";").reduce((cookies, part) => {
    const separator = part.indexOf("=");
    if (separator < 0) return cookies;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
    return cookies;
  }, {});
}

function getClientIp(headers = {}) {
  return text(headers["x-forwarded-for"] || headers["x-real-ip"], 100).split(",")[0].trim();
}

function sanitizeCustomData(input = {}) {
  const output = {};
  const stringFields = ["content_type", "content_name", "currency", "make", "model", "contact_method", "contact_context"];
  for (const field of stringFields) {
    const value = text(input[field], 250);
    if (value) output[field] = value;
  }
  const year = Number(input.year);
  if (Number.isInteger(year) && year >= 1900 && year <= 2100) output.year = year;
  const value = Number(input.value);
  if (Number.isFinite(value) && value >= 0) output.value = value;
  if (Array.isArray(input.content_ids)) {
    const ids = input.content_ids.map((id) => text(id, 200)).filter(Boolean).slice(0, 20);
    if (ids.length) output.content_ids = ids;
  }
  return output;
}

function buildUserData(headers, input = {}) {
  const cookies = parseCookies(headers.cookie);
  const fullName = text(input.name, 200).split(/\s+/).filter(Boolean);
  const userData = {
    client_ip_address: getClientIp(headers),
    client_user_agent: text(headers["user-agent"], 1000),
    fbp: text(cookies._fbp, 250),
    fbc: text(cookies._fbc, 250),
    em: hashed(input.email, normalizeEmail),
    ph: hashed(input.phone, normalizePhone),
    fn: hashed(fullName[0], normalizeName),
    ln: hashed(fullName.slice(1).join(""), normalizeName),
  };
  return Object.fromEntries(Object.entries(userData).filter(([, value]) => value && (!Array.isArray(value) || value.length)));
}

export async function createMetaConversionsResponse({
  method = "POST",
  body,
  headers = {},
  env = process.env,
  fetchImpl = fetch,
} = {}) {
  if (method !== "POST") return response(405, { ok: false, error: "method_not_allowed" });

  const pixelId = text(env.META_PIXEL_ID || env.VITE_META_PIXEL_ID, 50);
  const accessToken = text(env.META_CONVERSIONS_ACCESS_TOKEN, 2000);
  if (!pixelId || !accessToken) return response(503, { ok: false, error: "meta_conversions_not_configured" });

  let payload;
  try {
    payload = typeof body === "string" ? JSON.parse(body) : body;
  } catch {
    return response(400, { ok: false, error: "invalid_json" });
  }

  const eventName = text(payload?.eventName, 50);
  const eventId = text(payload?.eventId, 200);
  const eventSourceUrl = text(payload?.eventSourceUrl, 2048);
  if (!ALLOWED_EVENTS.has(eventName) || !eventId || !/^https?:\/\//i.test(eventSourceUrl)) {
    return response(400, { ok: false, error: "invalid_event" });
  }

  const event = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    event_source_url: eventSourceUrl,
    action_source: "website",
    user_data: buildUserData(headers, payload.userData),
    custom_data: sanitizeCustomData(payload.customData),
  };
  const graphVersion = text(env.META_GRAPH_API_VERSION, 20) || "v23.0";
  const graphBody = { data: [event] };
  const testEventCode = text(env.META_TEST_EVENT_CODE, 100);
  if (testEventCode) graphBody.test_event_code = testEventCode;

  try {
    const graphResponse = await fetchImpl(`https://graph.facebook.com/${graphVersion}/${encodeURIComponent(pixelId)}/events`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(graphBody),
    });
    const graphResult = await graphResponse.json().catch(() => ({}));
    if (!graphResponse.ok) {
      console.error("[Meta CAPI] Evento rechazado:", graphResult?.error?.message || graphResponse.status);
      return response(502, { ok: false, error: "meta_event_rejected" });
    }
    return response(200, { ok: true, eventsReceived: graphResult.events_received ?? 1 });
  } catch (error) {
    console.error("[Meta CAPI] No se pudo enviar el evento:", error?.message || error);
    return response(502, { ok: false, error: "meta_unavailable" });
  }
}

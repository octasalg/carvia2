import { getMetaVehicleId } from "./vehicleFeed.js";

const META_CONVERSIONS_ENDPOINT = "/api/meta/conversions";

function createEventId(eventName) {
  const uuid = globalThis.crypto?.randomUUID?.()
    || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `carvia-${String(eventName).toLowerCase()}-${uuid}`;
}

function getVehicleParameters(vehicle) {
  const id = getMetaVehicleId(vehicle);
  const price = Number(vehicle?.precio ?? vehicle?.price);
  const year = Number(vehicle?.anio ?? vehicle?.year);
  const make = String(vehicle?.marca ?? vehicle?.make ?? "").trim();
  const model = String(vehicle?.modelo ?? vehicle?.model ?? "").trim();

  return {
    ...(id ? { content_type: "vehicle", content_ids: [id] } : {}),
    ...(make || model ? { content_name: [make, model, Number.isInteger(year) ? year : ""].filter(Boolean).join(" ") } : {}),
    ...(make ? { make } : {}),
    ...(model ? { model } : {}),
    ...(Number.isInteger(year) ? { year } : {}),
    ...(Number.isFinite(price) && price > 0 ? { value: price, currency: "MXN" } : {}),
  };
}

function sendServerEvent(eventName, eventId, customData, userData) {
  if (typeof window === "undefined" || typeof window.fetch !== "function") return;

  window.fetch(META_CONVERSIONS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    keepalive: true,
    body: JSON.stringify({
      eventName,
      eventId,
      eventSourceUrl: window.location.href,
      customData,
      userData,
    }),
  }).catch(() => {
    // La medición nunca debe interrumpir la navegación o el envío del formulario.
  });
}

export function trackMetaEvent(eventName, customData = {}, userData = {}) {
  if (typeof window === "undefined") return false;

  const eventId = createEventId(eventName);
  if (typeof window.fbq === "function") {
    window.fbq("track", eventName, customData, { eventID: eventId });
  }
  sendServerEvent(eventName, eventId, customData, userData);
  return eventId;
}

export function trackMetaPageView(locationKey) {
  if (typeof window === "undefined") return false;
  const key = String(locationKey || `${window.location.pathname}${window.location.search}`);
  if (window.__carviaMetaLastPageView === key) return false;
  window.__carviaMetaLastPageView = key;
  return Boolean(trackMetaEvent("PageView"));
}

export function trackMetaViewContent(vehicle, navigationKey) {
  if (typeof window === "undefined") return false;
  const id = getMetaVehicleId(vehicle);
  if (!id) return false;

  const visitKey = `${navigationKey || window.history.state?.key || window.location.pathname}:${id}`;
  window.__carviaMetaTrackedVehicleVisits ||= new Set();
  if (window.__carviaMetaTrackedVehicleVisits.has(visitKey)) return false;

  window.__carviaMetaTrackedVehicleVisits.add(visitKey);
  return Boolean(trackMetaEvent("ViewContent", getVehicleParameters(vehicle)));
}

export function trackMetaContact(vehicle = null, context = "whatsapp") {
  return Boolean(trackMetaEvent("Contact", {
    ...getVehicleParameters(vehicle),
    contact_method: "whatsapp",
    contact_context: context,
  }));
}

export function trackMetaLead(parameters = {}, userData = {}) {
  return Boolean(trackMetaEvent("Lead", parameters, userData));
}

export { getVehicleParameters };

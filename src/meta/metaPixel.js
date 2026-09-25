import { getMetaVehicleId } from "./vehicleFeed.js";

export function trackMetaPageView(locationKey) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return false;
  const key = String(locationKey || `${window.location.pathname}${window.location.search}`);
  if (window.__carviaMetaLastPageView === key) return false;
  window.fbq("track", "PageView");
  window.__carviaMetaLastPageView = key;
  return true;
}

export function trackMetaViewContent(vehicle, navigationKey) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return false;
  const id = getMetaVehicleId(vehicle);
  if (!id) return false;

  const visitKey = `${navigationKey || window.history.state?.key || window.location.pathname}:${id}`;
  window.__carviaMetaTrackedVehicleVisits ||= new Set();
  if (window.__carviaMetaTrackedVehicleVisits.has(visitKey)) return false;

  window.fbq("track", "ViewContent", {
    content_type: "vehicle",
    content_ids: [id],
  });
  window.__carviaMetaTrackedVehicleVisits.add(visitKey);
  return true;
}

// Preparado para formularios futuros; no se dispara automáticamente.
export function trackMetaLead(parameters = {}) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return false;
  window.fbq("track", "Lead", parameters);
  return true;
}

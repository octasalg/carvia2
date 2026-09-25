/* global process, Buffer */
import { timingSafeEqual } from "node:crypto";
import {
  getMetaVehicleId,
  getPublishableMetaVehicles,
  serializeMetaVehicleOfferCsv,
  serializeMetaVehicleOfferXml,
} from "../src/meta/vehicleFeed.js";

const META_SELECT_FIELDS = [
  "id", "marca", "modelo", "version", "anio", "precio", "kilometraje",
  "transmision", "tipo", "color_exterior", "color_interior", "descripcion",
  "imagenes", "destacado", "visible", "vendido", "proximamente",
].join(",");

function secureTokenEquals(received, expected) {
  const receivedBuffer = Buffer.from(String(received || ""));
  const expectedBuffer = Buffer.from(String(expected || ""));
  return receivedBuffer.length === expectedBuffer.length
    && receivedBuffer.length > 0
    && timingSafeEqual(receivedBuffer, expectedBuffer);
}

function jsonError(status, message) {
  return {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify({ error: message }),
  };
}

export async function fetchPublishedVehicles({ supabaseUrl, supabaseKey, fetchImpl = fetch }) {
  if (!supabaseUrl || !supabaseKey) throw new Error("Falta la configuración de Supabase");
  const endpoint = `${String(supabaseUrl).replace(/\/+$/, "")}/rest/v1/autos?visible=eq.true&select=${encodeURIComponent(META_SELECT_FIELDS)}&order=created_at.desc`;
  const response = await fetchImpl(endpoint, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Supabase respondió ${response.status}${details ? `: ${details.slice(0, 200)}` : ""}`);
  }
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

export async function createMetaVehicleFeedResponse({
  requestUrl,
  format = "csv",
  env = process.env,
  fetchImpl = fetch,
  logger = console,
}) {
  const token = env.META_CATALOG_FEED_TOKEN || "";
  if (!token) return jsonError(503, "El feed no está configurado");

  const url = new URL(requestUrl, env.PUBLIC_BASE_URL || "http://localhost");
  if (!secureTokenEquals(url.searchParams.get("token"), token)) {
    return jsonError(403, "Token inválido");
  }

  const publicBaseUrl = String(env.PUBLIC_BASE_URL || url.origin).replace(/\/+$/, "");
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL || "";
  const supabaseKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || "";

  try {
    const vehicles = await fetchPublishedVehicles({ supabaseUrl, supabaseKey, fetchImpl });
    const publishable = getPublishableMetaVehicles(
      vehicles,
      { publicBaseUrl },
      (vehicle, errors) => logger.warn?.("[meta-feed] Vehículo omitido", {
        id: getMetaVehicleId(vehicle) || "sin-id",
        errors,
      }),
    );

    if (format === "xml") {
      return {
        status: 200,
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Content-Disposition": 'inline; filename="meta-vehicles.xml"',
          "Cache-Control": "no-store, max-age=0",
        },
        body: serializeMetaVehicleOfferXml(publishable),
      };
    }

    return {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'inline; filename="meta-vehicles.csv"',
        "Cache-Control": "no-store, max-age=0",
      },
      body: serializeMetaVehicleOfferCsv(publishable.map(({ row }) => row)),
    };
  } catch (error) {
    logger.error?.("[meta-feed] Error generando el feed", error);
    return jsonError(502, "No fue posible generar el feed");
  }
}

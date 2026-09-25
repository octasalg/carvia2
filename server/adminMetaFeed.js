/* global process */
import { createMetaVehicleFeedResponse } from "./metaVehicleFeed.js";

function jsonResponse(status, payload) {
  return {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(payload),
  };
}

async function isAuthenticatedAdmin({ authorization, supabaseUrl, supabaseKey, fetchImpl }) {
  if (!authorization?.startsWith("Bearer ") || !supabaseUrl || !supabaseKey) return false;
  try {
    const response = await fetchImpl(`${String(supabaseUrl).replace(/\/+$/, "")}/auth/v1/user`, {
      headers: {
        apikey: supabaseKey,
        Authorization: authorization,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function createAdminMetaFeedResponse({
  requestUrl,
  authorization,
  env = process.env,
  fetchImpl = fetch,
  logger = console,
}) {
  const publicBaseUrl = String(env.PUBLIC_BASE_URL || new URL(requestUrl).origin).replace(/\/+$/, "");
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL || "";
  const supabaseKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || "";
  const token = env.META_CATALOG_FEED_TOKEN || "";

  const authenticated = await isAuthenticatedAdmin({
    authorization,
    supabaseUrl,
    supabaseKey,
    fetchImpl,
  });
  if (!authenticated) return jsonResponse(401, { error: "Sesión administrativa inválida" });
  if (!token) return jsonResponse(503, { error: "El feed de Meta no está configurado" });

  const url = new URL(requestUrl);
  const feedUrl = new URL("/feeds/meta/vehicles.csv", `${publicBaseUrl}/`);
  feedUrl.searchParams.set("token", token);

  if (url.searchParams.get("action") === "download") {
    return createMetaVehicleFeedResponse({
      requestUrl: feedUrl.href,
      format: "csv",
      env: { ...env, PUBLIC_BASE_URL: publicBaseUrl },
      fetchImpl,
      logger,
    });
  }

  return jsonResponse(200, { csvUrl: feedUrl.href });
}

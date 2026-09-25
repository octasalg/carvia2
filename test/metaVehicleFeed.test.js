import test from "node:test";
import assert from "node:assert/strict";
import {
  escapeCsvValue,
  getMetaVehicleId,
  getPublishableMetaVehicles,
  getVehicleDetailUrl,
  getVehiclePublicImageUrls,
  mapVehicleToMetaFeed,
  serializeMetaVehicleOfferCsv,
  validateMetaFeedVehicle,
} from "../src/meta/vehicleFeed.js";
import { trackMetaViewContent } from "../src/meta/metaPixel.js";
import { createMetaVehicleFeedResponse } from "../server/metaVehicleFeed.js";
import { createAdminMetaFeedResponse } from "../server/adminMetaFeed.js";
import { createMetaConversionsResponse } from "../server/metaConversions.js";

const BASE_URL = "https://carvia.example";
const vehicle = {
  id: "7f29b797-cc8b-4c83-aeb8-6473c6bc1a2f",
  marca: "Mazda",
  modelo: "CX-5",
  version: "Signature",
  anio: 2024,
  precio: 629900,
  kilometraje: 12500,
  transmision: "Automática",
  tipo: "SUV",
  color_exterior: "Rojo",
  color_interior: "Negro",
  descripcion: "Una SUV, cómoda y \"premium\".\nLista para entrega.",
  imagenes: ["/images/cx5.jpg", "https://cdn.example/cx5-side.jpg", "/images/cx5.jpg"],
  visible: true,
  vendido: false,
  proximamente: false,
};

test("genera un identificador estable sin depender de campos editables", () => {
  assert.equal(getMetaVehicleId(vehicle), vehicle.id);
  assert.equal(getMetaVehicleId({ ...vehicle, precio: 1, descripcion: "Otra" }), vehicle.id);
});

test("mapea un vehículo al formato Vehicle Offer", () => {
  const { row } = mapVehicleToMetaFeed(vehicle, { publicBaseUrl: BASE_URL });
  assert.equal(row.title, "2024 Mazda CX-5 Signature");
  assert.equal(row.availability, "AVAILABLE");
  assert.equal(row.price, "629900.00 MXN");
  assert.equal(row.amount_price, "629900.00 MXN");
  assert.equal(row.offer_type, "cash");
  assert.equal(row.vehicle_offer_id, vehicle.id);
  assert.equal(row.make, "Mazda");
  assert.equal(row.transmission, "AUTOMATIC");
});

test("construye la URL real de la ficha del vehículo", () => {
  assert.equal(getVehicleDetailUrl(vehicle, BASE_URL), `${BASE_URL}/auto/${vehicle.id}`);
});

test("genera una URL absoluta para la imagen principal", () => {
  assert.equal(getVehiclePublicImageUrls(vehicle, BASE_URL)[0], `${BASE_URL}/images/cx5.jpg`);
});

test("conserva múltiples imágenes válidas y elimina duplicados", () => {
  assert.deepEqual(getVehiclePublicImageUrls(vehicle, BASE_URL), [
    `${BASE_URL}/images/cx5.jpg`,
    "https://cdn.example/cx5-side.jpg",
  ]);
});

test("escapa correctamente comillas, comas y saltos de línea en CSV", () => {
  assert.equal(escapeCsvValue('Cómodo, "premium"\nNuevo'), '"Cómodo, ""premium""\nNuevo"');
});

test("conserva caracteres especiales en un vehículo serializado", () => {
  const { row } = mapVehicleToMetaFeed(vehicle, { publicBaseUrl: BASE_URL });
  const csv = serializeMetaVehicleOfferCsv([row]);
  assert.match(csv, /"Una SUV, cómoda y ""premium""\. Lista para entrega\."/);
});

test("omite de forma segura un vehículo sin imagen pública", () => {
  const result = validateMetaFeedVehicle({ ...vehicle, imagenes: [] }, { publicBaseUrl: BASE_URL });
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("imagen pública faltante"));
});

test("el endpoint rechaza un token incorrecto", async () => {
  const response = await createMetaVehicleFeedResponse({
    requestUrl: `${BASE_URL}/feeds/meta/vehicles.csv?token=incorrecto`,
    env: { META_CATALOG_FEED_TOKEN: "correcto", PUBLIC_BASE_URL: BASE_URL },
  });
  assert.equal(response.status, 403);
});

test("el endpoint entrega CSV con un token correcto", async () => {
  const response = await createMetaVehicleFeedResponse({
    requestUrl: `${BASE_URL}/feeds/meta/vehicles.csv?token=correcto`,
    env: {
      META_CATALOG_FEED_TOKEN: "correcto",
      PUBLIC_BASE_URL: BASE_URL,
      SUPABASE_URL: "https://database.example",
      SUPABASE_ANON_KEY: "public-key",
    },
    fetchImpl: async () => ({ ok: true, json: async () => [vehicle] }),
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers["Content-Type"], "text/csv; charset=utf-8");
  assert.match(response.body, new RegExp(vehicle.id));
});

test("solo publica vehículos visibles y disponibles", () => {
  const rows = getPublishableMetaVehicles([
    vehicle,
    { ...vehicle, id: "sold", vendido: true },
    { ...vehicle, id: "hidden", visible: false },
    { ...vehicle, id: "coming", proximamente: true },
  ], { publicBaseUrl: BASE_URL });
  assert.deepEqual(rows.map(({ row }) => row.vehicle_offer_id), [vehicle.id]);
});

test("Pixel ViewContent usa exactamente el mismo ID del feed y no duplica la visita", () => {
  const calls = [];
  globalThis.window = {
    fbq: (...args) => calls.push(args),
    history: { state: { key: "visit-1" } },
    location: { pathname: `/auto/${vehicle.id}` },
  };
  assert.equal(trackMetaViewContent(vehicle, "visit-1"), true);
  assert.equal(trackMetaViewContent(vehicle, "visit-1"), false);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0][2].content_ids, [getMetaVehicleId(vehicle)]);
  delete globalThis.window;
});

test("Pixel y CAPI comparten event_id y ViewContent incluye los datos del vehículo", () => {
  const pixelCalls = [];
  const serverCalls = [];
  globalThis.window = {
    fbq: (...args) => pixelCalls.push(args),
    fetch: (_url, options) => {
      serverCalls.push(JSON.parse(options.body));
      return Promise.resolve({ ok: true });
    },
    history: { state: { key: "visit-capi" } },
    location: { pathname: `/auto/${vehicle.id}`, href: `${BASE_URL}/auto/${vehicle.id}` },
  };

  assert.equal(trackMetaViewContent(vehicle, "visit-capi"), true);
  assert.equal(pixelCalls[0][3].eventID, serverCalls[0].eventId);
  assert.deepEqual(serverCalls[0].customData.content_ids, [vehicle.id]);
  assert.equal(serverCalls[0].customData.make, "Mazda");
  assert.equal(serverCalls[0].customData.model, "CX-5");
  assert.equal(serverCalls[0].customData.year, 2024);
  assert.equal(serverCalls[0].customData.value, 629900);
  assert.equal(serverCalls[0].customData.currency, "MXN");
  delete globalThis.window;
});

test("CAPI envía el evento a Meta, conserva event_id y cifra los datos del lead", async () => {
  let graphRequest;
  const capiResponse = await createMetaConversionsResponse({
    body: {
      eventName: "Lead",
      eventId: "carvia-lead-test-1",
      eventSourceUrl: `${BASE_URL}/auto/${vehicle.id}`,
      customData: { content_ids: [vehicle.id], value: 629900, currency: "MXN" },
      userData: { name: "María López", email: "MARIA@example.com", phone: "614 123 4567" },
    },
    headers: {
      "user-agent": "Test browser",
      "x-forwarded-for": "203.0.113.8",
      cookie: "_fbp=fb.1.123.456; _fbc=fb.1.123.click",
    },
    env: {
      META_PIXEL_ID: "920694894141920",
      META_CONVERSIONS_ACCESS_TOKEN: "private-token",
      META_TEST_EVENT_CODE: "TEST123",
    },
    fetchImpl: async (url, options) => {
      graphRequest = { url, options, body: JSON.parse(options.body) };
      return { ok: true, json: async () => ({ events_received: 1 }) };
    },
  });

  assert.equal(capiResponse.status, 200);
  assert.match(graphRequest.url, /920694894141920\/events$/);
  assert.equal(graphRequest.options.headers.Authorization, "Bearer private-token");
  assert.equal(graphRequest.body.test_event_code, "TEST123");
  const event = graphRequest.body.data[0];
  assert.equal(event.event_id, "carvia-lead-test-1");
  assert.equal(event.event_name, "Lead");
  assert.equal(event.action_source, "website");
  assert.equal(event.custom_data.currency, "MXN");
  assert.equal(event.user_data.client_ip_address, "203.0.113.8");
  assert.equal(event.user_data.em[0].length, 64);
  assert.doesNotMatch(JSON.stringify(event.user_data), /MARIA|example\.com|614 123 4567/i);
});

test("el endpoint administrativo no revela la URL sin una sesión válida", async () => {
  const response = await createAdminMetaFeedResponse({
    requestUrl: `${BASE_URL}/api/admin/meta-feed?action=url`,
    authorization: "",
    env: {
      META_CATALOG_FEED_TOKEN: "secreto",
      PUBLIC_BASE_URL: BASE_URL,
      SUPABASE_URL: "https://database.example",
      SUPABASE_ANON_KEY: "public-key",
    },
  });
  assert.equal(response.status, 401);
  assert.doesNotMatch(response.body, /secreto/);
});

test("un administrador autenticado puede obtener la URL protegida", async () => {
  const response = await createAdminMetaFeedResponse({
    requestUrl: `${BASE_URL}/api/admin/meta-feed?action=url`,
    authorization: "Bearer valid-session",
    env: {
      META_CATALOG_FEED_TOKEN: "secreto",
      PUBLIC_BASE_URL: BASE_URL,
      SUPABASE_URL: "https://database.example",
      SUPABASE_ANON_KEY: "public-key",
    },
    fetchImpl: async () => ({ ok: true }),
  });
  assert.equal(response.status, 200);
  assert.equal(JSON.parse(response.body).csvUrl, `${BASE_URL}/feeds/meta/vehicles.csv?token=secreto`);
});

test("la descarga administrativa incluye UTF-8 BOM para conservar acentos en Excel", async () => {
  let requestNumber = 0;
  const response = await createAdminMetaFeedResponse({
    requestUrl: `${BASE_URL}/api/admin/meta-feed?action=download`,
    authorization: "Bearer valid-session",
    env: {
      META_CATALOG_FEED_TOKEN: "secreto",
      PUBLIC_BASE_URL: BASE_URL,
      SUPABASE_URL: "https://database.example",
      SUPABASE_ANON_KEY: "public-key",
    },
    fetchImpl: async () => {
      requestNumber += 1;
      return requestNumber === 1
        ? { ok: true }
        : { ok: true, json: async () => [vehicle] };
    },
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.charCodeAt(0), 0xFEFF);
  assert.match(response.body, /Automática|Certificado x Carvía|cómoda/);
  assert.match(response.headers["Content-Disposition"], /^attachment;/);
});

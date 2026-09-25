export const META_VEHICLE_OFFER_COLUMNS = Object.freeze([
  "title", "availability", "price", "offer_disclaimer", "offer_disclaimer_url",
  "image[0].url", "image[0].tag[0]", "video[0].url", "video[0].tag[0]",
  "vehicle_offer_id", "offer_description", "url",
  "custom_label_0", "custom_label_1", "custom_label_2", "custom_label_3", "custom_label_4",
  "custom_number_0", "custom_number_1", "custom_number_2", "custom_number_3", "custom_number_4",
  "applink.android_app_name", "applink.android_package", "applink.android_url",
  "applink.ios_app_name", "applink.ios_app_store_id", "applink.ios_url",
  "applink.ipad_app_name", "applink.ipad_app_store_id", "applink.ipad_url",
  "applink.iphone_app_name", "applink.iphone_app_store_id", "applink.iphone_url",
  "applink.windows_phone_app_id", "applink.windows_phone_app_name", "applink.windows_phone_url",
  "cashback", "start_time", "end_time", "comscore_market_codes[0]", "comscore_market_codes[1]",
  "amount_price", "amount_percentage", "downpayment", "offer_type", "term_length",
  "term_qualifier", "amount_qualifier", "downpayment_qualifier", "estimated_margin",
  "make", "model", "year", "fuel_type", "drivetrain", "transmission", "body_style",
  "exterior_color", "interior_color", "trim", "generation", "interior_upholstery",
  "overlay_disclaimer", "product_tags[0]", "product_tags[1]",
  "product_priority_0", "product_priority_1", "product_priority_2", "product_priority_3",
  "product_priority_4",
]);

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

function value(vehicle, camelKey, snakeKey = camelKey) {
  return vehicle?.[camelKey] ?? vehicle?.[snakeKey];
}

function cleanText(input) {
  return String(input ?? "").trim().replace(/\s+/g, " ");
}

function normalizeBaseUrl(baseUrl) {
  const raw = cleanText(baseUrl).replace(/\/+$/, "");
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.origin : "";
  } catch {
    return "";
  }
}

function isPrivateHost(hostname) {
  const host = hostname.toLowerCase();
  return LOCAL_HOSTS.has(host)
    || host.endsWith(".local")
    || /^10\./.test(host)
    || /^192\.168\./.test(host)
    || /^172\.(1[6-9]|2\d|3[01])\./.test(host);
}

export function getMetaVehicleId(vehicle) {
  const stableId = value(vehicle, "inventoryId", "inventory_id")
    || value(vehicle, "stockNumber", "stock_number")
    || value(vehicle, "vin")
    || value(vehicle, "id");
  return cleanText(stableId);
}

export function getVehicleDetailUrl(vehicle, publicBaseUrl) {
  const id = getMetaVehicleId(vehicle);
  const baseUrl = normalizeBaseUrl(publicBaseUrl);
  return id && baseUrl ? `${baseUrl}/auto/${encodeURIComponent(id)}` : "";
}

export function toPublicImageUrl(source, publicBaseUrl) {
  const raw = cleanText(source);
  if (!raw || /^(data|blob|file):/i.test(raw) || /^[a-z]:[\\/]/i.test(raw)) return "";

  const baseUrl = normalizeBaseUrl(publicBaseUrl);
  let parsed;
  try {
    parsed = /^https?:\/\//i.test(raw)
      ? new URL(raw)
      : baseUrl
        ? new URL(raw.startsWith("/") ? raw : `/${raw}`, `${baseUrl}/`)
        : null;
  } catch {
    return "";
  }

  if (!parsed || !["http:", "https:"].includes(parsed.protocol) || isPrivateHost(parsed.hostname)) return "";
  if (parsed.username || parsed.password) return "";
  if (/\/storage\/v1\/object\/sign\//i.test(parsed.pathname)) return "";
  if ([...parsed.searchParams.keys()].some((key) => /^(token|signature|x-amz-signature)$/i.test(key))) return "";
  return parsed.href;
}

export function getVehiclePublicImageUrls(vehicle, publicBaseUrl, maxImages = 20) {
  const sources = value(vehicle, "imagenes", "imagenes");
  const seen = new Set();
  const urls = [];
  for (const source of Array.isArray(sources) ? sources : []) {
    const publicUrl = toPublicImageUrl(source, publicBaseUrl);
    if (!publicUrl || seen.has(publicUrl)) continue;
    seen.add(publicUrl);
    urls.push(publicUrl);
    if (urls.length >= maxImages) break;
  }
  return urls;
}

export function getMetaAvailability(vehicle) {
  const isVisible = value(vehicle, "visible") !== false;
  const isSold = Boolean(value(vehicle, "vendido"));
  const isComingSoon = Boolean(value(vehicle, "proximamente"));
  return isVisible && !isSold && !isComingSoon ? "AVAILABLE" : "";
}

function normalizeTransmission(input) {
  const text = cleanText(input).toLowerCase();
  if (!text) return "";
  if (text.includes("manual")) return "MANUAL";
  if (text.includes("autom") || text.includes("cvt")) return "AUTOMATIC";
  return cleanText(input).toUpperCase();
}

function normalizeBodyStyle(input) {
  const text = cleanText(input).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  const mappings = {
    SEDAN: "SEDAN",
    HATCHBACK: "HATCHBACK",
    SUV: "SUV",
    PICKUP: "TRUCK",
    COUPE: "COUPE",
    CONVERTIBLE: "CONVERTIBLE",
    VAN: "VAN",
    WAGON: "WAGON",
  };
  return mappings[text] || text;
}

function buildTitle(vehicle) {
  return [value(vehicle, "anio", "anio"), value(vehicle, "marca", "marca"), value(vehicle, "modelo", "modelo"), value(vehicle, "version", "version")]
    .map(cleanText)
    .filter(Boolean)
    .join(" ");
}

function buildDescription(vehicle, title) {
  const description = cleanText(value(vehicle, "descripcion", "descripcion"));
  if (description) return description;
  const details = [
    title,
    value(vehicle, "kilometraje", "kilometraje") !== undefined
      ? `${Number(value(vehicle, "kilometraje", "kilometraje")).toLocaleString("es-MX")} km`
      : "",
    cleanText(value(vehicle, "transmision", "transmision")),
    cleanText(value(vehicle, "colorExterior", "color_exterior")),
  ].filter(Boolean);
  return details.join(" · ");
}

function formatPrice(input) {
  const amount = Number(input);
  return Number.isFinite(amount) && amount > 0 ? `${amount.toFixed(2)} MXN` : "";
}

export function mapVehicleToMetaFeed(vehicle, { publicBaseUrl } = {}) {
  const row = Object.fromEntries(META_VEHICLE_OFFER_COLUMNS.map((column) => [column, ""]));
  const title = buildTitle(vehicle);
  const images = getVehiclePublicImageUrls(vehicle, publicBaseUrl);
  const id = getMetaVehicleId(vehicle);
  const detailUrl = getVehicleDetailUrl(vehicle, publicBaseUrl);
  const publishedPrice = formatPrice(value(vehicle, "precio", "precio"));

  Object.assign(row, {
    title,
    availability: getMetaAvailability(vehicle),
    price: publishedPrice,
    "image[0].url": images[0] || "",
    "image[0].tag[0]": images[0] ? "EXTERIOR" : "",
    vehicle_offer_id: id,
    offer_description: buildDescription(vehicle, title),
    url: detailUrl,
    custom_label_0: "Seminuevo",
    custom_label_1: cleanText(value(vehicle, "tipo", "tipo")),
    custom_label_2: cleanText(value(vehicle, "transmision", "transmision")),
    custom_number_0: Number.isFinite(Number(value(vehicle, "kilometraje", "kilometraje")))
      ? String(Math.max(0, Math.round(Number(value(vehicle, "kilometraje", "kilometraje")))))
      : "",
    amount_price: publishedPrice,
    offer_type: publishedPrice ? "cash" : "",
    make: cleanText(value(vehicle, "marca", "marca")),
    model: cleanText(value(vehicle, "modelo", "modelo")),
    year: cleanText(value(vehicle, "anio", "anio")),
    transmission: normalizeTransmission(value(vehicle, "transmision", "transmision")),
    body_style: normalizeBodyStyle(value(vehicle, "tipo", "tipo")),
    exterior_color: cleanText(value(vehicle, "colorExterior", "color_exterior")),
    interior_color: cleanText(value(vehicle, "colorInterior", "color_interior")),
    trim: cleanText(value(vehicle, "version", "version")),
    "product_tags[0]": "Certificado x Carvía",
    "product_tags[1]": cleanText(value(vehicle, "destacado", "destacado")) === "true" ? "Destacado" : "",
  });

  return { row, images };
}

export function validateMetaFeedVehicle(vehicle, options = {}) {
  const { row } = mapVehicleToMetaFeed(vehicle, options);
  const errors = [];
  if (!row.vehicle_offer_id) errors.push("identificador faltante");
  if (!row.title) errors.push("título faltante");
  if (!row.url) errors.push("URL pública faltante");
  if (!row["image[0].url"]) errors.push("imagen pública faltante");
  if (!row.availability) errors.push("vehículo no disponible");
  return { valid: errors.length === 0, errors, row };
}

export function getPublishableMetaVehicles(vehicles, options = {}, onInvalid = () => {}) {
  const rows = [];
  for (const vehicle of Array.isArray(vehicles) ? vehicles : []) {
    const result = validateMetaFeedVehicle(vehicle, options);
    if (!result.valid) {
      onInvalid(vehicle, result.errors);
      continue;
    }
    rows.push({ ...result, images: getVehiclePublicImageUrls(vehicle, options.publicBaseUrl) });
  }
  return rows;
}

export function escapeCsvValue(input) {
  return `"${String(input ?? "").replace(/"/g, '""')}"`;
}

export function serializeMetaVehicleOfferCsv(rows) {
  const header = META_VEHICLE_OFFER_COLUMNS.join(",");
  const records = rows.map((row) => META_VEHICLE_OFFER_COLUMNS.map((column) => escapeCsvValue(row[column])).join(","));
  return [header, ...records].join("\r\n") + "\r\n";
}

function escapeXml(input) {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function serializeMetaVehicleOfferXml(items, feedTitle = "Carvía vehicle offers") {
  const listings = items.map(({ row, images = [] }) => {
    const imageNodes = images.map((url) => `    <image>\n      <url>${escapeXml(url)}</url>\n      <tag>EXTERIOR</tag>\n    </image>`).join("\n");
    const valueNodes = META_VEHICLE_OFFER_COLUMNS
      .filter((column) => !column.startsWith("image[") && row[column] !== "")
      .map((column) => `    <${column.replace(/\[\d+\]/g, "")}>${escapeXml(row[column])}</${column.replace(/\[\d+\]/g, "")}>`)
      .join("\n");
    return `  <listing>\n${imageNodes}${imageNodes && valueNodes ? "\n" : ""}${valueNodes}\n  </listing>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="utf-8"?>\n<listings>\n  <title>${escapeXml(feedTitle)}</title>\n${listings}\n</listings>\n`;
}

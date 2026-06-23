/* ============================================================
   CARVÍA — Servidor de producción (Node, sin dependencias)
   ------------------------------------------------------------
   - Sirve la SPA estática generada por Vite (carpeta ./dist).
   - Inyecta etiquetas Open Graph en TIEMPO DE PETICIÓN para que
     WhatsApp / Facebook / Telegram muestren un preview correcto:
       · /auto/:id  → foto y datos del auto (consulta Supabase).
       · cualquier otra ruta → logo de Carvía.
     (Los crawlers NO ejecutan JavaScript, por eso react-helmet
      no basta y la inyección debe hacerse en el servidor.)
   ============================================================ */
import http from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const DIST = join(ROOT, "dist");
const PORT = Number(process.env.PORT) || 80;

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml",
  ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8", ".webmanifest": "application/manifest+json",
};
const COMPRESSIBLE = new Set([".html", ".js", ".mjs", ".css", ".json", ".svg", ".txt", ".map", ".webmanifest"]);

const esc = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const mxn = (n) => "$" + Number(n || 0).toLocaleString("es-MX");
const km = (n) => Number(n || 0).toLocaleString("es-MX") + " km";

/* ---- index.html en memoria (cargado una vez) ---- */
let INDEX_HTML = "";
try {
  INDEX_HTML = await readFile(join(DIST, "index.html"), "utf8");
} catch {
  console.error("[carvia] No se encontró dist/index.html. ¿Corriste `npm run build`?");
}

/* ---- Caché simple (TTL) para autos consultados a Supabase ---- */
const carCache = new Map(); // id -> { car, exp }
const CAR_TTL = 60_000;

async function fetchCar(id) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  const hit = carCache.get(id);
  if (hit && hit.exp > Date.now()) return hit.car;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/autos?id=eq.${encodeURIComponent(id)}&visible=eq.true&select=*&limit=1`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    const car = res.ok ? (await res.json())?.[0] || null : null;
    carCache.set(id, { car, exp: Date.now() + CAR_TTL });
    return car;
  } catch {
    return null;
  }
}

function absUrl(origin, src) {
  if (!src) return "";
  return /^https?:\/\//i.test(src) ? src : origin + (src.startsWith("/") ? "" : "/") + src;
}

/* ---- Construye el bloque de etiquetas OG para una respuesta ---- */
function ogTags(origin, pathname, car) {
  let title, description, image, type, url = origin + pathname;
  if (car) {
    const name = `${car.marca} ${car.modelo} ${car.version || ""} ${car.anio}`.replace(/\s+/g, " ").trim();
    title = `${name} — ${mxn(car.precio)} | Carvía`;
    description =
      (car.descripcion && String(car.descripcion).slice(0, 180)) ||
      `${km(car.kilometraje)} · ${car.transmision || ""} · ${car.colorExterior || car.color_exterior || ""}`.trim();
    const imgs = Array.isArray(car.imagenes) ? car.imagenes : [];
    image = absUrl(origin, imgs[0]) || `${origin}/CarviaIso.png`;
    type = "product";
  } else {
    title = "Carvía — Autos seminuevos de calidad";
    description = "Autos seminuevos seleccionados y con garantía. Encuentra tu próximo auto.";
    image = `${origin}/CarviaIso.png`;
    type = "website";
  }
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<meta property="og:site_name" content="Carvía" />`,
    `<meta property="og:type" content="${type}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta property="og:image:alt" content="${esc(title)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    `<meta name="twitter:image" content="${esc(image)}" />`,
  ].join("\n  ");
}

function injectOg(html, tags) {
  if (html.includes("<!-- OG_START -->")) {
    return html.replace(
      /<!-- OG_START -->[\s\S]*?<!-- OG_END -->/,
      `<!-- OG_START -->\n  ${tags}\n  <!-- OG_END -->`
    );
  }
  return html.replace("</head>", `  ${tags}\n</head>`);
}

/* ---- Compresión + envío ---- */
function send(req, res, status, headers, body, ext) {
  const h = { ...headers };
  let payload = body;
  const accept = req.headers["accept-encoding"] || "";
  if (Buffer.isBuffer(payload) || typeof payload === "string") {
    if (COMPRESSIBLE.has(ext) && /\bgzip\b/.test(accept) && Buffer.byteLength(payload) > 1024) {
      payload = zlib.gzipSync(payload);
      h["Content-Encoding"] = "gzip";
      h["Vary"] = "Accept-Encoding";
    }
  }
  res.writeHead(status, h);
  res.end(req.method === "HEAD" ? undefined : payload);
}

async function serveIndex(req, res, origin, pathname) {
  let car = null;
  const m = pathname.match(/^\/auto\/([^/]+)\/?$/);
  if (m) car = await fetchCar(decodeURIComponent(m[1]));
  const html = injectOg(INDEX_HTML, ogTags(origin, pathname, car));
  send(req, res, 200, {
    "Content-Type": MIME[".html"],
    "Cache-Control": "no-cache, no-store, must-revalidate",
  }, html, ".html");
}

const server = http.createServer(async (req, res) => {
  try {
    const proto = (req.headers["x-forwarded-proto"] || "").split(",")[0].trim() || "http";
    const host = (req.headers["x-forwarded-host"] || req.headers.host || "localhost").split(",")[0].trim();
    const origin = `${proto}://${host}`;
    const { pathname } = new URL(req.url, origin);

    // Sólo GET / HEAD
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { Allow: "GET, HEAD" });
      return res.end();
    }

    // Ruta de archivo dentro de /dist (evita path traversal)
    const safe = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
    const filePath = join(DIST, safe);
    const ext = extname(filePath).toLowerCase();

    // Si pide un archivo real (con extensión) y existe → estático
    if (ext && ext !== ".html" && filePath.startsWith(DIST) && existsSync(filePath)) {
      const body = await readFile(filePath);
      const cache = pathname.startsWith("/assets/")
        ? "public, max-age=31536000, immutable"
        : "public, max-age=3600";
      return send(req, res, 200, {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Cache-Control": cache,
      }, body, ext);
    }

    // Cualquier otra ruta → SPA (index.html con OG inyectado)
    return await serveIndex(req, res, origin, pathname);
  } catch (err) {
    console.error("[carvia] Error:", err);
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Error interno");
  }
});

server.listen(PORT, () => {
  console.log(`[carvia] Servidor escuchando en :${PORT}`);
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn("[carvia] Sin credenciales Supabase en runtime: los previews de autos usarán el logo por defecto.");
  }
});

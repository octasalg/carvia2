/* ============================================================
   Parser de texto de WhatsApp → campos del formulario de auto
   ============================================================ */

const BRAND_ALIASES = {
  "mercedes": "Mercedes-Benz",
  "mercedes benz": "Mercedes-Benz",
  "mercedes-benz": "Mercedes-Benz",
  "land rover": "Land Rover",
  "alfa romeo": "Alfa Romeo",
  "rolls royce": "Rolls-Royce",
  "rolls-royce": "Rolls-Royce",
  "vw": "Volkswagen",
  "chevy": "Chevrolet",
};

const KNOWN_BRANDS = [
  "Acura", "Alfa Romeo", "Audi", "BMW", "BYD", "Buick", "Cadillac", "Chery",
  "Chevrolet", "Chrysler", "Citroën", "Dodge", "Fiat", "Ford", "GMC",
  "Genesis", "Haval", "Honda", "Hyundai", "Infiniti", "JAC", "Jeep",
  "Kia", "Land Rover", "Lexus", "Lincoln", "MG", "Mazda", "Mercedes-Benz",
  "Mini", "Mitsubishi", "Nissan", "Peugeot", "Porsche", "RAM", "Renault",
  "SEAT", "Subaru", "Suzuki", "Tesla", "Toyota", "Volkswagen", "Volvo",
];

function norm(s) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

function detectBrand(words) {
  if (words.length >= 2) {
    const two = words[0] + " " + words[1];
    const alias = BRAND_ALIASES[norm(two)];
    if (alias) return { brand: alias, used: 2 };
    const match = KNOWN_BRANDS.find((b) => norm(b) === norm(two));
    if (match) return { brand: match, used: 2 };
  }
  if (words.length >= 1) {
    const alias = BRAND_ALIASES[norm(words[0])];
    if (alias) return { brand: alias, used: 1 };
    const match = KNOWN_BRANDS.find((b) => norm(b) === norm(words[0]));
    if (match) return { brand: match, used: 1 };
  }
  return null;
}

const TRANSMISSION_PATTERNS = [
  [/autom[aá]tic[ao]/i, "Automática"],
  [/\bcvt\b/i, "CVT"],
  [/\bmanual\b/i, "Manual"],
];

const TYPE_PATTERNS = [
  [/\bsuv\b/i, "SUV"],
  [/\bpickup\b|\bcamioneta\b/i, "Pickup"],
  [/\bhatchback\b/i, "Hatchback"],
  [/\bcoup[eé]\b/i, "Coupé"],
  [/\bsed[aá]n\b/i, "Sedán"],
];

const PROVENANCE_PATTERNS = [
  /único due[ñn]o/i,
  /factura/i,
  /servicio[s]?\s+(de\s+)?agencia/i,
  /sin accidente/i,
  /no fumador/i,
  /impecable/i,
  /excelente estado/i,
  /buen estado/i,
];

const SKIP_PATTERNS = [
  /rendimiento\s+(ciudad|carretera)/i,
  /0[–—-]?100\s*km/i,
  /^\d[\d.]*\s*seg(undo)?s?$/i,
];

const YEAR_RE = /\b(19[89]\d|20[0-5]\d)\b/;

function parseBrandModelFromLine(line) {
  const yearMatch = line.match(YEAR_RE);
  const noYear = line.replace(YEAR_RE, "").replace(/\s+/g, " ").trim();
  const words = noYear.split(/\s+/).filter(Boolean);
  const brandResult = detectBrand(words);
  if (!brandResult) return null;
  const rest = words.slice(brandResult.used);
  return {
    marca: brandResult.brand,
    modelo: rest[0] || "",
    version: rest.length > 1 ? rest.slice(1).join(" ") : "",
    anio: yearMatch ? parseInt(yearMatch[1]) : null,
  };
}

export function parseCarText(rawText) {
  const lines = rawText.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  if (!lines.length) return {};

  const result = {};
  const equipamiento = [];
  const descParts = [];

  // Buscar año suelto en cualquier línea si no aparece junto a la marca
  const yearLineMatch = rawText.match(YEAR_RE);
  if (yearLineMatch) result.anio = parseInt(yearLineMatch[1]);

  // --- Detectar Marca/Modelo: primero en línea 1, luego en resto si falla ---
  let brandLineIndex = -1;
  for (let i = 0; i < Math.min(lines.length, 4); i++) {
    const bm = parseBrandModelFromLine(lines[i]);
    if (bm && bm.marca) {
      result.marca = bm.marca;
      if (bm.modelo) result.modelo = bm.modelo;
      if (bm.version) result.version = bm.version;
      if (bm.anio) result.anio = bm.anio;
      brandLineIndex = i;
      break;
    }
  }

  // --- Líneas siguientes ---
  for (let i = 0; i < lines.length; i++) {
    if (i === brandLineIndex) continue;
    const line = lines[i];

    // Ignorar líneas de rendimiento/performance
    if (SKIP_PATTERNS.some((p) => p.test(line))) continue;

    // Precio: $690,000
    const priceMatch = line.match(/^\$\s*([\d,.]+)\s*$/);
    if (priceMatch) {
      result.precio = parseInt(priceMatch[1].replace(/[,.]/g, "").replace(/(\d{3})$/, "$1") || priceMatch[1].replace(/,/g, ""));
      // Forma más robusta: quitar todo excepto dígitos
      result.precio = parseInt(priceMatch[1].replace(/\D/g, ""));
      continue;
    }

    // Kilometraje: 56,000 km
    const kmMatch = line.match(/^([\d,]+)\s*km$/i);
    if (kmMatch) {
      result.kilometraje = parseInt(kmMatch[1].replace(/,/g, ""));
      continue;
    }

    // Transmisión
    const transMatch = TRANSMISSION_PATTERNS.find(([p]) => p.test(line));
    if (transMatch) {
      result.transmision = transMatch[1];
      continue;
    }

    // Tipo de carrocería (solo si es la única info en la línea)
    const typeMatch = TYPE_PATTERNS.find(([p]) => p.test(line));
    if (typeMatch && line.split(/\s+/).length <= 3) {
      result.tipo = typeMatch[1];
      continue;
    }

    // Motor: "Motor 3.0 Turbo"
    if (/^motor\s+/i.test(line)) {
      const part = line.replace(/^motor\s+/i, "").trim();
      result.motor = result.motor ? `${result.motor} ${part}` : part;
      continue;
    }

    // Cilindros: "6 cilindros en línea"
    if (/\bcilindro/i.test(line)) {
      result.motor = result.motor ? `${result.motor} · ${line}` : line;
      continue;
    }

    // Potencia: "340 hp" → campo potencia
    const hpMatch = line.match(/^(\d+)\s*(hp|cv|caballos)\b/i);
    if (hpMatch) {
      result.potencia = parseInt(hpMatch[1], 10);
      continue;
    }

    // Rendimiento combinado: "12.5 km/l", "Rendimiento 14 km/l"
    const rendMatch = line.match(/(\d+(?:[.,]\d+)?)\s*km\s*\/?\s*l\b/i);
    if (rendMatch && !/(ciudad|carretera)/i.test(line)) {
      result.rendimiento = parseFloat(rendMatch[1].replace(",", "."));
      continue;
    }

    // Proveniencia/condición → descripción
    if (PROVENANCE_PATTERNS.some((p) => p.test(line))) {
      descParts.push(line);
      continue;
    }

    // Todo lo demás → equipamiento
    equipamiento.push(line);
  }

  if (descParts.length) result.descripcion = descParts.join(". ");
  if (equipamiento.length) {
    result.equipamiento = equipamiento;
    result.equipInput = equipamiento.join(", ");
  }

  return result;
}

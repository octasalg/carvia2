/* ============================================================
   CARVÍA — Generador del Identificador (hoja A4 horizontal)
   Port del diseño de Carvia_Identificador_Final.html para que
   el panel pueda generarlo/imprimirlo directo desde los datos
   del auto, sin que el usuario llene nada más.
   ============================================================ */
import { LOGO_BLACK } from "./identificadorLogo";

/* ── Helpers de formato (idénticos al HTML original) ── */
const fmtKm = (v) => {
  const n = parseInt(String(v).replace(/\D/g, ""), 10);
  return isNaN(n) ? "" : n.toLocaleString("es-MX") + " km";
};
const fmtPrecio = (v) => {
  const n = parseInt(String(v).replace(/\D/g, ""), 10);
  return isNaN(n) ? "" : "$" + n.toLocaleString("es-MX");
};
const today = () =>
  new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });

function fitFont(text, maxW, maxSize = 108, minSize = 30) {
  if (!text) return maxSize;
  return Math.min(maxSize, Math.max(minSize, Math.floor(maxW / (text.length * 0.58))));
}

/* ── Folio: CV-AAMMDD-#### ── */
export function genFolio() {
  const d = new Date();
  return (
    "CV-" +
    String(d.getFullYear()).slice(2) +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0") +
    "-" +
    Math.floor(1000 + Math.random() * 9000)
  );
}

/* ── Enganche: 15% si año ≤ 2019, 10% en adelante ── */
function calcEnganche(anio, precio) {
  const y = parseInt(anio, 10);
  const p = parseInt(String(precio || "").replace(/\D/g, ""), 10);
  if (!y || !p) return null;
  const pct = y <= 2019 ? 0.15 : 0.1;
  const monto = Math.round(p * pct);
  const label = y <= 2019 ? "15%" : "10%";
  return { monto, label, pct };
}

/* ── Mapeo del tipo de factura del inventario al del identificador ── */
function facturaInfo(factura) {
  const key = String(factura || "").trim().toLowerCase();
  const map = {
    agencia: { label: "Factura de Agencia", badge: "AGENCIA" },
    empresa: { label: "Factura de Empresa", badge: "EMPRESA" },
    seminuevos: { label: "Factura de Seminuevos", badge: "SEMINUEVOS" },
  };
  return map[key] || { label: "", badge: "" };
}

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/* ── Construye el bloque .id-root con los datos del auto ── */
function buildIdRoot(car, folio) {
  const marca = esc((car.marca || "").trim());
  const modelo = esc((car.modelo || "").trim());
  const version = esc((car.version || "").trim());
  const anio = (car.anio ?? "").toString().trim();
  const km = (car.kilometraje ?? "").toString().trim();
  const precio = (car.precio ?? "").toString().trim();

  const motor = esc((car.motor || "").trim());
  const trans = esc((car.transmision || "").trim());
  const potRaw = String(car.potencia ?? "").trim();
  const potencia = potRaw ? esc(potRaw.replace(/\s*hp\s*$/i, "")) + " HP" : "";
  const rendRaw = String(car.rendimiento ?? "").trim();
  const rend = rendRaw ? esc(rendRaw.replace(/\s*km\s*\/?\s*l\s*$/i, "")) + " km/l" : "";

  const { label: facturaLabel, badge: facturaBadge } = facturaInfo(car.factura);

  const longest = [marca, modelo, version, anio].reduce((a, b) => (b.length > a.length ? b : a), "");
  const fs = fitFont(longest, 526, 108, 30);
  const ls = fs > 70 ? -3 : -1;

  const hasSpecs = motor || potencia || rend || trans;
  const precioFmt = fmtPrecio(precio);
  const precioFs = fitFont(precioFmt, 270, 64, 28);

  const enganche = calcEnganche(anio, precio);
  const engancheVal = enganche
    ? `${fmtPrecio(String(enganche.monto))} <span style="font-size:18px;font-weight:700;color:#999691">(${enganche.label} del precio de venta)</span>`
    : '<span style="color:#D8D5CD;font-size:22px">— Completa año y precio</span>';

  const topCells = [
    { lbl: "Motor", val: motor },
    { lbl: "Potencia", val: potencia },
    { lbl: "Rendimiento combinado", val: rend },
    { lbl: "Transmisión", val: trans },
  ];
  const specValFs = 30;

  const specsHtml =
    hasSpecs || enganche
      ? `<div class="id-specs-grid">
          ${topCells
            .map((s, i) => {
              const col = i % 2,
                row = Math.floor(i / 2);
              const cls = ["id-spec-cell", col < 1 ? "br" : "", row < 1 ? "bb" : ""]
                .filter(Boolean)
                .join(" ");
              return `<div class="${cls}">
                <div class="id-spec-lbl">${s.lbl}</div>
                <div class="id-spec-val${s.val ? "" : " empty"}" style="font-size:${specValFs}px">${s.val || "—"}</div>
              </div>`;
            })
            .join("")}
          <div class="id-spec-cell enganche bb" style="border-top:1.5px solid #D8D5CD">
            <div class="id-spec-lbl">Enganche desde</div>
            <div class="id-spec-val" style="font-size:36px">${engancheVal}</div>
          </div>
        </div>`
      : `<div class="id-no-specs"><p>Ingresa las especificaciones<br>en el formulario</p></div>`;

  const fields = [
    { val: marca, ph: "Marca" },
    { val: modelo, ph: "Modelo" },
    { val: version, ph: "Versión" },
    { val: anio, ph: "Año" },
  ]
    .map(
      (f) =>
        `<div class="id-field ${f.val ? "filled" : "empty"}" style="font-size:${fs}px;letter-spacing:${ls}px">${f.val || f.ph}</div>`
    )
    .join("");

  return `
  <div class="id-root">
    <div class="id-topbar">
      <img src="data:image/png;base64,${LOGO_BLACK}" alt="carvía" style="height:52px;width:auto"/>
      <div class="id-topbar-right">
        ${facturaBadge ? `<span class="id-badge">${facturaBadge}</span>` : ""}
        <span class="id-site">Conoce todo nuestro catálogo en carvia.mx</span>
      </div>
    </div>
    <div class="id-body">
      <div class="id-left">${fields}</div>
      <div class="id-right">
        <div class="id-specs-title">Especificaciones técnicas</div>
        ${specsHtml}
      </div>
    </div>
    <div class="id-footer">
      <div class="id-footer-cell precio">
        <div class="id-footer-lbl">Precio de venta</div>
        <div class="id-footer-val" style="font-size:${precioFs}px;letter-spacing:-2px">
          ${precioFmt || '<span style="color:#D8D5CD;font-size:24px">— MXN</span>'}
        </div>
      </div>
      <div class="id-footer-cell km">
        <div class="id-footer-lbl">Kilometraje</div>
        <div class="id-footer-val" style="font-size:18px">${km ? fmtKm(km) : '<span style="color:#D8D5CD">—</span>'}</div>
      </div>
      <div class="id-footer-cell" style="flex:1">
        <div class="id-footer-lbl">Tipo de factura</div>
        <div class="id-footer-val" style="font-size:16px">${facturaLabel || '<span style="color:#D8D5CD">—</span>'}</div>
      </div>
      <div class="id-footer-cell last folio-cell">
        <div class="id-footer-lbl">Folio</div>
        <div class="id-footer-val" style="font-size:13px;letter-spacing:1px">${esc(folio) || "CV-"}</div>
        <div class="id-footer-sub">${today()}</div>
      </div>
    </div>
  </div>`;
}

/* ── CSS del identificador (idéntico al HTML original) ── */
const ID_STYLES = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #fff; font-family: 'Archivo', sans-serif; }
  body { display: flex; align-items: center; justify-content: center; min-height: 100vh; }

  .id-root {
    width: 1123px; height: 794px; display: flex; flex-direction: column;
    font-family: 'Archivo', sans-serif; background: #fff; overflow: hidden;
    box-shadow: 0 24px 60px rgba(0,0,0,.25);
  }
  .id-topbar {
    padding: 12px 32px; display: flex; align-items: center; justify-content: space-between;
    border-bottom: 1.5px solid #D8D5CD; flex-shrink: 0;
  }
  .id-topbar img { height: 52px; width: auto; }
  .id-topbar-right { display: flex; align-items: center; gap: 20px; }
  .id-badge { border: 1.5px solid #191817; color: #191817; font-size: 9px; font-weight: 800; letter-spacing: 2.5px; padding: 3px 12px; border-radius: 20px; text-transform: uppercase; }
  .id-site  { color: #999691; font-size: 10px; font-weight: 500; font-style: italic; }
  .id-body  { flex: 1; display: flex; overflow: hidden; }
  .id-left  { width: 590px; display: flex; flex-direction: column; justify-content: center; padding: 16px 32px 16px 36px; border-right: 1.5px solid #D8D5CD; }
  .id-field { font-weight: 900; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.0; }
  .id-field.filled { color: #191817; }
  .id-field.empty  { color: #D8D5CD; }
  .id-right { flex: 1; background: #fff; display: flex; flex-direction: column; padding: 18px 28px 14px 28px; }
  .id-specs-title { font-size: 8px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; color: #999691; margin-bottom: 14px; }

  .id-specs-grid {
    flex: 1; display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr 1fr;
    gap: 0;
  }
  .id-spec-cell { padding: 10px 16px; display: flex; flex-direction: column; justify-content: center; }
  .id-spec-cell.br { border-right: 1.5px solid #D8D5CD; }
  .id-spec-cell.bb { border-bottom: 1.5px solid #D8D5CD; }
  .id-spec-cell.enganche { grid-column: 1 / -1; border-right: none; }
  .id-spec-lbl { font-size: 9px; font-weight: 800; letter-spacing: 2.5px; text-transform: uppercase; color: #999691; margin-bottom: 4px; }
  .id-spec-val { font-weight: 900; color: #191817; letter-spacing: -0.5px; line-height: 1.1; }
  .id-spec-val.empty { color: #D8D5CD; }
  .id-no-specs { flex: 1; display: flex; align-items: center; justify-content: center; }
  .id-no-specs p { color: #D8D5CD; font-size: 12px; font-weight: 600; text-align: center; line-height: 1.6; }

  .id-footer { border-top: 1.5px solid #D8D5CD; display: flex; align-items: stretch; flex-shrink: 0; }
  .id-footer-cell { display: flex; flex-direction: column; justify-content: center; padding: 12px 20px; border-right: 1.5px solid #D8D5CD; }
  .id-footer-cell.last { border-right: none; align-items: flex-end; padding-right: 24px; }
  .id-footer-cell.precio { min-width: 300px; padding: 12px 28px; }
  .id-footer-cell.km     { min-width: 160px; }
  .id-footer-cell.folio-cell { min-width: 170px; }
  .id-footer-lbl { color: #999691; font-size: 8px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 3px; }
  .id-footer-val { color: #191817; font-weight: 900; letter-spacing: -0.3px; }
  .id-footer-sub { color: #999691; font-size: 9px; font-weight: 600; margin-top: 3px; }

  @media print {
    html, body { background: #fff; }
    body { display: block; }
    .id-root { box-shadow: none !important; }
    @page { size: A4 landscape; margin: 0; }
    .id-root { width: 297mm !important; height: 210mm !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;

/* ── Documento HTML completo y autocontenido ── */
export function buildIdentificadorHtml(car, folio = genFolio()) {
  const titulo = `Identificador ${(car.marca || "").trim()} ${(car.modelo || "").trim()} ${folio}`.trim();
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${esc(titulo)}</title>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
<style>${ID_STYLES}</style>
</head>
<body>
${buildIdRoot(car, folio)}
</body>
</html>`;
}

/**
 * Abre el identificador del auto en una pestaña nueva y lanza el diálogo de
 * impresión (Guardar como PDF / imprimir). Conserva el diseño A4 horizontal.
 * No requiere que el usuario llene ningún campo.
 */
export function printIdentificador(car) {
  const folio = genFolio();
  const html = buildIdentificadorHtml(car, folio);
  const win = window.open("", "_blank");
  if (!win) return false; // pop-up bloqueado
  win.document.open();
  win.document.write(html);
  win.document.close();

  const launch = () => {
    try {
      win.focus();
      win.print();
    } catch {
      /* el usuario puede imprimir manualmente */
    }
  };
  // Espera a que la fuente y el logo carguen para imprimir con el diseño correcto.
  if (win.document.readyState === "complete") {
    setTimeout(launch, 400);
  } else {
    win.onload = () => setTimeout(launch, 400);
  }
  return true;
}

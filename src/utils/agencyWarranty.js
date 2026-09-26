/* ============================================================
   CARVÍA — Garantía de agencia
   Helpers compartidos entre el formulario del panel y el servicio
   de autos para validar y normalizar los datos de garantía.
   ============================================================ */

/** Campos de detalle que sólo aplican cuando el auto conserva garantía. */
export const WARRANTY_DETAIL_FIELDS = [
  "garantiaUltimoServicio",
  "garantiaProximoServicioFecha",
  "garantiaProximoServicioKm",
  "garantiaIntervaloServicio",
];

/** Valida el formato `YYYY-MM-DD` que entrega/espera `<input type="date">`. */
export function isValidDateInput(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** Convierte un valor de fecha de la base (date o timestamp) a `YYYY-MM-DD`. */
export function toDateInputValue(value) {
  if (!value) return "";
  const text = String(value).slice(0, 10);
  return isValidDateInput(text) ? text : "";
}

function dateOrNull(value) {
  const text = toDateInputValue(value);
  return text || null;
}

function mileageOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return Math.round(number);
}

function textOrNull(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

/** Indica si un auto trae información de garantía capturada. */
export function hasWarrantyData(car = {}) {
  if (car.garantiaAgencia === true) return true;
  return WARRANTY_DETAIL_FIELDS.some((key) => {
    const value = car[key];
    return value !== null && value !== undefined && String(value).trim() !== "";
  });
}

/** Estado inicial del formulario (strings vacíos en vez de null). */
export function warrantyFormState(car = {}) {
  return {
    garantiaAgencia: hasWarrantyData(car),
    garantiaUltimoServicio: toDateInputValue(car.garantiaUltimoServicio),
    garantiaProximoServicioFecha: toDateInputValue(car.garantiaProximoServicioFecha),
    garantiaProximoServicioKm:
      car.garantiaProximoServicioKm === null || car.garantiaProximoServicioKm === undefined
        ? ""
        : String(car.garantiaProximoServicioKm),
    garantiaIntervaloServicio: car.garantiaIntervaloServicio ?? "",
  };
}

/**
 * Normaliza los campos de garantía antes de persistirlos.
 * Si el auto no conserva garantía, todos los detalles se limpian a `null`
 * para que la información anterior no se siga mostrando como vigente.
 */
export function normalizeWarrantyFields(car = {}) {
  if (car.garantiaAgencia !== true) {
    return {
      garantiaAgencia: false,
      garantiaUltimoServicio: null,
      garantiaProximoServicioFecha: null,
      garantiaProximoServicioKm: null,
      garantiaIntervaloServicio: null,
    };
  }
  return {
    garantiaAgencia: true,
    garantiaUltimoServicio: dateOrNull(car.garantiaUltimoServicio),
    garantiaProximoServicioFecha: dateOrNull(car.garantiaProximoServicioFecha),
    garantiaProximoServicioKm: mileageOrNull(car.garantiaProximoServicioKm),
    garantiaIntervaloServicio: textOrNull(car.garantiaIntervaloServicio),
  };
}

/**
 * Aplica la normalización sólo cuando el payload incluye la garantía.
 * Así las actualizaciones parciales (visible, destacado…) no tocan los datos.
 */
export function withNormalizedWarranty(car) {
  if (!car || typeof car !== "object") return car;
  const touchesWarranty =
    Object.prototype.hasOwnProperty.call(car, "garantiaAgencia") ||
    WARRANTY_DETAIL_FIELDS.some((key) => Object.prototype.hasOwnProperty.call(car, key));
  if (!touchesWarranty) return car;
  return { ...car, ...normalizeWarrantyFields(car) };
}

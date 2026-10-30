/* ============================================================
   CARVÍA — Precio de lista y precio de oferta
   Un vehículo tiene oferta sólo cuando su precio de oferta es
   mayor que 0 y menor que su precio de lista. No hay que activar
   nada manualmente: el descuento se calcula a partir de los dos.
   ============================================================ */

function toAmount(value) {
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Devuelve la información de precio de un vehículo.
 * @returns {{ listPrice: number, offerPrice: number, hasOffer: boolean, savings: number, finalPrice: number }}
 */
export function getVehiclePricing(car) {
  const listPrice = toAmount(car?.precio);
  const offerPrice = toAmount(car?.precio_oferta);
  const hasOffer = listPrice > 0 && offerPrice > 0 && offerPrice < listPrice;
  return {
    listPrice,
    offerPrice: hasOffer ? offerPrice : 0,
    hasOffer,
    savings: hasOffer ? listPrice - offerPrice : 0,
    finalPrice: hasOffer ? offerPrice : listPrice,
  };
}

/** Precio que realmente paga el cliente (oferta si es válida; si no, lista). */
export function getFinalPrice(car) {
  return getVehiclePricing(car).finalPrice;
}

/**
 * Valida los precios capturados en el panel de administración.
 * @returns {string|null} mensaje de error o null si son válidos
 */
export function validateVehiclePrices(listPriceInput, offerPriceInput) {
  const listPrice = Number(listPriceInput);
  if (listPriceInput === "" || listPriceInput === null || listPriceInput === undefined
    || !Number.isFinite(listPrice) || listPrice <= 0) {
    return "El precio de lista es obligatorio y debe ser mayor que 0";
  }
  if (offerPriceInput === "" || offerPriceInput === null || offerPriceInput === undefined) return null;
  const offerPrice = Number(offerPriceInput);
  if (!Number.isFinite(offerPrice) || offerPrice < 0) {
    return "El precio de oferta debe ser 0 (sin oferta) o un monto mayor que 0";
  }
  if (offerPrice > 0 && offerPrice >= listPrice) {
    return "El precio de oferta debe ser menor que el precio de lista";
  }
  return null;
}

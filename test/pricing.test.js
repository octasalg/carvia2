import test from "node:test";
import assert from "node:assert/strict";
import { getVehiclePricing, getFinalPrice, validateVehiclePrices } from "../src/utils/pricing.js";

test("vehículo sin oferta muestra sólo el precio de lista", () => {
  const p = getVehiclePricing({ precio: 999000, precio_oferta: 0 });
  assert.deepEqual(p, { listPrice: 999000, offerPrice: 0, hasOffer: false, savings: 0, finalPrice: 999000 });
});

test("vehículos registrados antes del cambio (sin precio_oferta) no tienen oferta", () => {
  for (const precio_oferta of [undefined, null, ""]) {
    const p = getVehiclePricing({ precio: 450000, precio_oferta });
    assert.equal(p.hasOffer, false);
    assert.equal(p.finalPrice, 450000);
  }
});

test("vehículo con oferta calcula el ahorro automáticamente", () => {
  const p = getVehiclePricing({ precio: 999000, precio_oferta: 979000 });
  assert.equal(p.hasOffer, true);
  assert.equal(p.offerPrice, 979000);
  assert.equal(p.savings, 20000);
  assert.equal(getFinalPrice({ precio: 999000, precio_oferta: 979000 }), 979000);
});

test("una oferta igual o mayor al precio de lista se ignora", () => {
  assert.equal(getVehiclePricing({ precio: 999000, precio_oferta: 999000 }).hasOffer, false);
  assert.equal(getVehiclePricing({ precio: 999000, precio_oferta: 1200000 }).hasOffer, false);
});

test("validación del panel de administración", () => {
  assert.match(validateVehiclePrices("", 0), /obligatorio/);
  assert.match(validateVehiclePrices(0, 0), /obligatorio/);
  assert.equal(validateVehiclePrices(999000, 0), null);
  assert.equal(validateVehiclePrices(999000, ""), null);
  assert.equal(validateVehiclePrices(999000, 979000), null);
  assert.match(validateVehiclePrices(999000, 999000), /menor/);
  assert.match(validateVehiclePrices(999000, -5), /0/);
});

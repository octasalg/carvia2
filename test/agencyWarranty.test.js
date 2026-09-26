import test from "node:test";
import assert from "node:assert/strict";
import {
  hasWarrantyData,
  isValidDateInput,
  normalizeWarrantyFields,
  toDateInputValue,
  warrantyFormState,
  withNormalizedWarranty,
} from "../src/utils/agencyWarranty.js";

test("un auto sin garantía guarda los detalles en null", () => {
  const saved = withNormalizedWarranty({
    marca: "Mazda",
    garantiaAgencia: false,
    garantiaUltimoServicio: "",
    garantiaProximoServicioFecha: "",
    garantiaProximoServicioKm: "",
    garantiaIntervaloServicio: "",
  });
  assert.equal(saved.marca, "Mazda");
  assert.equal(saved.garantiaAgencia, false);
  assert.equal(saved.garantiaUltimoServicio, null);
  assert.equal(saved.garantiaProximoServicioFecha, null);
  assert.equal(saved.garantiaProximoServicioKm, null);
  assert.equal(saved.garantiaIntervaloServicio, null);
});

test("un auto con garantía conserva toda la información capturada", () => {
  const saved = withNormalizedWarranty({
    garantiaAgencia: true,
    garantiaUltimoServicio: "2025-03-10",
    garantiaProximoServicioFecha: "2026-03-10",
    garantiaProximoServicioKm: "60000",
    garantiaIntervaloServicio: "  Cada 10,000 km o 12 meses  ",
  });
  assert.deepEqual(saved, {
    garantiaAgencia: true,
    garantiaUltimoServicio: "2025-03-10",
    garantiaProximoServicioFecha: "2026-03-10",
    garantiaProximoServicioKm: 60000,
    garantiaIntervaloServicio: "Cada 10,000 km o 12 meses",
  });
});

test("al desactivar la garantía los datos anteriores dejan de guardarse", () => {
  const saved = withNormalizedWarranty({
    garantiaAgencia: false,
    garantiaUltimoServicio: "2025-03-10",
    garantiaProximoServicioKm: 60000,
    garantiaIntervaloServicio: "Cada 15,000 km",
  });
  assert.equal(saved.garantiaUltimoServicio, null);
  assert.equal(saved.garantiaProximoServicioKm, null);
  assert.equal(saved.garantiaIntervaloServicio, null);
});

test("las actualizaciones parciales no tocan los datos de garantía", () => {
  const payload = { visible: false };
  assert.equal(withNormalizedWarranty(payload), payload);
  assert.deepEqual(withNormalizedWarranty({ destacado: true }), { destacado: true });
});

test("nunca se envían strings vacíos ni kilometrajes inválidos", () => {
  const saved = normalizeWarrantyFields({
    garantiaAgencia: true,
    garantiaUltimoServicio: "",
    garantiaProximoServicioFecha: "no-es-fecha",
    garantiaProximoServicioKm: -5,
    garantiaIntervaloServicio: "   ",
  });
  assert.equal(saved.garantiaUltimoServicio, null);
  assert.equal(saved.garantiaProximoServicioFecha, null);
  assert.equal(saved.garantiaProximoServicioKm, null);
  assert.equal(saved.garantiaIntervaloServicio, null);
  assert.equal(normalizeWarrantyFields({ garantiaAgencia: true, garantiaProximoServicioKm: 0 }).garantiaProximoServicioKm, 0);
});

test("valida el formato de fecha del formulario", () => {
  assert.equal(isValidDateInput("2025-03-10"), true);
  assert.equal(isValidDateInput("2025-02-30"), false);
  assert.equal(isValidDateInput("10/03/2025"), false);
  assert.equal(isValidDateInput(""), false);
  assert.equal(toDateInputValue("2025-03-10T00:00:00.000Z"), "2025-03-10");
  assert.equal(toDateInputValue(null), "");
});

test("un auto antiguo sin los campos nuevos abre el formulario sin garantía", () => {
  const legacyCar = { id: "c1", marca: "Toyota", modelo: "Corolla" };
  assert.equal(hasWarrantyData(legacyCar), false);
  assert.deepEqual(warrantyFormState(legacyCar), {
    garantiaAgencia: false,
    garantiaUltimoServicio: "",
    garantiaProximoServicioFecha: "",
    garantiaProximoServicioKm: "",
    garantiaIntervaloServicio: "",
  });
});

test("al editar, el formulario recarga la garantía guardada", () => {
  const stored = {
    garantiaAgencia: true,
    garantiaUltimoServicio: "2025-03-10",
    garantiaProximoServicioFecha: null,
    garantiaProximoServicioKm: 60000,
    garantiaIntervaloServicio: "Cada año",
  };
  assert.deepEqual(warrantyFormState(stored), {
    garantiaAgencia: true,
    garantiaUltimoServicio: "2025-03-10",
    garantiaProximoServicioFecha: "",
    garantiaProximoServicioKm: "60000",
    garantiaIntervaloServicio: "Cada año",
  });
});

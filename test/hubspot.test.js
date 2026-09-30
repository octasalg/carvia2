import test from "node:test";
import assert from "node:assert/strict";
import { buildHubspotSubmission } from "../src/lib/hubspot.js";

test("arma los campos de contacto para HubSpot", () => {
  const body = buildHubspotSubmission(
    {
      nombre: "  María López ",
      telefono: "614 123 4567",
      correo: "maria@example.com",
      autoInteres: "Mazda 3 Sedán i Sport",
      mensaje: "¿Sigue disponible?",
      tipoOperacion: "Financiado",
    },
    { autoField: "auto_de_interes", pageUri: "https://carvia.mx/auto/1", pageName: "Mazda 3" },
  );

  assert.deepEqual(body.fields, [
    { objectTypeId: "0-1", name: "firstname", value: "María López" },
    { objectTypeId: "0-1", name: "phone", value: "614 123 4567" },
    { objectTypeId: "0-1", name: "email", value: "maria@example.com" },
    { objectTypeId: "0-1", name: "message", value: "¿Sigue disponible?" },
    { objectTypeId: "0-1", name: "auto_de_interes", value: "Mazda 3 Sedán i Sport" },
    { objectTypeId: "0-1", name: "tipo_de_operacion", value: "Financiado" },
  ]);
  assert.deepEqual(body.context, { pageUri: "https://carvia.mx/auto/1", pageName: "Mazda 3" });
});

test("omite los campos vacíos (correo y mensaje son opcionales)", () => {
  const body = buildHubspotSubmission({ nombre: "Juan", telefono: "6141234567", correo: "", mensaje: "   " });
  assert.deepEqual(
    body.fields.map((f) => f.name),
    ["firstname", "phone"],
  );
  assert.equal(body.context, undefined);
});

test("incluye la cookie de seguimiento cuando existe", () => {
  const body = buildHubspotSubmission({ nombre: "Ana", telefono: "1" }, { hutk: "abc123" });
  assert.deepEqual(body.context, { hutk: "abc123" });
});

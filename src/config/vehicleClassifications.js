export const VEHICLE_CLASSIFICATIONS = Object.freeze([
  { value: "stock_propio", label: "Stock propio" },
  { value: "consignacion_propia", label: "Consignación propia" },
  { value: "aliado", label: "Aliado" },
]);

const CLASSIFICATION_LABELS = Object.fromEntries(
  VEHICLE_CLASSIFICATIONS.map(({ value, label }) => [value, label]),
);

export function getVehicleClassificationLabel(value) {
  return CLASSIFICATION_LABELS[value] || "Sin clasificar";
}

export function isValidVehicleClassification(value) {
  return Object.prototype.hasOwnProperty.call(CLASSIFICATION_LABELS, value);
}

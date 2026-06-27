/* ============================================================
   CARVÍA — Datos de ejemplo (fallback sin Supabase)
   ============================================================ */

export const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || "5216144016149";
export const BRANDS = [
  "Acura", "Alfa Romeo", "Audi", "BMW", "BYD", "Buick", "Cadillac", "Chery",
  "Chevrolet", "Chrysler", "Dodge", "Fiat", "Ford", "GMC", "Genesis",
  "Haval", "Honda", "Hyundai", "Infiniti", "JAC", "Jeep", "Kia",
  "Land Rover", "Lexus", "Lincoln", "MG", "Mazda", "Mercedes-Benz", "Mini",
  "Mitsubishi", "Nissan", "Peugeot", "Porsche", "RAM", "Renault", "SEAT",
  "Subaru", "Suzuki", "Tesla", "Toyota", "Volkswagen", "Volvo",
];
export const TRANSMISSIONS = ["Automática", "Manual"];
export const TYPES = ["Sedán", "Hatchback", "SUV", "Pickup", "Coupé"];

/* Utilidades de formato */
export const mxn = (n) => "$" + Number(n || 0).toLocaleString("es-MX");
export const km = (n) => Number(n || 0).toLocaleString("es-MX") + " km";
export const uid = () => crypto.randomUUID ? crypto.randomUUID() : "c" + Math.random().toString(36).slice(2, 9);
/* Convierte texto en slug legible para URLs/analytics: "Toyota Corolla LE" → "toyota-corolla-le" */
export const slug = (s) =>
  String(s || "")
    .normalize("NFD").replace(new RegExp("[\\u0300-\\u036f]", "g"), "") // quita acentos
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
export const today = () => new Date().toISOString().slice(0, 10);

export const img = (id, w = 1200) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

export function waLink(car) {
  const msg = car
    ? `Hola Carvía, me interesa el ${car.marca} ${car.modelo} ${car.version} ${car.anio} (${mxn(car.precio)}). ¿Sigue disponible?`
    : "Hola Carvía, me gustaría más información sobre sus autos seminuevos.";
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

export const emptyFilters = {
  marca: "", modelo: "", anio: "", precioMin: "", precioMax: "",
  kmMax: "", color: "", transmision: "", tipo: "", q: "",
};

/* Datos de ejemplo para modo sin Supabase */
export const SEED = [
  {
    id: "c1", marca: "Mazda", modelo: "Mazda 3", version: "i Grand Touring", anio: 2021,
    precio: 339000, kilometraje: 38500, transmision: "Automática", motor: "2.5L 4 cil. 186 hp",
    potencia: 186, rendimiento: 14.5,
    tipo: "Hatchback", colorExterior: "Rojo Soul Metálico", colorInterior: "Negro piel",
    descripcion: "Mazda 3 Grand Touring en estado impecable, un solo dueño, servicios de agencia al corriente. Conducción deportiva con acabados premium.",
    equipamiento: ["Quemacocos eléctrico", "Pantalla MZD Connect", "Cámara de reversa", "Head-Up Display", "Asientos en piel", "CarPlay / Android Auto", "Sensores de punto ciego"],
    imagenes: [img("photo-1606664515524-ed2f786a0bd6"), img("photo-1552519507-da3b142c6e3d"), img("photo-1503376780353-7e6692767b70"), img("photo-1542362567-b07e54358753")],
    destacado: true, visible: true, fechaCreacion: "2024-11-02", fechaActualizacion: "2024-11-02",
  },
  {
    id: "c2", marca: "Nissan", modelo: "Versa", version: "Advance", anio: 2022,
    precio: 289000, kilometraje: 24300, transmision: "CVT", motor: "1.6L 4 cil. 118 hp",
    potencia: 118, rendimiento: 18.2,
    tipo: "Sedán", colorExterior: "Gris Plata", colorInterior: "Negro tela",
    descripcion: "Versa Advance modelo reciente con bajo kilometraje. Ideal por su rendimiento de combustible y amplitud interior.",
    equipamiento: ["Pantalla táctil 7\"", "Cámara de reversa", "Control crucero", "Climatizador automático", "Llave inteligente", "Bluetooth"],
    imagenes: [img("photo-1549924231-f129b911e442"), img("photo-1494976388531-d1058494cdd8"), img("photo-1568844293986-8d0400bd4745")],
    destacado: true, visible: true, fechaCreacion: "2024-11-05", fechaActualizacion: "2024-11-05",
  },
  {
    id: "c3", marca: "Kia", modelo: "Forte", version: "EX Pack", anio: 2021,
    precio: 269000, kilometraje: 41200, transmision: "Automática", motor: "1.6L 4 cil. 121 hp",
    potencia: 121, rendimiento: 17.0,
    tipo: "Sedán", colorExterior: "Blanco Perla", colorInterior: "Negro tela",
    descripcion: "Kia Rio EX bien cuidado, perfecto primer auto. Garantía de fábrica vigente y excelente equipamiento de seguridad.",
    equipamiento: ["Pantalla 8\"", "CarPlay / Android Auto", "6 bolsas de aire", "Cámara de reversa", "Faros LED", "Rines de aluminio"],
    imagenes: [img("photo-1583121274602-3e2820c69888"), img("photo-1494976388531-d1058494cdd8"), img("photo-1605559424843-9e4c228bf1c2")],
    destacado: false, visible: true, fechaCreacion: "2024-11-08", fechaActualizacion: "2024-11-08",
  },
  {
    id: "c4", marca: "Toyota", modelo: "Corolla", version: "LE", anio: 2020,
    precio: 319000, kilometraje: 52800, transmision: "CVT", motor: "1.8L 4 cil. 139 hp",
    potencia: 139, rendimiento: 16.1,
    tipo: "Sedán", colorExterior: "Gris Oxford", colorInterior: "Beige tela",
    descripcion: "Toyota Corolla LE, sinónimo de confiabilidad. Mantenimientos documentados y excelente estado general de carrocería.",
    equipamiento: ["Toyota Safety Sense", "Pantalla 8\"", "Control crucero adaptativo", "Cámara de reversa", "Climatizador", "Faros LED"],
    imagenes: [img("photo-1621007947382-bb3c3994e3fb"), img("photo-1619767886558-efdc259cde1a"), img("photo-1503376780353-7e6692767b70")],
    destacado: true, visible: true, fechaCreacion: "2024-11-10", fechaActualizacion: "2024-11-10",
  },
  {
    id: "c5", marca: "Honda", modelo: "Civic", version: "Turbo", anio: 2019,
    precio: 359000, kilometraje: 61500, transmision: "CVT", motor: "1.5L Turbo 174 hp",
    potencia: 174, rendimiento: 15.3,
    tipo: "Sedán", colorExterior: "Negro Cristal", colorInterior: "Negro piel",
    descripcion: "Honda Civic Turbo con motor potente y eficiente. Look deportivo, interior espacioso y tecnología de punta.",
    equipamiento: ["Honda Sensing", "Quemacocos", "Asientos en piel", "Pantalla táctil", "Arranque por botón", "Rines deportivos", "Sensores de proximidad"],
    imagenes: [img("photo-1606152421802-db97b9c7a11b"), img("photo-1552519507-da3b142c6e3d"), img("photo-1542362567-b07e54358753")],
    destacado: false, visible: true, fechaCreacion: "2024-11-12", fechaActualizacion: "2024-11-12",
  },
];

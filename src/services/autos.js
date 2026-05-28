/* ============================================================
   CARVÍA — Servicio CRUD para autos
   Usa Supabase si está configurado; si no, usa datos locales (SEED).
   ============================================================ */
import { supabase, isConfigured } from "../lib/supabase";
import { SEED, uid, today } from "../data/seed";

const PAGE_SIZE = 12;

/* ---------- Mapeo DB (snake_case) ↔ App (camelCase) ---------- */
function fromDB(row) {
  if (!row) return null;
  return {
    ...row,
    colorExterior: row.color_exterior,
    colorInterior: row.color_interior,
    fechaCreacion: row.created_at,
    fechaActualizacion: row.updated_at,
  };
}

function toDB(car) {
  const {
    colorExterior, colorInterior,
    fechaCreacion, fechaActualizacion,
    color_exterior, color_interior,
    created_at, updated_at,
    ...rest
  } = car;
  return {
    ...rest,
    color_exterior: colorExterior ?? color_exterior,
    color_interior: colorInterior ?? color_interior,
  };
}

/* ---------- Filtrado local (fallback sin Supabase) ---------- */
let _localCars = null;

function getLocalCars() {
  if (_localCars) return _localCars;
  try {
    const stored = localStorage.getItem("carvia:inventory:v2");
    _localCars = stored ? JSON.parse(stored) : [...SEED];
  } catch {
    _localCars = [...SEED];
  }
  return _localCars;
}

function saveLocalCars(cars) {
  _localCars = cars;
  try { localStorage.setItem("carvia:inventory:v2", JSON.stringify(cars)); } catch {}
}

function applyLocalFilters(cars, filters) {
  return cars.filter((c) => {
    if (filters.marca && c.marca !== filters.marca) return false;
    if (filters.modelo && !c.modelo.toLowerCase().includes(filters.modelo.toLowerCase())) return false;
    if (filters.anio && String(c.anio) !== String(filters.anio)) return false;
    if (filters.tipo && c.tipo !== filters.tipo) return false;
    if (filters.transmision && c.transmision !== filters.transmision) return false;
    if (filters.color && !(c.colorExterior || "").toLowerCase().includes(filters.color.toLowerCase())) return false;
    if (filters.precioMin && c.precio < Number(filters.precioMin)) return false;
    if (filters.precioMax && c.precio > Number(filters.precioMax)) return false;
    if (filters.kmMax && c.kilometraje > Number(filters.kmMax)) return false;
    if (filters.q) {
      const hay = `${c.marca} ${c.modelo} ${c.version} ${c.tipo} ${c.transmision} ${c.colorExterior} ${c.anio} ${c.descripcion}`.toLowerCase();
      if (!hay.includes(filters.q.toLowerCase())) return false;
    }
    return true;
  });
}

/* =============================================================
   FUNCIONES PÚBLICAS
   ============================================================= */

/**
 * Obtiene autos visibles con filtros opcionales y paginación.
 * @returns {{ data, count, error }}
 */
export async function getAutos({ filters = {}, page = 0, limit = PAGE_SIZE } = {}) {
  if (!isConfigured) {
    const all = getLocalCars().filter((c) => c.visible);
    const filtered = applyLocalFilters(all, filters);
    return {
      data: filtered.slice(0, (page + 1) * limit),
      count: filtered.length,
      error: null,
    };
  }

  try {
    let query = supabase.from("autos").select("*", { count: "exact" }).eq("visible", true);
    query = applySupabaseFilters(query, filters);
    query = query.order("created_at", { ascending: false }).range(0, (page + 1) * limit - 1);
    const { data, count, error } = await query;
    return { data: data?.map(fromDB) ?? [], count: count ?? 0, error };
  } catch (error) {
    return { data: [], count: 0, error };
  }
}

/**
 * Obtiene TODOS los autos (admin) incluyendo ocultos.
 */
export async function getAutosAdmin() {
  if (!isConfigured) {
    const cars = getLocalCars();
    return { data: cars, count: cars.length, error: null };
  }
  try {
    const { data, count, error } = await supabase
      .from("autos")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });
    return { data: data?.map(fromDB) ?? [], count: count ?? 0, error };
  } catch (error) {
    return { data: [], count: 0, error };
  }
}

/**
 * Obtiene un auto por ID.
 */
export async function getAutoById(id) {
  if (!isConfigured) {
    const car = getLocalCars().find((c) => c.id === id) ?? null;
    return { data: car, error: car ? null : new Error("No encontrado") };
  }
  try {
    const { data, error } = await supabase.from("autos").select("*").eq("id", id).single();
    return { data: fromDB(data), error };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Crea un nuevo auto.
 */
export async function createAuto(carData) {
  if (!isConfigured) {
    const newCar = { ...carData, id: uid(), fechaCreacion: today(), fechaActualizacion: today() };
    const cars = getLocalCars();
    saveLocalCars([newCar, ...cars]);
    return { data: newCar, error: null };
  }
  try {
    const { data, error } = await supabase.from("autos").insert(toDB(carData)).select().single();
    return { data: fromDB(data), error };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Actualiza un auto existente.
 */
export async function updateAuto(id, carData) {
  if (!isConfigured) {
    const cars = getLocalCars().map((c) =>
      c.id === id ? { ...c, ...carData, fechaActualizacion: today() } : c
    );
    saveLocalCars(cars);
    return { data: cars.find((c) => c.id === id), error: null };
  }
  try {
    const { data, error } = await supabase
      .from("autos")
      .update(toDB(carData))
      .eq("id", id)
      .select()
      .single();
    return { data: fromDB(data), error };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Elimina un auto.
 */
export async function deleteAuto(id) {
  if (!isConfigured) {
    saveLocalCars(getLocalCars().filter((c) => c.id !== id));
    return { error: null };
  }
  try {
    const { error } = await supabase.from("autos").delete().eq("id", id);
    return { error };
  } catch (error) {
    return { error };
  }
}

/**
 * Cambia la visibilidad de un auto.
 */
export async function toggleVisible(id, visible) {
  return updateAuto(id, { visible });
}

/**
 * Cambia el estado destacado de un auto.
 */
export async function toggleDestacado(id, destacado) {
  return updateAuto(id, { destacado });
}

/**
 * Retorna las marcas únicas de autos visibles en el inventario.
 * @returns {{ data: string[], error }}
 */
export async function getAvailableBrands() {
  if (!isConfigured) {
    const brands = [...new Set(getLocalCars().filter((c) => c.visible).map((c) => c.marca))]
      .filter(Boolean)
      .sort();
    return { data: brands, error: null };
  }
  try {
    const { data, error } = await supabase
      .from("autos")
      .select("marca")
      .eq("visible", true);
    const brands = [...new Set((data || []).map((r) => r.marca))].filter(Boolean).sort();
    return { data: brands, error };
  } catch (error) {
    return { data: [], error };
  }
}

/**
 * Guarda un mensaje de contacto en Supabase.
 */
export async function saveContacto({ nombre, telefono, correo, autoInteres, mensaje }) {
  if (!isConfigured) {
    console.info("[Contacto] Guardado en modo demo:", { nombre, telefono });
    return { error: null };
  }
  try {
    const { error } = await supabase.from("contactos").insert({
      nombre, telefono, correo,
      auto_interes: autoInteres,
      mensaje,
    });
    return { error };
  } catch (error) {
    return { error };
  }
}

/* ---------- Helper: filtros en Supabase ---------- */
function applySupabaseFilters(query, filters) {
  if (filters.marca) query = query.eq("marca", filters.marca);
  if (filters.modelo) query = query.ilike("modelo", `%${filters.modelo}%`);
  if (filters.anio) query = query.eq("anio", Number(filters.anio));
  if (filters.tipo) query = query.eq("tipo", filters.tipo);
  if (filters.transmision) query = query.eq("transmision", filters.transmision);
  if (filters.color) query = query.ilike("color_exterior", `%${filters.color}%`);
  if (filters.precioMin) query = query.gte("precio", Number(filters.precioMin));
  if (filters.precioMax) query = query.lte("precio", Number(filters.precioMax));
  if (filters.kmMax) query = query.lte("kilometraje", Number(filters.kmMax));
  if (filters.q) {
    query = query.or(
      `marca.ilike.%${filters.q}%,modelo.ilike.%${filters.q}%,version.ilike.%${filters.q}%,descripcion.ilike.%${filters.q}%,color_exterior.ilike.%${filters.q}%`
    );
  }
  return query;
}

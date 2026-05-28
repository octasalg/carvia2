/* ============================================================
   CARVÍA — Servicio para las fotos del Hero de la página de inicio
   Persiste en localStorage (demo) o en Supabase tabla settings
   (key = 'hero_images') cuando está configurado.
   ============================================================ */
import { supabase, isConfigured } from "../lib/supabase";

const LOCAL_KEY = "carvia:hero:images";
const MAX_IMAGES = 10;

/**
 * Obtiene las URLs de las fotos del hero.
 * @returns {Promise<{ data: string[], error: any }>}
 */
export async function getHeroImages() {
  if (!isConfigured) {
    try {
      const stored = localStorage.getItem(LOCAL_KEY);
      const data = stored ? JSON.parse(stored) : [];
      return { data: Array.isArray(data) ? data : [], error: null };
    } catch {
      return { data: [], error: null };
    }
  }

  try {
    const { data, error } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "hero_images")
      .single();

    if (error && error.code === "PGRST116") {
      // Fila no existe todavía → array vacío
      return { data: [], error: null };
    }
    if (error) return { data: [], error };

    const urls = Array.isArray(data?.value) ? data.value : [];
    return { data: urls, error: null };
  } catch (error) {
    return { data: [], error };
  }
}

/**
 * Guarda las URLs de las fotos del hero (máximo MAX_IMAGES).
 * @param {string[]} urls
 * @returns {Promise<{ error: any }>}
 */
export async function saveHeroImages(urls) {
  const limited = (urls || []).slice(0, MAX_IMAGES);

  if (!isConfigured) {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(limited));
      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  try {
    const { error } = await supabase
      .from("settings")
      .upsert({ key: "hero_images", value: limited }, { onConflict: "key" });
    return { error };
  } catch (error) {
    return { error };
  }
}

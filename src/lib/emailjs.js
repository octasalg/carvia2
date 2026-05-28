/* ============================================================
   CARVÍA — Configuración EmailJS
   ============================================================ */
import emailjs from "@emailjs/browser";

export const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || "";
export const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || "";
export const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || "";

export const isConfigured = !!(SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY);

/**
 * Envía un correo de contacto via EmailJS.
 * Si EmailJS no está configurado, solo loguea en consola.
 */
export async function sendContactEmail({ nombre, telefono, correo, autoInteres, mensaje }) {
  if (!isConfigured) {
    console.info("[EmailJS] No configurado. Mensaje recibido:", { nombre, telefono, correo });
    return { status: "demo" };
  }

  return emailjs.send(
    SERVICE_ID,
    TEMPLATE_ID,
    {
      from_name: nombre,
      phone: telefono,
      reply_to: correo,
      auto_interes: autoInteres || "Sin especificar",
      message: mensaje || "",
    },
    PUBLIC_KEY
  );
}

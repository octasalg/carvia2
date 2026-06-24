/* ============================================================
   CARVÍA — Seguimiento de páginas para Google Analytics (GA4)
   Envía un evento page_view cada vez que cambia la ruta.
   Necesario porque es una SPA: el navegador no recarga al
   navegar entre secciones, así que GA no lo detecta solo.
   ============================================================ */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const GA_MEASUREMENT_ID = "G-FGLBJB9JBF";

export default function usePageTracking() {
  const location = useLocation();

  useEffect(() => {
    if (typeof window.gtag !== "function") return;

    // El detalle de auto (/auto/:id) envía su propio page_view con el nombre del
    // auto ya cargado, así que aquí lo omitimos para no mandar uno con título genérico.
    if (location.pathname.startsWith("/auto/")) return;

    window.gtag("event", "page_view", {
      page_path: location.pathname + location.search,
      page_location: window.location.href,
      page_title: document.title,
      send_to: GA_MEASUREMENT_ID,
    });
  }, [location]);
}

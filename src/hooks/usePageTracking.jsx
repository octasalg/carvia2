/* ============================================================
   CARVÍA — Seguimiento de páginas para Google Analytics (GA4)
   Envía un evento page_view cada vez que cambia la ruta.
   Necesario porque es una SPA: el navegador no recarga al
   navegar entre secciones, así que GA no lo detecta solo.
   ============================================================ */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackMetaPageView } from "../meta/metaPixel";

const GA_MEASUREMENT_ID = "G-FGLBJB9JBF";

export default function usePageTracking() {
  const location = useLocation();

  useEffect(() => {
    if (typeof window.gtag === "function" && !location.pathname.startsWith("/auto/")) {
      window.gtag("event", "page_view", {
        page_path: location.pathname + location.search,
        page_location: window.location.href,
        page_title: document.title,
        send_to: GA_MEASUREMENT_ID,
      });
    }

    // El HTML ya registra la primera carga; location.key evita duplicarla y
    // permite registrar una sola PageView en cada navegación posterior de la SPA.
    trackMetaPageView(location.key);
  }, [location]);
}

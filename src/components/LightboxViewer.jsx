import { useEffect, useRef, useCallback, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Visor de fotos fullscreen.
 * Props:
 *   - images: string[]
 *   - initialIndex: number
 *   - open: boolean
 *   - onClose: () => void
 *   - autoName: string
 */
export default function LightboxViewer({ images = [], initialIndex = 0, open, onClose, autoName = "" }) {
  const [current, setCurrent] = useState(initialIndex);
  const [animating, setAnimating] = useState(false);
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);

  // Sincronizar índice cuando se abre
  useEffect(() => {
    if (open) setCurrent(initialIndex);
  }, [open, initialIndex]);

  // Bloquear scroll del body cuando lightbox está abierto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const navigate = useCallback((dir) => {
    if (animating || images.length <= 1) return;
    setAnimating(true);
    setCurrent((prev) => (prev + dir + images.length) % images.length);
    setTimeout(() => setAnimating(false), 220);
  }, [animating, images.length]);

  // Teclado
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") navigate(-1);
      if (e.key === "ArrowRight") navigate(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, navigate]);

  // Touch/swipe
  function onTouchStart(e) { touchStartX.current = e.touches[0].clientX; }
  function onTouchMove(e) { touchEndX.current = e.touches[0].clientX; }
  function onTouchEnd() {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) navigate(diff > 0 ? 1 : -1);
    touchStartX.current = null;
    touchEndX.current = null;
  }

  if (!open) return null;

  return (
    <div
      className="lightbox-overlay"
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Header */}
      <div className="lightbox-header" onClick={(e) => e.stopPropagation()}>
        <span className="lightbox-name">{autoName}</span>
        <span className="lightbox-counter">{current + 1} / {images.length}</span>
        <button className="lightbox-close" onClick={onClose} aria-label="Cerrar">
          <X size={22} />
        </button>
      </div>

      {/* Imagen principal */}
      <div className="lightbox-main" onClick={(e) => e.stopPropagation()}>
        {images.length > 1 && (
          <button
            className="lightbox-nav lightbox-prev"
            onClick={(e) => { e.stopPropagation(); navigate(-1); }}
            aria-label="Foto anterior"
          >
            <ChevronLeft size={28} />
          </button>
        )}

        <div className={`lightbox-img-wrap ${animating ? "lb-fade" : ""}`}>
          <img
            src={images[current]}
            alt={`${autoName} foto ${current + 1}`}
            className="lightbox-img"
            loading="eager"
            onError={(e) => { e.currentTarget.style.opacity = "0"; }}
          />
        </div>

        {images.length > 1 && (
          <button
            className="lightbox-nav lightbox-next"
            onClick={(e) => { e.stopPropagation(); navigate(1); }}
            aria-label="Foto siguiente"
          >
            <ChevronRight size={28} />
          </button>
        )}
      </div>

      {/* Miniaturas (solo desktop) */}
      {images.length > 1 && (
        <div className="lightbox-thumbs" onClick={(e) => e.stopPropagation()}>
          {images.map((src, i) => (
            <button
              key={i}
              className={`lightbox-thumb ${i === current ? "active" : ""}`}
              onClick={() => setCurrent(i)}
              aria-label={`Ver foto ${i + 1}`}
            >
              <img src={src} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

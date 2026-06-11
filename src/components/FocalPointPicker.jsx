/* ============================================================
   CARVÍA — Selector de punto focal de la foto de portada
   Permite elegir qué parte de la foto queda centrada en el
   recuadro del catálogo (object-position). Clic/arrastrar sobre
   la imagen + sliders finos de ajuste. Vista previa en vivo.
   ============================================================ */
import { useRef, useState, useCallback } from "react";
import { RotateCcw } from "lucide-react";

const DEFAULT = "50% 50%";

function clamp(n) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** "50% 30%" -> { x: 50, y: 30 } */
function parsePos(value) {
  const m = String(value || DEFAULT).match(/(-?\d+(?:\.\d+)?)%?\s+(-?\d+(?:\.\d+)?)%?/);
  if (!m) return { x: 50, y: 50 };
  return { x: clamp(parseFloat(m[1])), y: clamp(parseFloat(m[2])) };
}

/**
 * Props:
 *  - image: string   URL de la foto de portada (primera imagen)
 *  - value: string   object-position actual, ej. "50% 30%"
 *  - onChange: (value: string) => void
 */
export default function FocalPointPicker({ image, value, onChange }) {
  const { x, y } = parsePos(value);
  const pos = `${x}% ${y}%`;
  const wrapRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const setFromEvent = useCallback(
    (e) => {
      const el = wrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const px = clamp(((e.clientX - rect.left) / rect.width) * 100);
      const py = clamp(((e.clientY - rect.top) / rect.height) * 100);
      onChange(`${px}% ${py}%`);
    },
    [onChange]
  );

  if (!image) return null;

  return (
    <div className="focal">
      <div className="focal-editors">
        {/* Imagen completa: clic/arrastrar para marcar el punto focal */}
        <div
          ref={wrapRef}
          className="focal-image"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            setDragging(true);
            setFromEvent(e);
          }}
          onPointerMove={(e) => dragging && setFromEvent(e)}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
          title="Haz clic o arrastra para elegir qué parte se verá en el catálogo"
        >
          <img src={image} alt="" draggable={false} />
          <span className="focal-marker" style={{ left: `${x}%`, top: `${y}%` }} />
        </div>

        {/* Vista previa del recorte tal como se verá en el catálogo */}
        <div className="focal-preview-box">
          <span className="focal-preview-label">Vista en catálogo</span>
          <div className="focal-preview">
            <img src={image} alt="" style={{ objectPosition: pos }} draggable={false} />
          </div>
        </div>
      </div>

      {/* Sliders de ajuste fino */}
      <div className="focal-sliders">
        <label>
          ↔ Horizontal
          <input
            type="range" min="0" max="100" value={x}
            onChange={(e) => onChange(`${clamp(+e.target.value)}% ${y}%`)}
          />
        </label>
        <label>
          ↕ Vertical
          <input
            type="range" min="0" max="100" value={y}
            onChange={(e) => onChange(`${x}% ${clamp(+e.target.value)}%`)}
          />
        </label>
        <button type="button" className="btn btn-ghost focal-reset" onClick={() => onChange(DEFAULT)}>
          <RotateCcw size={13} /> Centrar
        </button>
      </div>
    </div>
  );
}

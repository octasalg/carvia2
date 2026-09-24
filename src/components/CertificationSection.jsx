import { BadgeCheck, CalendarPlus, ClipboardCheck, ShieldCheck } from "lucide-react";
import Reveal from "./Reveal";

const CERTIFICATION_BENEFITS = [
  {
    icon: BadgeCheck,
    text: "Procedencia y documentación validadas",
  },
  {
    icon: ClipboardCheck,
    text: "Inspección mecánica y estética de 150 puntos",
  },
  {
    icon: ShieldCheck,
    text: "Garantía de 12 meses o 20,000 km",
  },
  {
    icon: CalendarPlus,
    text: "Opción de extender garantía hasta por 3 años más*",
  },
];

export default function CertificationSection({ compact = false }) {
  return (
    <Reveal
      as="section"
      className={`certification-panel${compact ? " certification-panel-compact" : ""}`}
      aria-labelledby={compact ? "certification-title-detail" : "certification-title-home"}
    >
      <div className="certification-visual">
        <img
          src="/images/certificado-carvia.png"
          alt="Sello Certificado x Carvía"
          loading="lazy"
        />
      </div>

      <div className="certification-copy">
        <p className="certification-eyebrow">El estándar de nuestros vehículos</p>
        <h2 id={compact ? "certification-title-detail" : "certification-title-home"}>
          Tu próximo auto. <span>Certificado x Carvía</span>
        </h2>
        <p className="certification-description">
          Un auto Certificado x Carvía pasó por nuestro proceso de validación,
          inspección y preparación, y cuenta con respaldo después de la compra.
        </p>
        <p className="certification-includes">Todos nuestros vehículos incluyen:</p>

        <ul className="certification-benefits">
          {CERTIFICATION_BENEFITS.map(({ icon: Icon, text }) => (
            <li key={text}>
              <span className="certification-benefit-icon" aria-hidden="true">
                <Icon size={18} />
              </span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </div>
    </Reveal>
  );
}

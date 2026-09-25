import { useNavigate } from "react-router-dom";
import { Gauge, Settings2, FileText, Star, Car, MessageCircle, Calendar } from "lucide-react";
import Reveal from "./Reveal";
import { mxn, km, waLink } from "../data/seed";
import { calculateFinancing, financingCurrencyFormatter } from "../config/financing";
import { trackMetaContact } from "../meta/metaPixel";

export default function CarCard({ car, delay = 0, showCertificationBanner = false }) {
  const navigate = useNavigate();
  const financing = calculateFinancing(car.precio, car.anio);
  const monthlyPayment = financing?.monthlyPayment;
  const hasValidMonthlyPayment = Number.isFinite(monthlyPayment) && monthlyPayment > 0;

  return (
    <Reveal delay={delay} className="card">
      <div className="card-media" onClick={() => navigate(`/auto/${car.id}`)}>
        <img
          className="card-photo"
          src={car.imagenes?.[0]}
          alt={`${car.marca} ${car.modelo}`}
          loading="lazy"
          style={{ objectPosition: car.coverPosition || "50% 50%" }}
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
        <div className="card-media-fallback"><Car size={40} /></div>
        {showCertificationBanner && (
          <div className="card-certification-banner">
            <img
              src="/images/certificado-carvia-banner.png"
              alt="Certificado x CARVIA"
            />
          </div>
        )}
        {car.vendido && <span className="card-ribbon">Vendido</span>}
        {car.precio_especial && <span className="card-ribbon card-ribbon-left">Precio especial</span>}
        <div className={`card-badges${car.precio_especial ? " card-badges-lowered" : ""}`}>
          {car.destacado && <span className="card-badge tag-destacado"><Star size={12} /> Destacado</span>}
          {car.oferta && <span className="card-badge tag-oferta">🔥 Oferta</span>}
          {car.proximamente && <span className="card-badge tag-proximamente">⏳ Próximamente</span>}
        </div>
        {!car.vendido && <span className="card-year">{car.anio}</span>}
      </div>
      <div className="card-body">
        <div className="card-top">
          <div className="card-identity">
            <p className="card-brand">{car.marca}</p>
            <h3 className="card-model">{car.modelo} <span>{car.version}</span></h3>
          </div>
          <div className="card-price-block">
            <p className="card-price">{mxn(car.precio)} <span>MXN</span></p>
            {hasValidMonthlyPayment && (
              <p className="card-monthly-payment">
                Desde <strong>{financingCurrencyFormatter.format(monthlyPayment)}</strong>/mes
              </p>
            )}
          </div>
        </div>
        <div className="card-specs">
          {car.factura && <span><FileText size={14} /> {car.factura}</span>}
          <span><Calendar size={14} /> {car.anio}</span>
          <span><Gauge size={14} /> {km(car.kilometraje)}</span>
          <span><Settings2 size={14} /> {car.transmision}</span>
        </div>
        <div className="card-actions">
          <button className="btn btn-dark" onClick={() => navigate(`/auto/${car.id}`)}>
            Ver detalles
          </button>
          <a className="btn btn-wa" href={waLink(car)} target="_blank" rel="noreferrer" onClick={() => trackMetaContact(car, "catalog_card")}>
            <MessageCircle size={16} /> WhatsApp
          </a>
        </div>
      </div>
    </Reveal>
  );
}

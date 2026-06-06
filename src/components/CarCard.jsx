import { useNavigate } from "react-router-dom";
import { Gauge, Settings2, FileText, Star, Car, MessageCircle, Calendar } from "lucide-react";
import Reveal from "./Reveal";
import { mxn, km, waLink } from "../data/seed";

export default function CarCard({ car, delay = 0 }) {
  const navigate = useNavigate();

  return (
    <Reveal delay={delay} className="card">
      <div className="card-media" onClick={() => navigate(`/auto/${car.id}`)}>
        <img
          src={car.imagenes?.[0]}
          alt={`${car.marca} ${car.modelo}`}
          loading="lazy"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
        <div className="card-media-fallback"><Car size={40} /></div>
        <div className="card-badges">
          {car.destacado && <span className="card-badge tag-destacado"><Star size={12} /> Destacado</span>}
          {car.oferta && <span className="card-badge tag-oferta">🔥 Oferta</span>}
          {car.proximamente && <span className="card-badge tag-proximamente">⏳ Próximamente</span>}
        </div>
        <span className="card-year">{car.anio}</span>
      </div>
      <div className="card-body">
        <div className="card-top">
          <div>
            <p className="card-brand">{car.marca}</p>
            <h3 className="card-model">{car.modelo} <span>{car.version}</span></h3>
          </div>
          <p className="card-price">{mxn(car.precio)}</p>
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
          <a className="btn btn-wa" href={waLink(car)} target="_blank" rel="noreferrer">
            <MessageCircle size={16} /> WhatsApp
          </a>
        </div>
      </div>
    </Reveal>
  );
}

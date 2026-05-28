import { useNavigate } from "react-router-dom";
import { MessageCircle, Lock } from "lucide-react";
import Logo from "./Logo";
import { waLink } from "../data/seed";

export default function Footer() {
  const navigate = useNavigate();

  function scrollTo(id) {
    if (window.location.pathname !== "/") {
      navigate("/");
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 120);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }
  }

  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <Logo size={28} />
          <p>Tu agencia de autos seminuevos premium. Confianza, tecnología y el mejor servicio en cada compra.</p>
          <a className="btn btn-wa" href={waLink(null)} target="_blank" rel="noreferrer">
            <MessageCircle size={16} /> Cotiza por WhatsApp
          </a>
        </div>
        <div className="footer-col">
          <h4>Explora</h4>
          <button onClick={() => navigate("/catalogo")}>Catálogo</button>
          <button onClick={() => scrollTo("servicios")}>Servicios</button>
          <button onClick={() => scrollTo("financiamiento")}>Financiamiento</button>
          <button onClick={() => scrollTo("contacto")}>Contacto</button>
        </div>
        <div className="footer-col">
          <h4>Contacto</h4>
          <span>Av. Prol. Teófilo Borunda 10800</span>
          <span>Col. Labor de Terrazas, Chihuahua, Chih.</span>
          <span>(614) 401 6149</span>
          <span>hola@carvia.mx</span>
        </div>
      </div>
      <div className="footer-bottom container">
        <span>© {new Date().getFullYear()} Carvía. Todos los derechos reservados.</span>
        <button className="footer-admin" onClick={() => navigate("/admin/login")}>
          <Lock size={12} /> Acceso administrador
        </button>
      </div>
    </footer>
  );
}

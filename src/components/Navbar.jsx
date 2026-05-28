import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, ChevronRight, Calendar } from "lucide-react";
import Logo from "./Logo";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Cerrar menú al cambiar ruta
  useEffect(() => { setOpen(false); }, [location.pathname]);

  function scrollToSection(id) {
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 120);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }
    setOpen(false);
  }

  const links = [
    { l: "Inicio", action: () => navigate("/") },
    { l: "Catálogo", action: () => navigate("/catalogo") },
    { l: "Servicios", action: () => scrollToSection("servicios") },
    { l: "Financiamiento", action: () => scrollToSection("financiamiento") },
    { l: "Contacto", action: () => scrollToSection("contacto") },
  ];

  return (
    <header className={`nav ${scrolled ? "nav-scrolled" : ""}`}>
      <div className="nav-inner">
        <Logo size={26} />
        <nav className="nav-links">
          {links.map((x) => (
            <button key={x.l} className="nav-link" onClick={x.action}>{x.l}</button>
          ))}
        </nav>
        <div className="nav-right">
          <button
            className="btn btn-primary nav-cta"
            onClick={() => scrollToSection("contacto")}
          >
            <Calendar size={16} /> Agenda tu cita
          </button>
          <button className="nav-burger" onClick={() => setOpen(!open)} aria-label="Menú">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
      <div className={`nav-mobile ${open ? "open" : ""}`}>
        {links.map((x) => (
          <button key={x.l} className="nav-mlink" onClick={x.action}>
            {x.l} <ChevronRight size={16} />
          </button>
        ))}
        <button
          className="btn btn-primary"
          onClick={() => scrollToSection("contacto")}
        >
          <Calendar size={16} /> Agenda tu cita
        </button>
      </div>
    </header>
  );
}

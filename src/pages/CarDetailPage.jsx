import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  ChevronLeft, ChevronRight, Star, Car, Calendar, Gauge,
  Settings2, Fuel, Palette, MessageCircle, Check, ArrowRight, Maximize2, FileText, Share2
} from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import LightboxViewer from "../components/LightboxViewer";
import { getAutoById } from "../services/autos";
import { mxn, km, waLink, slug } from "../data/seed";
import { sendContactEmail } from "../lib/emailjs";
import { saveContacto } from "../services/autos";
import toast from "react-hot-toast";

export default function CarDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImg, setActiveImg] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
    loadCar();
  }, [id]);

  async function loadCar() {
    setLoading(true);
    setError(null);
    const { data, error } = await getAutoById(id);
    if (error || !data) {
      setError(error || new Error("No encontrado"));
      setLoading(false);
      return;
    }
    setCar(data);
    setLoading(false);

    // Analytics (GA4): enviamos el page_view aquí, ya con el auto cargado, usando una
    // ruta "virtual" legible (/auto/marca-modelo-version-anio) en lugar del id. Así el
    // reporte estándar de "Páginas y pantallas" muestra el nombre del auto, no un id.
    if (typeof window.gtag === "function") {
      const nombre = `${data.marca} ${data.modelo} ${data.version} ${data.anio}`;
      window.gtag("event", "page_view", {
        page_path: `/auto/${slug(nombre)}`,
        page_location: window.location.href,
        page_title: `${nombre} | Carvía`,
        send_to: "G-FGLBJB9JBF",
      });
    }
  }

  function openLightbox(index) {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }

  async function handleShare() {
    const url = window.location.href;
    const title = car ? `${car.marca} ${car.modelo} ${car.version} ${car.anio} | Carvía` : "Carvía";
    const text = car ? `Mira este ${car.marca} ${car.modelo} ${car.anio} en Carvía` : "";
    // Web Share API (móvil): abre el menú nativo (WhatsApp, etc.)
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err) {
        if (err?.name === "AbortError") return; // el usuario canceló
      }
    }
    // Fallback (escritorio): copiar el enlace al portapapeles
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Enlace copiado");
    } catch {
      toast.error("No se pudo compartir el enlace");
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="page" style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="spinner" />
        </div>
        <Footer />
      </>
    );
  }

  if (error || !car) {
    return (
      <>
        <Navbar />
        <div className="page">
          <div className="container" style={{ paddingTop: 60 }}>
            <div className="error-state">
              <Car size={48} />
              <h3>Auto no encontrado</h3>
              <p>El auto que buscas no existe o ya no está disponible.</p>
              <button className="btn btn-primary" onClick={() => navigate("/catalogo")}>
                Ver catálogo
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const imgs = car.imagenes?.length ? car.imagenes : [""];
  const autoName = `${car.marca} ${car.modelo} ${car.version} ${car.anio}`;

  return (
    <>
      <Helmet>
        <title>{autoName} — {mxn(car.precio)} | Carvía</title>
        <meta name="description" content={`${autoName}. ${km(car.kilometraje)}, transmisión ${car.transmision}. ${car.descripcion?.slice(0, 120)}…`} />
        <meta property="og:title" content={`${autoName} — ${mxn(car.precio)} | Carvía`} />
        <meta property="og:description" content={car.descripcion || ""} />
        {imgs[0] && <meta property="og:image" content={imgs[0]} />}
        <meta property="og:type" content="product" />
        <meta property="og:url" content={typeof window !== "undefined" ? window.location.href : ""} />
        <meta name="twitter:card" content="summary_large_image" />
        {imgs[0] && <meta name="twitter:image" content={imgs[0]} />}
      </Helmet>

      <Navbar />

      <div className="page detail">
        <div className="container">
          <div className="detail-top">
            <button className="back-btn" onClick={() => navigate(-1)}>
              <ChevronLeft size={18} /> Regresar al catálogo
            </button>
            <button className="share-btn" onClick={handleShare} aria-label="Compartir">
              <Share2 size={16} /> Compartir
            </button>
          </div>

          <div className="detail-grid">
            {/* Galería */}
            <div className="detail-gallery">
              <div className="gallery-main" style={{ cursor: "pointer" }} onClick={() => openLightbox(activeImg)}>
                <img
                  src={imgs[activeImg]}
                  alt={autoName}
                  loading="eager"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
                <div className="gallery-fallback"><Car size={56} /></div>
                {car.destacado && <span className="card-badge"><Star size={12} /> Destacado</span>}
                {/* Botón expand */}
                <button className="gallery-expand" onClick={(e) => { e.stopPropagation(); openLightbox(activeImg); }} aria-label="Ver en pantalla completa">
                  <Maximize2 size={16} />
                </button>
                {imgs.length > 1 && (
                  <>
                    <button className="gallery-nav left" onClick={(e) => { e.stopPropagation(); setActiveImg((activeImg - 1 + imgs.length) % imgs.length); }}>
                      <ChevronLeft size={20} />
                    </button>
                    <button className="gallery-nav right" onClick={(e) => { e.stopPropagation(); setActiveImg((activeImg + 1) % imgs.length); }}>
                      <ChevronRight size={20} />
                    </button>
                  </>
                )}
              </div>
              {imgs.length > 1 && (
                <div className="gallery-thumbs">
                  {imgs.map((src, i) => (
                    <button
                      key={i}
                      className={`thumb ${i === activeImg ? "active" : ""}`}
                      onClick={() => { setActiveImg(i); openLightbox(i); }}
                    >
                      <img src={src} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="detail-info">
              <p className="detail-brand">{car.marca} · {car.anio}</p>
              <h1 className="detail-title">{car.modelo} <span>{car.version}</span></h1>
              <p className="detail-price">{mxn(car.precio)}</p>
              <div className="detail-specs">
                {car.factura && <div><FileText size={18} /><span>Factura</span><strong>{car.factura}</strong></div>}
                <div><Calendar size={18} /><span>Año</span><strong>{car.anio}</strong></div>
                <div><Gauge size={18} /><span>Kilometraje</span><strong>{km(car.kilometraje)}</strong></div>
                <div><Settings2 size={18} /><span>Transmisión</span><strong>{car.transmision}</strong></div>
                <div><Fuel size={18} /><span>Motor</span><strong>{car.motor}</strong></div>
                <div><Palette size={18} /><span>Color ext.</span><strong>{car.colorExterior}</strong></div>
              </div>
              <div className="detail-cta">
                <a className="btn btn-wa btn-lg" href={waLink(car)} target="_blank" rel="noreferrer">
                  <MessageCircle size={18} /> Cotizar por WhatsApp
                </a>
                <button className="btn btn-ghost btn-lg" onClick={() => document.getElementById("detail-contacto")?.scrollIntoView({ behavior: "smooth" })}>
                  Solicitar info
                </button>
              </div>
            </div>
          </div>

          {/* Equipamiento */}
          {car.equipamiento?.length > 0 && (
            <div className="detail-body">
              <div className="detail-section">
                <h2>Equipamiento</h2>
                <div className="equip-grid">
                  {car.equipamiento.map((e) => (
                    <span key={e} className="equip"><Check size={14} /> {e}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Formulario de contacto */}
          <div className="detail-contact" id="detail-contacto">
            <DetailContactForm car={car} />
          </div>
        </div>
      </div>

      {/* Lightbox */}
      <LightboxViewer
        images={imgs}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        autoName={autoName}
      />

      <Footer />
    </>
  );
}

/* ---- Formulario de contacto en detalle ---- */
function DetailContactForm({ car }) {
  const [form, setForm] = useState({ nombre: "", tel: "", correo: "", msg: "" });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit() {
    if (!form.nombre || !form.tel) return;
    setLoading(true);
    try {
      await Promise.allSettled([
        sendContactEmail({ nombre: form.nombre, telefono: form.tel, correo: form.correo, autoInteres: `${car.marca} ${car.modelo} ${car.version}`, mensaje: form.msg }),
        saveContacto({ nombre: form.nombre, telefono: form.tel, correo: form.correo, autoInteres: `${car.marca} ${car.modelo} ${car.version}`, mensaje: form.msg }),
      ]);
      setSent(true);
      toast.success("¡Mensaje enviado!");
    } catch {
      toast.error("Error al enviar. Intenta por WhatsApp.");
    }
    setLoading(false);
  }

  return (
    <div className="detail-form-card">
      <div className="dform-copy">
        <h3>¿Te interesa este {car.marca}?</h3>
        <p>Déjanos tus datos y un asesor te contactará, o cotiza al instante por WhatsApp.</p>
        <a className="btn btn-wa btn-lg" href={waLink(car)} target="_blank" rel="noreferrer">
          <MessageCircle size={18} /> Cotizar este auto
        </a>
      </div>
      <div className="dform-fields">
        {sent ? (
          <div className="form-sent">
            <div className="form-sent-icon"><Check size={28} /></div>
            <h3>¡Mensaje enviado!</h3>
            <p>Te contactaremos pronto.</p>
          </div>
        ) : (
          <>
            <div className="field"><label>Nombre</label><input value={form.nombre} onChange={set("nombre")} placeholder="Tu nombre" /></div>
            <div className="form-row">
              <div className="field"><label>Teléfono</label><input value={form.tel} onChange={set("tel")} placeholder="10 dígitos" /></div>
              <div className="field"><label>Correo</label><input value={form.correo} onChange={set("correo")} placeholder="email" /></div>
            </div>
            <div className="field"><label>Mensaje</label>
              <textarea rows={2} value={form.msg} onChange={set("msg")} placeholder={`Me interesa el ${car.modelo}…`} />
            </div>
            <button className="btn btn-primary" onClick={submit} disabled={loading}>
              {loading ? "Enviando…" : <>Enviar <ArrowRight size={16} /></>}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

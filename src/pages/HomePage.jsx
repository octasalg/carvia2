import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Star, Sparkles, ShieldCheck, BadgeCheck, Wallet, Award,
  TrendingUp, ArrowRight, Check, MessageCircle, Quote, Car
} from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Reveal from "../components/Reveal";
import toast from "react-hot-toast";
import { sendContactEmail } from "../lib/emailjs";
import { saveContacto, getAvailableBrands } from "../services/autos";
import Counter from "../components/Counter";
import CarCard from "../components/CarCard";
import SearchPanel from "../components/SearchPanel";
import { SkeletonGrid } from "../components/SkeletonCard";
import { getAutos } from "../services/autos";
import { getHeroImages } from "../services/heroImages";
import { BRANDS, emptyFilters, img, waLink, mxn } from "../data/seed";

const DEFAULT_HERO = img("photo-1503376780353-7e6692767b70", 900);

export default function HomePage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(emptyFilters);
  const [availableBrands, setAvailableBrands] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [heroImages, setHeroImages] = useState([]);
  const [heroIdx, setHeroIdx] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
    loadFeatured();
    getHeroImages().then(({ data }) => setHeroImages(Array.isArray(data) && data.length > 0 ? data : []));
    getAvailableBrands().then(({ data }) => { if (data?.length) setAvailableBrands(data); });
  }, []);

  // Auto-rotate carousel when there are multiple hero images
  useEffect(() => {
    if (heroImages.length <= 1) return;
    const t = setInterval(() => setHeroIdx((i) => (i + 1) % heroImages.length), 5000);
    return () => clearInterval(t);
  }, [heroImages.length]);

  async function loadFeatured() {
    setLoading(true);
    setError(null);
    const { data, error } = await getAutos({ page: 0, limit: 6 });
    if (error) { setError(error); setLoading(false); return; }
    // Priorizar destacados
    const sorted = [...(data || [])].sort((a, b) => (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0));
    setFeatured(sorted.slice(0, 3));
    setLoading(false);
  }

  function handleSearch() {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    navigate(`/catalogo?${params.toString()}`);
  }

  function scrollTo(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <>
      <Helmet>
        <title>Carvía — Autos Seminuevos Premium en Chihuahua</title>
        <meta name="description" content="Encuentra tu auto seminuevo ideal en Carvía. Autos certificados, financiamiento flexible y garantía real en Chihuahua." />
        <meta property="og:title" content="Carvía — Autos Seminuevos Premium en Chihuahua" />
        <meta property="og:description" content="Autos inspeccionados punto por punto. Financiamiento a tu medida y la confianza de una agencia premium." />
        <meta property="og:type" content="website" />
      </Helmet>

      <Navbar />

      {/* HERO */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-glow" />
        <div className="hero-grid" />
        <div className="hero-inner">
          <div className="hero-copy">
            <div className="hero-badge fade-up d1"><Sparkles size={14} /> Seminuevos certificados · Chihuahua</div>
            <h1 className="hero-title">
              <span className="fade-up d2">Encuentra el</span>{" "}
              <span className="fade-up d3 grad">seminuevo</span>{" "}
              <span className="fade-up d4">ideal para ti</span>
            </h1>
            <p className="hero-sub fade-up d5">
              Autos inspeccionados punto por punto, financiamiento a tu medida y la confianza
              de una agencia premium. Tu próximo auto, sin sorpresas.
            </p>
            <div className="hero-cta fade-up d6">
              <button className="btn btn-primary btn-lg" onClick={() => navigate("/catalogo")}>
                Ver catálogo <ArrowRight size={18} />
              </button>
              <button className="btn btn-ghost btn-lg" onClick={() => scrollTo("contacto")}>
                Contáctanos
              </button>
            </div>
            <div className="hero-stats fade-up d7">
              <div><strong><Counter to={480} suffix="+" /></strong><span>Autos vendidos</span></div>
              <div><strong><Counter to={150} suffix=" pts" /></strong><span>Puntos de inspección</span></div>
              <div><strong><Counter to={12} /></strong><span>Años de experiencia</span></div>
            </div>
          </div>
          <div className="hero-art fade-in d4">
            <div className="hero-card">
              <img
                key={heroIdx}
                src={heroImages.length > 0 ? heroImages[heroIdx] : DEFAULT_HERO}
                alt="Auto seminuevo destacado"
                loading="eager"
                className="hero-card-img"
                onError={(e) => { e.currentTarget.src = DEFAULT_HERO; }}
              />
              <div className="hero-card-tag"><BadgeCheck size={16} /> Inspección certificada</div>
              {heroImages.length > 1 && (
                <div className="hero-card-dots">
                  {heroImages.map((_, i) => (
                    <button
                      key={i}
                      className={`hero-dot${i === heroIdx ? " active" : ""}`}
                      onClick={() => setHeroIdx(i)}
                      aria-label={`Foto ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="hero-float f1"><ShieldCheck size={18} /> Garantía incluida</div>
            <div className="hero-float f2"><Wallet size={18} /> Desde $4,990/mes</div>
          </div>
        </div>
        <div className="hero-marquee">
          <div className="marquee-track">
            {[...BRANDS, ...BRANDS].map((b, i) => <span key={i}>{b}</span>)}
          </div>
        </div>
      </section>

      {/* BUSCADOR */}
      <SearchPanel filters={filters} setFilters={setFilters} onSearch={handleSearch} brands={availableBrands.length ? availableBrands : undefined} />

      {/* AUTOS DESTACADOS */}
      <section className="section" id="destacados">
        <div className="container">
          <Reveal className="section-head">
            <div>
              <p className="eyebrow"><Star size={14} /> Selección Carvía</p>
              <h2 className="section-title">Autos destacados</h2>
            </div>
            <button className="btn btn-ghost" onClick={() => navigate("/catalogo")}>
              Ver todo el catálogo <ArrowRight size={16} />
            </button>
          </Reveal>

          {loading ? (
            <SkeletonGrid count={3} />
          ) : error ? (
            <div className="error-state">
              <Car size={40} />
              <h3>Error al cargar</h3>
              <p>No se pudieron cargar los autos. Verifica tu conexión.</p>
              <button className="btn btn-ghost" onClick={loadFeatured}>Reintentar</button>
            </div>
          ) : (
            <div className="cards-grid">
              {featured.map((c, i) => <CarCard key={c.id} car={c} delay={i * 90} />)}
            </div>
          )}
        </div>
      </section>

      {/* POR QUÉ CARVÍA */}
      <WhyUs />

      {/* PROCESO */}
      <Process />

      {/* FINANCIAMIENTO */}
      <Financing />

      {/* TESTIMONIOS */}
      <Testimonials />

      {/* CONTACTO */}
      <Contact />

      <Footer />
    </>
  );
}

/* ---- Secciones internas ---- */

function WhyUs() {
  const items = [
    { i: <ShieldCheck size={24} />, t: "Autos inspeccionados", d: "Cada unidad pasa una revisión de 150 puntos mecánicos y estéticos antes de ponerse a la venta." },
    { i: <Wallet size={24} />, t: "Financiamiento flexible", d: "Planes a tu medida con las mejores tasas. Aprobación rápida y enganches accesibles." },
    { i: <BadgeCheck size={24} />, t: "Garantía real", d: "Respaldamos cada compra con garantía y trámites de cambio de propietario incluidos." },
    { i: <Award size={24} />, t: "Trato premium", d: "Asesoría honesta y personalizada. Sin presiones, con toda la información transparente." },
  ];
  return (
    <section className="section" id="servicios">
      <div className="container">
        <Reveal className="section-head center">
          <div>
            <p className="eyebrow"><Sparkles size={14} /> Por qué Carvía</p>
            <h2 className="section-title">Comprar con nosotros es diferente</h2>
            <p className="section-sub">Combinamos tecnología, transparencia y un servicio de lujo para que tu compra sea segura y placentera.</p>
          </div>
        </Reveal>
        <div className="why-grid">
          {items.map((x, i) => (
            <Reveal key={x.t} delay={i * 80} className="why-card">
              <div className="why-icon">{x.i}</div>
              <h3>{x.t}</h3>
              <p>{x.d}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Process() {
  const steps = [
    { n: "01", t: "Explora el catálogo", d: "Filtra entre nuestros seminuevos certificados y elige tus favoritos." },
    { n: "02", t: "Agenda y prueba", d: "Reserva una cita y maneja el auto. Revisa cada detalle con tu asesor." },
    { n: "03", t: "Financia a tu medida", d: "Te ayudamos a elegir el plan ideal con la mejor tasa disponible." },
    { n: "04", t: "Estrena con confianza", d: "Cerramos los trámites y entregamos tu auto con garantía incluida." },
  ];
  return (
    <section className="section process">
      <div className="container">
        <Reveal className="section-head center">
          <div>
            <p className="eyebrow"><TrendingUp size={14} /> Proceso simple</p>
            <h2 className="section-title">4 pasos para estrenar</h2>
          </div>
        </Reveal>
        <div className="steps">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 90} className="step">
              <span className="step-n">{s.n}</span>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
              {i < steps.length - 1 && <ArrowRight className="step-arrow" size={20} />}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Financing() {
  const navigate = useNavigate();
  return (
    <section className="section finance" id="financiamiento">
      <div className="container finance-inner">
        <Reveal className="finance-copy">
          <p className="eyebrow"><Wallet size={14} /> Financiamiento</p>
          <h2 className="section-title">Maneja hoy, paga a tu ritmo</h2>
          <p className="section-sub">Trabajamos con las principales instituciones financieras para ofrecerte planes claros, sin letras chiquitas.</p>
          <ul className="finance-list">
            {["Enganche desde el 10%", "Plazos de 12 a 60 meses", "Aprobación en menos de 24 horas", "Aceptamos tu auto a cuenta", "Tasas competitivas garantizadas"].map((t) => (
              <li key={t}><Check size={16} /> {t}</li>
            ))}
          </ul>
          <button className="btn btn-primary btn-lg" onClick={() => document.getElementById("contacto")?.scrollIntoView({ behavior: "smooth" })}>
            Solicita tu plan <ArrowRight size={18} />
          </button>
        </Reveal>
        <Reveal delay={120} className="finance-card">
          <div className="fc-head"><Wallet size={20} /> Simulador estimado</div>
          <div className="fc-row"><span>Precio del auto</span><strong>$319,000</strong></div>
          <div className="fc-row"><span>Enganche (20%)</span><strong>$63,800</strong></div>
          <div className="fc-row"><span>Plazo</span><strong>48 meses</strong></div>
          <div className="fc-divider" />
          <div className="fc-total"><span>Mensualidad estimada</span><strong>$6,290</strong></div>
          <p className="fc-note">*Cifras ilustrativas. Sujeto a aprobación crediticia.</p>
        </Reveal>
      </div>
    </section>
  );
}

function Testimonials() {
  const t = [
    { n: "Laura M.", c: "Mazda 3 2021", r: 5, q: "El proceso fue rapidísimo y todo súper transparente. Me entregaron el auto impecable y con garantía. 100% recomendados." },
    { n: "Carlos R.", c: "Toyota Corolla", r: 5, q: "Me dieron mi auto anterior a cuenta y el financiamiento quedó a mi medida. Atención de primer nivel, sin presiones." },
    { n: "Andrea V.", c: "Nissan Versa", r: 5, q: "Buscaba algo confiable y económico. El asesor fue honesto en cada detalle. Volvería a comprar con Carvía sin dudarlo." },
  ];
  return (
    <section className="section">
      <div className="container">
        <Reveal className="section-head center">
          <div>
            <p className="eyebrow"><Quote size={14} /> Testimonios</p>
            <h2 className="section-title">Clientes que ya estrenan</h2>
          </div>
        </Reveal>
        <div className="testi-grid">
          {t.map((x, i) => (
            <Reveal key={x.n} delay={i * 90} className="testi-card">
              <div className="testi-stars">{Array.from({ length: x.r }).map((_, k) => <Star key={k} size={16} />)}</div>
              <p className="testi-q">"{x.q}"</p>
              <div className="testi-who">
                <div className="testi-avatar">{x.n[0]}</div>
                <div><strong>{x.n}</strong><span>{x.c}</span></div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Contact() {
  const [form, setForm] = useState({ nombre: "", tel: "", correo: "", auto: "", msg: "" });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit() {
    if (!form.nombre || !form.tel) return;
    setLoading(true);
    try {
      await Promise.allSettled([
        sendContactEmail({ nombre: form.nombre, telefono: form.tel, correo: form.correo, autoInteres: form.auto, mensaje: form.msg }),
        saveContacto({ nombre: form.nombre, telefono: form.tel, correo: form.correo, autoInteres: form.auto, mensaje: form.msg }),
      ]);
      setSent(true);
      toast.success("¡Mensaje enviado correctamente!");
    } catch {
      toast.error("Error al enviar. Intenta por WhatsApp.");
    }
    setLoading(false);
  }

  return (
    <section className="section contact" id="contacto">
      <div className="container contact-inner">
        <Reveal className="contact-info">
          <p className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 7 }}>Contacto</p>
          <h2 className="section-title">Visítanos o escríbenos</h2>
          <p className="section-sub">Estamos para asesorarte. Agenda tu cita o cotiza directo por WhatsApp.</p>
          <div className="contact-items">
            <a className="contact-item" href={waLink(null)} target="_blank" rel="noreferrer">
              <MessageCircle size={18} /><div><strong>WhatsApp</strong><span>+52 614 401 6149</span></div>
            </a>
            <div className="contact-item"><span style={{ color: "var(--orange)" }}>📞</span><div><strong>Teléfono</strong><span>(614) 401 6149</span></div></div>
            <div className="contact-item"><span style={{ color: "var(--orange)" }}>✉️</span><div><strong>Correo</strong><span>hola@carvia.mx</span></div></div>
            <div className="contact-item"><span style={{ color: "var(--orange)" }}>📍</span><div><strong>Ubicación</strong><span>Av. Prol. Teófilo Borunda 10800, Col. Labor de Terrazas, Chihuahua</span></div></div>
            <div className="contact-item"><span style={{ color: "var(--orange)" }}>🕐</span><div><strong>Horario</strong><span>Lun–Vie · 9:00–19:00 · Sáb · 9:00–16:00</span></div></div>
          </div>
        </Reveal>
        <Reveal delay={120} className="contact-form">
          {sent ? (
            <div className="form-sent">
              <div className="form-sent-icon"><Check size={32} /></div>
              <h3>¡Gracias, {form.nombre.split(" ")[0]}!</h3>
              <p>Recibimos tu mensaje. Un asesor te contactará muy pronto.</p>
              <a className="btn btn-wa" href={waLink(null)} target="_blank" rel="noreferrer">
                <MessageCircle size={16} /> Continuar por WhatsApp
              </a>
            </div>
          ) : (
            <>
              <h3 className="form-title">Solicita información</h3>
              <div className="form-row">
                <div className="field"><label>Nombre *</label><input value={form.nombre} onChange={set("nombre")} placeholder="Tu nombre" /></div>
                <div className="field"><label>Teléfono *</label><input value={form.tel} onChange={set("tel")} placeholder="10 dígitos" /></div>
              </div>
              <div className="field"><label>Correo</label><input value={form.correo} onChange={set("correo")} placeholder="tucorreo@email.com" /></div>
              <div className="field">
                <label>Auto de interés</label>
                <input value={form.auto} onChange={set("auto")} placeholder="Ej. Mazda 3, Toyota Corolla…" />
              </div>
              <div className="field"><label>Mensaje</label><textarea rows={3} value={form.msg} onChange={set("msg")} placeholder="¿En qué te ayudamos?" /></div>
              <div className="form-cta">
                <button className="btn btn-primary" onClick={submit} disabled={loading}>
                  {loading ? "Enviando…" : <>Enviar mensaje <ArrowRight size={16} /></>}
                </button>
                <a className="btn btn-wa" href={waLink(null)} target="_blank" rel="noreferrer">
                  <MessageCircle size={16} /> WhatsApp
                </a>
              </div>
            </>
          )}
        </Reveal>
      </div>
    </section>
  );
}

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Search, Plus, Pencil, Trash2, Eye, EyeOff, Star, Car,
  LogOut, LayoutDashboard, X, Upload, ArrowRight, Images, Save,
  ClipboardPaste, Wand2, ChevronDown,
} from "lucide-react";
import Logo from "../components/Logo";
import ImageUploader from "../components/ImageUploader";
import { useAuth } from "../hooks/useAuth";
import {
  getAutosAdmin, createAuto, updateAuto, deleteAuto,
  toggleVisible, toggleDestacado,
} from "../services/autos";
import { getHeroImages, saveHeroImages } from "../services/heroImages";
import { BRANDS, TRANSMISSIONS, TYPES, mxn, km, uid, today } from "../data/seed";
import { parseCarText } from "../utils/parseCarText";
import toast from "react-hot-toast";

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { logout, session } = useAuth();
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [view, setView] = useState("all"); // all | visible | hidden | featured
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [section, setSection] = useState("inventory"); // inventory | hero

  useEffect(() => {
    loadCars();
  }, []);

  async function loadCars() {
    setLoading(true);
    const { data, error } = await getAutosAdmin();
    if (error) { toast.error("Error al cargar autos"); }
    else { setCars(data || []); }
    setLoading(false);
  }

  async function handleLogout() {
    await logout();
    navigate("/", { replace: true });
  }

  const filtered = cars.filter((c) => {
    if (view === "visible" && !c.visible) return false;
    if (view === "hidden" && c.visible) return false;
    if (view === "featured" && !c.destacado) return false;
    if (q) {
      const hay = `${c.marca} ${c.modelo} ${c.version} ${c.anio}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  const stats = {
    total: cars.length,
    visible: cars.filter((c) => c.visible).length,
    hidden: cars.filter((c) => !c.visible).length,
    featured: cars.filter((c) => c.destacado).length,
  };

  async function toggle(id, key) {
    const car = cars.find((c) => c.id === id);
    if (!car) return;
    const newVal = !car[key];
    setCars((prev) => prev.map((c) => c.id === id ? { ...c, [key]: newVal } : c));
    const fn = key === "visible" ? toggleVisible : toggleDestacado;
    const { error } = await fn(id, newVal);
    if (error) { toast.error("Error al actualizar"); loadCars(); }
  }

  async function remove(id) {
    const { error } = await deleteAuto(id);
    if (error) { toast.error("Error al eliminar"); }
    else { setCars((prev) => prev.filter((c) => c.id !== id)); toast.success("Auto eliminado"); }
    setConfirmDel(null);
  }

  async function saveCar(data) {
    const isEdit = !!data.id && cars.some((c) => c.id === data.id);
    let result;
    if (isEdit) {
      result = await updateAuto(data.id, data);
    } else {
      result = await createAuto(data);
    }
    if (result.error) {
      toast.error("Error al guardar");
    } else {
      toast.success(isEdit ? "Auto actualizado" : "Auto creado");
      await loadCars();
    }
    setEditing(null);
  }

  return (
    <>
      <Helmet>
        <title>Dashboard — Admin Carvía</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="admin">
        {/* Sidebar */}
        <aside className="admin-side">
          <Logo size={24} to="/" />
          <nav>
            <button
              className={`admin-nav ${section === "inventory" ? "active" : ""}`}
              onClick={() => setSection("inventory")}
            >
              <LayoutDashboard size={18} /> Inventario
            </button>
            <button
              className={`admin-nav ${section === "hero" ? "active" : ""}`}
              onClick={() => setSection("hero")}
            >
              <Images size={18} /> Fotos del Hero
            </button>
            <button className="admin-nav" onClick={() => navigate("/")}><Car size={18} /> Ver sitio</button>
          </nav>
          <button className="admin-logout" onClick={handleLogout}>
            <LogOut size={16} /> Cerrar sesión
          </button>
        </aside>

        {/* Contenido principal */}
        <main className="admin-main">
          {section === "hero" ? (
            <HeroSection />
          ) : (
            <>
              <div className="admin-top">
                <div>
                  <h1>Gestión de inventario</h1>
                  <p>Administra los autos del catálogo público.</p>
                </div>
                <button className="btn btn-primary" onClick={() => setEditing({})}>
                  <Plus size={16} /> Nuevo auto
                </button>
              </div>

              {/* Stats */}
              <div className="admin-stats">
                {[
                  { l: "Total", v: stats.total, i: <Car size={18} />, k: "all" },
                  { l: "Visibles", v: stats.visible, i: <Eye size={18} />, k: "visible" },
                  { l: "Ocultos", v: stats.hidden, i: <EyeOff size={18} />, k: "hidden" },
                  { l: "Destacados", v: stats.featured, i: <Star size={18} />, k: "featured" },
                ].map((s) => (
                  <button key={s.l} className={`stat ${view === s.k ? "active" : ""}`} onClick={() => setView(s.k)}>
                    <span className="stat-i">{s.i}</span>
                    <span className="stat-v">{s.v}</span>
                    <span className="stat-l">{s.l}</span>
                  </button>
                ))}
              </div>

              {/* Buscador */}
              <div className="admin-search">
                <Search size={16} />
                <input
                  placeholder="Buscar por marca, modelo, año…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>

              {/* Tabla */}
              {loading ? (
                <div style={{ textAlign: "center", padding: 40 }}><div className="spinner" /></div>
              ) : (
                <div className="admin-table">
                  <div className="atable-head">
                    <span>Auto</span><span>Precio</span><span>Año / Km</span><span>Estado</span><span>Acciones</span>
                  </div>
                  {filtered.length === 0 && (
                    <div className="atable-empty">No hay autos que coincidan.</div>
                  )}
                  {filtered.map((c) => (
                    <div className="atable-row" key={c.id}>
                      <div className="ar-car">
                        <div className="ar-thumb">
                          <img src={c.imagenes?.[0]} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                          <Car size={18} className="ar-thumb-fb" />
                        </div>
                        <div>
                          <strong>{c.marca} {c.modelo}</strong>
                          <span>{c.version}</span>
                        </div>
                      </div>
                      <div className="ar-price">{mxn(c.precio)}</div>
                      <div className="ar-meta">{c.anio}<span>{km(c.kilometraje)}</span></div>
                      <div className="ar-tags">
                        <span className={`tag ${c.visible ? "tag-on" : "tag-off"}`}>{c.visible ? "Visible" : "Oculto"}</span>
                        {c.destacado && <span className="tag tag-star"><Star size={11} /> Destacado</span>}
                      </div>
                      <div className="ar-actions">
                        <button title="Destacar" className={`iconbtn ${c.destacado ? "on" : ""}`} onClick={() => toggle(c.id, "destacado")}><Star size={16} /></button>
                        <button title={c.visible ? "Ocultar" : "Mostrar"} className="iconbtn" onClick={() => toggle(c.id, "visible")}>
                          {c.visible ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <button title="Editar" className="iconbtn" onClick={() => setEditing(c)}><Pencil size={16} /></button>
                        <button title="Eliminar" className="iconbtn danger" onClick={() => setConfirmDel(c)}><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Modal de edición */}
      {editing !== null && (
        <CarForm
          initial={editing}
          onSave={saveCar}
          onClose={() => setEditing(null)}
        />
      )}

      {/* Modal de confirmación de eliminación */}
      {confirmDel && (
        <div className="modal-overlay" onClick={() => setConfirmDel(null)}>
          <div className="confirm" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon"><Trash2 size={24} /></div>
            <h3>Eliminar auto</h3>
            <p>¿Seguro que deseas eliminar <strong>{confirmDel.marca} {confirmDel.modelo}</strong>? Esta acción no se puede deshacer.</p>
            <div className="confirm-cta">
              <button className="btn btn-ghost" onClick={() => setConfirmDel(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => remove(confirmDel.id)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ============================================================
   SECCIÓN: FOTOS DEL HERO
   ============================================================ */
function HeroSection() {
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getHeroImages().then(({ data }) => {
      setUrls(data || []);
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    const { error } = await saveHeroImages(urls);
    if (error) {
      toast.error("Error al guardar las fotos");
    } else {
      toast.success("¡Fotos del hero actualizadas!");
    }
    setSaving(false);
  }

  return (
    <div>
      <div className="admin-top">
        <div>
          <h1>Fotos del Hero</h1>
          <p>Estas imágenes aparecen en el carrusel de la página de inicio, justo donde dice <em>"Encuentra el seminuevo ideal para ti"</em>. Máximo 10 fotos.</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <><span className="spinner-sm" /> Guardando…</> : <><Save size={16} /> Guardar cambios</>}
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60 }}><div className="spinner" /></div>
      ) : (
        <div className="hero-section-wrap">
          <div className="hero-section-info">
            <span className={`tag ${urls.length > 0 ? "tag-on" : "tag-off"}`}>
              {urls.length} foto{urls.length !== 1 ? "s" : ""} configurada{urls.length !== 1 ? "s" : ""}
            </span>
            {urls.length === 0 && (
              <p className="hero-section-hint">Sin fotos configuradas, el hero mostrará la imagen por defecto.</p>
            )}
          </div>
          <ImageUploader
            autoId="hero-banner"
            value={urls}
            onChange={setUrls}
          />
        </div>
      )}
    </div>
  );
}

/* ============================================================
   FORMULARIO DE AUTO (modal)
   ============================================================ */
function CarForm({ initial, onSave, onClose }) {
  const blank = {
    marca: "", modelo: "", version: "", anio: new Date().getFullYear(), precio: "",
    kilometraje: "", transmision: "Automática", motor: "", tipo: "Sedán",
    colorExterior: "", colorInterior: "", descripcion: "", equipamiento: [],
    imagenes: [], destacado: false, visible: true,
  };
  const [f, setF] = useState({ ...blank, ...initial });
  const [equipInput, setEquipInput] = useState((initial.equipamiento || []).join(", "));
  const [imageUrls, setImageUrls] = useState(initial.imagenes || []);
  const [useUploader, setUseUploader] = useState(false);
  const [urlInput, setUrlInput] = useState((initial.imagenes || []).join("\n"));
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const isEdit = !!initial.id;

  function handleAutofill() {
    const parsed = parseCarText(pasteText);
    if (!parsed || Object.keys(parsed).length === 0) {
      toast.error("No se pudo extraer información del texto");
      return;
    }
    setF((prev) => ({
      ...prev,
      ...(parsed.marca && { marca: parsed.marca }),
      ...(parsed.modelo && { modelo: parsed.modelo }),
      ...(parsed.version !== undefined && { version: parsed.version }),
      ...(parsed.anio && { anio: parsed.anio }),
      ...(parsed.precio && { precio: parsed.precio }),
      ...(parsed.kilometraje && { kilometraje: parsed.kilometraje }),
      ...(parsed.transmision && { transmision: parsed.transmision }),
      ...(parsed.tipo && { tipo: parsed.tipo }),
      ...(parsed.motor && { motor: parsed.motor }),
      ...(parsed.descripcion && { descripcion: parsed.descripcion }),
    }));
    if (parsed.equipInput) setEquipInput(parsed.equipInput);
    setPasteOpen(false);
    toast.success("Campos completados automáticamente");
  }

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function submit() {
    if (!f.marca || !f.modelo) { toast.error("Marca y modelo son requeridos"); return; }
    const imgs = useUploader
      ? imageUrls
      : urlInput.split("\n").map((s) => s.trim()).filter(Boolean);
    onSave({
      ...f,
      precio: Number(f.precio) || 0,
      kilometraje: Number(f.kilometraje) || 0,
      anio: Number(f.anio) || new Date().getFullYear(),
      imagenes: imgs,
      equipamiento: equipInput.split(",").map((s) => s.trim()).filter(Boolean),
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{isEdit ? "Editar auto" : "Registrar nuevo auto"}</h2>
          <button className="iconbtn" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body">
          {/* Auto-llenado desde texto de WhatsApp */}
          <div className="paste-panel">
            <button type="button" className="paste-trigger" onClick={() => setPasteOpen((o) => !o)}>
              <ClipboardPaste size={15} />
              <span>Autocompletar desde texto de WhatsApp</span>
              <ChevronDown size={14} className={pasteOpen ? "paste-chevron open" : "paste-chevron"} />
            </button>
            {pasteOpen && (
              <div className="paste-area">
                <p className="paste-hint">Pega el texto con los datos del auto tal como te lo envían por WhatsApp y los campos se llenarán solos.</p>
                <textarea
                  className="paste-input"
                  rows={10}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={"BMW X5 xDrive40i M Sport 2020\n\nFactura de agencia\nÚnico dueño\n56,000 km\nAutomática deportiva\n\nInteriores en piel\nAsientos calefactables\nTecho panorámico\n\nMotor 3.0 Turbo\n6 cilindros en línea\n340 hp\n\n$690,000"}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ alignSelf: "flex-end" }}
                  onClick={handleAutofill}
                  disabled={!pasteText.trim()}
                >
                  <Wand2 size={15} /> Autocompletar campos
                </button>
              </div>
            )}
          </div>

          <div className="form-grid">
            <div className="field">
              <label>Marca *</label>
              <select value={f.marca} onChange={set("marca")}>
                <option value="">Selecciona</option>
                {BRANDS.map((b) => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div className="field"><label>Modelo *</label><input value={f.modelo} onChange={set("modelo")} placeholder="Ej. Mazda 3" /></div>
            <div className="field"><label>Versión</label><input value={f.version} onChange={set("version")} placeholder="Ej. Grand Touring" /></div>
            <div className="field"><label>Año</label><input type="number" value={f.anio} onChange={set("anio")} /></div>
            <div className="field"><label>Precio (MXN)</label><input type="number" value={f.precio} onChange={set("precio")} placeholder="319000" /></div>
            <div className="field"><label>Kilometraje</label><input type="number" value={f.kilometraje} onChange={set("kilometraje")} placeholder="38500" /></div>
            <div className="field">
              <label>Transmisión</label>
              <select value={f.transmision} onChange={set("transmision")}>
                {TRANSMISSIONS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Tipo</label>
              <select value={f.tipo} onChange={set("tipo")}>
                {TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="field"><label>Motor</label><input value={f.motor} onChange={set("motor")} placeholder="2.5L 4 cil." /></div>
            <div className="field"><label>Color exterior</label><input value={f.colorExterior} onChange={set("colorExterior")} placeholder="Rojo metálico" /></div>
            <div className="field"><label>Color interior</label><input value={f.colorInterior} onChange={set("colorInterior")} placeholder="Negro piel" /></div>
          </div>

          <div className="field"><label>Descripción</label>
            <textarea rows={3} value={f.descripcion} onChange={set("descripcion")} placeholder="Describe el estado y atributos del auto…" />
          </div>
          <div className="field"><label>Equipamiento (separado por comas)</label>
            <textarea rows={2} value={equipInput} onChange={(e) => setEquipInput(e.target.value)} placeholder="Quemacocos, Cámara de reversa, CarPlay…" />
          </div>

          {/* Imágenes: toggle entre subida y URLs */}
          <div className="field">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <label><Upload size={13} /> Imágenes</label>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className={`btn ${!useUploader ? "btn-primary" : "btn-ghost"}`}
                  style={{ padding: "6px 12px", fontSize: 12 }}
                  onClick={() => setUseUploader(false)}
                >
                  URLs
                </button>
                <button
                  className={`btn ${useUploader ? "btn-primary" : "btn-ghost"}`}
                  style={{ padding: "6px 12px", fontSize: 12 }}
                  onClick={() => setUseUploader(true)}
                >
                  Subir fotos
                </button>
              </div>
            </div>

            {useUploader ? (
              <ImageUploader
                autoId={f.id || `new-${Date.now()}`}
                value={imageUrls}
                onChange={setImageUrls}
              />
            ) : (
              <textarea
                rows={3}
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Una URL por línea&#10;https://images.unsplash.com/…"
              />
            )}
          </div>

          <div className="form-toggles">
            <label className="switch">
              <input type="checkbox" checked={f.destacado} onChange={(e) => setF({ ...f, destacado: e.target.checked })} />
              <span className="switch-track" /><span className="switch-label"><Star size={14} /> Destacado</span>
            </label>
            <label className="switch">
              <input type="checkbox" checked={f.visible} onChange={(e) => setF({ ...f, visible: e.target.checked })} />
              <span className="switch-track" /><span className="switch-label"><Eye size={14} /> Visible en catálogo</span>
            </label>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={submit}>
            {isEdit ? "Guardar cambios" : "Crear auto"} <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

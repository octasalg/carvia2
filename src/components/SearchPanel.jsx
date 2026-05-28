import { useState, useMemo } from "react";
import { Search, Filter, ChevronDown, X } from "lucide-react";
import Reveal from "./Reveal";
import { BRANDS, TRANSMISSIONS, TYPES, emptyFilters } from "../data/seed";

const FILTER_TRANSMISSIONS = ["Automática", "Manual"];

/**
 * SearchPanel con modo colapsable en móvil para el catálogo.
 * Props:
 *   - filters, setFilters: estado de filtros
 *   - onSearch: callback al presionar "Buscar"
 *   - collapsible: bool — si true, activa el modo mobile collapse (para catálogo)
 */
export default function SearchPanel({ filters, setFilters, onSearch, collapsible = false, brands = BRANDS }) {
  const [open, setOpen] = useState(false);
  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });

  // Conteo de filtros activos (excluye q que es búsqueda general)
  const activeCount = useMemo(() => {
    return Object.entries(filters).filter(([k, v]) => k !== "q" && v !== "").length;
  }, [filters]);

  // Chips para los filtros activos
  const chips = useMemo(() => {
    const result = [];
    if (filters.marca) result.push({ key: "marca", label: filters.marca });
    if (filters.tipo) result.push({ key: "tipo", label: filters.tipo });
    if (filters.transmision) result.push({ key: "transmision", label: filters.transmision });
    if (filters.anio) result.push({ key: "anio", label: `Año ${filters.anio}` });
    if (filters.color) result.push({ key: "color", label: `Color: ${filters.color}` });
    if (filters.modelo) result.push({ key: "modelo", label: `Modelo: ${filters.modelo}` });
    if (filters.precioMin && filters.precioMax) {
      result.push({ key: "precio", label: `$${Number(filters.precioMin).toLocaleString("es-MX")}–$${Number(filters.precioMax).toLocaleString("es-MX")}` });
    } else if (filters.precioMin) {
      result.push({ key: "precioMin", label: `Min $${Number(filters.precioMin).toLocaleString("es-MX")}` });
    } else if (filters.precioMax) {
      result.push({ key: "precioMax", label: `Max $${Number(filters.precioMax).toLocaleString("es-MX")}` });
    }
    if (filters.kmMax) result.push({ key: "kmMax", label: `Max ${Number(filters.kmMax).toLocaleString("es-MX")} km` });
    return result;
  }, [filters]);

  function removeChip(key) {
    if (key === "precio") {
      setFilters({ ...filters, precioMin: "", precioMax: "" });
    } else {
      setFilters({ ...filters, [key]: "" });
    }
  }

  const panelContent = (
    <div className="search-grid">
      <div className="field field-wide">
        <label>Palabra clave</label>
        <input placeholder="Ej. Mazda rojo, automático…" value={filters.q} onChange={set("q")} />
      </div>
      <div className="field">
        <label>Marca</label>
        <select value={filters.marca} onChange={set("marca")}>
          <option value="">Todas</option>
          {brands.map((b) => <option key={b}>{b}</option>)}
        </select>
      </div>
      <div className="field">
        <label>Modelo</label>
        <input placeholder="Cualquiera" value={filters.modelo} onChange={set("modelo")} />
      </div>
      <div className="field">
        <label>Año</label>
        <input type="number" placeholder="Cualquiera" value={filters.anio} onChange={set("anio")} />
      </div>
      <div className="field">
        <label>Tipo</label>
        <select value={filters.tipo} onChange={set("tipo")}>
          <option value="">Todos</option>
          {TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div className="field">
        <label>Transmisión</label>
        <select value={filters.transmision} onChange={set("transmision")}>
          <option value="">Todas</option>
          {FILTER_TRANSMISSIONS.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div className="field">
        <label>Precio mín.</label>
        <input type="number" placeholder="$0" value={filters.precioMin} onChange={set("precioMin")} />
      </div>
      <div className="field">
        <label>Precio máx.</label>
        <input type="number" placeholder="Sin límite" value={filters.precioMax} onChange={set("precioMax")} />
      </div>
      <div className="field">
        <label>Km máximo</label>
        <input type="number" placeholder="Sin límite" value={filters.kmMax} onChange={set("kmMax")} />
      </div>
      <div className="field">
        <label>Color</label>
        <input placeholder="Cualquiera" value={filters.color} onChange={set("color")} />
      </div>

      {collapsible ? (
        /* En catálogo móvil: botones al final del panel */
        <div className="search-mobile-btns">
          <button className="btn btn-ghost" onClick={() => setFilters(emptyFilters)}>
            Limpiar todo
          </button>
          <button className="btn btn-primary search-go-mobile" onClick={() => { onSearch(); setOpen(false); }}>
            <Search size={16} /> Aplicar filtros
          </button>
        </div>
      ) : (
        <button className="btn btn-primary search-go" onClick={onSearch}>
          <Search size={18} /> Buscar autos
        </button>
      )}
    </div>
  );

  /* ---- Modo no colapsable (home) ---- */
  if (!collapsible) {
    return (
      <section className="search-wrap" id="buscar">
        <Reveal className="search-panel">
          <div className="search-head">
            <div className="search-title"><Search size={18} /> Encuentra tu auto ideal</div>
            <button className="search-clear" onClick={() => setFilters(emptyFilters)}>Limpiar filtros</button>
          </div>
          {panelContent}
        </Reveal>
      </section>
    );
  }

  /* ---- Modo colapsable (catálogo) ---- */
  return (
    <section className="search-wrap catalog-search" id="buscar">
      {/* Desktop: siempre visible */}
      <div className="search-panel search-desktop">
        <div className="search-head">
          <div className="search-title"><Search size={18} /> Filtrar autos</div>
          <button className="search-clear" onClick={() => setFilters(emptyFilters)}>Limpiar filtros</button>
        </div>
        {panelContent}
      </div>

      {/* Móvil: toggle collapsible */}
      <div className="search-mobile-wrap">
        <button
          className={`filter-toggle ${open ? "open" : ""}`}
          onClick={() => setOpen(!open)}
          aria-expanded={open}
        >
          <span className="filter-toggle-left">
            <Filter size={16} />
            <span>Filtros{activeCount > 0 ? ` · ${activeCount}` : ""}</span>
            {activeCount > 0 && <span className="filter-badge">{activeCount}</span>}
          </span>
          <ChevronDown size={16} className={`filter-chevron ${open ? "rotated" : ""}`} />
        </button>

        {/* Chips de filtros activos (solo cuando panel cerrado) */}
        {!open && chips.length > 0 && (
          <div className="filter-chips-scroll">
            {chips.map((c) => (
              <span key={c.key} className="filter-chip">
                {c.label}
                <button onClick={() => removeChip(c.key)} aria-label={`Quitar ${c.label}`}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Panel colapsable */}
        <div className={`filter-panel-mobile ${open ? "open" : ""}`}>
          <div className="search-panel">
            {panelContent}
          </div>
        </div>
      </div>
    </section>
  );
}

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Car, Filter, ChevronDown } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import CarCard from "../components/CarCard";
import SearchPanel from "../components/SearchPanel";
import { SkeletonGrid } from "../components/SkeletonCard";
import { getAutos, getAvailableBrands } from "../services/autos";
import { emptyFilters } from "../data/seed";

const PAGE_SIZE = 12;
const SORT_OPTIONS = [
  { v: "recientes", l: "Más recientes" },
  { v: "precio-asc", l: "Precio: menor a mayor" },
  { v: "precio-desc", l: "Precio: mayor a menor" },
  { v: "km", l: "Menor kilometraje" },
  { v: "anio", l: "Año más nuevo" },
];

export default function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Leer filtros iniciales desde URL params
  const [filters, setFilters] = useState(() => ({
    ...emptyFilters,
    marca: searchParams.get("marca") || "",
    modelo: searchParams.get("modelo") || "",
    anio: searchParams.get("anio") || "",
    tipo: searchParams.get("tipo") || "",
    transmision: searchParams.get("transmision") || "",
    color: searchParams.get("color") || "",
    precioMin: searchParams.get("precioMin") || "",
    precioMax: searchParams.get("precioMax") || "",
    kmMax: searchParams.get("kmMax") || "",
    q: searchParams.get("q") || "",
  }));

  const [sort, setSort] = useState("recientes");
  const [availableBrands, setAvailableBrands] = useState([]);
  const [allCars, setAllCars] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [appliedFilters, setAppliedFilters] = useState(filters);

  useEffect(() => {
    window.scrollTo(0, 0);
    getAvailableBrands().then(({ data }) => { if (data?.length) setAvailableBrands(data); });
  }, []);

  useEffect(() => {
    loadCars(true);
  }, [appliedFilters]);

  async function loadCars(reset = false) {
    if (reset) {
      setLoading(true);
      setError(null);
      setPage(0);
    }
    const currentPage = reset ? 0 : page;
    const { data, count, error } = await getAutos({ filters: appliedFilters, page: currentPage });
    if (error) { setError(error); setLoading(false); return; }
    if (reset) {
      setAllCars(data || []);
    } else {
      setAllCars((prev) => [...prev, ...(data || [])]);
    }
    setTotalCount(count || 0);
    setLoading(false);
    setLoadingMore(false);
  }

  async function loadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    setLoadingMore(true);
    const { data, error } = await getAutos({ filters: appliedFilters, page: nextPage });
    if (error) { setLoadingMore(false); return; }
    setAllCars((prev) => {
      const existingIds = new Set(prev.map((c) => c.id));
      const newOnes = (data || []).filter((c) => !existingIds.has(c.id));
      return [...prev, ...newOnes];
    });
    setLoadingMore(false);
  }

  function handleSearch() {
    // Aplicar filtros y actualizar URL
    setAppliedFilters({ ...filters });
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    setSearchParams(params);
  }

  // Ordenamiento local
  const sorted = useMemo(() => {
    let r = [...allCars];
    if (sort === "precio-asc") r.sort((a, b) => a.precio - b.precio);
    if (sort === "precio-desc") r.sort((a, b) => b.precio - a.precio);
    if (sort === "km") r.sort((a, b) => a.kilometraje - b.kilometraje);
    if (sort === "anio") r.sort((a, b) => b.anio - a.anio);
    return r;
  }, [allCars, sort]);

  const hasMore = allCars.length < totalCount;
  const showing = allCars.length;

  return (
    <>
      <Helmet>
        <title>Catálogo de Seminuevos — Carvía</title>
        <meta name="description" content="Explora todos nuestros autos seminuevos certificados. Filtra por marca, precio, transmisión y más." />
        <meta property="og:title" content="Catálogo de Seminuevos — Carvía" />
        <meta property="og:description" content="Autos inspeccionados y certificados. Encuentra tu próximo auto en Carvía." />
      </Helmet>

      <Navbar />

      {/* Header */}
      <div className="page-head">
        <div className="container">
          <p className="eyebrow"><Car size={14} /> Inventario</p>
          <h1 className="page-title">Catálogo de seminuevos</h1>
          <p className="section-sub">
            {loading ? "Cargando…" : `${totalCount} ${totalCount === 1 ? "auto disponible" : "autos disponibles"}`}
          </p>
        </div>
      </div>

      <div className="page">
        <div className="container">
          {/* Panel de filtros con collapse en móvil */}
          <SearchPanel
            filters={filters}
            setFilters={setFilters}
            onSearch={handleSearch}
            collapsible={true}
            brands={availableBrands.length ? availableBrands : undefined}
          />

          {/* Toolbar de ordenamiento */}
          <div className="catalog-toolbar">
            <span>
              <Filter size={15} />
              {loading ? "Cargando…" : `${showing} de ${totalCount} resultados`}
            </span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              {SORT_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </div>

          {/* Contenido */}
          {loading ? (
            <SkeletonGrid count={6} />
          ) : error ? (
            <div className="error-state">
              <Car size={40} />
              <h3>Error al cargar</h3>
              <p>No se pudieron cargar los autos. Verifica tu conexión.</p>
              <button className="btn btn-ghost" onClick={() => loadCars(true)}>Reintentar</button>
            </div>
          ) : sorted.length === 0 ? (
            <div className="empty">
              <Car size={40} />
              <h3>Sin resultados</h3>
              <p>Ajusta los filtros para ver más autos.</p>
              <button className="btn btn-ghost" onClick={() => {
                setFilters(emptyFilters);
                setAppliedFilters(emptyFilters);
                setSearchParams({});
              }}>
                Limpiar filtros
              </button>
            </div>
          ) : (
            <>
              <div className="cards-grid catalog-grid">
                {sorted.map((c, i) => <CarCard key={c.id} car={c} delay={(i % 3) * 80} />)}
              </div>

              {/* Load more */}
              {hasMore && (
                <div className="load-more-wrap">
                  <p className="load-more-count">Mostrando {showing} de {totalCount} autos</p>
                  <button
                    className="btn btn-ghost load-more-btn"
                    onClick={loadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <><span className="spinner-sm" /> Cargando…</>
                    ) : (
                      <>Cargar más autos <ChevronDown size={16} /></>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Footer />
    </>
  );
}

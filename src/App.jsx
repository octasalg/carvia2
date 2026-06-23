/* ============================================================
   CARVÍA — Enrutador principal
   Toda la lógica visual vive en src/pages/
   El diseño (CSS) se importa desde src/App.css
   ============================================================ */
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./hooks/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./pages/HomePage";
import CatalogPage from "./pages/CatalogPage";
import CarDetailPage from "./pages/CarDetailPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import usePageTracking from "./hooks/usePageTracking";
import "./App.css";

/** Registra las vistas de página en Google Analytics al navegar (SPA) */
function AnalyticsTracker() {
  usePageTracking();
  return null;
}

/** Estilo global de toasts — consistente con el diseño de Carvía */
const TOAST_OPTS = {
  style: {
    background: "#1a1a1f",
    color: "#f4f4f5",
    border: "1px solid #ff5a1f",
    borderRadius: "12px",
    fontFamily: "Manrope, system-ui, sans-serif",
    fontSize: "14px",
    fontWeight: "600",
  },
  success: {
    iconTheme: { primary: "#ff5a1f", secondary: "#1a1a1f" },
  },
  error: {
    iconTheme: { primary: "#e5484d", secondary: "#fff" },
  },
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AnalyticsTracker />
        <div className="app">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/catalogo" element={<CatalogPage />} />
            <Route path="/auto/:id" element={<CarDetailPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
            {/* Fallback: redirigir al home */}
            <Route path="*" element={<HomePage />} />
          </Routes>

          <Toaster position="top-right" toastOptions={TOAST_OPTS} />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

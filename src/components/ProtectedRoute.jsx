import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

/**
 * Ruta protegida: redirige a /admin/login si no hay sesión activa.
 * Muestra spinner mientras verifica la sesión.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="protected-loading">
        <div className="spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}

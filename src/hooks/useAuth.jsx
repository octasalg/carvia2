/* ============================================================
   CARVÍA — Hook de autenticación con Supabase
   Proporciona AuthProvider y useAuth
   ============================================================ */
import { createContext, useContext, useState, useEffect } from "react";
import { supabase, isConfigured as supabaseConfigured } from "../lib/supabase";

const AuthContext = createContext(null);

const DEMO_KEY = "carvia:demo:authed";
const DEMO_EMAIL = "admin@carvia.mx";
const DEMO_PASS = "carvia2025";

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabaseConfigured) {
      // Modo demo: leer del localStorage
      const authed = localStorage.getItem(DEMO_KEY) === "true";
      setSession(authed ? { demo: true, user: { email: DEMO_EMAIL } } : null);
      setLoading(false);
      return;
    }

    // Modo Supabase real
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Inicia sesión con email y password.
   * En modo demo acepta admin@carvia.mx / carvia2025.
   */
  const login = async (email, password) => {
    if (!supabaseConfigured) {
      if (email === DEMO_EMAIL && password === DEMO_PASS) {
        const s = { demo: true, user: { email: DEMO_EMAIL } };
        localStorage.setItem(DEMO_KEY, "true");
        setSession(s);
        return { session: s };
      }
      throw new Error("Usuario o contraseña incorrectos.");
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  /** Cierra sesión */
  const logout = async () => {
    if (!supabaseConfigured) {
      localStorage.removeItem(DEMO_KEY);
      setSession(null);
      return;
    }
    await supabase.auth.signOut();
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, loading, login, logout, isAuthenticated: !!session }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}

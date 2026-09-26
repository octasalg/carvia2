/* ============================================================
   CARVÍA — Hook de autenticación con Supabase
   Proporciona AuthProvider y useAuth.
   Además del inicio de sesión, carga el PERFIL/ROL del usuario
   desde `admin_profiles` para el control de permisos del panel.
   ============================================================ */
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase, isConfigured as supabaseConfigured } from "../lib/supabase";

const AuthContext = createContext(null);

const DEMO_KEY = "carvia:demo:authed";
const DEMO_EMAIL = "admin@carvia.mx";
const DEMO_PASS = "carvia2025";

const AUTH_EMAIL_DOMAIN = import.meta.env.VITE_AUTH_EMAIL_DOMAIN || "carvia.mx";

/** Convierte un nombre de usuario en el email interno usado por Supabase Auth. */
function toEmail(identifier) {
  const value = String(identifier || "").trim();
  if (value.includes("@")) return value.toLowerCase();
  return `${value.toLowerCase()}@${AUTH_EMAIL_DOMAIN}`;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  /** Carga el perfil (rol/estado) del usuario autenticado. Nunca lanza. */
  const loadProfile = useCallback(async (activeSession) => {
    if (!supabaseConfigured || !activeSession?.user?.id || activeSession.demo) {
      const demoProfile = activeSession?.demo ? { username: "demo", role: "superadmin", active: true } : null;
      setProfile(demoProfile);
      return demoProfile;
    }
    try {
      const { data } = await supabase
        .from("admin_profiles")
        .select("id, username, full_name, role, active, protected")
        .eq("id", activeSession.user.id)
        .maybeSingle();
      setProfile(data || null);
      return data || null;
    } catch {
      setProfile(null);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!supabaseConfigured) {
      const authed = localStorage.getItem(DEMO_KEY) === "true";
      const demoSession = authed ? { demo: true, user: { email: DEMO_EMAIL } } : null;
      setSession(demoSession);
      setProfile(authed ? { username: "demo", role: "superadmin", active: true } : null);
      setLoading(false);
      return;
    }

    // Desbloquea la UI en cuanto se conoce la sesión; el perfil (rol) se
    // carga en segundo plano para no dejar la pantalla en "cargando" si la
    // consulta a admin_profiles falla o tarda.
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        loadProfile(session);
      })
      .finally(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      loadProfile(session);
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  /**
   * Inicia sesión con nombre de usuario (o email) y contraseña.
   * Rechaza el acceso si la cuenta está desactivada.
   */
  const login = async (identifier, password) => {
    if (!supabaseConfigured) {
      if (toEmail(identifier) === DEMO_EMAIL && password === DEMO_PASS) {
        const s = { demo: true, user: { email: DEMO_EMAIL } };
        localStorage.setItem(DEMO_KEY, "true");
        setSession(s);
        setProfile({ username: "demo", role: "superadmin", active: true });
        return { session: s };
      }
      throw new Error("Usuario o contraseña incorrectos.");
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: toEmail(identifier),
      password,
    });
    if (error) throw new Error("Usuario o contraseña incorrectos.");

    const loadedProfile = await loadProfile(data.session);
    if (!loadedProfile) {
      await supabase.auth.signOut();
      setSession(null);
      throw new Error("Tu cuenta no tiene acceso al panel administrativo.");
    }
    if (loadedProfile.active === false) {
      await supabase.auth.signOut();
      setSession(null);
      setProfile(null);
      throw new Error("Tu cuenta está desactivada. Contacta al administrador.");
    }
    return data;
  };

  /** Cierra sesión */
  const logout = async () => {
    if (!supabaseConfigured) {
      localStorage.removeItem(DEMO_KEY);
      setSession(null);
      setProfile(null);
      return;
    }
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        role: profile?.role || null,
        isSuperadmin: profile?.role === "superadmin",
        loading,
        login,
        logout,
        isAuthenticated: !!session,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}

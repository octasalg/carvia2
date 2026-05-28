import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ChevronLeft, ArrowRight, Lock, User } from "lucide-react";
import Logo from "../components/Logo";
import Reveal from "../components/Reveal";
import { useAuth } from "../hooks/useAuth";
import { isConfigured as supabaseConfigured } from "../lib/supabase";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Si ya está autenticado, redirigir al dashboard
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  async function submit() {
    if (!email || !pass) { setErr("Completa todos los campos."); return; }
    setErr("");
    setSubmitting(true);
    try {
      await login(email, pass);
      navigate("/admin/dashboard", { replace: true });
    } catch (e) {
      setErr(e.message || "Credenciales incorrectas.");
    }
    setSubmitting(false);
  }

  function onKey(e) { if (e.key === "Enter") submit(); }

  if (loading) {
    return (
      <div className="admin-login">
        <div className="login-bg" />
        <div className="spinner" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Acceso Admin — Carvía</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="admin-login">
        <div className="login-bg" />
        <Reveal className="login-card">
          <Logo size={30} to="/" />
          <h1>Panel administrador</h1>
          <p>Acceso exclusivo para el equipo de Carvía.</p>

          <div className="field">
            <label><User size={13} /> Correo</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@carvia.mx"
              onKeyDown={onKey}
              autoComplete="email"
            />
          </div>
          <div className="field">
            <label><Lock size={13} /> Contraseña</label>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="••••••••"
              onKeyDown={onKey}
              autoComplete="current-password"
            />
          </div>

          {err && <p className="login-err">{err}</p>}

          <button
            className="btn btn-primary btn-lg login-btn"
            onClick={submit}
            disabled={submitting}
          >
            {submitting ? "Ingresando…" : <>Iniciar sesión <ArrowRight size={16} /></>}
          </button>

          {!supabaseConfigured && (
            <p className="login-hint">
              Demo · correo <code>admin@carvia.mx</code> · contraseña <code>carvia2025</code>
            </p>
          )}

          <button className="login-back" onClick={() => navigate("/")}>
            <ChevronLeft size={14} /> Volver al sitio
          </button>
        </Reveal>
      </div>
    </>
  );
}

import { type FormEvent, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { loginUser } from "@/api/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

type LocationState = { from?: { pathname: string } } | null;

// ─── Social button icons ──────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-4 h-4 flex-shrink-0"
      aria-hidden
    >
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const from =
    (location.state as LocationState)?.from?.pathname ?? "/explorar";

  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (!email.trim()) {
      errs.email = "El correo es obligatorio";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = "Introduce un correo válido";
    }
    if (!password) {
      errs.password = "La contraseña es obligatoria";
    } else if (password.length < 6) {
      errs.password = "La contraseña debe tener al menos 6 caracteres";
    }
    return errs;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setIsLoading(true);
    try {
      const auth = await loginUser({
        email: email.trim(),
        password,
      });
      login(auth);
      navigate(from, { replace: true });
    } catch (error) {
      setErrors({
        general:
          error instanceof Error ? error.message : "No se pudo iniciar sesión",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleSocialLogin(_provider: "google" | "apple") {
    setErrors({
      general: "El login social todavía no está conectado al backend.",
    });
  }

  return (
    <>
      <div className="bg-white border border-border rounded-2xl shadow-xl shadow-black/[0.06] p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold tracking-tight mb-1.5">
              Bienvenido de vuelta
            </h1>
            <p className="text-sm text-muted-foreground">
              Inicia sesión para continuar con tu cuenta
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {errors.general && <FieldError message={errors.general} />}

            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-foreground"
              >
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white placeholder:text-muted-foreground/60 outline-none transition-all
                  ${
                    errors.email
                      ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                      : "border-border focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  }`}
              />
              {errors.email && (
                <FieldError message={errors.email} />
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-foreground"
                >
                  Contraseña
                </label>
                <button
                  type="button"
                  className="text-xs text-violet-600 hover:text-violet-700 font-medium transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password)
                      setErrors((p) => ({ ...p, password: undefined }));
                  }}
                  className={`w-full px-3.5 py-2.5 pr-11 rounded-xl border text-sm bg-white placeholder:text-muted-foreground/60 outline-none transition-all
                    ${
                      errors.password
                        ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                        : "border-border focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <FieldError message={errors.password} />
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-semibold text-sm py-2.5 px-4 rounded-xl transition-all hover:shadow-md hover:shadow-violet-200 active:scale-[0.98] mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Iniciando sesión…
                </>
              ) : (
                "Iniciar sesión"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">
              o continúa con
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Social buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleSocialLogin("google")}
              className="flex items-center justify-center gap-2 border border-border bg-white hover:bg-muted text-foreground text-sm font-medium py-2.5 px-4 rounded-xl transition-all hover:border-slate-300 active:scale-[0.98] disabled:opacity-50"
            >
              <GoogleIcon />
              Google
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleSocialLogin("apple")}
              className="flex items-center justify-center gap-2 border border-border bg-white hover:bg-muted text-foreground text-sm font-medium py-2.5 px-4 rounded-xl transition-all hover:border-slate-300 active:scale-[0.98] disabled:opacity-50"
            >
              <AppleIcon />
              Apple
            </button>
          </div>

          {/* Register link */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            ¿No tienes cuenta?{" "}
            <Link
              to="/register"
              className="text-violet-600 hover:text-violet-700 font-semibold transition-colors"
            >
              Regístrate gratis
            </Link>
          </p>
        </div>

      {/* Footer note */}
      <p className="text-center text-xs text-muted-foreground/70 mt-6">
        Al continuar aceptas nuestros{" "}
        <a href="#" className="underline underline-offset-2 hover:text-foreground transition-colors">
          Términos de uso
        </a>{" "}
        y{" "}
        <a href="#" className="underline underline-offset-2 hover:text-foreground transition-colors">
          Política de privacidad
        </a>
        .
      </p>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldError({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-1.5 text-red-600 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
      {message}
    </div>
  );
}

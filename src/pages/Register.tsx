import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { GENRES } from "@/data/mock";
import { loginUser, registerUser } from "@/api/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  username: string;
  location: string;
  genres: string[];
}

type Step1Errors = Partial<Pick<FormData, "name" | "email" | "password" | "confirmPassword">>;
type Step2Errors = Partial<Pick<FormData, "username" | "location">>;

// ─── Password strength ────────────────────────────────────────────────────────

interface StrengthInfo {
  score: number;
  label: string;
  barColor: string;
  textColor: string;
}

function getStrength(pwd: string): StrengthInfo {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^a-zA-Z0-9]/.test(pwd)) score++;

  const levels: StrengthInfo[] = [
    { score: 0, label: "Muy débil",  barColor: "bg-red-400",    textColor: "text-red-500"    },
    { score: 1, label: "Débil",      barColor: "bg-red-400",    textColor: "text-red-500"    },
    { score: 2, label: "Regular",    barColor: "bg-amber-400",  textColor: "text-amber-600"  },
    { score: 3, label: "Buena",      barColor: "bg-blue-400",   textColor: "text-blue-600"   },
    { score: 4, label: "Fuerte",     barColor: "bg-emerald-500",textColor: "text-emerald-600"},
  ];

  return levels[score];
}

// ─── Validators ───────────────────────────────────────────────────────────────

function validateStep1(data: FormData): Step1Errors {
  const errs: Step1Errors = {};
  if (!data.name.trim())
    errs.name = "El nombre es obligatorio";
  if (!data.email.trim())
    errs.email = "El correo es obligatorio";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
    errs.email = "Introduce un correo válido";
  if (!data.password)
    errs.password = "La contraseña es obligatoria";
  else if (data.password.length < 8)
    errs.password = "Mínimo 8 caracteres";
  if (!data.confirmPassword)
    errs.confirmPassword = "Confirma tu contraseña";
  else if (data.password !== data.confirmPassword)
    errs.confirmPassword = "Las contraseñas no coinciden";
  return errs;
}

function validateStep2(data: FormData): Step2Errors {
  const errs: Step2Errors = {};
  if (!data.username.trim())
    errs.username = "El nombre de usuario es obligatorio";
  else if (data.username.length < 3)
    errs.username = "Mínimo 3 caracteres";
  else if (!/^[a-zA-Z0-9_]+$/.test(data.username))
    errs.username = "Solo letras, números y guión bajo";
  if (!data.location.trim())
    errs.location = "La ubicación es obligatoria";
  return errs;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const INITIAL: FormData = {
  name: "", email: "", password: "", confirmPassword: "",
  username: "", location: "", genres: [],
};

const STEP_LABELS = ["Tu cuenta", "Perfil", "Intereses"];

export default function Register() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const [step, setStep] = useState(1);
  const [data, setData] = useState<FormData>(INITIAL);
  const [errors1, setErrors1] = useState<Step1Errors>({});
  const [errors2, setErrors2] = useState<Step2Errors>({});
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function update(patch: Partial<FormData>) {
    setData((prev) => ({ ...prev, ...patch }));
  }

  function handleNext(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (step === 1) {
      const errs = validateStep1(data);
      if (Object.keys(errs).length > 0) { setErrors1(errs); return; }
      setErrors1({});
    }
    if (step === 2) {
      const errs = validateStep2(data);
      if (Object.keys(errs).length > 0) { setErrors2(errs); return; }
      setErrors2({});
    }
    setStep((s) => s + 1);
  }

  async function handleSubmit(skip = false) {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (skip) {
        update({ genres: [] });
      }

      await registerUser({
        name: data.name.trim(),
        email: data.email.trim(),
        password: data.password,
      });

      const auth = await loginUser({
        email: data.email.trim(),
        password: data.password,
      });

      login(auth);
      navigate("/explorar", { replace: true });
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "No se pudo crear la cuenta"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const strength = getStrength(data.password);

  return (
    <>
      <div className="bg-white border border-border rounded-2xl shadow-xl shadow-black/[0.06] overflow-hidden">
          {/* Progress header */}
          <div className="px-8 pt-8 pb-6 border-b border-border">
            <Stepper current={step} labels={STEP_LABELS} />
          </div>

          {/* Step content — key forces remount for animate-in */}
          <div
            key={step}
            className="animate-in fade-in slide-in-from-right-4 duration-200 px-8 py-6"
          >
            {submitError && <FieldError message={submitError} />}
            {step === 1 && (
              <Step1
                data={data}
                errors={errors1}
                showPwd={showPwd}
                showConfirm={showConfirm}
                strength={strength}
                onTogglePwd={() => setShowPwd((v) => !v)}
                onToggleConfirm={() => setShowConfirm((v) => !v)}
                onChange={update}
                clearError={(k) => setErrors1((p) => ({ ...p, [k]: undefined }))}
                onSubmit={handleNext}
              />
            )}
            {step === 2 && (
              <Step2
                data={data}
                errors={errors2}
                onChange={update}
                clearError={(k) => setErrors2((p) => ({ ...p, [k]: undefined }))}
                onBack={() => setStep(1)}
                onSubmit={handleNext}
              />
            )}
            {step === 3 && (
              <Step3
                selected={data.genres}
                isSubmitting={isSubmitting}
                onToggle={(g) => {
                  const next = data.genres.includes(g)
                    ? data.genres.filter((x) => x !== g)
                    : data.genres.length < 5
                    ? [...data.genres, g]
                    : data.genres;
                  update({ genres: next });
                }}
                onBack={() => setStep(2)}
                onSubmit={() => handleSubmit(false)}
                onSkip={() => handleSubmit(true)}
              />
            )}
          </div>
        </div>

      {/* Sign in link */}
      <p className="text-center text-sm text-muted-foreground mt-6">
        ¿Ya tienes cuenta?{" "}
        <Link
          to="/login"
          className="text-violet-600 hover:text-violet-700 font-semibold transition-colors"
        >
          Inicia sesión
        </Link>
      </p>
    </>
  );
}

// ─── Stepper ──────────────────────────────────────────────────────────────────

function Stepper({ current, labels }: { current: number; labels: string[] }) {
  return (
    <div className="flex items-center gap-0">
      {labels.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;

        return (
          <div key={n} className="flex items-center flex-1 last:flex-none">
            {/* Circle */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
                  ${done
                    ? "bg-violet-600 text-white"
                    : active
                    ? "bg-violet-50 border-2 border-violet-600 text-violet-600"
                    : "bg-muted border-2 border-border text-muted-foreground"
                  }`}
              >
                {done ? <Check className="w-3.5 h-3.5" /> : n}
              </div>
              <span
                className={`text-[11px] font-medium whitespace-nowrap leading-none transition-colors duration-300
                  ${active ? "text-violet-600" : done ? "text-foreground" : "text-muted-foreground"}`}
              >
                {label}
              </span>
            </div>

            {/* Connector */}
            {i < labels.length - 1 && (
              <div
                className={`flex-1 h-[2px] mb-4 mx-2 rounded-full transition-all duration-500
                  ${done ? "bg-violet-600" : "bg-border"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1 ───────────────────────────────────────────────────────────────────

interface Step1Props {
  data: FormData;
  errors: Step1Errors;
  showPwd: boolean;
  showConfirm: boolean;
  strength: StrengthInfo;
  onTogglePwd: () => void;
  onToggleConfirm: () => void;
  onChange: (p: Partial<FormData>) => void;
  clearError: (k: keyof Step1Errors) => void;
  onSubmit: (e: FormEvent) => void;
}

function Step1({
  data, errors, showPwd, showConfirm, strength,
  onTogglePwd, onToggleConfirm, onChange, clearError, onSubmit,
}: Step1Props) {
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <StepHeader
        title="Crea tu cuenta"
        subtitle="Empecemos con tus datos básicos"
      />

      {/* Name */}
      <Field label="Nombre completo" error={errors.name}>
        <input
          type="text"
          placeholder="Ana García"
          autoComplete="name"
          value={data.name}
          onChange={(e) => { onChange({ name: e.target.value }); clearError("name"); }}
          className={inputCx(!!errors.name)}
        />
      </Field>

      {/* Email */}
      <Field label="Correo electrónico" error={errors.email}>
        <input
          type="email"
          placeholder="ana@correo.com"
          autoComplete="email"
          value={data.email}
          onChange={(e) => { onChange({ email: e.target.value }); clearError("email"); }}
          className={inputCx(!!errors.email)}
        />
      </Field>

      {/* Password */}
      <Field label="Contraseña" error={errors.password}>
        <PasswordInput
          value={data.password}
          show={showPwd}
          placeholder="Mínimo 8 caracteres"
          autoComplete="new-password"
          onChange={(v) => { onChange({ password: v }); clearError("password"); }}
          onToggle={onTogglePwd}
          hasError={!!errors.password}
        />
        {data.password && (
          <div className="mt-2 space-y-1.5">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                    i <= strength.score ? strength.barColor : "bg-muted"
                  }`}
                />
              ))}
            </div>
            <p className={`text-xs font-medium ${strength.textColor}`}>
              {strength.label}
              <span className="text-muted-foreground font-normal"> — usa mayúsculas, números y símbolos</span>
            </p>
          </div>
        )}
      </Field>

      {/* Confirm password */}
      <Field label="Confirmar contraseña" error={errors.confirmPassword}>
        <PasswordInput
          value={data.confirmPassword}
          show={showConfirm}
          placeholder="Repite tu contraseña"
          autoComplete="new-password"
          onChange={(v) => { onChange({ confirmPassword: v }); clearError("confirmPassword"); }}
          onToggle={onToggleConfirm}
          hasError={!!errors.confirmPassword}
        />
      </Field>

      <NavButtons next="Continuar" />
    </form>
  );
}

// ─── Step 2 ───────────────────────────────────────────────────────────────────

interface Step2Props {
  data: FormData;
  errors: Step2Errors;
  onChange: (p: Partial<FormData>) => void;
  clearError: (k: keyof Step2Errors) => void;
  onBack: () => void;
  onSubmit: (e: FormEvent) => void;
}

function Step2({ data, errors, onChange, clearError, onBack, onSubmit }: Step2Props) {
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <StepHeader
        title="Personaliza tu perfil"
        subtitle="Elige cómo te verán otros lectores"
      />

      {/* Username */}
      <Field label="Nombre de usuario" error={errors.username}>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">
            @
          </span>
          <input
            type="text"
            placeholder="ana_lectora"
            autoComplete="username"
            value={data.username}
            onChange={(e) => {
              onChange({ username: e.target.value.toLowerCase() });
              clearError("username");
            }}
            className={`${inputCx(!!errors.username)} pl-8`}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          Solo letras, números y guión bajo. Mínimo 3 caracteres.
        </p>
      </Field>

      {/* Location */}
      <Field label="Ciudad o región" error={errors.location}>
        <input
          type="text"
          placeholder="Lima, Perú"
          autoComplete="address-level2"
          value={data.location}
          onChange={(e) => { onChange({ location: e.target.value }); clearError("location"); }}
          className={inputCx(!!errors.location)}
        />
      </Field>

      <NavButtons back="Atrás" next="Continuar" onBack={onBack} />
    </form>
  );
}

// ─── Step 3 ───────────────────────────────────────────────────────────────────

interface Step3Props {
  selected: string[];
  isSubmitting: boolean;
  onToggle: (g: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  onSkip: () => void;
}

function Step3({ selected, isSubmitting, onToggle, onBack, onSubmit, onSkip }: Step3Props) {
  return (
    <div className="space-y-5">
      <StepHeader
        title="¿Qué te gusta leer?"
        subtitle="Selecciona hasta 5 géneros favoritos"
      />

      {/* Counter */}
      <div className="flex items-center justify-between text-xs font-medium">
        <span className="text-muted-foreground">
          {selected.length === 0 ? "Ninguno seleccionado" : `${selected.length} seleccionado${selected.length > 1 ? "s" : ""}`}
        </span>
        <span className={selected.length >= 5 ? "text-violet-600" : "text-muted-foreground"}>
          {selected.length} / 5
        </span>
      </div>

      {/* Genre pills */}
      <div className="flex flex-wrap gap-2">
        {GENRES.map((genre) => {
          const isSelected = selected.includes(genre);
          const isDisabled = !isSelected && selected.length >= 5;

          return (
            <button
              key={genre}
              type="button"
              disabled={isDisabled}
              onClick={() => onToggle(genre)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all duration-150
                ${
                  isSelected
                    ? "bg-violet-600 border-violet-600 text-white shadow-sm shadow-violet-200"
                    : isDisabled
                    ? "bg-muted border-border text-muted-foreground/50 cursor-not-allowed"
                    : "bg-white border-border text-foreground hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
                }`}
            >
              {isSelected && <Check className="inline w-3 h-3 mr-1 -mt-0.5" />}
              {genre}
            </button>
          );
        })}
      </div>

      {/* Tip when 5 selected */}
      {selected.length >= 5 && (
        <p className="text-xs text-violet-600 bg-violet-50 border border-violet-100 rounded-lg px-3 py-2">
          Máximo alcanzado. Deselecciona uno para cambiar tu elección.
        </p>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2 gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2.5 rounded-xl hover:bg-muted"
        >
          <ChevronLeft className="w-4 h-4" />
          Atrás
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSkip}
            disabled={isSubmitting}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2.5 rounded-xl hover:bg-muted disabled:opacity-50"
          >
            Omitir
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting || selected.length === 0}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all hover:shadow-md hover:shadow-violet-200 active:scale-[0.98]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creando cuenta…
              </>
            ) : (
              <>
                Crear cuenta
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function StepHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-1">
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground">{label}</label>
      {children}
      {error && <FieldError message={error} />}
    </div>
  );
}

function FieldError({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-1.5 text-red-600 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
      {message}
    </div>
  );
}

interface PasswordInputProps {
  value: string;
  show: boolean;
  placeholder: string;
  autoComplete: string;
  hasError: boolean;
  onChange: (v: string) => void;
  onToggle: () => void;
}

function PasswordInput({
  value, show, placeholder, autoComplete, hasError, onChange, onToggle,
}: PasswordInputProps) {
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        placeholder={placeholder}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputCx(hasError)} pr-11`}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
        aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function NavButtons({
  back,
  next,
  onBack,
}: {
  back?: string;
  next: string;
  onBack?: () => void;
}) {
  return (
    <div className="flex items-center justify-between pt-2 gap-3">
      {back && onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2.5 rounded-xl hover:bg-muted"
        >
          <ChevronLeft className="w-4 h-4" />
          {back}
        </button>
      ) : (
        <div />
      )}
      <button
        type="submit"
        className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all hover:shadow-md hover:shadow-violet-200 active:scale-[0.98]"
      >
        {next}
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inputCx(hasError: boolean) {
  return `w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white placeholder:text-muted-foreground/60 outline-none transition-all
    ${
      hasError
        ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
        : "border-border focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
    }`;
}

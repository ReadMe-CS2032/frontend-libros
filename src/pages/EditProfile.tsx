import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Camera, MapPin, AlignLeft, User as UserIcon, Save, Loader2, Link as LinkIcon } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { getZones, updateProfile, uploadProfilePhoto, type ZoneOption } from "@/api/users";
import { cn } from "@/lib/utils";

// ─── Field config ─────────────────────────────────────────────────────────────

const BIO_MAX = 300;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EditProfilePage() {
  const user     = useAuthStore((s) => s.user);
  const token    = useAuthStore((s) => s.token);
  const setUser  = useAuthStore((s) => s.setUser);
  const navigate = useNavigate();
  const fileRef  = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name:     user?.name     ?? "",
    zoneId:   user?.zoneId ? String(user.zoneId) : "",
    bio:      user?.bio      ?? "",
    photoUrl: user?.avatar   ?? "",
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [errors, setErrors]   = useState<Partial<Record<"name" | "avatar", string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [saving, setSaving]   = useState(false);

  const displayAvatar = avatarPreview ?? form.photoUrl ?? user?.avatar ?? "";

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    const authToken = token;

    async function loadZones() {
      setZonesLoading(true);
      const response = await getZones(authToken);
      if (cancelled) return;

      if (response.ok) {
        setZones(response.data);
      }

      setZonesLoading(false);
    }

    loadZones();

    return () => {
      cancelled = true;
    };
  }, [token]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, avatar: "La imagen no puede superar los 5 MB." }));
      return;
    }
    setErrors((prev) => ({ ...prev, avatar: undefined }));
    setSubmitError(null);
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function field<K extends keyof typeof form>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
  }

  function validate() {
    const errs: typeof errors = {};
    if (!form.name.trim() || form.name.trim().length < 2)
      errs.name = "El nombre debe tener al menos 2 caracteres.";
    return errs;
  }

  async function handleSave() {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    if (!user || !token) {
      setSubmitError("Tu sesión no es válida. Vuelve a iniciar sesión.");
      return;
    }

    setSaving(true);
    setSubmitError(null);

    const zoneId = form.zoneId ? Number(form.zoneId) : null;

    const profileResponse = await updateProfile(user.id, token, {
      name:     form.name.trim(),
      zoneId,
      photoUrl: form.photoUrl.trim() || null,
    });

    if (!profileResponse.ok) {
      setSaving(false);
      setSubmitError(profileResponse.error || "No se pudo actualizar el perfil");
      return;
    }

    let nextUser = {
      ...profileResponse.data,
      bio: form.bio.trim(),
    };

    if (avatarFile) {
      const photoResponse = await uploadProfilePhoto(user.id, token, avatarFile);
      if (!photoResponse.ok) {
        setSaving(false);
        setSubmitError(photoResponse.error || "No se pudo subir la foto");
        return;
      }

      nextUser = {
        ...photoResponse.data,
        bio: form.bio.trim(),
      };
    }

    setUser(nextUser);
    setSaving(false);
    navigate("/perfil");
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Link
          to="/perfil"
          className="w-8 h-8 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground leading-none">
            Editar perfil
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Actualiza tu información personal
          </p>
        </div>
      </div>

      {/* ── Form card ─────────────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-border/60 bg-white shadow-sm overflow-hidden">

        {/* Avatar */}
        <div className="px-6 sm:px-8 pt-8 pb-6 flex flex-col items-center gap-3 border-b border-border/50">
          <div
            className="relative group cursor-pointer"
            onClick={() => fileRef.current?.click()}
            role="button"
            aria-label="Cambiar foto de perfil"
          >
            <img
              src={displayAvatar}
              alt={user.name}
              className="w-28 h-28 rounded-2xl object-cover ring-4 ring-border shadow-md"
            />
            <div className="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-black/45 transition-colors duration-200 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
              <Camera className="w-6 h-6 text-white" />
              <span className="text-[11px] font-semibold text-white">Cambiar</span>
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="text-xs font-semibold text-violet-600 hover:text-violet-700 transition-colors"
          >
            Cambiar foto de perfil
          </button>

          {errors.avatar ? (
            <p className="text-xs text-red-500">{errors.avatar}</p>
          ) : (
            <p className="text-xs text-muted-foreground">JPG, PNG, GIF o WebP · máx. 5 MB</p>
          )}

          <div className="w-full max-w-sm">
            <FormField label="O pega una URL de imagen" icon={LinkIcon}>
              <input
                type="url"
                value={form.photoUrl}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, photoUrl: e.target.value }));
                  setAvatarPreview(null);
                  setAvatarFile(null);
                }}
                placeholder="https://…"
                className={inputCn(false)}
              />
            </FormField>
          </div>
        </div>

        {/* Fields */}
        <div className="px-6 sm:px-8 py-7 space-y-6">

          {/* Name */}
          <FormField
            label="Nombre"
            required
            icon={UserIcon}
            error={errors.name}
          >
            <input
              type="text"
              value={form.name}
              onChange={field("name")}
              placeholder="Tu nombre completo"
              maxLength={80}
              className={inputCn(!!errors.name)}
            />
          </FormField>

          {/* Location */}
          <FormField label="Ubicación" icon={MapPin}>
            <select
              value={form.zoneId}
              onChange={(e) => setForm((prev) => ({ ...prev, zoneId: e.target.value }))}
              className={inputCn(false)}
            >
              <option value="">
                {zonesLoading ? "Cargando zonas..." : "Sin zona seleccionada"}
              </option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
          </FormField>

          {/* Bio */}
          <FormField label="Biografía" icon={AlignLeft}>
            <textarea
              value={form.bio}
              onChange={field("bio")}
              placeholder="Cuéntanos algo sobre ti y tus gustos literarios…"
              rows={4}
              maxLength={BIO_MAX}
              className={cn(inputCn(false), "resize-none leading-relaxed")}
            />
            <p className={cn(
              "text-xs text-right mt-1 tabular-nums",
              form.bio.length >= BIO_MAX ? "text-red-400 font-medium" : "text-muted-foreground"
            )}>
              {form.bio.length}/{BIO_MAX}
            </p>
            <p className="text-xs text-muted-foreground">
              Este campo todavía no se guarda en el microservicio de usuarios.
            </p>
          </FormField>

          {submitError && (
            <p className="text-sm text-red-600">{submitError}</p>
          )}

        </div>

        {/* Actions */}
        <div className="px-6 sm:px-8 pb-8 pt-0 flex items-center justify-end gap-3 border-t border-border/50 pt-5">
          <Link
            to="/perfil"
            className="px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-150"
          >
            Cancelar
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={cn(
              "inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white",
              "bg-gradient-to-r from-violet-600 to-purple-600",
              "hover:from-violet-700 hover:to-purple-700",
              "shadow-sm shadow-violet-200 transition-all duration-150 active:scale-95",
              "disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
            )}
          >
            {saving
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Save    className="w-4 h-4" />
            }
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── Form field wrapper ───────────────────────────────────────────────────────

interface FormFieldProps {
  label:    string;
  icon:     React.ElementType;
  required?: boolean;
  error?:   string;
  children: React.ReactNode;
}

function FormField({ label, icon: Icon, required, error, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0" />
        <span className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
        </span>
      </label>
      {children}
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
}

// ─── Input class helper ───────────────────────────────────────────────────────

function inputCn(hasError: boolean) {
  return cn(
    "w-full px-4 py-2.5 rounded-xl border text-sm text-foreground",
    "placeholder:text-muted-foreground/60",
    "focus:outline-none focus:ring-2 transition-all duration-150",
    hasError
      ? "border-red-400 bg-red-50/40 focus:ring-red-200 focus:border-red-400"
      : "border-border bg-white focus:ring-violet-300/60 focus:border-violet-400"
  );
}

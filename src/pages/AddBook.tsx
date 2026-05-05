import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Check, Tag, Repeat2, Gift,
  Loader2, BookOpen, Sparkles, Upload, ImagePlus,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { getCategories } from "@/api/categories";
import { createBook, getBooks, saveLocalBookCover } from "@/api/books";
import type { BookMode } from "@/types";
import {
  cn,
  MODE_LABELS,
  MODE_COLORS,
  formatPrice,
} from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3;

const MAX_GENRES = 4;
const CURRENT_YEAR = new Date().getFullYear();

const LANGUAGES = ["Español", "Inglés", "Francés", "Portugués", "Alemán", "Italiano", "Otro"];
const MAX_LOCAL_COVER_SIZE_MB = 5;


const MODES: {
  value: BookMode;
  label: string;
  desc:  string;
  icon:  React.ElementType;
  ring:  string;
  bg:    string;
  text:  string;
}[] = [
  { value: "sell",     label: "Venta",       desc: "Precio fijo en soles",  icon: Tag,     ring: "ring-violet-300", bg: "bg-violet-50",  text: "text-violet-700" },
  { value: "exchange", label: "Intercambio", desc: "Por otro libro",        icon: Repeat2, ring: "ring-blue-300",   bg: "bg-blue-50",    text: "text-blue-700"   },
  { value: "donate",   label: "Donación",    desc: "Sin ningún costo",      icon: Gift,    ring: "ring-emerald-300",bg: "bg-emerald-50", text: "text-emerald-700"},
];

// ─── Form state ───────────────────────────────────────────────────────────────

type FormData = {
  title:       string;
  author:      string;
  editorial:   string;
  year:        string;
  description: string;
  cover:       string;
  language:    string;
  mode:        BookMode | "";
  price:       string;
  genres:      string[];
};

const INITIAL: FormData = {
  title: "", author: "", editorial: "", year: "",
  description: "", cover: "", language: "Español",
  mode: "", price: "", genres: [],
};

// ─── Validation ───────────────────────────────────────────────────────────────

function validate(step: Step, d: FormData) {
  const e: Partial<Record<keyof FormData | "genres", string>> = {};
  if (step >= 1) {
    if (!d.title.trim())       e.title       = "El título es obligatorio.";
    if (!d.author.trim())      e.author      = "El autor es obligatorio.";
    if (!d.description.trim()) e.description = "La descripción es obligatoria.";
    if (d.year && (isNaN(+d.year) || +d.year < 1450 || +d.year > CURRENT_YEAR))
      e.year = `Año entre 1450 y ${CURRENT_YEAR}.`;
  }
  if (step >= 2) {
    if (!d.mode)      e.mode      = "Selecciona un modo de transacción.";
    if (d.mode === "sell") {
      if (!d.price)        e.price = "El precio es obligatorio.";
      else if (+d.price <= 0) e.price = "El precio debe ser mayor a 0.";
    }
  }
  if (step >= 3) {
    if (d.genres.length === 0) e.genres = "Selecciona al menos un género.";
  }
  return e;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AddBookPage() {
  const currentUser = useAuthStore((s) => s.user);
  const token       = useAuthStore((s) => s.token);
  const navigate    = useNavigate();

  const [step,       setStep]       = useState<Step>(1);
  const [form,       setForm]       = useState<FormData>(INITIAL);
  const [errors,     setErrors]     = useState<ReturnType<typeof validate>>({});
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [categoryNames, setCategoryNames] = useState<string[]>([]);
  const [localCover, setLocalCover] = useState<string | null>(null);
  const [coverMessage, setCoverMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    const authToken = token;

    async function loadCategories() {
      const [catResponse, booksResponse] = await Promise.all([
        getCategories(authToken),
        getBooks(authToken),
      ]);
      if (cancelled) return;

      if (catResponse.ok && catResponse.data.length > 0) {
        setCategoryNames(catResponse.data.map((c) => c.name));
        return;
      }

      if (booksResponse.ok) {
        const fromBooks = [...new Set(booksResponse.data.map((b) => b.genre).filter(Boolean))];
        if (fromBooks.length > 0) {
          setCategoryNames(fromBooks);
          return;
        }
      }

      // Fallback: lista de géneros predeterminados
      setCategoryNames([
        "Ficción", "No ficción", "Ciencia ficción", "Fantasía", "Misterio",
        "Thriller", "Romance", "Aventura", "Terror", "Historia",
        "Biografía", "Autoayuda", "Filosofía", "Ciencia", "Arte",
        "Tecnología", "Economía", "Derecho", "Educación", "Poesía",
      ]);
    }

    loadCategories();

    return () => {
      cancelled = true;
    };
  }, [token]);

  function set<K extends keyof FormData>(key: K, val: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function clearLocalCover() {
    setLocalCover(null);
    setCoverMessage(null);
  }

  async function processImageFile(file: File): Promise<string> {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
      reader.readAsDataURL(file);
    });

    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("No se pudo procesar la imagen"));
      img.src = dataUrl;
    });

    const targetRatio = 3 / 4;
    const sourceRatio = image.width / image.height;

    let cropWidth = image.width;
    let cropHeight = image.height;
    let offsetX = 0;
    let offsetY = 0;

    if (sourceRatio > targetRatio) {
      cropWidth = image.height * targetRatio;
      offsetX = (image.width - cropWidth) / 2;
    } else {
      cropHeight = image.width / targetRatio;
      offsetY = (image.height - cropHeight) / 2;
    }

    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 1200;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("No se pudo preparar la portada");
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(
      image,
      offsetX,
      offsetY,
      cropWidth,
      cropHeight,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return canvas.toDataURL("image/jpeg", 0.9);
  }

  async function handleLocalCoverChange(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setCoverMessage("Selecciona un archivo de imagen valido.");
      return;
    }
    if (file.size > MAX_LOCAL_COVER_SIZE_MB * 1024 * 1024) {
      setCoverMessage(`La imagen no puede superar ${MAX_LOCAL_COVER_SIZE_MB} MB.`);
      return;
    }

    try {
      const processedCover = await processImageFile(file);
      setLocalCover(processedCover);
      setCoverMessage(
        "Portada local lista. Se ajustara automaticamente al formato vertical 3:4."
      );
    } catch (error) {
      setCoverMessage(
        error instanceof Error ? error.message : "No se pudo preparar la portada"
      );
    }
  }

  function handleNext() {
    const errs = validate(step, form);
    const stepKeys: Record<Step, (keyof FormData)[]> = {
      1: ["title", "author", "description", "year"],
      2: ["mode", "price"],
      3: ["genres"],
    };
    const stepErrors = Object.fromEntries(
      stepKeys[step].filter((k) => errs[k]).map((k) => [k, errs[k]])
    );
    if (Object.keys(stepErrors).length) { setErrors(stepErrors); return; }
    setErrors({});
    setStep((s) => (s + 1) as Step);
  }

  async function handlePublish() {
    const errs = validate(3, form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    if (!currentUser || !token) return;
    setPublishing(true);
    setPublishError(null);
    const result = await createBook({
      title:       form.title.trim(),
      author:      form.author.trim(),
      description: form.description.trim(),
      cover:       form.cover.trim() || "",
      genre:       form.genres[0],
      year:        +form.year || CURRENT_YEAR,
      language:    form.language,
      condition:   "good",
      mode:        form.mode as BookMode,
      price:       form.mode === "sell" ? +form.price : undefined,
      ownerId:     currentUser.id,
      location:    currentUser.location,
      isFeatured:  false,
    }, token);
    setPublishing(false);
    if (result.ok) {
      if (localCover) {
        saveLocalBookCover(result.data.id, localCover);
      }
      navigate(`/libro/${result.data.id}`);
    } else {
      setPublishError(result.error ?? "No se pudo publicar el libro");
    }
  }

  const progress = ((step - 1) / 2) * 100;
  const genreOptions = useMemo(() => categoryNames, [categoryNames]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Link to="/mi-biblioteca" className="w-8 h-8 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex-shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground leading-none">
            Publicar
            <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent"> libro</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Completa los 3 pasos para publicar tu libro</p>
        </div>
      </div>

      {/* ── Wizard card ───────────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-border/60 bg-white shadow-sm overflow-hidden">

        {/* Progress bar */}
        <div className="h-1 bg-muted/60">
          <div
            className="h-full bg-gradient-to-r from-violet-600 to-purple-600 transition-all duration-500 ease-out"
            style={{ width: `${progress + 34}%` }}
          />
        </div>

        {/* Step indicator */}
        <div className="px-6 sm:px-8 pt-6 pb-5 border-b border-border/50">
          <StepIndicator step={step} />
        </div>

        {/* Step content */}
        <div className="px-6 sm:px-8 py-7">
          {step === 1 && (
            <Step1
              form={form}
              errors={errors}
              set={set}
              localCover={localCover}
              coverMessage={coverMessage}
              onLocalCoverChange={handleLocalCoverChange}
              onClearLocalCover={clearLocalCover}
            />
          )}
          {step === 2 && <Step2 form={form} errors={errors} set={set} />}
          {step === 3 && (
            <Step3
              form={form}
              errors={errors}
              set={set}
              categories={genreOptions}
              localCover={localCover}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="px-6 sm:px-8 pb-8 flex items-center justify-between border-t border-border/50 pt-5">
          {step > 1 ? (
            <button
              onClick={() => setStep((s) => (s - 1) as Step)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Anterior
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              onClick={handleNext}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-sm shadow-violet-200 transition-all active:scale-95"
            >
              Siguiente
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="flex flex-col items-end gap-2">
              {publishError && (
                <p className="text-xs text-red-500 font-medium text-right">{publishError}</p>
              )}
              <button
                onClick={() => void handlePublish()}
                disabled={publishing}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-sm shadow-violet-200 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {publishing ? "Publicando…" : "Publicar libro"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEP_LABELS = ["Información", "Detalles", "Géneros"];

function StepIndicator({ step }: { step: Step }) {
  return (
    <div className="flex items-start justify-center gap-0">
      {STEP_LABELS.map((label, i) => {
        const n      = i + 1;
        const done   = step > n;
        const active = step === n;
        return (
          <div key={n} className="flex items-start">
            {i > 0 && (
              <div className={cn("w-16 sm:w-24 h-px mt-4 transition-colors duration-300", done ? "bg-violet-400" : "bg-border")} />
            )}
            <div className="flex flex-col items-center gap-1.5">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
                done   ? "bg-violet-600 text-white"
                       : active ? "bg-violet-600 text-white ring-4 ring-violet-100"
                                : "bg-muted text-muted-foreground border border-border"
              )}>
                {done ? <Check className="w-3.5 h-3.5" /> : n}
              </div>
              <span className={cn(
                "text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap",
                active ? "text-violet-700" : "text-muted-foreground/60"
              )}>
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Shared field wrapper ─────────────────────────────────────────────────────

function Field({
  label, required, error, children,
}: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
}

function inputCn(err?: string) {
  return cn(
    "w-full px-4 py-2.5 rounded-xl border text-sm text-foreground placeholder:text-muted-foreground/60",
    "focus:outline-none focus:ring-2 transition-all duration-150",
    err
      ? "border-red-400 bg-red-50/40 focus:ring-red-200 focus:border-red-400"
      : "border-border bg-white focus:ring-violet-300/60 focus:border-violet-400"
  );
}

// ─── Step 1 — Información ─────────────────────────────────────────────────────

type StepProps = {
  form:   FormData;
  errors: ReturnType<typeof validate>;
  set:    <K extends keyof FormData>(k: K, v: FormData[K]) => void;
};

function Step1({
  form,
  errors,
  set,
  localCover,
  coverMessage,
  onLocalCoverChange,
  onClearLocalCover,
}: StepProps & {
  localCover: string | null;
  coverMessage: string | null;
  onLocalCoverChange: (file: File | null) => void | Promise<void>;
  onClearLocalCover: () => void;
}) {
  const previewSrc =
    localCover ||
    form.cover.trim() ||
    "https://covers.openlibrary.org/b/id/8228631-L.jpg";

  return (
    <div className="space-y-5">
      <Field label="Título" required error={errors.title as string}>
        <input
          type="text"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Ej. Cien años de soledad"
          maxLength={120}
          className={inputCn(errors.title as string)}
        />
      </Field>

      <Field label="Autor" required error={errors.author as string}>
        <input
          type="text"
          value={form.author}
          onChange={(e) => set("author", e.target.value)}
          placeholder="Ej. Gabriel García Márquez"
          maxLength={100}
          className={inputCn(errors.author as string)}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Editorial">
          <input
            type="text"
            value={form.editorial}
            onChange={(e) => set("editorial", e.target.value)}
            placeholder="Ej. Sudamericana"
            maxLength={80}
            className={inputCn()}
          />
        </Field>
        <Field label="Año de publicación" error={errors.year as string}>
          <input
            type="number"
            value={form.year}
            onChange={(e) => set("year", e.target.value)}
            placeholder={String(CURRENT_YEAR)}
            min={1450}
            max={CURRENT_YEAR}
            className={inputCn(errors.year as string)}
          />
        </Field>
      </div>

      <Field label="Descripción" required error={errors.description as string}>
        <textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Describe brevemente de qué trata el libro…"
          rows={4}
          maxLength={600}
          className={cn(inputCn(errors.description as string), "resize-none leading-relaxed")}
        />
        <p className={cn("text-xs text-right mt-0.5 tabular-nums", form.description.length >= 580 ? "text-red-400" : "text-muted-foreground/50")}>
          {form.description.length}/600
        </p>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="URL de portada">
          <input
            type="url"
            value={form.cover}
            onChange={(e) => set("cover", e.target.value)}
            placeholder="https://…"
            className={inputCn()}
          />
        </Field>
        <Field label="Idioma">
          <select
            value={form.language}
            onChange={(e) => set("language", e.target.value)}
            className={cn(inputCn(), "cursor-pointer appearance-none")}
          >
            {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Imagen desde tu laptop">
        <div className="space-y-3">
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-violet-300 bg-violet-50/60 px-4 py-3 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-100">
            <ImagePlus className="w-4 h-4" />
            Seleccionar imagen
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onLocalCoverChange(e.target.files?.[0] ?? null)}
            />
          </label>

          <div className="rounded-2xl border border-border/60 bg-muted/20 p-3 flex gap-4">
            <div className="w-24 flex-shrink-0">
              <div className="aspect-[3/4] overflow-hidden rounded-xl bg-muted/60">
                <img
                  src={previewSrc}
                  alt="Vista previa de portada"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-sm font-medium text-foreground">
                La imagen se adapta automaticamente a portada vertical 3:4.
              </p>
              <p className="text-xs text-muted-foreground">
                Si eliges una imagen local, se mostrara bien en el frontend y se guardara en este navegador.
              </p>
              {coverMessage && (
                <p className="text-xs text-violet-700">{coverMessage}</p>
              )}
              {localCover && (
                <button
                  type="button"
                  onClick={onClearLocalCover}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50"
                >
                  <Upload className="w-3 h-3" />
                  Quitar imagen local
                </button>
              )}
            </div>
          </div>
        </div>
      </Field>
    </div>
  );
}

// ─── Step 2 — Detalles ────────────────────────────────────────────────────────

function Step2({ form, errors, set }: StepProps) {
  return (
    <div className="space-y-7">

      {/* Mode */}
      <div className="space-y-3">
        <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
          Modo de transacción<span className="text-red-400 ml-0.5">*</span>
        </p>
        <div className="grid grid-cols-3 gap-3">
          {MODES.map(({ value, label, desc, icon: Icon, ring, bg, text }) => {
            const active = form.mode === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => { set("mode", value); if (value !== "sell") set("price", ""); }}
                className={cn(
                  "flex flex-col items-center gap-2.5 p-4 rounded-2xl border text-center transition-all duration-150",
                  active ? cn("border-transparent ring-2", ring, bg) : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                )}
              >
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", active ? bg : "bg-muted/60")}>
                  <Icon className={cn("w-5 h-5", active ? text : "text-muted-foreground")} />
                </div>
                <div>
                  <p className={cn("text-sm font-semibold leading-none", active ? text : "text-foreground")}>{label}</p>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{desc}</p>
                </div>
              </button>
            );
          })}
        </div>
        {errors.mode && <p className="text-xs text-red-500 font-medium">{errors.mode as string}</p>}
      </div>

      {/* Price — only for sell */}
      {form.mode === "sell" && (
        <Field label="Precio de venta" required error={errors.price as string}>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground select-none">
              S/
            </span>
            <input
              type="number"
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
              placeholder="0.00"
              min={0}
              step={0.5}
              className={cn(inputCn(errors.price as string), "pl-9")}
            />
          </div>
        </Field>
      )}
    </div>
  );
}

// ─── Step 3 — Géneros + resumen ───────────────────────────────────────────────

function Step3({
  form,
  errors,
  set,
  categories,
  localCover,
}: StepProps & { categories: string[]; localCover: string | null }) {
  function toggleGenre(g: string) {
    const has = form.genres.includes(g);
    if (!has && form.genres.length >= MAX_GENRES) return;
    set("genres", has ? form.genres.filter((x) => x !== g) : [...form.genres, g]);
  }

  const coverSrc =
    localCover ||
    form.cover.trim() ||
    "https://covers.openlibrary.org/b/id/8228631-L.jpg";

  return (
    <div className="space-y-7">

      {/* Genre picker */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
            Géneros<span className="text-red-400 ml-0.5">*</span>
          </p>
          <span className={cn(
            "text-[11px] font-semibold tabular-nums px-2 py-0.5 rounded-full",
            form.genres.length >= MAX_GENRES
              ? "bg-violet-100 text-violet-700"
              : "bg-muted text-muted-foreground"
          )}>
            {form.genres.length}/{MAX_GENRES}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((g) => {
            const selected  = form.genres.includes(g);
            const maxed     = !selected && form.genres.length >= MAX_GENRES;
            return (
              <button
                key={g}
                type="button"
                onClick={() => toggleGenre(g)}
                disabled={maxed}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150",
                  selected
                    ? "bg-violet-600 text-white shadow-sm"
                    : maxed
                      ? "bg-muted/40 text-muted-foreground/40 cursor-not-allowed border border-border/40"
                      : "bg-muted/60 text-muted-foreground border border-border/60 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50"
                )}
              >
                <BookOpen className="w-3 h-3 flex-shrink-0" />
                {g}
              </button>
            );
          })}
        </div>
        {categories.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Cargando categorías...
          </p>
        )}
        {errors.genres && <p className="text-xs text-red-500 font-medium">{errors.genres as string}</p>}
      </div>

      {/* Summary */}
      <div className="space-y-3">
        <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
          Resumen de tu publicación
        </p>

        <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 flex gap-4">

          {/* Cover thumbnail */}
          <div className="w-16 flex-shrink-0">
            <div className="aspect-[3/4] rounded-xl overflow-hidden bg-muted/60">
              {form.cover.trim() ? (
                <img src={coverSrc} alt="portada" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white/70" />
                </div>
              )}
            </div>
          </div>

          {/* Meta */}
          <div className="flex-1 min-w-0 space-y-2">
            <div>
              <p className="text-sm font-bold text-foreground leading-snug line-clamp-2">
                {form.title || <span className="text-muted-foreground italic">Sin título</span>}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {form.author || "—"}
                {form.year ? ` · ${form.year}` : ""}
                {form.language !== "Español" ? ` · ${form.language}` : ""}
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {form.mode && (
                <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", MODE_COLORS[form.mode as BookMode])}>
                  {MODE_LABELS[form.mode as BookMode]}
                </span>
              )}
              {form.mode === "sell" && form.price && (
                <span className="text-[10px] font-bold text-violet-700 px-2 py-0.5 rounded-full bg-violet-50">
                  {formatPrice(+form.price)}
                </span>
              )}
            </div>

            {form.genres.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {form.genres.map((g) => (
                  <span key={g} className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
                    {g}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

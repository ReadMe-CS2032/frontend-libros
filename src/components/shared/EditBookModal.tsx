import { useEffect, useRef, useState } from "react";
import {
  X, ImagePlus, Upload, Tag, Repeat2, Gift, Loader2, Check, BookOpen,
} from "lucide-react";
import { getCategories } from "@/api/categories";
import { updateBook, uploadBookPhoto, saveLocalBookCover } from "@/api/books";
import type { Book, BookMode } from "@/types";
import { cn, MODE_COLORS, MODE_LABELS, formatPrice } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_GENRES = 4;
const MAX_COVER_MB = 5;
const CURRENT_YEAR = new Date().getFullYear();

const MODES: {
  value: BookMode;
  label: string;
  desc:  string;
  icon:  React.ElementType;
  ring:  string;
  bg:    string;
  text:  string;
}[] = [
  { value: "sell",     label: "Venta",       desc: "Precio fijo",      icon: Tag,     ring: "ring-violet-300", bg: "bg-violet-50",   text: "text-violet-700"  },
  { value: "exchange", label: "Intercambio", desc: "Por otro libro",   icon: Repeat2, ring: "ring-blue-300",   bg: "bg-blue-50",     text: "text-blue-700"    },
  { value: "donate",   label: "Donación",    desc: "Sin ningún costo", icon: Gift,    ring: "ring-emerald-300",bg: "bg-emerald-50",  text: "text-emerald-700" },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface EditBookModalProps {
  book:    Book;
  token:   string;
  onClose: () => void;
  onSaved: (updated: Book) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
  const bytes = atob(data);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

async function processImageFile(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(String(reader.result));
    reader.onerror = () => rej(new Error("No se pudo leer la imagen"));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("No se pudo procesar la imagen"));
    img.src = dataUrl;
  });

  const targetRatio = 3 / 4;
  const sourceRatio = image.width / image.height;
  let cropW = image.width, cropH = image.height, ox = 0, oy = 0;
  if (sourceRatio > targetRatio) { cropW = image.height * targetRatio; ox = (image.width - cropW) / 2; }
  else                           { cropH = image.width / targetRatio;  oy = (image.height - cropH) / 2; }

  const canvas = document.createElement("canvas");
  canvas.width = 900; canvas.height = 1200;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, ox, oy, cropW, cropH, 0, 0, 900, 1200);
  return canvas.toDataURL("image/jpeg", 0.9);
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

function Field({ label, required, error, children }: {
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function EditBookModal({ book, token, onClose, onSaved }: EditBookModalProps) {
  const [title,       setTitle]       = useState(book.title);
  const [author,      setAuthor]      = useState(book.author);
  const [description, setDescription] = useState(book.description);
  const [year,        setYear]        = useState(book.year ? String(book.year) : "");
  const [coverUrl,    setCoverUrl]    = useState(book.cover.startsWith("data:") ? "" : book.cover);
  const [mode,        setMode]        = useState<BookMode>(book.mode || "exchange");
  const [price,       setPrice]       = useState(book.price != null ? String(book.price) : "");
  const [genres,      setGenres]      = useState<string[]>(book.genre ? [book.genre] : []);
  const [categories,  setCategories]  = useState<string[]>([]);
  const [localCover,  setLocalCover]  = useState<string | null>(null);
  const [coverMsg,    setCoverMsg]    = useState<string | null>(null);
  const [errors,      setErrors]      = useState<Record<string, string>>({});
  const [saving,      setSaving]      = useState(false);
  const [saveError,   setSaveError]   = useState<string | null>(null);

  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const res = await getCategories(token);
      if (cancelled) return;
      if (res.ok && res.data.length > 0) {
        setCategories(res.data.map((c) => c.name));
      } else {
        setCategories([
          "Ficción", "No ficción", "Ciencia ficción", "Fantasía", "Misterio",
          "Thriller", "Romance", "Aventura", "Terror", "Historia",
          "Biografía", "Autoayuda", "Filosofía", "Ciencia", "Arte",
          "Tecnología", "Economía", "Derecho", "Educación", "Poesía",
        ]);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [token]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleCoverFile(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setCoverMsg("Selecciona un archivo de imagen válido."); return; }
    if (file.size > MAX_COVER_MB * 1024 * 1024) { setCoverMsg(`La imagen no puede superar ${MAX_COVER_MB} MB.`); return; }
    try {
      const processed = await processImageFile(file);
      setLocalCover(processed);
      setCoverMsg("Imagen lista — se ajustará al formato 3:4.");
    } catch (err) {
      setCoverMsg(err instanceof Error ? err.message : "No se pudo procesar la imagen");
    }
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!title.trim())       e.title       = "El título es obligatorio.";
    if (!author.trim())      e.author      = "El autor es obligatorio.";
    if (!description.trim()) e.description = "La descripción es obligatoria.";
    if (year && (isNaN(+year) || +year < 1450 || +year > CURRENT_YEAR))
      e.year = `Año entre 1450 y ${CURRENT_YEAR}.`;
    if (mode === "sell") {
      if (!price)      e.price = "El precio es obligatorio.";
      else if (+price <= 0) e.price = "Debe ser mayor a 0.";
    }
    return e;
  }

  async function handleSave() {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSaving(true);
    setSaveError(null);

    const patch: Parameters<typeof updateBook>[1] = {
      title:       title.trim(),
      author:      author.trim(),
      description: description.trim(),
      genre:       genres[0] ?? book.genre,
      mode,
      price:       mode === "sell" ? +price : undefined,
      year:        year ? +year : book.year,
    };

    const res = await updateBook(book.id, patch, token);

    if (!res.ok) {
      setSaving(false);
      setSaveError(res.error ?? "No se pudo guardar");
      return;
    }

    let updated = res.data;

    if (localCover) {
      const blob = dataUrlToBlob(localCover);
      const file = new File([blob], "cover.jpg", { type: "image/jpeg" });
      const photoRes = await uploadBookPhoto(book.id, token, file);
      if (photoRes.ok) {
        updated = photoRes.data;
      } else {
        saveLocalBookCover(book.id, localCover);
        updated = { ...updated, cover: localCover };
      }
    } else if (coverUrl.trim() && coverUrl.trim() !== book.cover) {
      const urlRes = await updateBook(book.id, { cover: coverUrl.trim() }, token);
      if (urlRes.ok) updated = urlRes.data;
    }

    setSaving(false);
    onSaved(updated);
    onClose();
  }

  const previewSrc = localCover || coverUrl.trim() || book.cover || "";

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-border/60 overflow-hidden">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-foreground leading-none">
              Editar
              <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent"> libro</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{book.title}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Body ──────────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

          {/* Información básica */}
          <section className="space-y-4">
            <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
              Información básica
            </p>

            <Field label="Título" required error={errors.title}>
              <input
                type="text"
                value={title}
                onChange={(e) => { setTitle(e.target.value); setErrors((p) => ({ ...p, title: "" })); }}
                placeholder="Ej. Cien años de soledad"
                maxLength={120}
                className={inputCn(errors.title)}
              />
            </Field>

            <Field label="Autor" required error={errors.author}>
              <input
                type="text"
                value={author}
                onChange={(e) => { setAuthor(e.target.value); setErrors((p) => ({ ...p, author: "" })); }}
                placeholder="Ej. Gabriel García Márquez"
                maxLength={100}
                className={inputCn(errors.author)}
              />
            </Field>

            <Field label="Descripción" required error={errors.description}>
              <textarea
                value={description}
                onChange={(e) => { setDescription(e.target.value); setErrors((p) => ({ ...p, description: "" })); }}
                placeholder="Describe brevemente de qué trata el libro…"
                rows={4}
                maxLength={600}
                className={cn(inputCn(errors.description), "resize-none leading-relaxed")}
              />
              <p className={cn("text-xs text-right mt-0.5 tabular-nums", description.length >= 580 ? "text-red-400" : "text-muted-foreground/50")}>
                {description.length}/600
              </p>
            </Field>

            <Field label="Año de publicación" error={errors.year}>
              <input
                type="number"
                value={year}
                onChange={(e) => { setYear(e.target.value); setErrors((p) => ({ ...p, year: "" })); }}
                placeholder={String(CURRENT_YEAR)}
                min={1450}
                max={CURRENT_YEAR}
                className={inputCn(errors.year)}
              />
            </Field>
          </section>

          {/* Portada */}
          <section className="space-y-4">
            <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
              Portada
            </p>

            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 flex gap-4">
              <div className="w-20 flex-shrink-0">
                <div className="aspect-[3/4] rounded-xl overflow-hidden bg-muted/60">
                  {previewSrc ? (
                    <img src={previewSrc} alt="portada" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-white/70" />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0 space-y-3">
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-violet-300 bg-violet-50/60 px-4 py-2.5 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-100">
                  <ImagePlus className="w-4 h-4" />
                  Subir imagen
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => void handleCoverFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                {coverMsg && <p className="text-xs text-violet-700">{coverMsg}</p>}
                {localCover && (
                  <button
                    type="button"
                    onClick={() => { setLocalCover(null); setCoverMsg(null); }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  >
                    <Upload className="w-3 h-3" />
                    Quitar imagen
                  </button>
                )}
                <Field label="O pega una URL">
                  <input
                    type="url"
                    value={coverUrl}
                    onChange={(e) => setCoverUrl(e.target.value)}
                    placeholder="https://…"
                    className={inputCn()}
                  />
                </Field>
              </div>
            </div>
          </section>

          {/* Modo de transacción */}
          <section className="space-y-3">
            <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
              Modo de transacción
            </p>
            <div className="grid grid-cols-3 gap-3">
              {MODES.map(({ value, label, desc, icon: Icon, ring, bg, text }) => {
                const active = mode === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => { setMode(value); if (value !== "sell") setPrice(""); setErrors((p) => ({ ...p, price: "" })); }}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-2xl border text-center transition-all duration-150",
                      active ? cn("border-transparent ring-2", ring, bg) : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                    )}
                  >
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", active ? bg : "bg-muted/60")}>
                      <Icon className={cn("w-4 h-4", active ? text : "text-muted-foreground")} />
                    </div>
                    <div>
                      <p className={cn("text-xs font-semibold leading-none", active ? text : "text-foreground")}>{label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {mode === "sell" && (
              <Field label="Precio de venta" required error={errors.price}>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground select-none">S/</span>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => { setPrice(e.target.value); setErrors((p) => ({ ...p, price: "" })); }}
                    placeholder="0.00"
                    min={0}
                    step={0.5}
                    className={cn(inputCn(errors.price), "pl-9")}
                  />
                </div>
              </Field>
            )}
          </section>

          {/* Géneros */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest">Género</p>
              <span className={cn(
                "text-[11px] font-semibold tabular-nums px-2 py-0.5 rounded-full",
                genres.length >= MAX_GENRES ? "bg-violet-100 text-violet-700" : "bg-muted text-muted-foreground"
              )}>
                {genres.length}/{MAX_GENRES}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((g) => {
                const selected = genres.includes(g);
                const maxed    = !selected && genres.length >= MAX_GENRES;
                return (
                  <button
                    key={g}
                    type="button"
                    disabled={maxed}
                    onClick={() => {
                      if (selected) setGenres(genres.filter((x) => x !== g));
                      else if (!maxed) setGenres([...genres, g]);
                    }}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150",
                      selected
                        ? "bg-violet-600 text-white shadow-sm"
                        : maxed
                          ? "bg-muted/40 text-muted-foreground/40 cursor-not-allowed border border-border/40"
                          : "bg-muted/60 text-muted-foreground border border-border/60 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50"
                    )}
                  >
                    {selected && <Check className="w-3 h-3 flex-shrink-0" />}
                    {g}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Preview rápido */}
          <section className="rounded-2xl border border-border/60 bg-muted/20 p-4 flex gap-4">
            <div className="w-14 flex-shrink-0">
              <div className="aspect-[3/4] rounded-xl overflow-hidden bg-muted/60">
                {previewSrc ? (
                  <img src={previewSrc} alt="portada" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-white/70" />
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              <p className="text-sm font-bold text-foreground leading-snug line-clamp-2">
                {title || <span className="text-muted-foreground italic">Sin título</span>}
              </p>
              <p className="text-xs text-muted-foreground">{author || "—"}{year ? ` · ${year}` : ""}</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {mode && (
                  <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", MODE_COLORS[mode as BookMode])}>
                    {MODE_LABELS[mode as BookMode]}
                  </span>
                )}
                {mode === "sell" && price && +price > 0 && (
                  <span className="text-[10px] font-bold text-violet-700 px-2 py-0.5 rounded-full bg-violet-50">
                    {formatPrice(+price)}
                  </span>
                )}
                {genres.map((g) => (
                  <span key={g} className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">{g}</span>
                ))}
              </div>
            </div>
          </section>

        </div>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border/50 flex-shrink-0 bg-white">
          {saveError && <p className="text-xs text-red-500 font-medium flex-1">{saveError}</p>}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={() => void handleSave()}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-sm shadow-violet-200 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

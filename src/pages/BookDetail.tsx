import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Share2, ShoppingBag, Repeat2, Gift,
  MapPin, CalendarDays, Globe, BookMarked, Star,
  CheckCircle2, Check, MessageCircle,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { getBookById, getBooks } from "@/api/books";
import BookCoverPlaceholder from "@/components/shared/BookCoverPlaceholder";
import { createPurchaseOrder, getSellerProfileByBookId } from "@/api/orders";
import { getReviewStatsForUser } from "@/api/users";
import type { Book, BookMode } from "@/types";
import Avatar      from "@/components/shared/Avatar";
import StarRating  from "@/components/shared/StarRating";
import {
  cn,
  CONDITION_LABELS,
  CONDITION_COLORS,
  MODE_LABELS,
  MODE_COLORS,
  formatPrice,
} from "@/lib/utils";

// ─── Action config ────────────────────────────────────────────────────────────

const MODE_ACTION: Partial<Record<BookMode, { label: string; icon: React.ElementType }>> = {
  sell:     { label: "Comprar libro",        icon: ShoppingBag },
  exchange: { label: "Proponer intercambio", icon: Repeat2     },
  donate:   { label: "Solicitar donación",   icon: Gift        },
};

// ─── Metadata items ───────────────────────────────────────────────────────────

function buildMeta(book: Book) {
  return [
    { icon: CalendarDays, label: "Año",       value: book.year ? String(book.year) : "" },
    { icon: Globe,        label: "Idioma",    value: book.language || "" },
    { icon: BookMarked,   label: "Condición", value: book.condition ? CONDITION_LABELS[book.condition] : "" },
    { icon: MapPin,       label: "Ubicación", value: book.location ? book.location.split(",")[0] : "" },
  ].filter((item) => item.value);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BookDetailPage() {
  const { id }      = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const token       = useAuthStore((s) => s.token);
  const [book, setBook] = useState<Book | null>(null);
  const [owner, setOwner] = useState<(typeof currentUser) | null>(null);
  const [related, setRelated] = useState<Book[]>([]);
  const [ownerReviewStats, setOwnerReviewStats] = useState({ averageRating: 0, totalReviews: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const [copied,    setCopied]    = useState(false);
  const [requested, setRequested] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !token) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const bookId = id;
    const authToken = token;

    async function loadBook() {
      setIsLoading(true);

      const bookResponse = await getBookById(bookId, authToken);
      if (!bookResponse.ok || cancelled) {
        setIsLoading(false);
        return;
      }

      setBook(bookResponse.data);

      const [ownerResponse, booksResponse] = await Promise.all([
        getSellerProfileByBookId(bookId, authToken),
        getBooks(authToken),
      ]);

      if (cancelled) return;

      if (ownerResponse.ok) {
        setOwner(ownerResponse.data.seller);

        const statsResponse = await getReviewStatsForUser(ownerResponse.data.userId, authToken);
        if (!cancelled && statsResponse.ok) {
          setOwnerReviewStats(statsResponse.data);
        }
      }

      if (booksResponse.ok) {
        setRelated(
          booksResponse.data
            .filter(
              (candidate) =>
                candidate.genre === bookResponse.data.genre &&
                candidate.id !== bookResponse.data.id
            )
            .slice(0, 4)
        );
      }

      setIsLoading(false);
    }

    loadBook();

    return () => {
      cancelled = true;
    };
  }, [id, token]);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto py-24 text-sm text-muted-foreground">
        Cargando libro...
      </div>
    );
  }

  if (!book) {
    return (
      <div className="max-w-6xl mx-auto flex flex-col items-center justify-center gap-4 py-24">
        <BookMarked className="w-10 h-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Libro no encontrado.</p>
        <Link to="/marketplace" className="text-sm font-medium text-violet-600 hover:underline">
          Volver al marketplace
        </Link>
      </div>
    );
  }

  const displayOwner =
    owner ?? (currentUser?.id === book.ownerId ? currentUser : null);
  const ownerProfileId = displayOwner?.id ?? book.ownerId;
  const ownerName = displayOwner?.name?.trim() || `Usuario ${book.ownerId}`;
  const ownerBooksPosted = displayOwner?.booksPosted ?? 0;
  const ownerLocation = displayOwner?.location?.trim() || "Ubicacion pendiente";
  const meta   = buildMeta(book);
  const action = book.mode ? MODE_ACTION[book.mode] ?? null : null;
  const avgRating = ownerReviewStats.totalReviews > 0
    ? ownerReviewStats.averageRating
    : displayOwner?.rating ?? 0;
  const reviewCount = ownerReviewStats.totalReviews > 0
    ? ownerReviewStats.totalReviews
    : displayOwner?.reviewCount ?? 0;
  const isOwn = currentUser?.id === book.ownerId;
  const ActionIcon = action?.icon;

  function handleShare() {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleAction() {
    if (isSubmitting || requested) return;

    if (!book || !currentUser?.id || !token) {
      setActionError("Debes iniciar sesión para enviar tu interés.");
      return;
    }

    setActionError(null);
    setIsSubmitting(true);
    const response = await createPurchaseOrder(
      {
        bookId: book.id,
        message: `Hola, estoy interesado en comprar "${book.title}".`,
      },
      token
    );

    if (!response.ok) {
      setActionError(response.error || "No se pudo procesar la compra.");
      setIsSubmitting(false);
      return;
    }

    setRequested(true);
    setIsSubmitting(false);
    if (response.data.solicitudId) {
      navigate(`/mensajes?c=${response.data.solicitudId}`);
      return;
    }

    navigate("/mensajes");
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10">

      {/* ── Back ──────────────────────────────────────────────────────────── */}
      <Link
        to="/marketplace"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al marketplace
      </Link>

      {/* ── Main grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] xl:grid-cols-[360px_1fr] gap-8 xl:gap-14 items-start">

        {/* ── Cover panel ───────────────────────────────────────────────── */}
        <div className="lg:sticky lg:top-8 space-y-4">

          {/* Cover */}
          <div className="relative">
            {book.isFeatured && (
              <span className="absolute top-3 left-3 z-10 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400/90 text-amber-900 text-[10px] font-bold uppercase tracking-wider shadow backdrop-blur-sm">
                <Star className="w-2.5 h-2.5 fill-current" />
                Destacado
              </span>
            )}
            <div className="aspect-[3/4] rounded-2xl overflow-hidden shadow-[0_20px_60px_-10px_rgba(0,0,0,0.28)]">
              {book.cover ? (
                <img
                  src={book.cover}
                  alt={book.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <BookCoverPlaceholder title={book.title} />
              )}
            </div>
          </div>

          {/* Badges under cover */}
          <div className="flex flex-wrap gap-2">
            <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold", MODE_COLORS[book.mode])}>
              {book.mode === "sell" ? <ShoppingBag className="w-3 h-3" />
                : book.mode === "exchange" ? <Repeat2 className="w-3 h-3" />
                : <Gift className="w-3 h-3" />}
              {MODE_LABELS[book.mode]}
            </span>
            <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold", CONDITION_COLORS[book.condition])}>
              {CONDITION_LABELS[book.condition]}
            </span>
          </div>
        </div>

        {/* ── Info panel ────────────────────────────────────────────────── */}
        <div className="space-y-7">

          {/* Title block */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-100 text-[11px] font-semibold">
                <BookMarked className="w-3 h-3" />
                {book.genre}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight">
              {book.title}
            </h1>
            <p className="text-base text-muted-foreground font-medium">{book.author}</p>

            {/* Rating */}
            <div className="flex items-center gap-2">
              <StarRating value={avgRating} size="md" showValue />
              <span className="text-sm text-muted-foreground">· {reviewCount} reseña{reviewCount !== 1 ? "s" : ""}</span>
            </div>
          </div>

          {/* Price */}
          {book.mode === "sell" && book.price != null && (
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-violet-700 tabular-nums tracking-tight">
                {formatPrice(book.price)}
              </span>
              <span className="text-sm text-muted-foreground">precio fijo</span>
            </div>
          )}

          {/* Owner card */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
              {book.mode === "sell" ? "Vendido por" : "Publicado por"}
            </p>
            <div className="flex items-center gap-4 p-4 rounded-2xl border border-border/60 bg-white shadow-sm">
              <Link to={`/perfil/${ownerProfileId}`} className="flex-shrink-0">
                <Avatar src={displayOwner?.avatar} name={ownerName} size="lg" />
              </Link>
              <div className="flex-1 min-w-0">
                <Link
                  to={`/perfil/${ownerProfileId}`}
                  className="text-sm font-bold text-foreground hover:text-violet-700 transition-colors truncate block"
                >
                  {ownerName}
                </Link>
                <p className="mt-0.5 text-xs text-muted-foreground">{ownerLocation}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <StarRating value={avgRating} size="sm" showValue />
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <BookMarked className="w-3 h-3" />
                    {ownerBooksPosted} libros
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <MessageCircle className="w-3 h-3" />
                    {reviewCount} reseñas
                  </span>
                </div>
              </div>
              <Link
                to={`/perfil/${ownerProfileId}`}
                className="flex-shrink-0 px-3.5 py-1.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
              >
                Ver perfil
              </Link>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
              Descripción
            </p>
            <p className="text-sm text-foreground/80 leading-relaxed">{book.description}</p>
          </div>

          {/* Metadata grid */}
          <div className="grid grid-cols-2 gap-3">
            {meta.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/50">
                <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center flex-shrink-0 shadow-sm border border-border/60">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground/70" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest leading-none mb-0.5">
                    {label}
                  </p>
                  <p className="text-sm font-medium text-foreground truncate">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          {!isOwn && action && (
            <div className="space-y-3 pt-1">
              <button
                onClick={handleAction}
                disabled={requested || isSubmitting}
                className={cn(
                  "w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl text-sm font-bold text-white transition-all duration-200 active:scale-[0.98]",
                  requested
                    ? "bg-emerald-500 cursor-default shadow-sm shadow-emerald-200"
                    : isSubmitting
                      ? "bg-violet-500 cursor-wait shadow-sm shadow-violet-200/60"
                      : "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-md shadow-violet-200/60"
                )}
              >
                {requested
                    ? <><CheckCircle2 className="w-4 h-4" /> ¡Mensaje enviado!</>
                  : isSubmitting
                    ? <><ShoppingBag className="w-4 h-4" /> Procesando...</>
                  : ActionIcon ? <><ActionIcon className="w-4 h-4" /> {action.label}</> : null
                }
              </button>

              {actionError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {actionError}
                </div>
              )}

              <button
                onClick={handleShare}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-150"
              >
                {copied
                  ? <><Check className="w-4 h-4 text-emerald-600" /> <span className="text-emerald-600">¡Link copiado!</span></>
                  : <><Share2 className="w-4 h-4" /> Compartir</>
                }
              </button>
            </div>
          )}

        </div>
      </div>

      {/* ── Related books ─────────────────────────────────────────────────── */}
      {related.length > 0 && (
        <div className="space-y-5 border-t border-border/50 pt-10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
              <BookMarked className="w-3.5 h-3.5 text-violet-600" />
            </div>
            <h2 className="text-base font-bold text-foreground">
              Más libros de <span className="text-violet-700">{book.genre}</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {related.map((b) => <RelatedBookCard key={b.id} book={b} />)}
          </div>
        </div>
      )}

    </div>
  );
}

// ─── Related book card ────────────────────────────────────────────────────────

function RelatedBookCard({ book }: { book: Book }) {
  const ModeIcon = book.mode === "sell" ? ShoppingBag : book.mode === "exchange" ? Repeat2 : Gift;

  return (
    <Link
      to={`/libro/${book.id}`}
      className="group flex flex-col rounded-2xl bg-white border border-border/60 shadow-sm hover:shadow-md hover:ring-2 hover:ring-violet-200/70 transition-all duration-200 overflow-hidden"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-muted/40">
        {book.cover ? (
          <img
            src={book.cover}
            alt={book.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <BookCoverPlaceholder title={book.title} />
        )}
        <div className="absolute top-2 right-2 pointer-events-none">
          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shadow-sm", MODE_COLORS[book.mode])}>
            <ModeIcon className="w-2.5 h-2.5" />
            {MODE_LABELS[book.mode]}
          </span>
        </div>
      </div>
      <div className="flex flex-col flex-1 p-3 gap-1.5">
        <span className={cn("self-start text-[10px] font-semibold px-1.5 py-0.5 rounded-md", CONDITION_COLORS[book.condition])}>
          {CONDITION_LABELS[book.condition]}
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">{book.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{book.author}</p>
        </div>
        <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-border/50">
          {book.mode === "sell" && book.price != null ? (
            <span className="text-sm font-bold text-violet-700 tabular-nums">{formatPrice(book.price)}</span>
          ) : (
            <span className="text-xs font-medium text-muted-foreground">
              {book.mode === "exchange" ? "Intercambio" : "Donación"}
            </span>
          )}
          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground/70">
            <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
            <span className="truncate">{book.location.split(",")[0]}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

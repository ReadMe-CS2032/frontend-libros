import { useEffect, useMemo, useState } from "react";
import {
  Library, BookMarked, Eye, Bookmark, TrendingUp,
  Tag, Repeat2, BookLock, Edit2, MapPin, Gift, Trash2, EyeOff,
} from "lucide-react";
import BookCoverPlaceholder from "@/components/shared/BookCoverPlaceholder";
import { useAuthStore } from "@/store/useAuthStore";
import { deleteBook, getBooksByOwner, updateBook, updateBookAvailability } from "@/api/books";
import { getTransactionsByUser } from "@/api/transactions";
import type { Book, Transaction } from "@/types";
import {
  cn,
  CONDITION_LABELS,
  CONDITION_COLORS,
  MODE_LABELS,
  MODE_COLORS,
  formatPrice,
} from "@/lib/utils";

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type LibraryTab = "all" | "sell" | "exchange" | "reserved";

// ─── Mode icon map ────────────────────────────────────────────────────────────

const MODE_ICONS: Record<string, React.ElementType> = {
  sell:     Tag,
  exchange: Repeat2,
  donate:   Gift,
};

// ─── Mock stats not yet in backend ───────────────────────────────────────────

const MOCK_VIEWS      = 1_847;
const MOCK_SAVED      = 52;
const MOCK_VIEW_TREND = 18;
const MOCK_SAVED_TREND = 12;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LibraryPage() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const [activeTab, setActiveTab] = useState<LibraryTab>("all");
  const [books, setBooks] = useState<Book[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [busyBookId, setBusyBookId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id || !token) return;

    let cancelled = false;
    const userId = user.id;
    const authToken = token;

    async function loadLibraryData() {
      const [booksResponse, transactionsResponse] = await Promise.all([
        getBooksByOwner(userId, authToken),
        getTransactionsByUser(userId, authToken),
      ]);

      if (cancelled) return;

      if (booksResponse.ok) {
        setBooks(booksResponse.data);
      }

      if (transactionsResponse.ok) {
        setTransactions(transactionsResponse.data);
      }
    }

    loadLibraryData();

    return () => {
      cancelled = true;
    };
  }, [token, user?.id]);

  const published = books.length;

  const reservedBookIds = useMemo(
    () =>
      new Set(
        transactions
          .filter((transaction) => transaction.sellerId === user?.id)
          .map((transaction) => transaction.bookId)
      ),
    [transactions, user?.id]
  );

  const filteredBooks = useMemo(() => {
    switch (activeTab) {
      case "sell":     return books.filter((b) => b.mode === "sell");
      case "exchange": return books.filter((b) => b.mode === "exchange");
      case "reserved": return books.filter((b) => reservedBookIds.has(b.id));
      default:         return books;
    }
  }, [activeTab, books, reservedBookIds]);

  const tabs = [
    { value: "all" as const, label: "Todos", icon: BookMarked, count: books.length },
    { value: "sell" as const, label: "Venta", icon: Tag, count: books.filter((b) => b.mode === "sell").length },
    { value: "exchange" as const, label: "Intercambio", icon: Repeat2, count: books.filter((b) => b.mode === "exchange").length },
    { value: "reserved" as const, label: "Transado", icon: BookLock, count: books.filter((b) => reservedBookIds.has(b.id)).length },
  ];

  const stats = [
    {
      label:    "Libros publicados",
      value:    published,
      icon:     BookMarked,
      color:    "violet" as const,
      trend:    null,
      footnote: "en el marketplace",
    },
    {
      label:    "Vistas totales",
      value:    MOCK_VIEWS.toLocaleString("es-PE"),
      icon:     Eye,
      color:    "blue" as const,
      trend:    MOCK_VIEW_TREND,
      footnote: "este mes",
    },
    {
      label:    "Guardados",
      value:    MOCK_SAVED,
      icon:     Bookmark,
      color:    "emerald" as const,
      trend:    MOCK_SAVED_TREND,
      footnote: "por otros lectores",
    },
  ];

  async function handleEditBook(book: Book) {
    if (!token) return;

    const title = window.prompt("Nuevo titulo", book.title);
    if (title === null) return;

    const author = window.prompt("Nuevo autor", book.author);
    if (author === null) return;

    const description = window.prompt("Nueva descripcion", book.description);
    if (description === null) return;

    const nextPriceValue = window.prompt(
      "Nuevo precio. Dejalo vacio para quitarlo",
      book.price != null ? String(book.price) : ""
    );
    if (nextPriceValue === null) return;

    const nextPrice =
      nextPriceValue.trim() === "" ? undefined : Number(nextPriceValue.trim());

    setBusyBookId(book.id);
    const response = await updateBook(
      book.id,
      {
        title: title.trim(),
        author: author.trim(),
        description: description.trim(),
        price: Number.isNaN(nextPrice as number) ? book.price : nextPrice,
      },
      token
    );
    setBusyBookId(null);

    if (!response.ok) {
      window.alert(response.error || "No se pudo editar el libro");
      return;
    }

    setBooks((current) =>
      current.map((item) => (item.id === book.id ? response.data : item))
    );
  }

  async function handleToggleAvailability(book: Book) {
    if (!token) return;

    setBusyBookId(book.id);
    const response = await updateBookAvailability(
      book.id,
      !(book.available ?? true),
      token
    );
    setBusyBookId(null);

    if (!response.ok) {
      window.alert(response.error || "No se pudo actualizar la disponibilidad");
      return;
    }

    setBooks((current) =>
      current.map((item) => (item.id === book.id ? response.data : item))
    );
  }

  async function handleDeleteBook(book: Book) {
    if (!token) return;
    if (!window.confirm(`Eliminar "${book.title}"?`)) return;

    setBusyBookId(book.id);
    const response = await deleteBook(book.id, token);
    setBusyBookId(null);

    if (!response.ok) {
      window.alert(response.error || "No se pudo eliminar el libro");
      return;
    }

    setBooks((current) => current.filter((item) => item.id !== book.id));
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-sm shadow-violet-200/60 flex-shrink-0">
          <Library className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground leading-none">
            Mi biblio
            <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
              teca
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gestiona y organiza todos tus libros publicados
          </p>
        </div>
      </div>

      {/* ── Stats strip ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-border rounded-2xl overflow-hidden border border-border shadow-sm">
        {stats.map((s, i) => (
          <StatBlock key={i} {...s} />
        ))}
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="bg-muted/50 border border-border rounded-2xl p-1 flex gap-0.5">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.value;
          const Icon = tab.icon;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-white text-violet-700 shadow-sm border border-border/60"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/60"
              )}
            >
              <Icon className={cn("w-3.5 h-3.5 flex-shrink-0", isActive ? "text-violet-600" : "text-current")} />
              <span className="hidden sm:inline">{tab.label}</span>
              <span
                className={cn(
                  "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold tabular-nums",
                  isActive
                    ? "bg-violet-100 text-violet-700"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Books grid ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredBooks.map((book) => (
          <LibraryBookCard
            key={book.id}
            book={book}
            isBusy={busyBookId === book.id}
            isReserved={reservedBookIds.has(book.id)}
            onDelete={() => handleDeleteBook(book)}
            onEdit={() => handleEditBook(book)}
            onToggleAvailability={() => handleToggleAvailability(book)}
          />
        ))}
      </div>

    </div>
  );
}

// ─── Library book card ────────────────────────────────────────────────────────

interface LibraryBookCardProps {
  book:       Book;
  isBusy: boolean;
  isReserved: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onToggleAvailability: () => void;
}

function LibraryBookCard({
  book,
  isBusy,
  isReserved,
  onDelete,
  onEdit,
  onToggleAvailability,
}: LibraryBookCardProps) {
  const ModeIcon = MODE_ICONS[book.mode] ?? Tag;

  return (
    <div className="group flex flex-col rounded-2xl bg-white border border-border/60 shadow-sm hover:shadow-md hover:ring-2 hover:ring-violet-200/70 transition-all duration-200 overflow-hidden">

      {/* ── Cover ─────────────────────────────────────────────────────────── */}
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

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/45 transition-colors duration-200 flex items-end justify-center gap-2 pb-3 opacity-0 group-hover:opacity-100">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 text-foreground text-xs font-semibold shadow hover:bg-white transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <Eye className="w-3 h-3" />
            Ver
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600/95 text-white text-xs font-semibold shadow hover:bg-violet-700 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Edit2 className="w-3 h-3" />
            Editar
          </button>
        </div>

        {/* Reserved banner */}
        {isReserved && (
          <div className="absolute top-2 left-0 right-0 flex justify-center pointer-events-none">
            <span className="bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm">
              Transado
            </span>
          </div>
        )}

        {/* Mode badge — top right */}
        <div className="absolute top-2 right-2 pointer-events-none">
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shadow-sm",
              MODE_COLORS[book.mode]
            )}
          >
            <ModeIcon className="w-2.5 h-2.5" />
            {MODE_LABELS[book.mode]}
          </span>
        </div>
      </div>

      {/* ── Info ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 p-3 gap-1.5">

        {/* Condition */}
        <span className={cn("self-start text-[10px] font-semibold px-1.5 py-0.5 rounded-md", CONDITION_COLORS[book.condition])}>
          {CONDITION_LABELS[book.condition]}
        </span>

        {/* Title + author */}
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
            {book.title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{book.author}</p>
        </div>

        {/* Footer: price | location */}
        <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-border/50 mt-0.5">
          {book.mode === "sell" && book.price != null ? (
            <span className="text-sm font-bold text-violet-700 tabular-nums">
              {formatPrice(book.price)}
            </span>
          ) : (
            <span className="text-xs font-medium text-muted-foreground">
              {book.mode === "exchange" ? "Intercambio" : "Donación"}
            </span>
          )}
          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground/70 min-w-0 overflow-hidden">
            <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
            <span className="truncate">{book.location.split(",")[0]}</span>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            type="button"
            disabled={isBusy}
            onClick={onToggleAvailability}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border px-2 py-2 text-[11px] font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground disabled:opacity-50"
          >
            <EyeOff className="w-3 h-3" />
            {book.available === false ? "Activar" : "Ocultar"}
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={onDelete}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-200 px-2 py-2 text-[11px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="w-3 h-3" />
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Stat block ───────────────────────────────────────────────────────────────

const COLOR_MAP = {
  violet:  { iconBg: "bg-violet-100", iconText: "text-violet-600", value: "text-violet-700" },
  blue:    { iconBg: "bg-blue-100",   iconText: "text-blue-600",   value: "text-blue-700"   },
  emerald: { iconBg: "bg-emerald-100",iconText: "text-emerald-600",value: "text-emerald-700"},
} as const;

interface StatBlockProps {
  label:    string;
  value:    string | number;
  icon:     React.ElementType;
  color:    keyof typeof COLOR_MAP;
  trend:    number | null;
  footnote: string;
}

function StatBlock({ label, value, icon: Icon, color, trend, footnote }: StatBlockProps) {
  const c = COLOR_MAP[color];

  return (
    <div className="bg-white px-6 py-5 flex items-center gap-5 hover:bg-muted/20 transition-colors">
      <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0", c.iconBg)}>
        <Icon className={cn("w-5 h-5", c.iconText)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-1">
          {label}
        </p>
        <div className="flex items-baseline gap-2.5">
          <span className={cn("text-2xl font-bold tracking-tight tabular-nums", c.value)}>
            {value}
          </span>
          {trend != null && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
              <TrendingUp className="w-3 h-3" />
              +{trend}%
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">{footnote}</p>
      </div>
    </div>
  );
}

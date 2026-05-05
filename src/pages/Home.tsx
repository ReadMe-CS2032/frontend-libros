import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  BookMarked,
  ArrowLeftRight,
  MapPin,
  Plus,
  TrendingUp,
  Clock,
  ArrowRight,
  Flame,
  Sun,
  Sunset,
  Moon,
  Star,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { getBooks } from "@/api/books";
import { getTransactionsByUser } from "@/api/transactions";
import { getUserById } from "@/api/users";
import { cn } from "@/lib/utils";
import { BookGrid, BookListItem } from "@/components/books";
import StarRating from "@/components/shared/StarRating";
import type { Book, Transaction } from "@/types";

type User = import("@/types").User;

const getKPIs = (user: User | null, books: Book[], transactions: Transaction[]) => {
  const myTransactions = transactions.filter(
    (transaction) =>
      transaction.buyerId === user?.id || transaction.sellerId === user?.id
  );
  const mySales = myTransactions.filter(
    (transaction) =>
      transaction.sellerId === user?.id && transaction.mode === "sell"
  );
  const revenue = mySales.reduce(
    (total, transaction) => total + (transaction.agreedPrice ?? 0),
    0
  );

  return [
  {
    label:     "Libros listados",
    value:     books.filter((book) => book.ownerId === user?.id).length.toString(),
    sub:       `de ${books.length} en plataforma`,
    icon:      BookMarked,
    iconBg:    "bg-violet-100",
    iconColor: "text-violet-700",
    cardBg:    "bg-gradient-to-br from-white to-violet-50/60",
    trend:     "+1 este mes",
    trendUp:   true,
    href:      "/mis-libros",
  },
  {
    label:     "Transacciones",
    value:     myTransactions.length.toString(),
    sub:       myTransactions.length === 1 ? "registro completado" : "registros completados",
    icon:      ArrowLeftRight,
    iconBg:    "bg-blue-100",
    iconColor: "text-blue-700",
    cardBg:    "bg-gradient-to-br from-white to-blue-50/60",
    trend:     "Ver historial",
    trendUp:   false,
    href:      "/intercambios",
  },
  {
    label:     "Ventas registradas",
    value:     `S/ ${revenue}`,
    sub:       mySales.length === 1 ? "1 venta detectada" : `${mySales.length} ventas detectadas`,
    icon:      TrendingUp,
    iconBg:    "bg-emerald-100",
    iconColor: "text-emerald-700",
    cardBg:    "bg-gradient-to-br from-white to-emerald-50/60",
    trend:     "Desde transactions",
    trendUp:   revenue > 0,
    href:      undefined,
  },
  {
    label:     "Rating promedio",
    value:     user?.rating.toFixed(1) ?? "—",
    sub:       `${user?.reviewCount ?? 0} reseñas recibidas`,
    icon:      Star,
    iconBg:    "bg-amber-100",
    iconColor: "text-amber-700",
    cardBg:    "bg-gradient-to-br from-white to-amber-50/60",
    trend:     "Ver reseñas",
    trendUp:   false,
    href:      "/perfil",
    rating:    user?.rating,
  },
];
};

// Greeting
function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) {
    return {
      saludo:     "Buenos días",
      icon:       Sun,
      tagline:    "El mejor momento para descubrir tu próxima lectura.",
      chip:       "Mañana lectora",
    };
  }
  if (hour >= 12 && hour < 19) {
    return {
      saludo:     "Buenas tardes",
      icon:       Sunset,
      tagline:    "¿Cuál será tu próxima historia? Hay libros esperándote.",
      chip:       "Tarde de libros",
    };
  }
  return {
    saludo:     "Buenas noches",
    icon:       Moon,
    tagline:    "Una última página antes de dormir... o quizás un libro nuevo.",
    chip:       "Noche de lectura",
  };
}

export default function Home() {
  const user      = useAuthStore((s) => s.user);
  const token     = useAuthStore((s) => s.token);
  const firstName = user?.name.split(" ")[0] ?? "Lector";
  const [books, setBooks] = useState<Book[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [ownersById, setOwnersById] = useState<Record<string, User>>({});
  const kpis      = getKPIs(user, books, transactions);

  const greeting = getGreeting();
  const GreetIcon = greeting.icon;

  const [selectedGenre, setSelectedGenre] = useState("Todos");

  useEffect(() => {
    if (!token || !user?.id) return;

    let cancelled = false;
    const authToken = token;
    const userId = user.id;

    async function loadHomeData() {
      const [booksResponse, transactionsResponse] = await Promise.all([
        getBooks(authToken, {}, 1, 1000),
        getTransactionsByUser(userId, authToken),
      ]);

      if (!booksResponse.ok || cancelled) return;

      const allBooks = booksResponse.data;
      setBooks(allBooks);
      if (transactionsResponse.ok) {
        setTransactions(transactionsResponse.data);
      }

      // Solo fetchear owners de los libros que se van a mostrar (máx ~14)
      const sorted = [...allBooks].sort((a, b) =>
        (b.createdAt ? new Date(b.createdAt).getTime() : 0) -
        (a.createdAt ? new Date(a.createdAt).getTime() : 0)
      );
      const visibleBooks = [
        ...sorted.slice(0, 8),
        ...[...allBooks.filter((b) => b.isFeatured), ...allBooks.filter((b) => !b.isFeatured)].slice(0, 6),
      ];
      const ownerIds = [...new Set(visibleBooks.map((book) => book.ownerId))];

      const owners = await Promise.all(
        ownerIds.map(async (ownerId) => {
          const ownerResponse = await getUserById(ownerId, authToken);
          return ownerResponse.ok ? ownerResponse.data : null;
        })
      );

      if (cancelled) return;

      setOwnersById(
        Object.fromEntries(
          owners
            .filter((owner): owner is User => owner !== null)
            .map((owner) => [
              owner.id,
              {
                ...owner,
                profileHref: "/perfil",
              },
            ])
        )
      );
    }

    loadHomeData();

    return () => {
      cancelled = true;
    };
  }, [token, user?.id]);

  const allBooksSorted = useMemo(
    () =>
      [...books].sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      }),
    [books]
  );
  const featuredBooks = useMemo(
    () => books.filter((b) => b.isFeatured),
    [books]
  );
  const recentBooks = useMemo(() => allBooksSorted.slice(0, 8), [allBooksSorted]);
  const showcaseBooks = useMemo(
    () => [...featuredBooks, ...books.filter((b) => !b.isFeatured)].slice(0, 6),
    [books, featuredBooks]
  );
  const filterGenres = useMemo(
    () => ["Todos", ...new Set(books.map((book) => book.genre).filter(Boolean))],
    [books]
  );

  const filteredBooks = selectedGenre === "Todos"
    ? showcaseBooks
    : books.filter((b) => b.genre === selectedGenre);

  const filteredRecent = selectedGenre === "Todos"
    ? recentBooks
    : allBooksSorted.filter((b) => b.genre === selectedGenre).slice(0, 8);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-6 lg:space-y-10">

      {/* Welcome hero */}
      <section className="relative overflow-hidden rounded-[28px] border border-border/80 bg-gradient-to-br from-white via-white to-violet-50/40 px-5 py-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.25)] sm:px-8 sm:py-8 lg:px-10 lg:py-9">
        {/* Blobs */}
        <div className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full bg-violet-100/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-purple-100/30 blur-3xl" />
        {/* Dot grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: "radial-gradient(circle, #7c3aed 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative flex flex-col gap-7 lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:items-stretch">
          {/* Left */}
          <div className="space-y-5">
            {/* Chip */}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-100 bg-violet-50/90 px-2.5 py-1 text-[11px] font-semibold text-violet-700 shadow-sm shadow-violet-100/40">
              <GreetIcon className="w-3 h-3" />
              {greeting.chip}
            </span>

            {/* Heading */}
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-muted-foreground/90">
                {greeting.saludo},
              </p>
              <h1 className="max-w-2xl text-3xl font-bold tracking-tight leading-[1.05] sm:text-4xl lg:text-[42px]">
                Un panel hecho para
                {" "}
                <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                  {firstName}.
                </span>
              </h1>
            </div>

            {/* Tagline */}
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              {greeting.tagline}
            </p>

            {/* Pills + CTA */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {user?.location && (
                <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-white/80 px-2.5 py-1 text-xs text-muted-foreground backdrop-blur-sm">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  {user.location}
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-white/80 px-2.5 py-1 text-xs text-muted-foreground backdrop-blur-sm">
                <BookOpen className="w-3 h-3 flex-shrink-0" />
                  {books.length} libros disponibles
              </span>

              <Link
                to="/publicar"
                className={cn(
                  "inline-flex items-center gap-1.5",
                  "rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2",
                  "text-xs font-semibold text-white shadow-sm shadow-violet-200",
                  "hover:from-violet-700 hover:to-purple-700 transition-all duration-150 active:scale-95"
                )}
              >
                <Plus className="w-3.5 h-3.5" />
                Publicar libro
              </Link>
            </div>
          </div>

          {/* Right — mini stat accent */}
          <div className="relative hidden rounded-[24px] border border-violet-100/80 bg-white/75 p-5 shadow-[0_18px_40px_-30px_rgba(124,58,237,0.4)] backdrop-blur-sm lg:flex lg:flex-col lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 ring-1 ring-violet-100">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-500/80">
                  Actividad
                </p>
                <p className="text-2xl font-bold tracking-tight text-foreground">
                  {books.length} libros
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Descubre títulos nuevos, coordina intercambios y mantiene tu biblioteca en movimiento.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
          {kpis.map((kpi) => (
            <KPICard key={kpi.label} {...kpi} />
          ))}
        </div>
      </section>

      {/* ── Genre filter ──────────────────────────────────────────────────── */}
      <section className="space-y-3 rounded-[24px] border border-border/70 bg-white px-4 py-4 shadow-[0_14px_34px_-30px_rgba(15,23,42,0.3)] sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
              Explorar por género
            </p>
            <p className="text-sm text-muted-foreground">
              Ajusta la selección destacada según lo que quieras leer hoy.
            </p>
          </div>
          {selectedGenre !== "Todos" && (
            <button
              onClick={() => setSelectedGenre("Todos")}
              className="rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-600 transition-colors hover:text-violet-700"
            >
              Limpiar filtro
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
          {filterGenres.map((genre) => (
            <GenrePill
              key={genre}
              label={genre}
              selected={selectedGenre === genre}
              onClick={() => setSelectedGenre(genre)}
            />
          ))}
        </div>
      </section>

      {/* ── Featured / filtered books ──────────────────────────────────────── */}
      <section className="space-y-4 rounded-[28px] border border-border/70 bg-white p-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.28)] sm:p-5 lg:p-6">
        <SectionHeader
          title={selectedGenre === "Todos" ? "Destacados" : selectedGenre}
          subtitle={
            selectedGenre === "Todos"
              ? "Libros seleccionados para ti"
              : `${filteredBooks.length} libro${filteredBooks.length !== 1 ? "s" : ""} disponible${filteredBooks.length !== 1 ? "s" : ""}`
          }
          icon={Flame}
          href="/explorar"
          cta="Ver todos"
        />
        {filteredBooks.length > 0 ? (
          <BookGrid
            books={filteredBooks}
            ownersById={ownersById}
            columns={3}
            className="grid-cols-2 sm:grid-cols-3 xl:grid-cols-3"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 py-14">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-violet-400" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-foreground">Sin libros en este género</p>
              <p className="text-xs text-muted-foreground">Aún no hay libros de <span className="font-medium">{selectedGenre}</span> disponibles.</p>
            </div>
            <button
              onClick={() => setSelectedGenre("Todos")}
              className="text-xs font-medium text-violet-600 hover:text-violet-700 transition-colors mt-1"
            >
              Ver todos los géneros
            </button>
          </div>
        )}
      </section>

      {/* ── Recent books ──────────────────────────────────────────────────── */}
      <section className="space-y-4 rounded-[28px] border border-border/70 bg-white p-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.28)] sm:p-5 lg:p-6">
        <SectionHeader
          title="Recién publicados"
          subtitle="Los últimos en llegar a la plataforma"
          icon={Clock}
          href="/explorar"
          cta="Ver más"
        />

        {filteredRecent.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-border/80 bg-muted/[0.22]">
            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border/60">
              {/* Split list into two columns on lg */}
              {[filteredRecent.slice(0, Math.ceil(filteredRecent.length / 2)), filteredRecent.slice(Math.ceil(filteredRecent.length / 2))].map((col, ci) => (
                <div key={ci} className="divide-y divide-border/50">
                  {col.map((book, i) => (
                    <BookListItem
                      key={book.id}
                      book={book}
                      owner={ownersById[book.ownerId]}
                      index={ci * Math.ceil(filteredRecent.length / 2) + i}
                      className="rounded-none border-0 bg-transparent p-4 shadow-none hover:bg-violet-50/40"
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 gap-3 rounded-2xl border border-dashed border-border bg-muted/30">
            <BookOpen className="w-8 h-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Sin publicaciones recientes en este género.</p>
          </div>
        )}
      </section>

      <section>
        <CTABanner userName={firstName} />
      </section>
    </div>
  );
}

// ─── Genre pill ───────────────────────────────────────────────────────────────

interface GenrePillProps {
  label:    string;
  selected: boolean;
  onClick:  () => void;
}

function GenrePill({ label, selected, onClick }: GenrePillProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-150",
        selected
          ? "border-violet-600 bg-violet-600 text-white shadow-sm shadow-violet-200"
          : "bg-white text-muted-foreground hover:border-violet-300 hover:bg-violet-50/50 hover:text-violet-700"
      )}
    >
      {label}
    </button>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KPICardProps {
  label:     string;
  value:     string;
  sub:       string;
  icon:      React.ElementType;
  iconBg:    string;
  iconColor: string;
  cardBg:    string;
  trend:     string;
  trendUp:   boolean;
  href?:     string;
  rating?:   number;
}

function KPICard({ label, value, sub, icon: Icon, iconBg, iconColor, cardBg, trend, trendUp, href, rating }: KPICardProps) {
  const inner = (
    <div
      className={cn(
        "relative flex h-full flex-col gap-4 overflow-hidden rounded-[22px] border border-border/80 p-5",
        "shadow-[0_14px_30px_-28px_rgba(15,23,42,0.35)] transition-all duration-200",
        cardBg,
        href && "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_24px_40px_-30px_rgba(15,23,42,0.35)]"
      )}
    >
      {/* Top row */}
      <div className="flex items-start justify-between">
        <span className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-black/[0.06]",
          iconBg
        )}>
          <Icon className={cn("w-[18px] h-[18px]", iconColor)} />
        </span>

        {trendUp && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border text-emerald-700 bg-emerald-50 border-emerald-100">
            <TrendingUp className="w-2.5 h-2.5" />
            {trend}
          </span>
        )}
      </div>

      {/* Metric */}
      <div className="space-y-1.5">
        <p className="text-[28px] font-bold leading-none tracking-tight text-foreground sm:text-[30px]">
          {value}
        </p>
        {rating != null && (
          <StarRating value={rating} size="sm" className="mt-1.5" />
        )}
        <p className="text-xs text-muted-foreground leading-snug">{sub}</p>
      </div>

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between border-t border-black/[0.05] pt-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {!trendUp && (
          <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground/70">
            {trend}
            {href && <ArrowRight className="w-3 h-3" />}
          </span>
        )}
      </div>
    </div>
  );

  if (href) return <Link to={href} className="block">{inner}</Link>;
  return inner;
}

interface SectionHeaderProps {
  title:    string;
  subtitle: string;
  icon:     React.ElementType;
  href:     string;
  cta:      string;
}

function SectionHeader({ title, subtitle, icon: Icon, href, cta }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-violet-50 ring-1 ring-violet-100/80">
          <Icon className="w-3.5 h-3.5 text-violet-600" />
        </span>
        <div className="space-y-0.5">
          <h2 className="text-lg font-semibold leading-tight text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <Link
        to={href}
        className="mt-1 inline-flex flex-shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-violet-600 transition-colors hover:bg-violet-50 hover:text-violet-700"
      >
        {cta}
        <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

function CTABanner({ userName }: { userName: string }) {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-violet-500/20 bg-gradient-to-br from-violet-600 via-violet-600 to-purple-700 p-6 shadow-[0_24px_50px_-28px_rgba(124,58,237,0.6)] sm:p-8">
      <div className="pointer-events-none absolute -top-10 -right-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-8 -left-8 h-40 w-40 rounded-full bg-purple-500/20 blur-2xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
        <div className="space-y-2.5">
          <p className="text-sm font-medium text-white/70">Para ti, {userName}</p>
          <h3 className="text-xl font-bold leading-tight text-white sm:text-2xl">
            Tu colección merece<br className="hidden sm:block" /> nuevos lectores
          </h3>
          <p className="max-w-sm text-sm leading-relaxed text-white/70">
            Publica tus libros en menos de 2 minutos y conecta con lectores cerca de ti.
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <StarRating value={4.8} showValue size="sm" className="text-white/80" />
          <Link
            to="/publicar"
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-5 py-2.5",
              "bg-white text-violet-700 font-semibold text-sm",
              "hover:bg-violet-50 transition-colors shadow-sm active:scale-95"
            )}
          >
            <Plus className="w-4 h-4" />
            Publicar ahora
          </Link>
        </div>
      </div>
    </div>
  );
}

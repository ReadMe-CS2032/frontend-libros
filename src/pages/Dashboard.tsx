import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  BookMarked,
  Star,
  ShoppingBag,
  MapPin,
  CalendarDays,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Tag,
  Repeat2,
  Heart,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  type TooltipProps,
} from "recharts";
import { useAuthStore } from "@/store/useAuthStore";
import { getBookById, getBooksByOwner } from "@/api/books";
import { getSolicitudesByUser } from "@/api/solicitudes";
import { getTransactionsByUser } from "@/api/transactions";
import { getReviewStatsForUser, getUserById } from "@/api/users";
import type { Book, Conversation, Transaction, User } from "@/types";
import { cn, formatPrice, formatRelativeTime } from "@/lib/utils";
import Avatar from "@/components/shared/Avatar";
import BookCoverPlaceholder from "@/components/shared/BookCoverPlaceholder";
import StarRating from "@/components/shared/StarRating";

// ─── KPI data ─────────────────────────────────────────────────────────────────

const MONTH_LABEL = new Intl.DateTimeFormat("es-PE", { month: "long" }).format(new Date());

function pct(cur: number, prev: number) {
  if (prev === 0) return null;
  return Math.round(((cur - prev) / prev) * 100);
}

type DashboardMonth = {
  month: string;
  monthKey: string;
  ventas: number;
  intercambios: number;
  booksListed: number;
};

function toMonthKey(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function buildMonthlyActivity(
  transactions: Transaction[],
  solicitudes: Conversation[],
  books: Book[]
): DashboardMonth[] {
  const formatter = new Intl.DateTimeFormat("es-PE", { month: "short" });
  const now = new Date();

  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return {
      month: formatter.format(date).replace(".", ""),
      monthKey: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      ventas: 0,
      intercambios: 0,
      booksListed: 0,
    };
  });

  const byKey = new Map(months.map((month) => [month.monthKey, month]));

  transactions.forEach((transaction) => {
    const month = byKey.get(toMonthKey(transaction.createdAt));
    if (!month) return;
    month.ventas += transaction.agreedPrice ?? 0;
    month.intercambios += 1;
  });

  solicitudes.forEach((solicitud) => {
    const month = byKey.get(toMonthKey(solicitud.lastMessageAt));
    if (!month) return;
    if (!transactions.some((transaction) => transaction.bookId === solicitud.bookId)) {
      month.intercambios += 1;
    }
  });

  books.forEach((book) => {
    const month = byKey.get(toMonthKey(book.createdAt));
    if (month) month.booksListed += 1;
  });

  return months;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  const [books, setBooks] = useState<Book[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [solicitudes, setSolicitudes] = useState<Conversation[]>([]);
  const [usersById, setUsersById] = useState<Record<string, User>>({});
  const [booksById, setBooksById] = useState<Record<string, Book>>({});
  const [reviewStats, setReviewStats] = useState({ averageRating: 0, totalReviews: 0 });
  const [isLoading, setIsLoading] = useState(Boolean(user?.id && token));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id || !token) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const userId = user.id;
    const authToken = token;

    async function loadDashboard() {
      setIsLoading(true);
      setError(null);

      const [booksResponse, transactionsResponse, solicitudesResponse, reviewStatsResponse] =
        await Promise.all([
          getBooksByOwner(userId, authToken),
          getTransactionsByUser(userId, authToken),
          getSolicitudesByUser(userId, authToken),
          getReviewStatsForUser(userId, authToken),
        ]);

      if (cancelled) return;

      const nextBooks = booksResponse.ok ? booksResponse.data : [];
      const nextTransactions = transactionsResponse.ok ? transactionsResponse.data : [];
      const nextSolicitudes = solicitudesResponse.ok ? solicitudesResponse.data : [];

      setBooks(nextBooks);
      setTransactions(nextTransactions);
      setSolicitudes(nextSolicitudes);

      if (reviewStatsResponse.ok) {
        setReviewStats(reviewStatsResponse.data);
      }

      const failures = [
        booksResponse.ok ? null : booksResponse.error,
        transactionsResponse.ok ? null : transactionsResponse.error,
        solicitudesResponse.ok ? null : solicitudesResponse.error,
        reviewStatsResponse.ok ? null : reviewStatsResponse.error,
      ].filter(Boolean);

      if (failures.length > 0) {
        setError(failures[0] || "No se pudo cargar todo el dashboard");
      }

      const recentTransactions = nextTransactions
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 8);
      const bookIds = [...new Set(recentTransactions.map((transaction) => transaction.bookId).filter(Boolean))];
      const peerIds = [
        ...new Set(
          recentTransactions
            .map((transaction) => transaction.buyerId === userId ? transaction.sellerId : transaction.buyerId)
            .filter(Boolean)
        ),
      ];

      const [transactionBooks, peers] = await Promise.all([
        Promise.all(bookIds.map(async (id) => {
          const existing = nextBooks.find((book) => book.id === id);
          if (existing) return existing;
          const response = await getBookById(id, authToken);
          return response.ok ? response.data : null;
        })),
        Promise.all(peerIds.map(async (id) => {
          const response = await getUserById(id, authToken);
          return response.ok ? response.data : null;
        })),
      ]);

      if (cancelled) return;

      setBooksById(Object.fromEntries(
        transactionBooks.filter((book): book is Book => book !== null).map((book) => [book.id, book])
      ));
      setUsersById(Object.fromEntries(
        peers.filter((peer): peer is User => peer !== null).map((peer) => [peer.id, peer])
      ));
      setIsLoading(false);
    }

    loadDashboard();
    return () => { cancelled = true; };
  }, [token, user?.id]);

  const monthlyActivity = useMemo(
    () => buildMonthlyActivity(transactions, solicitudes, books),
    [books, solicitudes, transactions]
  );

  const currentMonth = monthlyActivity[monthlyActivity.length - 1];
  const previousMonth = monthlyActivity[monthlyActivity.length - 2];

  const kpis = useMemo(() => {
    const activeDeals = solicitudes.filter(
      (solicitud) => solicitud.status === "pendiente" || solicitud.status === "aceptada"
    );
    const avgRating = reviewStats.totalReviews > 0
      ? reviewStats.averageRating
      : (user?.rating ?? 0);

    return {
      revenue: currentMonth?.ventas ?? 0,
      revenueTrend: pct(currentMonth?.ventas ?? 0, previousMonth?.ventas ?? 0),
      activeDeals: activeDeals.length,
      dealsTrend: pct(currentMonth?.intercambios ?? 0, previousMonth?.intercambios ?? 0),
      booksPosted: books.length,
      booksTrend: pct(currentMonth?.booksListed ?? 0, previousMonth?.booksListed ?? 0),
      rating: avgRating,
      reviewCount: reviewStats.totalReviews || user?.reviewCount || 0,
      monthlyTransactions: currentMonth?.intercambios ?? 0,
      monthlyBooksListed: currentMonth?.booksListed ?? 0,
    };
  }, [books.length, currentMonth, previousMonth, reviewStats, solicitudes, user?.rating, user?.reviewCount]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-sm shadow-violet-200/60 flex-shrink-0">
            <LayoutDashboard className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground leading-none">
              Dash<span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">board</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Resumen de tu actividad en ReadMe
            </p>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="rounded-2xl border border-border bg-white px-4 py-3 text-sm text-muted-foreground shadow-sm">
          Cargando datos del dashboard...
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
          {error}
        </div>
      )}

      {/* ── KPI strip ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

        <KPICard
          title={`Ventas de ${MONTH_LABEL}`}
          value={formatPrice(kpis.revenue)}
          trend={kpis.revenueTrend}
          trendBase="vs mes anterior"
          icon={ShoppingBag}
          footer={`${kpis.monthlyTransactions} transacciones`}
          color="violet"
        />

        <KPICard
          title="Intercambios activos"
          value={String(kpis.activeDeals)}
          trend={kpis.dealsTrend}
          trendBase="vs mes anterior"
          icon={ArrowLeftRight}
          footer="pendientes o aceptados"
          color="blue"
        />

        <KPICard
          title="Libros publicados"
          value={String(kpis.booksPosted)}
          trend={kpis.booksTrend}
          trendBase="vs mes anterior"
          icon={BookMarked}
          footer={`${kpis.monthlyBooksListed} listados este mes`}
          color="emerald"
        />

        <KPICard
          title="Rating promedio"
          value={kpis.rating.toFixed(1)}
          icon={Star}
          footer={`${kpis.reviewCount} reseñas recibidas`}
          color="amber"
          ratingValue={kpis.rating}
        />

      </div>

      {/* ── Area chart ────────────────────────────────────────────────────── */}
      <AreaChartCard data={monthlyActivity} />

      {/* ── Profile + Bar chart ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ProfileCard user={user} kpis={kpis} />
        <div className="lg:col-span-2">
          <BarChartCard data={monthlyActivity} />
        </div>
      </div>

      {/* ── Recent transactions ───────────────────────────────────────────── */}
      <RecentTransactions
        booksById={booksById}
        transactions={transactions}
        usersById={usersById}
        currentUserId={user?.id}
      />

    </div>
  );
}

// ─── Recent transactions ──────────────────────────────────────────────────────

const STATUS_CONFIG = {
  completed: {
    label: "Completado",
    icon:  CheckCircle2,
    class: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  pending: {
    label: "Pendiente",
    icon:  Clock,
    class: "bg-amber-50 text-amber-700 border-amber-100",
  },
  accepted: {
    label: "Aceptado",
    icon:  RefreshCw,
    class: "bg-blue-50 text-blue-700 border-blue-100",
  },
  rejected: {
    label: "Rechazado",
    icon:  XCircle,
    class: "bg-red-50 text-red-600 border-red-100",
  },
  cancelled: {
    label: "Cancelado",
    icon:  XCircle,
    class: "bg-muted text-muted-foreground border-border",
  },
} as const;

const MODE_CONFIG = {
  sell:     { label: "Venta",       icon: Tag,     class: "text-violet-700 bg-violet-50 border-violet-100" },
  exchange: { label: "Intercambio", icon: Repeat2,  class: "text-blue-700 bg-blue-50 border-blue-100"     },
  donate:   { label: "Donación",    icon: Heart,   class: "text-green-700 bg-green-50 border-green-100"   },
  loan:     { label: "Préstamo",    icon: BookMarked, class: "text-orange-700 bg-orange-50 border-orange-100" },
} as const;

interface RecentTransactionsProps {
  transactions: Transaction[];
  booksById: Record<string, Book>;
  usersById: Record<string, User>;
  currentUserId?: string;
}

function RecentTransactions({
  transactions,
  booksById,
  usersById,
  currentUserId,
}: RecentTransactionsProps) {
  const rows = transactions
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8)
    .map((t) => {
    const book = booksById[t.bookId];
    const counterpartyId = t.buyerId === currentUserId ? t.sellerId : t.buyerId;
    const counterparty = usersById[counterpartyId];
    const status       = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.pending;
    const mode         = (t.mode && t.mode in MODE_CONFIG ? MODE_CONFIG[t.mode as keyof typeof MODE_CONFIG] : undefined) ?? MODE_CONFIG.sell;
    return { t, book, counterparty, status, mode };
  });

  return (
    <div className="rounded-2xl border border-border bg-white overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Transacciones recientes</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Últimos movimientos de tu cuenta</p>
        </div>
        <span className="text-[11px] font-medium text-violet-600 bg-violet-50 border border-violet-100 px-2.5 py-1 rounded-full">
          {rows.length} registros
        </span>
      </div>

      {rows.length === 0 && (
        <div className="px-6 py-10 text-center text-sm text-muted-foreground">
          Aún no hay transacciones registradas.
        </div>
      )}

      {/* Table — desktop */}
      {rows.length > 0 && (
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/30">
              {["Libro / Contraparte", "Tipo", "Fecha", "Monto", "Estado"].map((h) => (
                <th
                  key={h}
                  className="text-left text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest px-6 py-3 whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {rows.map(({ t, book, counterparty, status, mode }) => {
              const StatusIcon = status.icon;
              const ModeIcon   = mode.icon;
              return (
                <tr
                  key={t.id}
                  className="hover:bg-violet-50/20 transition-colors group"
                >
                  {/* Book + counterparty */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-11 rounded-lg overflow-hidden bg-muted flex-shrink-0 ring-1 ring-border">
                        {book?.cover ? (
                          <img
                            src={book.cover}
                            alt={book.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <BookCoverPlaceholder title={book?.title ?? "Libro"} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate max-w-[160px] group-hover:text-violet-700 transition-colors">
                          {book?.title ?? "—"}
                        </p>
                        {counterparty && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Avatar src={counterparty.avatar} name={counterparty.name} size="xs" />
                            <span className="text-xs text-muted-foreground truncate">
                              {counterparty.name.split(" ")[0]}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Mode */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium",
                      mode.class
                    )}>
                      <ModeIcon className="w-3 h-3" />
                      {mode.label}
                    </span>
                  </td>

                  {/* Date */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm text-foreground tabular-nums">
                      {new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", year: "numeric" })
                        .format(new Date(t.createdAt))}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {formatRelativeTime(t.createdAt)}
                    </p>
                  </td>

                  {/* Amount */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {t.agreedPrice != null ? (
                      <span className="font-semibold text-foreground tabular-nums">
                        {formatPrice(t.agreedPrice)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/60 italic">—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium",
                      status.class
                    )}>
                      <StatusIcon className="w-3 h-3" />
                      {status.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}

      {/* List — mobile */}
      {rows.length > 0 && (
      <div className="md:hidden divide-y divide-border/50">
        {rows.map(({ t, book, counterparty, status, mode }) => {
          const StatusIcon = status.icon;
          const ModeIcon   = mode.icon;
          return (
            <div key={t.id} className="flex items-start gap-3 px-5 py-4">
              <div className="w-9 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0 ring-1 ring-border">
                {book?.cover ? (
                  <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />
                ) : (
                  <BookCoverPlaceholder title={book?.title ?? "Libro"} />
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm font-medium text-foreground truncate">{book?.title ?? "—"}</p>
                {counterparty && (
                  <p className="text-xs text-muted-foreground">{counterparty.name.split(" ")[0]}</p>
                )}
                <div className="flex items-center gap-2 flex-wrap pt-0.5">
                  <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium", mode.class)}>
                    <ModeIcon className="w-2.5 h-2.5" />{mode.label}
                  </span>
                  <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium", status.class)}>
                    <StatusIcon className="w-2.5 h-2.5" />{status.label}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                {t.agreedPrice != null ? (
                  <span className="text-sm font-semibold tabular-nums">{formatPrice(t.agreedPrice)}</span>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
                <span className="text-[10px] text-muted-foreground">{formatRelativeTime(t.createdAt)}</span>
              </div>
            </div>
          );
        })}
      </div>
      )}

    </div>
  );
}

// ─── Profile card ────────────────────────────────────────────────────────────

interface ProfileCardProps {
  user: User | null;
  kpis: { rating: number; reviewCount: number; booksPosted: number };
}

function ProfileCard({ user, kpis }: ProfileCardProps) {
  if (!user) return null;

  const joinedYear = new Intl.DateTimeFormat("es-PE", {
    month: "long",
    year: "numeric",
  }).format(new Date(user.joinedAt));

  const stats = [
    { label: "Libros",   value: kpis.booksPosted,  icon: BookMarked      },
    { label: "Reseñas",  value: kpis.reviewCount,  icon: MessageSquare   },
    { label: "Rating",   value: kpis.rating.toFixed(1), icon: Star        },
  ];

  return (
    // Sin overflow-hidden para que el avatar pueda sobrepasar el borde del header
    <div className="rounded-2xl border border-border bg-white flex flex-col h-full">

      {/* Accent header — overflow-hidden solo aquí para el dot pattern */}
      <div className="rounded-t-2xl h-20 bg-gradient-to-br from-violet-600 to-purple-700 relative overflow-hidden flex-shrink-0">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
          aria-hidden
        />
      </div>

      {/* Avatar — colgando 50 % dentro del header y 50 % en el contenido */}
      <div className="px-5 -mt-8 relative z-10 flex-shrink-0">
        <Avatar
          src={user.avatar}
          name={user.name}
          size="xl"
          className="ring-4 ring-white shadow-lg"
        />
      </div>

      {/* Main content */}
      <div className="px-5 pb-5 pt-3 flex flex-col flex-1">

        {/* Name + bio */}
        <p className="text-base font-bold text-foreground leading-tight">{user.name}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
          {user.bio}
        </p>

        {/* Location + joined */}
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            {user.location}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" />
            Miembro desde {joinedYear}
          </div>
        </div>

        {/* Stats */}
        <div className="border-t border-border/60 mt-4 pt-4 flex items-center justify-between">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center">
                <Icon className="w-3.5 h-3.5 text-violet-600" />
              </div>
              <p className="text-sm font-bold text-foreground tabular-nums">{value}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* Star rating */}
        <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
          <StarRating value={kpis.rating} size="sm" showValue />
          <span className="text-[11px] text-muted-foreground">{kpis.reviewCount} reseñas</span>
        </div>

      </div>
    </div>
  );
}

// ─── Bar chart card ───────────────────────────────────────────────────────────

function BarChartCard({ data }: { data: DashboardMonth[] }) {
  const barData = data.map((d, i) => ({
    month: d.month,
    ingresos: d.ventas,
    isCurrent: i === data.length - 1,
  }));

  return (
    <div className="rounded-2xl border border-border bg-white p-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Ingresos mensuales</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ventas en soles — últimos 6 meses
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="w-3 h-3 rounded-sm bg-violet-600 flex-shrink-0" />
          <span className="text-xs text-muted-foreground">Ingresos (S/)</span>
        </div>
      </div>

      <div className="flex-1 min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={barData}
            margin={{ top: 4, right: 4, bottom: 0, left: -16 }}
            barSize={28}
          >
            <defs>
              <linearGradient id="gradBar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#7c3aed" stopOpacity={1}    />
                <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.85} />
              </linearGradient>
              <linearGradient id="gradBarMuted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#c4b5fd" stopOpacity={0.7} />
                <stop offset="100%" stopColor="#ddd6fe" stopOpacity={0.5} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              dy={6}
            />

            <YAxis
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              width={36}
            />

            <Tooltip
              content={<BarTooltip />}
              cursor={{ fill: "#f8fafc", radius: 8 }}
            />

            <Bar dataKey="ingresos" radius={[6, 6, 0, 0]} name="Ingresos">
              {barData.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.isCurrent ? "url(#gradBar)" : "url(#gradBarMuted)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function BarTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-white shadow-lg shadow-black/10 px-4 py-3 min-w-[120px]">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
        {label}
      </p>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-violet-600 flex-shrink-0" />
          <span className="text-xs text-muted-foreground">Ingresos</span>
        </div>
        <span className="text-xs font-semibold text-foreground tabular-nums">
          S/ {payload[0].value}
        </span>
      </div>
    </div>
  );
}

// ─── Area chart card ──────────────────────────────────────────────────────────

function AreaChartCard({ data }: { data: DashboardMonth[] }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Actividad mensual</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ventas e intercambios — últimos 6 meses
          </p>
        </div>
        <div className="flex items-center gap-5 flex-shrink-0">
          <LegendDot color="#7c3aed" label="Ventas (S/)" />
          <LegendDot color="#3b82f6" label="Intercambios" />
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="gradVentas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.18} />
              <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}    />
            </linearGradient>
            <linearGradient id="gradIntercambios" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.14} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}    />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#f1f5f9"
            vertical={false}
          />

          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            dy={6}
          />

          <YAxis
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}`}
            width={36}
          />

          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#e2e8f0", strokeWidth: 1 }} />

          <Area
            type="monotone"
            dataKey="ventas"
            name="Ventas"
            stroke="#7c3aed"
            strokeWidth={2}
            fill="url(#gradVentas)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0, fill: "#7c3aed" }}
          />

          <Area
            type="monotone"
            dataKey="intercambios"
            name="Intercambios"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#gradIntercambios)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0, fill: "#3b82f6" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-border bg-white shadow-lg shadow-black/10 px-4 py-3 min-w-[148px]">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">
        {label}
      </p>
      <div className="space-y-1.5">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: entry.color }}
              />
              <span className="text-xs text-muted-foreground">{entry.name}</span>
            </div>
            <span className="text-xs font-semibold text-foreground tabular-nums">
              {entry.dataKey === "ventas" ? `S/ ${entry.value}` : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Legend dot ───────────────────────────────────────────────────────────────

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

const COLOR_MAP = {
  violet:  {
    iconBg:   "bg-violet-100",
    iconText: "text-violet-600",
    valueBg:  "from-violet-600 to-purple-600",
    accent:   "border-violet-100",
  },
  blue:    {
    iconBg:   "bg-blue-100",
    iconText: "text-blue-600",
    valueBg:  "from-blue-600 to-sky-500",
    accent:   "border-blue-100",
  },
  emerald: {
    iconBg:   "bg-emerald-100",
    iconText: "text-emerald-600",
    valueBg:  "from-emerald-600 to-teal-500",
    accent:   "border-emerald-100",
  },
  amber:   {
    iconBg:   "bg-amber-100",
    iconText: "text-amber-600",
    valueBg:  "from-amber-500 to-orange-400",
    accent:   "border-amber-100",
  },
} as const;

interface KPICardProps {
  title:        string;
  value:        string;
  icon:         React.ElementType;
  footer:       string;
  color:        keyof typeof COLOR_MAP;
  trend?:       number | null;
  trendBase?:   string;
  ratingValue?: number;
}

function KPICard({
  title,
  value,
  icon: Icon,
  footer,
  color,
  trend,
  trendBase,
  ratingValue,
}: KPICardProps) {
  const c = COLOR_MAP[color];
  const positive = trend != null && trend >= 0;

  return (
    <div
      className={cn(
        "relative rounded-2xl border bg-white p-5 overflow-hidden",
        "hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5",
        "transition-all duration-200",
        c.accent
      )}
    >
      {/* Subtle top-right glow */}
      <div
        className="pointer-events-none absolute -top-8 -right-8 w-28 h-28 rounded-full opacity-[0.06]"
        style={{ background: `radial-gradient(circle, var(--tw-gradient-stops))` }}
        aria-hidden
      />

      {/* Icon + trend row */}
      <div className="flex items-start justify-between mb-5">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", c.iconBg)}>
          <Icon className={cn("w-5 h-5", c.iconText)} />
        </div>

        {trend != null && (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full",
              positive
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-600"
            )}
          >
            {positive
              ? <TrendingUp className="w-3 h-3" />
              : <TrendingDown className="w-3 h-3" />
            }
            {positive ? "+" : ""}{trend}%
          </span>
        )}
      </div>

      {/* Value */}
      <p
        className={cn(
          "text-[30px] font-bold tracking-tight leading-none mb-1",
          `bg-gradient-to-br ${c.valueBg} bg-clip-text text-transparent`
        )}
      >
        {value}
      </p>

      {/* Title */}
      <p className="text-sm text-muted-foreground">{title}</p>

      {/* Rating stars */}
      {ratingValue != null && (
        <div className="mt-2">
          <StarRating value={ratingValue} size="sm" />
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-border/60">
        <p className="text-xs text-muted-foreground">
          {trend != null && trendBase ? (
            <span className={cn("font-medium", positive ? "text-emerald-600" : "text-red-500")}>
              {positive ? "+" : ""}{trend}%{" "}
            </span>
          ) : null}
          {footer}
        </p>
      </div>
    </div>
  );
}

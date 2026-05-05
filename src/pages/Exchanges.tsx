import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  Clock,
  Layers,
  ShoppingBag,
  CheckCircle2,
  ArrowUpRight,
  BookMarked,
  MessageCircle,
  XCircle,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { getBookById } from "@/api/books";
import { getSolicitudesByUser } from "@/api/solicitudes";
import { getUserById } from "@/api/users";
import type { Book, Conversation, User } from "@/types";
import Avatar from "@/components/shared/Avatar";
import EmptyState from "@/components/shared/EmptyState";
import { cn, formatRelativeTime } from "@/lib/utils";

type StatusTab = "all" | "pendiente" | "aceptada";

const STATUS_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  aceptada:  "Completada",
};

const STATUS_COLOR: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-800",
  aceptada:  "bg-emerald-100 text-emerald-800",
};

const STATUS_ICON: Record<string, React.ElementType> = {
  pendiente: Clock,
  aceptada:  CheckCircle2,
};

const SUMMARY_CARDS = [
  {
    key: "total" as const,
    label: "Total",
    icon: Layers,
    color: "text-violet-600",
    bg: "bg-violet-50",
    ring: "ring-violet-100",
    border: "border-violet-200/60",
    accent: "from-violet-50 to-white",
  },
  {
    key: "asBuyer" as const,
    label: "Como comprador",
    icon: ShoppingBag,
    color: "text-amber-600",
    bg: "bg-amber-50",
    ring: "ring-amber-100",
    border: "border-amber-200/60",
    accent: "from-amber-50 to-white",
  },
  {
    key: "asSeller" as const,
    label: "Como vendedor",
    icon: BookMarked,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    ring: "ring-emerald-100",
    border: "border-emerald-200/60",
    accent: "from-emerald-50 to-white",
  },
  {
    key: "recent" as const,
    label: "Este mes",
    icon: Clock,
    color: "text-gray-500",
    bg: "bg-gray-50",
    ring: "ring-gray-100",
    border: "border-gray-200/60",
    accent: "from-gray-50 to-white",
  },
] as const;

export default function ExchangesPage() {
  const currentUser = useAuthStore((s) => s.user);
  const token       = useAuthStore((s) => s.token);

  const [activeTab, setActiveTab]     = useState<StatusTab>("all");
  const [solicitudes, setSolicitudes] = useState<Conversation[]>([]);
  const [booksById, setBooksById]     = useState<Record<string, Book>>({});
  const [usersById, setUsersById]     = useState<Record<string, User>>({});
  const [isLoading, setIsLoading]     = useState(Boolean(currentUser?.id && token));
  const [error, setError]             = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser?.id || !token) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const userId    = currentUser.id;
    const authToken = token;

    async function load() {
      setIsLoading(true);
      setError(null);

      const response = await getSolicitudesByUser(userId, authToken);
      if (cancelled) return;

      if (!response.ok) {
        setError(response.error || "No se pudieron cargar los intercambios");
        setIsLoading(false);
        return;
      }

      setSolicitudes(response.data);

      const bookIds = [...new Set(response.data.map((s) => s.bookId).filter(Boolean))];
      const peerIds = [
        ...new Set(
          response.data.map((s) =>
            s.buyerId === userId ? s.sellerId : s.buyerId
          ).filter((id): id is string => Boolean(id))
        ),
      ];

      const [books, users] = await Promise.all([
        Promise.all(bookIds.map(async (id) => {
          const r = await getBookById(id, authToken);
          return r.ok ? r.data : null;
        })),
        Promise.all(peerIds.map(async (uid) => {
          const r = await getUserById(uid, authToken);
          return r.ok ? r.data : null;
        })),
      ]);

      if (cancelled) return;

      setBooksById(Object.fromEntries(
        books.filter((b): b is Book => b !== null).map((b) => [b.id, b])
      ));
      setUsersById(Object.fromEntries(
        users.filter((u): u is User => u !== null).map((u) => [u.id, u])
      ));
      setIsLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [currentUser?.id, token]);

  const stats = useMemo(() => ({
    total:    solicitudes.length,
    asBuyer:  solicitudes.filter((s) => s.buyerId  === currentUser?.id).length,
    asSeller: solicitudes.filter((s) => s.sellerId === currentUser?.id).length,
    recent:   solicitudes.filter((s) => {
      if (!s.lastMessageAt) return false;
      return new Date(s.lastMessageAt).getTime() >= Date.now() - 30 * 24 * 60 * 60 * 1000;
    }).length,
  }), [solicitudes, currentUser?.id]);

  const filtered = useMemo(() => {
    if (activeTab === "all") return solicitudes;
    return solicitudes.filter((s) => s.status === activeTab);
  }, [activeTab, solicitudes]);

  const tabCounts = useMemo(() => ({
    all:       solicitudes.length,
    pendiente: solicitudes.filter((s) => s.status === "pendiente").length,
    aceptada:  solicitudes.filter((s) => s.status === "aceptada").length,
  }), [solicitudes]);

  return (
    <div className="max-w-5xl mx-auto space-y-7">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Intercambios</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Historial de solicitudes de compra e intercambio
        </p>
      </div>

      {isLoading && (
        <div className="rounded-2xl border border-border bg-white px-4 py-3 text-sm text-muted-foreground shadow-sm">
          Cargando intercambios...
        </div>
      )}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {SUMMARY_CARDS.map(({ key, label, icon: Icon, color, bg, ring, border, accent }) => (
          <div
            key={key}
            className={cn(
              "rounded-2xl border bg-gradient-to-b p-5 flex flex-col gap-4 shadow-sm",
              border, accent
            )}
          >
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center ring-1", bg, ring)}>
              <Icon className={cn("w-4 h-4", color)} />
            </div>
            <div>
              <p className={cn("text-3xl font-bold tabular-nums tracking-tight leading-none", color)}>
                {stats[key]}
              </p>
              <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest mt-2">
                {label}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <div className="bg-muted/50 border border-border rounded-2xl p-1 flex gap-0.5 w-full sm:w-fit">
          {([
            { value: "all"       as const, label: "Todos",      icon: Layers },
            { value: "pendiente" as const, label: "Pendientes",  icon: Clock },
            { value: "aceptada"  as const, label: "Completados", icon: CheckCircle2 },
          ] as const).map(({ value, label, icon: Icon }) => {
            const active = activeTab === value;
            return (
              <button
                key={value}
                onClick={() => setActiveTab(value)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 whitespace-nowrap",
                  active
                    ? "bg-white text-violet-700 shadow-sm border border-border/60"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/60"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5 flex-shrink-0", active ? "text-violet-600" : "text-current")} />
                {label}
                <span className={cn(
                  "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold tabular-nums",
                  active ? "bg-violet-100 text-violet-700" : "bg-muted text-muted-foreground"
                )}>
                  {tabCounts[value]}
                </span>
              </button>
            );
          })}
        </div>

        {!isLoading && filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-border/60 shadow-sm">
            <EmptyState
              icon={XCircle}
              title="Sin intercambios"
              description="No hay solicitudes para este filtro."
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-border/60 bg-white shadow-sm overflow-hidden divide-y divide-border/50">
            {filtered.map((solicitud) => (
              <SolicitudRow
                key={solicitud.id}
                solicitud={solicitud}
                book={booksById[solicitud.bookId]}
                peer={usersById[
                  solicitud.buyerId === currentUser?.id
                    ? (solicitud.sellerId ?? "")
                    : (solicitud.buyerId ?? "")
                ]}
                isBuyer={solicitud.buyerId === currentUser?.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface SolicitudRowProps {
  solicitud: Conversation;
  book?: Book;
  peer?: User;
  isBuyer: boolean;
}

function SolicitudRow({ solicitud, book, peer, isBuyer }: SolicitudRowProps) {
  const status = solicitud.status ?? "pendiente";
  const StatusIcon = STATUS_ICON[status] ?? Clock;

  return (
    <div className="flex items-start sm:items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors group">
      <Link
        to={solicitud.bookId ? `/libro/${solicitud.bookId}` : "#"}
        className="flex-shrink-0 w-12 h-16 sm:w-14 sm:h-[72px] rounded-xl overflow-hidden bg-muted/50 shadow-sm ring-1 ring-border/50 hover:ring-violet-300 transition-all"
      >
        {book?.cover ? (
          <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookMarked className="w-5 h-5 text-muted-foreground/30" />
          </div>
        )}
      </Link>

      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold",
            isBuyer ? "bg-violet-100 text-violet-800" : "bg-amber-100 text-amber-800"
          )}>
            <ShoppingBag className="w-2.5 h-2.5" />
            {isBuyer ? "Comprador" : "Vendedor"}
          </span>
          <span className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold",
            STATUS_COLOR[status] ?? "bg-gray-100 text-gray-700"
          )}>
            <StatusIcon className="w-2.5 h-2.5" />
            {STATUS_LABEL[status] ?? status}
          </span>
        </div>

        <div>
          <Link
            to={solicitud.bookId ? `/libro/${solicitud.bookId}` : "#"}
            className="text-sm font-semibold text-foreground hover:text-violet-700 transition-colors leading-tight block truncate"
          >
            {book?.title ?? "Libro no disponible"}
          </Link>
          {book && <p className="text-xs text-muted-foreground truncate">{book.author}</p>}
        </div>

        <div className="flex items-center gap-3 pt-0.5">
          {peer ? (
            <div className="flex items-center gap-1.5">
              <Avatar src={peer.avatar} name={peer.name} size="xs" />
              <span className="text-xs text-muted-foreground truncate">{peer.name}</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">
              {isBuyer ? "Vendedor" : "Comprador"} desconocido
            </span>
          )}
          {solicitud.lastMessageAt && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground/60">
              <CalendarDays className="w-2.5 h-2.5 flex-shrink-0" />
              {formatRelativeTime(solicitud.lastMessageAt)}
            </span>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 flex flex-col items-end gap-2 self-center">
        <Link
          to={`/mensajes?c=${solicitud.id}`}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-600 hover:text-violet-800 px-2.5 py-1.5 rounded-xl hover:bg-violet-50 transition-all opacity-0 group-hover:opacity-100"
        >
          <MessageCircle className="w-3 h-3" />
          Ver chat
          <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

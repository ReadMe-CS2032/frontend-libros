import { useRef, useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  Search,
  Bell,
  Menu,
  Home,
  ChevronRight,
  MessageCircle,
  ArrowLeftRight,
  Star,
  Info,
  CheckCheck,
  X,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useUIStore } from "@/store/useUIStore";
import { NOTIFICATIONS } from "@/data/mock";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import Avatar from "@/components/shared/Avatar";
import type { NotificationType } from "@/types";

// ─── Breadcrumb config ────────────────────────────────────────────────────────

const ROUTE_LABELS: Record<string, string> = {
  "/explorar":      "Explorar",
  "/mis-libros":    "Mis libros",
  "/intercambios":  "Intercambios",
  "/mensajes":      "Mensajes",
  "/perfil":        "Perfil",
  "/configuracion": "Configuración",
};

// ─── Notification icons ───────────────────────────────────────────────────────

const NOTIF_ICONS: Record<NotificationType, React.ElementType> = {
  message:     MessageCircle,
  transaction: ArrowLeftRight,
  review:      Star,
  system:      Info,
};

const NOTIF_COLORS: Record<NotificationType, string> = {
  message:     "bg-sky-100 text-sky-600",
  transaction: "bg-violet-100 text-violet-600",
  review:      "bg-amber-100 text-amber-600",
  system:      "bg-slate-100 text-slate-500",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Header() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const user          = useAuthStore((s) => s.user);
  const location      = useLocation();
  const navigate      = useNavigate();

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const notifRef = useRef<HTMLDivElement>(null);

  const unread = notifications.filter((n) => !n.read).length;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [notifOpen]);

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  // Build breadcrumb segments from pathname
  const segments = location.pathname
    .split("/")
    .filter(Boolean)
    .map((_, i, arr) => {
      const path = "/" + arr.slice(0, i + 1).join("/");
      return { path, label: ROUTE_LABELS[path] ?? arr[i] };
    });

  return (
    <header className="sticky top-0 z-20 h-14 flex-shrink-0 flex items-center justify-between px-4 lg:px-6 bg-white/90 backdrop-blur-md border-b border-border">

      {/* ── Left ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Abrir menú"
        >
          <Menu className="w-[18px] h-[18px]" />
        </button>

        {/* Breadcrumb */}
        <nav className="hidden sm:flex items-center gap-1 text-sm">
          <Link
            to="/explorar"
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
          </Link>
          {segments.map((seg, i) => (
            <span key={seg.path} className="flex items-center gap-1">
              <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
              {i === segments.length - 1 ? (
                <span className="font-medium text-foreground">{seg.label}</span>
              ) : (
                <Link
                  to={seg.path}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {seg.label}
                </Link>
              )}
            </span>
          ))}
        </nav>

        {/* Search pill — visible on md+ */}
        <button
          onClick={() => navigate("/explorar")}
          className="hidden md:flex items-center gap-2 bg-muted hover:bg-muted/80 text-muted-foreground px-3 py-1.5 rounded-xl transition-colors border border-border/60 w-52"
        >
          <Search className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="flex-1 text-left text-xs">Buscar libros…</span>
          <kbd className="text-[10px] bg-background border border-border rounded px-1 py-0.5 font-mono leading-none">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* ── Right ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1">

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifOpen((o) => !o)}
            className="relative p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Notificaciones"
          >
            <Bell className="w-[18px] h-[18px]" />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-600 ring-2 ring-white" />
              </span>
            )}
          </button>

          {/* Dropdown */}
          {notifOpen && (
            <div
              className={cn(
                "absolute right-0 top-full mt-2 w-80 rounded-2xl border border-border bg-white shadow-xl shadow-black/10",
                "animate-in fade-in slide-in-from-top-2 duration-150"
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">Notificaciones</p>
                  {unread > 0 && (
                    <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-violet-600 text-white text-[10px] font-bold">
                      {unread}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {unread > 0 && (
                    <button
                      onClick={markAllRead}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted"
                    >
                      <CheckCheck className="w-3 h-3" />
                      Marcar leídas
                    </button>
                  )}
                  <button
                    onClick={() => setNotifOpen(false)}
                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="max-h-[360px] overflow-y-auto divide-y divide-border/50">
                {notifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-10">
                    Sin notificaciones
                  </p>
                ) : (
                  notifications.map((notif) => {
                    const Icon = NOTIF_ICONS[notif.type];
                    return (
                      <button
                        key={notif.id}
                        onClick={() => setNotifOpen(false)}
                        className={cn(
                          "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors",
                          notif.read
                            ? "hover:bg-muted/50"
                            : "bg-violet-50/50 hover:bg-violet-50"
                        )}
                      >
                        {/* Icon bubble */}
                        <span
                          className={cn(
                            "flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mt-0.5",
                            NOTIF_COLORS[notif.type]
                          )}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </span>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={cn(
                                "text-xs leading-snug truncate",
                                notif.read ? "font-medium text-foreground" : "font-semibold text-foreground"
                              )}
                            >
                              {notif.title}
                            </p>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                              {formatRelativeTime(notif.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                            {notif.body}
                          </p>
                        </div>

                        {/* Unread dot */}
                        {!notif.read && (
                          <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-violet-600 mt-2" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-border/50">
                <button className="w-full text-xs text-center text-muted-foreground hover:text-foreground transition-colors py-1 rounded-lg hover:bg-muted">
                  Ver todas las notificaciones
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-border mx-1" />

        {/* User */}
        {user && (
          <button
            onClick={() => navigate("/perfil")}
            className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-xl hover:bg-muted transition-colors"
          >
            <Avatar src={user.avatar} name={user.name} size="xs" />
            <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate">
              {user.name.split(" ")[0]}
            </span>
          </button>
        )}
      </div>
    </header>
  );
}

import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  Search,
  Menu,
  Home,
  ChevronRight,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useUIStore } from "@/store/useUIStore";

import Avatar from "@/components/shared/Avatar";

// ─── Breadcrumb config ────────────────────────────────────────────────────────

const ROUTE_LABELS: Record<string, string> = {
  "/explorar":      "Explorar",
  "/mis-libros":    "Mis libros",
  "/intercambios":  "Intercambios",
  "/mensajes":      "Mensajes",
  "/perfil":        "Perfil",
  "/configuracion": "Configuración",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Header() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const user          = useAuthStore((s) => s.user);
  const location      = useLocation();
  const navigate      = useNavigate();

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

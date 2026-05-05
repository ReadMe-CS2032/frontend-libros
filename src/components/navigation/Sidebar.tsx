import { NavLink, useNavigate } from "react-router-dom";
import {
  BookOpen,
  ArrowLeftRight,
  MessageCircle,
  LayoutDashboard,
  Store,
  Library,
  User,
  Settings,
  LogOut,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  X,
  Plus,
  Truck,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useUIStore } from "@/store/useUIStore";
import { cn } from "@/lib/utils";
import Avatar from "@/components/shared/Avatar";

// ─── Nav config ───────────────────────────────────────────────────────────────

const NAV_MAIN = [
  { label: "Dashboard",     icon: LayoutDashboard, href: "/dashboard"     },
  { label: "Analytics",     icon: BarChart2,       href: "/analytics"     },
  { label: "Marketplace",   icon: Store,           href: "/marketplace"   },
  { label: "Mi biblioteca", icon: Library,         href: "/mi-biblioteca" },
  { label: "Intercambios",  icon: ArrowLeftRight,  href: "/intercambios"        },
  { label: "Mensajes",      icon: MessageCircle,   href: "/mensajes"            },
  { label: "Entregas",      icon: Truck,           href: "/entregas-pendientes" },
];

const NAV_BOTTOM = [
  { label: "Perfil",        icon: User,     href: "/perfil"        },
  { label: "Configuración", icon: Settings, href: "/configuracion" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const sidebarOpen            = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen         = useUIStore((s) => s.setSidebarOpen);
  const sidebarCollapsed       = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebarCollapsed = useUIStore((s) => s.toggleSidebarCollapsed);
  const user                   = useAuthStore((s) => s.user);
  const logout                 = useAuthStore((s) => s.logout);
  const navigate               = useNavigate();

  function handleLogout() {
    logout();
    navigate("/", { replace: true });
  }

  function closeOnMobile() {
    setSidebarOpen(false);
  }

  return (
    <aside
      className={cn(
        "fixed lg:sticky top-0 h-screen flex flex-col z-40",
        "bg-white border-r border-border",
        "transition-[width,transform] duration-300 ease-in-out",
        sidebarCollapsed ? "lg:w-[68px]" : "lg:w-64",
        "w-64",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      {/* ── Logo row ─────────────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex items-center h-14 border-b border-border flex-shrink-0 gap-2",
          sidebarCollapsed ? "px-[18px]" : "px-4"
        )}
      >
        <NavLink to="/" className="flex-shrink-0" onClick={closeOnMobile}>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-md shadow-violet-200">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
        </NavLink>

        <span
          className={cn(
            "font-bold text-base flex-1 overflow-hidden whitespace-nowrap transition-all duration-300",
            sidebarCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
          )}
        >
          ReadMe
        </span>

        {/* Desktop collapse toggle */}
        <button
          onClick={toggleSidebarCollapsed}
          title={sidebarCollapsed ? "Expandir" : "Colapsar"}
          className={cn(
            "hidden lg:flex flex-shrink-0 items-center justify-center w-6 h-6 rounded-lg",
            "text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          )}
        >
          {sidebarCollapsed
            ? <ChevronRight className="w-3.5 h-3.5" />
            : <ChevronLeft  className="w-3.5 h-3.5" />
          }
        </button>

        {/* Mobile close */}
        <button
          onClick={closeOnMobile}
          className="lg:hidden flex-shrink-0 p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Cerrar menú"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Publish button ────────────────────────────────────────────────── */}
      <div className={cn("flex-shrink-0 pt-4 pb-1", sidebarCollapsed ? "px-2" : "px-3")}>
        <SidebarTooltip label="Publicar libro" disabled={!sidebarCollapsed}>
          <NavLink
            to="/publicar"
            onClick={closeOnMobile}
            className={cn(
              "flex items-center gap-2.5 rounded-xl font-semibold text-sm text-white",
              "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700",
              "shadow-sm shadow-violet-200 transition-all duration-150 active:scale-95",
              sidebarCollapsed ? "justify-center p-2.5" : "px-3 py-2.5"
            )}
          >
            <Plus className={cn("flex-shrink-0", sidebarCollapsed ? "w-5 h-5" : "w-4 h-4")} />
            {!sidebarCollapsed && <span>Publicar libro</span>}
          </NavLink>
        </SidebarTooltip>
      </div>

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav
        className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-0.5",
          sidebarCollapsed ? "px-2" : "px-3"
        )}
      >
        {!sidebarCollapsed && (
          <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest px-3 mb-2">
            Menú
          </p>
        )}

        {NAV_MAIN.map((item) => (
          <SidebarLink
            key={item.href}
            {...item}
            collapsed={sidebarCollapsed}
            onClick={closeOnMobile}
          />
        ))}

        <div className={cn("border-t border-border/60", sidebarCollapsed ? "my-2 mx-1" : "my-3")} />

        {!sidebarCollapsed && (
          <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest px-3 mb-2">
            Cuenta
          </p>
        )}

        {NAV_BOTTOM.map((item) => (
          <SidebarLink
            key={item.href}
            {...item}
            collapsed={sidebarCollapsed}
            onClick={closeOnMobile}
          />
        ))}
      </nav>

      {/* ── User card ────────────────────────────────────────────────────── */}
      {user && (
        <div className="border-t border-border flex-shrink-0 p-2">
          {sidebarCollapsed ? (
            <div className="flex flex-col items-center gap-1 py-1">
              <SidebarTooltip label={user.name} disabled={false}>
                <Avatar src={user.avatar} name={user.name} size="sm" />
              </SidebarTooltip>
              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                className="flex items-center justify-center w-full py-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-muted transition-colors group">
              <Avatar src={user.avatar} name={user.name} size="sm" className="flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate leading-tight">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.location}</p>
              </div>
              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

// ─── Sidebar link ─────────────────────────────────────────────────────────────

interface SidebarLinkProps {
  label: string;
  icon: React.ElementType;
  href: string;
  collapsed: boolean;
  onClick?: () => void;
}

function SidebarLink({ label, icon: Icon, href, collapsed, onClick }: SidebarLinkProps) {
  return (
    <SidebarTooltip label={label} disabled={!collapsed}>
      <NavLink
        to={href}
        onClick={onClick}
        className={({ isActive }) =>
          cn(
            "flex items-center rounded-xl text-sm font-medium transition-all duration-150",
            collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5",
            isActive
              ? "bg-violet-50 text-violet-700 font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )
        }
      >
        {({ isActive }) => (
          <>
            <Icon
              className={cn(
                "flex-shrink-0 transition-colors",
                collapsed ? "w-5 h-5" : "w-4 h-4",
                isActive ? "text-violet-600" : "text-current"
              )}
            />
            {!collapsed && <span className="truncate">{label}</span>}
          </>
        )}
      </NavLink>
    </SidebarTooltip>
  );
}

// ─── Tooltip (collapsed mode) ─────────────────────────────────────────────────

interface SidebarTooltipProps {
  label: string;
  disabled: boolean;
  children: React.ReactNode;
}

function SidebarTooltip({ label, disabled, children }: SidebarTooltipProps) {
  if (disabled) return <>{children}</>;
  return (
    <div className="relative group/tip">
      {children}
      <span
        className={cn(
          "pointer-events-none absolute left-full ml-2.5 top-1/2 -translate-y-1/2 z-50",
          "whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1.5",
          "text-xs font-medium text-background shadow-lg",
          "opacity-0 group-hover/tip:opacity-100 scale-95 group-hover/tip:scale-100",
          "transition-all duration-150"
        )}
      >
        {label}
        {/* Arrow */}
        <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-foreground" />
      </span>
    </div>
  );
}

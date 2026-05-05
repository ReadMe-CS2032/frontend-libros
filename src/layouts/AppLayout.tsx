import { Outlet } from "react-router-dom";
import { useUIStore } from "@/store/useUIStore";
import { cn } from "@/lib/utils";
import Sidebar from "@/components/navigation/Sidebar";
import Header from "@/components/navigation/Header";

export default function AppLayout() {
  const sidebarOpen    = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);

  return (
    <div className="flex h-screen bg-[#fafafa] overflow-hidden">
      {/* Mobile overlay */}
      <div
        aria-hidden
        onClick={() => setSidebarOpen(false)}
        className={cn(
          "fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden transition-opacity duration-300",
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      />

      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-5 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

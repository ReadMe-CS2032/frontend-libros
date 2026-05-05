import { create } from "zustand";

interface UIState {
  sidebarOpen: boolean;        // mobile: overlay visible
  sidebarCollapsed: boolean;   // desktop: icon-only mode
  searchOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapsed: () => void;
  toggleSearch: () => void;
  setSearchOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarOpen: false,
  sidebarCollapsed: false,
  searchOpen: false,

  toggleSidebar: () =>
    set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  setSidebarOpen: (open) =>
    set({ sidebarOpen: open }),

  toggleSidebarCollapsed: () =>
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  toggleSearch: () =>
    set((s) => ({ searchOpen: !s.searchOpen })),

  setSearchOpen: (open) =>
    set({ searchOpen: open }),
}));

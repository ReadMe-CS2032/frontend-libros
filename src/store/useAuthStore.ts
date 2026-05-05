import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (payload: { user: User; token: string }) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

const LEGACY_LOCATION_MAP: Record<string, string> = {
  "Madrid, España": "Lima, Perú",
  "Barcelona, España": "Arequipa, Perú",
  "Sevilla, España": "Cusco, Perú",
  "Valencia, España": "Trujillo, Perú",
};

function normalizeUser(user: User | null): User | null {
  if (!user) return null;

  return {
    ...user,
    location: LEGACY_LOCATION_MAP[user.location] ?? user.location,
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: ({ user, token }) =>
        set({ user: normalizeUser(user), token, isAuthenticated: true }),

      setUser: (user) =>
        set({ user: normalizeUser(user), isAuthenticated: true }),

      logout: () =>
        set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      merge: (persistedState, currentState) => {
        const typedState = persistedState as Partial<AuthState> | undefined;

        return {
          ...currentState,
          ...typedState,
          user: normalizeUser(typedState?.user ?? currentState.user),
          token: typedState?.token ?? currentState.token,
        };
      },
    }
  )
);

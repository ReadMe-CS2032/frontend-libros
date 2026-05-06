import { useAuthStore } from "@/store/useAuthStore";

const ANALYTICS_API_URL =
  import.meta.env.VITE_API_URL?.trim() || "http://localhost:8005/api";

async function requestAnalytics<T>(path: string): Promise<T> {
  const token = useAuthStore.getState().token;

  if (!token) {
    throw new Error("No hay una sesión activa");
  }

  const response = await fetch(`${ANALYTICS_API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const text = await response.text().catch(() => "");
  let payload: unknown = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const p = payload as Record<string, unknown> | null;
    const message =
      (p?.message as string) ||
      (p?.error as string) ||
      (p?.detail as string) ||
      text.slice(0, 200) ||
      `Error ${response.status}`;

    console.error(`[analytics API] ${response.status} ${path}`, text);
    throw new Error(message);
  }

  return payload as T;
}

export function getCategoriasdemanda() {
  return requestAnalytics<unknown>("/analytics/categorias-demanda");
}

export function getUsuariosActivosZona() {
  return requestAnalytics<unknown>("/analytics/usuarios-activos-zona");
}

export function getTopVendedoresCategoria() {
  return requestAnalytics<unknown>("/analytics/top-vendedores-categoria");
}

export function getTasaExitoZona() {
  return requestAnalytics<unknown>("/analytics/tasa-exito-zona");
}

export function getZonasActividad() {
  return requestAnalytics<unknown>("/analytics/zonas-actividad");
}

export function getCategoriasVista() {
  return requestAnalytics<unknown>("/analytics/categorias-vista");
}

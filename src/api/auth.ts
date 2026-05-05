import type { User } from "@/types";

const USERS_API_URL =
  import.meta.env.VITE_USERS_API_URL?.trim() || "http://localhost:8001/api";

interface BackendZone {
  id: number;
  name: string;
}

interface BackendUser {
  id: number;
  name: string;
  email: string;
  zone_id?: number | null;
  zone?: BackendZone | null;
  photo_url?: string | null;
  created_at: string;
}

interface BackendEnvelope<T> {
  data: T;
  message?: string;
  error?: string;
}

interface LoginResponse {
  token: string;
  user: BackendUser;
}

export interface AuthResult {
  token: string;
  user: User;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

function defaultAvatar(name: string) {
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(
    name || "reader"
  )}`;
}

export function mapBackendUser(user: BackendUser): User {
  return {
    id: String(user.id),
    name: user.name,
    email: user.email,
    zoneId: user.zone_id ?? null,
    avatar: user.photo_url || defaultAvatar(user.name),
    location: user.zone?.name || "Ubicacion pendiente",
    bio: "Completa tu perfil para contarle a otros lectores sobre tus gustos.",
    rating: 0,
    reviewCount: 0,
    booksPosted: 0,
    joinedAt: user.created_at,
  };
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${USERS_API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  let payload: BackendEnvelope<T> | { error?: string } | null = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(
      payload && "error" in payload && payload.error
        ? payload.error
        : "No se pudo completar la solicitud"
    );
  }

  if (!payload || !("data" in payload)) {
    throw new Error("Respuesta inesperada del servidor");
  }

  return payload.data;
}

export async function loginUser(payload: LoginPayload): Promise<AuthResult> {
  const data = await request<LoginResponse>("/users/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return {
    token: data.token,
    user: mapBackendUser(data.user),
  };
}

export async function registerUser(payload: RegisterPayload): Promise<User> {
  const data = await request<BackendUser>("/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return mapBackendUser(data);
}

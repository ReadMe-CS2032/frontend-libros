import type { ApiResponse, User, Review, Notification } from "@/types";
import { USERS, REVIEWS, NOTIFICATIONS } from "@/data/mock";
import { mapBackendUser } from "@/api/auth";

const USERS_API_URL =
  import.meta.env.VITE_USERS_API_URL?.trim() || "http://localhost:8001/api";
const REVIEWS_API_URL =
  import.meta.env.VITE_TRANSACTIONS_API_URL?.trim() || "http://localhost:8006/api";

const delay = (ms = 400) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

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

interface BackendReview {
  id: number;
  user_id: number;
  target_user_id: number;
  transaction_id: number;
  rating: number;
  comment: string;
  created_at: string;
}

interface BackendReviewStats {
  _id: number;
  average_rating: number;
  total_reviews: number;
}

export interface ZoneOption {
  id: number;
  name: string;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
}

function ok<T>(data: T): ApiResponse<T> {
  return { ok: true, data };
}

function fail<T>(error: string): ApiResponse<T> {
  return { ok: false, data: null as T, error };
}

function mapBackendReview(review: BackendReview): Review {
  return {
    id: String(review.id),
    reviewerId: String(review.user_id),
    reviewedUserId: String(review.target_user_id),
    transactionId: String(review.transaction_id),
    rating: review.rating,
    comment: review.comment,
    createdAt: review.created_at,
  };
}

async function getProfileFromBackend(
  id: string,
  token: string
): Promise<ApiResponse<User>> {
  try {
    const response = await fetch(`${USERS_API_URL}/users/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const payload =
      ((await response.json().catch(() => null)) as
        | { data?: BackendUser; error?: string }
        | null) ?? null;

    if (!response.ok) {
      return fail(payload?.error || "No se pudo obtener el perfil");
    }

    if (!payload?.data) {
      return fail("Respuesta inesperada del servidor");
    }

    return ok(mapBackendUser(payload.data));
  } catch {
    return fail("No se pudo conectar con el servicio de usuarios");
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getCurrentUser(
  id: string,
  token: string
): Promise<ApiResponse<User>> {
  return getProfileFromBackend(id, token);
}

export async function getUserById(
  id: string,
  token?: string
): Promise<ApiResponse<User>> {
  if (token) {
    return getProfileFromBackend(id, token);
  }

  await delay(350);
  const user = USERS.find((u) => u.id === id);
  if (!user) return fail(`User with id "${id}" not found`);
  return ok(user);
}

export async function getUsers(): Promise<ApiResponse<User[]>> {
  await delay();
  // In production: GET /api/users
  return ok(USERS);
}

export async function getZones(token: string): Promise<ApiResponse<ZoneOption[]>> {
  try {
    const response = await fetch(`${USERS_API_URL}/zones`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const payload =
      ((await response.json().catch(() => null)) as
        | { data?: ZoneOption[]; error?: string }
        | null) ?? null;

    if (!response.ok) {
      return fail(payload?.error || "No se pudieron obtener las zonas");
    }

    return ok(payload?.data ?? []);
  } catch {
    return fail("No se pudo conectar con el servicio de usuarios");
  }
}

export async function updateProfile(
  id: string,
  token: string,
  patch: {
    name?: string;
    zoneId?: number | null;
    photoUrl?: string | null;
  }
): Promise<ApiResponse<User>> {
  try {
    const body: Record<string, string | number | null> = {};

    if (patch.name !== undefined) body.name = patch.name;
    if (patch.zoneId !== undefined) body.zone_id = patch.zoneId;
    if (patch.photoUrl !== undefined) body.photo_url = patch.photoUrl;

    const response = await fetch(`${USERS_API_URL}/users/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const payload =
      ((await response.json().catch(() => null)) as
        | { data?: BackendUser; error?: string }
        | null) ?? null;

    if (!response.ok) {
      return fail(payload?.error || "No se pudo actualizar el perfil");
    }

    if (!payload?.data) {
      return fail("Respuesta inesperada del servidor");
    }

    return ok(mapBackendUser(payload.data));
  } catch {
    return fail("No se pudo conectar con el servicio de usuarios");
  }
}

export async function uploadProfilePhoto(
  id: string,
  token: string,
  photo: File
): Promise<ApiResponse<User>> {
  try {
    const formData = new FormData();
    formData.append("photo", photo);

    const response = await fetch(`${USERS_API_URL}/users/${id}/photo`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const payload =
      ((await response.json().catch(() => null)) as
        | { data?: BackendUser; error?: string }
        | null) ?? null;

    if (!response.ok) {
      return fail(payload?.error || "No se pudo subir la foto");
    }

    if (!payload?.data) {
      return fail("Respuesta inesperada del servidor");
    }

    return ok(mapBackendUser(payload.data));
  } catch {
    return fail("No se pudo conectar con el servicio de usuarios");
  }
}

export async function getReviewsForUser(
  userId: string,
  token?: string
): Promise<ApiResponse<Review[]>> {
  if (token) {
    try {
      const response = await fetch(`${REVIEWS_API_URL}/reviews/user/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload =
        ((await response.json().catch(() => null)) as
          | BackendReview[]
          | { data?: BackendReview[]; detail?: string }
          | null) ?? null;

      if (!response.ok) {
        return fail(
          payload &&
            typeof payload === "object" &&
            !Array.isArray(payload) &&
            payload.detail
            ? payload.detail
            : "No se pudieron obtener las reseñas"
        );
      }

      const list = Array.isArray(payload)
        ? payload
        : Array.isArray((payload as { data?: BackendReview[] })?.data)
          ? (payload as { data: BackendReview[] }).data
          : [];

      return ok(list.map(mapBackendReview));
    } catch {
      return fail("No se pudo conectar con el servicio de reviews");
    }
  }

  await delay(350);
  const reviews = REVIEWS.filter((r) => r.reviewedUserId === userId);
  return ok(reviews);
}

export async function createReview(
  payload: Omit<Review, "id" | "createdAt" | "reviewerId">,
  token?: string
): Promise<ApiResponse<Review>> {
  if (token) {
    try {
      const response = await fetch(`${REVIEWS_API_URL}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          target_user_id: Number(payload.reviewedUserId),
          transaction_id: payload.transactionId,
          rating: payload.rating,
          comment: payload.comment,
        }),
      });

      const payloadJson =
        ((await response.json().catch(() => null)) as
          | { id?: string; detail?: string }
          | null) ?? null;

      if (!response.ok) {
        return fail(payloadJson?.detail || "No se pudo crear la reseña");
      }

      return ok({
        ...payload,
        id: payloadJson?.id ?? `r-${Date.now()}`,
        reviewerId: "",
        createdAt: new Date().toISOString(),
      });
    } catch {
      return fail("No se pudo conectar con el servicio de reviews");
    }
  }

  await delay(600);
  const review: Review = {
    ...payload,
    id: `r${Date.now()}`,
    reviewerId: "",
    createdAt: new Date().toISOString().split("T")[0],
  };
  // In production: POST /api/reviews
  return ok(review);
}

export async function getReviewStatsForUser(
  userId: string,
  token?: string
): Promise<ApiResponse<ReviewStats>> {
  if (token) {
    try {
      const response = await fetch(`${REVIEWS_API_URL}/reviews/stats/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload =
        ((await response.json().catch(() => null)) as
          | BackendReviewStats
          | { detail?: string }
          | null) ?? null;

      if (!response.ok) {
        return fail(
          payload &&
            typeof payload === "object" &&
            "detail" in payload &&
            payload.detail
            ? payload.detail
            : "No se pudieron obtener las estadísticas de reseñas"
        );
      }

      return ok({
        averageRating:
          payload && typeof payload === "object" && "average_rating" in payload
            ? Number(payload.average_rating ?? 0)
            : 0,
        totalReviews:
          payload && typeof payload === "object" && "total_reviews" in payload
            ? Number(payload.total_reviews ?? 0)
            : 0,
      });
    } catch {
      return fail("No se pudo conectar con el servicio de reviews");
    }
  }

  const reviews = REVIEWS.filter((review) => review.reviewedUserId === userId);
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length
      : 0;

  return ok({
    averageRating,
    totalReviews: reviews.length,
  });
}

export async function getNotifications(
  userId: string
): Promise<ApiResponse<Notification[]>> {
  await delay(300);
  const notifications = NOTIFICATIONS.filter((n) => n.userId === userId);
  return ok(notifications);
}

export async function markNotificationRead(
  id: string
): Promise<ApiResponse<boolean>> {
  await delay(200);
  const exists = NOTIFICATIONS.some((n) => n.id === id);
  if (!exists) return fail(`Notification "${id}" not found`);
  // In production: PATCH /api/notifications/:id/read
  return ok(true);
}

export async function markAllNotificationsRead(
  userId: string
): Promise<ApiResponse<boolean>> {
  await delay(300);
  const count = NOTIFICATIONS.filter((n) => n.userId === userId).length;
  if (count === 0) return fail("No notifications found for this user");
  // In production: POST /api/notifications/read-all
  return ok(true);
}

import { mapBackendUser } from "@/api/auth";
import type { ApiResponse, User } from "@/types";

const ORCHESTRATOR_API_URL =
  import.meta.env.VITE_API_URL?.trim() || "http://localhost:8004/api";

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

function ok<T>(data: T): ApiResponse<T> {
  return { ok: true, data };
}

function fail<T>(error: string): ApiResponse<T> {
  return { ok: false, data: null as T, error };
}

export async function createPurchaseOrder(
  payload: {
    bookId: string;
    message: string;
  },
  token: string
): Promise<ApiResponse<{ transactionId?: string; solicitudId?: string }>> {
  try {
    const response = await fetch(`${ORCHESTRATOR_API_URL}/orders/solicitud`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        book_id: Number(payload.bookId),
        message: payload.message,
      }),
    });

    const payloadJson =
      ((await response.json().catch(() => null)) as
        | { data?: { _id?: string; id?: string }; error?: string }
        | null) ?? null;

    if (!response.ok) {
      return fail(payloadJson?.error || "No se pudo procesar la solicitud");
    }

    const solicitudId = payloadJson?.data?._id ?? payloadJson?.data?.id;

    return ok({ solicitudId });
  } catch {
    return fail("No se pudo conectar con el orquestador");
  }
}

export async function acceptOrder(
  solicitudId: string,
  token: string
): Promise<ApiResponse<{ transactionId?: string }>> {
  try {
    const response = await fetch(`${ORCHESTRATOR_API_URL}/orders/${solicitudId}/accept`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const payloadJson =
      ((await response.json().catch(() => null)) as
        | { data?: { transaction_id?: number | string; id?: number | string }; error?: string }
        | null) ?? null;

    if (!response.ok) {
      return fail(payloadJson?.error || "No se pudo aceptar la solicitud");
    }

    const transactionId =
      payloadJson?.data?.transaction_id ?? payloadJson?.data?.id;

    return ok({ transactionId: transactionId != null ? String(transactionId) : undefined });
  } catch {
    return fail("No se pudo conectar con el orquestador");
  }
}

export async function rejectOrder(
  solicitudId: string,
  token: string
): Promise<ApiResponse<void>> {
  try {
    const response = await fetch(`${ORCHESTRATOR_API_URL}/orders/${solicitudId}/reject`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const payloadJson =
      ((await response.json().catch(() => null)) as
        | { error?: string }
        | null) ?? null;

    if (!response.ok) {
      return fail(payloadJson?.error || "No se pudo rechazar la solicitud");
    }

    return ok(undefined as unknown as void);
  } catch {
    return fail("No se pudo conectar con el orquestador");
  }
}

export async function cancelOrder(
  solicitudId: string,
  token: string
): Promise<ApiResponse<void>> {
  try {
    const response = await fetch(`${ORCHESTRATOR_API_URL}/orders/${solicitudId}/cancel`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const payloadJson =
      ((await response.json().catch(() => null)) as
        | { error?: string }
        | null) ?? null;

    if (!response.ok) {
      return fail(payloadJson?.error || "No se pudo cancelar la solicitud");
    }

    return ok(undefined as unknown as void);
  } catch {
    return fail("No se pudo conectar con el orquestador");
  }
}

export async function getSellerProfileByBookId(
  bookId: string,
  token: string
): Promise<ApiResponse<{ userId: string; seller: User }>> {
  try {
    const response = await fetch(
      `${ORCHESTRATOR_API_URL}/orders/book/${bookId}/seller-profile`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const payloadJson =
      ((await response.json().catch(() => null)) as
        | { data?: { user_id?: number | string; seller?: BackendUser }; error?: string }
        | null) ?? null;

    if (!response.ok || !payloadJson?.data?.seller || payloadJson.data.user_id == null) {
      return fail(payloadJson?.error || "No se pudo obtener el perfil del vendedor");
    }

    return ok({
      userId: String(payloadJson.data.user_id),
      seller: mapBackendUser(payloadJson.data.seller),
    });
  } catch {
    return fail("No se pudo conectar con el orquestador");
  }
}

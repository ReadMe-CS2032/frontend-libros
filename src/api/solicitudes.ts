import type { ApiResponse, Conversation, Message, SolicitudStatus } from "@/types";

const SOLICITUDES_API_URL =
  import.meta.env.VITE_SOLICITUDES_API_URL?.trim() || "http://localhost:8003/api";

interface BackendSolicitudMessage {
  from: number;
  text: string;
  date: string;
}

interface BackendSolicitud {
  _id: string;
  book_id: number;
  buyer_id: number;
  seller_id: number;
  status: SolicitudStatus;
  messages: BackendSolicitudMessage[];
  created_at?: string;
}

function ok<T>(data: T, total?: number): ApiResponse<T> {
  return {
    ok: true,
    data,
    ...(total !== undefined && {
      meta: { total, page: 1, pageSize: total, totalPages: 1 },
    }),
  };
}

function fail<T>(error: string): ApiResponse<T> {
  return { ok: false, data: null as T, error };
}

async function requestJson<T>(
  path: string,
  token: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(`${SOLICITUDES_API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | T
    | { detail?: unknown; message?: string }
    | null;

  if (!response.ok) {
    let message = "No se pudo completar la solicitud";
    if (payload && typeof payload === "object") {
      if ("detail" in payload && payload.detail) {
        const d = payload.detail;
        if (typeof d === "string") {
          message = d;
        } else if (Array.isArray(d) && d.length > 0) {
          // FastAPI validation error: detail is an array of {msg, loc, ...}
          const first = d[0] as { msg?: string };
          message = first?.msg ?? JSON.stringify(d[0]);
        } else {
          message = JSON.stringify(d);
        }
      } else if ("message" in payload && typeof payload.message === "string") {
        message = payload.message;
      }
    }
    throw new Error(message);
  }

  return payload as T;
}

function mapSolicitudMessage(
  solicitudId: string,
  message: BackendSolicitudMessage
): Message {
  return {
    id: `${solicitudId}-${message.from}-${message.date}`,
    conversationId: solicitudId,
    senderId: String(message.from),
    text: message.text,
    sentAt: message.date,
    read: true,
  };
}

function mapSolicitudToConversation(
  solicitud: BackendSolicitud,
  currentUserId: string
): Conversation {
  const messages = (solicitud.messages ?? []).map((message) =>
    mapSolicitudMessage(solicitud._id, message)
  );
  const lastMessage = messages[messages.length - 1];
  const buyerId = String(solicitud.buyer_id);
  const sellerId = String(solicitud.seller_id);

  return {
    id: solicitud._id,
    participantIds:
      buyerId === currentUserId
        ? [buyerId, sellerId]
        : [sellerId, buyerId],
    bookId: String(solicitud.book_id),
    lastMessage: lastMessage?.text ?? "",
    lastMessageAt: lastMessage?.sentAt ?? solicitud.created_at ?? "",
    unreadCount: 0,
    messages,
    status: solicitud.status,
    buyerId,
    sellerId,
  };
}

function extractList<T>(raw: T[] | { items?: T[]; data?: T[]; solicitudes?: T[] }): T[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    if (Array.isArray((raw as Record<string, unknown>).items))       return (raw as { items: T[] }).items;
    if (Array.isArray((raw as Record<string, unknown>).data))        return (raw as { data: T[] }).data;
    if (Array.isArray((raw as Record<string, unknown>).solicitudes)) return (raw as { solicitudes: T[] }).solicitudes;
  }
  return [];
}

export async function getSolicitudesByUser(
  userId: string,
  token: string
): Promise<ApiResponse<Conversation[]>> {
  try {
    const raw = await requestJson<BackendSolicitud[] | Record<string, unknown>>(
      `/solicitudes/user/${userId}?page=1&size=100`,
      token
    );
    const solicitudes = extractList(raw as BackendSolicitud[] | { items?: BackendSolicitud[]; data?: BackendSolicitud[]; solicitudes?: BackendSolicitud[] });
    const mapped = solicitudes
      .map((solicitud) => mapSolicitudToConversation(solicitud, userId))
      .sort((a, b) => {
        const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return tb - ta;
      });
    return ok(mapped, mapped.length);
  } catch (error) {
    return fail(
      error instanceof Error
        ? error.message
        : "No se pudieron obtener las conversaciones"
    );
  }
}

export async function getSolicitudById(
  id: string,
  currentUserId: string,
  token: string
): Promise<ApiResponse<Conversation>> {
  try {
    const solicitud = await requestJson<BackendSolicitud>(`/solicitudes/${id}`, token);
    return ok(mapSolicitudToConversation(solicitud, currentUserId));
  } catch (error) {
    return fail(
      error instanceof Error
        ? error.message
        : "No se pudo obtener la conversación"
    );
  }
}

export async function createSolicitud(
  payload: {
    bookId: string;
    sellerId: string;
    initialMessage: string;
  },
  token: string
): Promise<ApiResponse<{ id: string }>> {
  try {
    const response = await requestJson<{ id: string; message: string }>(
      "/solicitudes",
      token,
      {
        method: "POST",
        body: JSON.stringify({
          book_id: Number(payload.bookId),
          seller_id: Number(payload.sellerId),
          initial_message: payload.initialMessage,
        }),
      }
    );

    return ok({ id: response.id });
  } catch (error) {
    return fail(
      error instanceof Error
        ? error.message
        : "No se pudo crear la solicitud"
    );
  }
}

export async function sendSolicitudMessage(
  id: string,
  text: string,
  token: string
): Promise<ApiResponse<boolean>> {
  try {
    await requestJson<{ message: string }>(`/solicitudes/${id}/messages`, token, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
    return ok(true);
  } catch (error) {
    return fail(
      error instanceof Error
        ? error.message
        : "No se pudo enviar el mensaje"
    );
  }
}

export async function updateSolicitudStatus(
  id: string,
  status: SolicitudStatus,
  token: string
): Promise<ApiResponse<boolean>> {
  try {
    await requestJson<{ message: string }>(`/solicitudes/${id}/status`, token, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
    return ok(true);
  } catch (error) {
    return fail(
      error instanceof Error
        ? error.message
        : "No se pudo actualizar el estado"
    );
  }
}

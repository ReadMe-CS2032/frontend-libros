import type {
  ApiResponse,
  Transaction,
} from "@/types";

const TRANSACTIONS_API_URL =
  import.meta.env.VITE_API_URL?.trim() || "http://localhost:8006/api";

interface BackendTransaction {
  id: number;
  book_id: number;
  buyer_id: number;
  seller_id: number;
  created_at?: string | null;
}

interface BackendTransactionPayload {
  book_id: number;
  buyer_id: number;
  seller_id: number;
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
  const response = await fetch(`${TRANSACTIONS_API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | T
    | { message?: string }
    | null;

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "message" in payload &&
      payload.message
        ? payload.message
        : "No se pudo completar la solicitud";
    throw new Error(message);
  }

  return payload as T;
}

function mapBackendTransaction(transaction: BackendTransaction): Transaction {
  const createdAt = transaction.created_at ?? "";
  return {
    id: String(transaction.id),
    bookId: String(transaction.book_id),
    sellerId: String(transaction.seller_id),
    buyerId: String(transaction.buyer_id),
    mode: "",
    status: "completed",
    agreedPrice: undefined,
    createdAt,
    updatedAt: createdAt,
  };
}

export async function getTransactions(
  token: string
): Promise<ApiResponse<Transaction[]>> {
  try {
    const transactions = await requestJson<BackendTransaction[]>(
      "/transactions",
      token
    );
    const mapped = transactions.map(mapBackendTransaction);
    return ok(mapped, mapped.length);
  } catch (error) {
    return fail(
      error instanceof Error
        ? error.message
        : "No se pudieron obtener las transacciones"
    );
  }
}

export async function getTransactionsByUser(
  userId: string,
  token: string
): Promise<ApiResponse<Transaction[]>> {
  try {
    const transactions = await requestJson<BackendTransaction[]>(
      `/transactions/user/${userId}`,
      token
    );
    const mapped = transactions.map(mapBackendTransaction);
    return ok(mapped, mapped.length);
  } catch (error) {
    return fail(
      error instanceof Error
        ? error.message
        : "No se pudieron obtener las transacciones del usuario"
    );
  }
}

export async function getTransactionById(
  id: string,
  token: string
): Promise<ApiResponse<Transaction>> {
  try {
    const transaction = await requestJson<BackendTransaction>(
      `/transactions/${id}`,
      token
    );
    return ok(mapBackendTransaction(transaction));
  } catch (error) {
    return fail(
      error instanceof Error
        ? error.message
        : "No se pudo obtener la transacción"
    );
  }
}

export async function createTransaction(
  payload: {
    bookId: string;
    buyerId: string;
    sellerId: string;
  },
  token: string
): Promise<ApiResponse<Transaction>> {
  try {
    const body: BackendTransactionPayload = {
      book_id: Number(payload.bookId),
      buyer_id: Number(payload.buyerId),
      seller_id: Number(payload.sellerId),
    };

    const transaction = await requestJson<BackendTransaction>(
      "/transactions",
      token,
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );

    return ok(mapBackendTransaction(transaction));
  } catch (error) {
    return fail(
      error instanceof Error
        ? error.message
        : "No se pudo registrar la transacción"
    );
  }
}

export async function updateTransactionStatus(): Promise<ApiResponse<Transaction>> {
  return fail("El backend actual no expone un endpoint para actualizar estados");
}

export async function getTransactionsByBook(
  bookId: string,
  token: string
): Promise<ApiResponse<Transaction[]>> {
  try {
    const raw = await fetch(`${TRANSACTIONS_API_URL}/transactions/book/${bookId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = (await raw.json().catch(() => null)) as
      | BackendTransaction[]
      | { data?: BackendTransaction[] }
      | null;

    if (!raw.ok) return fail("No se pudieron obtener las transacciones del libro");

    const list = Array.isArray(payload)
      ? payload
      : Array.isArray((payload as { data?: BackendTransaction[] })?.data)
        ? (payload as { data: BackendTransaction[] }).data
        : [];

    return ok(list.map(mapBackendTransaction), list.length);
  } catch {
    return fail("No se pudo conectar con el servicio de transacciones");
  }
}


import type { ApiResponse, Category } from "@/types";

const BOOKS_API_URL =
  import.meta.env.VITE_BOOKS_API_URL?.trim() || "http://localhost:8002/api";


interface BackendCategory {
  id: number;
  name: string;
  description?: string | null;
  createdAt?: string | null;
  active?: boolean | null;
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

function mapCategory(category: BackendCategory): Category {
  return {
    id: category.id,
    name: category.name ?? "",
    description: category.description ?? "",
    createdAt: category.createdAt ?? "",
    active: category.active ?? true,
  };
}

async function requestJson<T>(
  path: string,
  token: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(`${BOOKS_API_URL}${path}`, {
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

export async function getCategories(token: string): Promise<ApiResponse<Category[]>> {
  try {
    const raw = await requestJson<BackendCategory[] | { content?: BackendCategory[] }>("/categories?page=1&size=100", token);
    const list: BackendCategory[] = Array.isArray(raw)
      ? raw
      : (Array.isArray(raw?.content) ? raw.content : []);
    const mapped = list.map(mapCategory);
    return ok(mapped, mapped.length);
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "No se pudieron obtener las categorias"
    );
  }
}

export async function getCategoryById(
  id: number,
  token: string
): Promise<ApiResponse<Category>> {
  try {
    const category = await requestJson<BackendCategory>(`/categories/${id}`, token);
    return ok(mapCategory(category));
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "No se pudo obtener la categoria"
    );
  }
}

export async function createCategory(
  payload: Pick<Category, "name" | "description">,
  token: string
): Promise<ApiResponse<Category>> {
  try {
    const category = await requestJson<BackendCategory>("/categories", token, {
      method: "POST",
      body: JSON.stringify({
        name: payload.name,
        description: payload.description || "",
      }),
    });
    return ok(mapCategory(category));
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "No se pudo crear la categoria"
    );
  }
}

export async function updateCategory(
  id: number,
  payload: Pick<Category, "name" | "description">,
  token: string
): Promise<ApiResponse<Category>> {
  try {
    const category = await requestJson<BackendCategory>(`/categories/${id}`, token, {
      method: "PUT",
      body: JSON.stringify({
        name: payload.name,
        description: payload.description || "",
      }),
    });
    return ok(mapCategory(category));
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "No se pudo actualizar la categoria"
    );
  }
}

export async function deleteCategory(
  id: number,
  token: string
): Promise<ApiResponse<boolean>> {
  try {
    await requestJson<void>(`/categories/${id}`, token, {
      method: "DELETE",
    });
    return ok(true);
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "No se pudo eliminar la categoria"
    );
  }
}

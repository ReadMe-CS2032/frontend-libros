import type { ApiResponse, Book, BookFilters, BookMode, BookCondition } from "@/types";

const BOOKS_API_URL =
  import.meta.env.VITE_API_URL?.trim() || "http://localhost:8002/api";
const LOCAL_BOOK_COVER_PREFIX = "book-local-cover:";


interface BackendCategory {
  id: number;
  name: string;
  description?: string | null;
}

interface BackendBook {
  id: number;
  user_id: number;
  title: string;
  author: string;
  category?: BackendCategory | null;
  description?: string | null;
  photo_url?: string | null;
  price?: number | null;
  available?: boolean | null;
  active?: boolean | null;
  created_at?: string | null;
}

interface BackendBookPayload {
  title: string;
  author: string;
  user_id?: number;
  description?: string;
  photo_url?: string;
  price?: number;
  category_id?: number;
  available?: boolean;
  active?: boolean;
}

function getLocalBookCover(bookId: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(`${LOCAL_BOOK_COVER_PREFIX}${bookId}`);
}

export function saveLocalBookCover(bookId: string, coverDataUrl: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${LOCAL_BOOK_COVER_PREFIX}${bookId}`, coverDataUrl);
}

export function removeLocalBookCover(bookId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(`${LOCAL_BOOK_COVER_PREFIX}${bookId}`);
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
  const response = await fetch(`${BOOKS_API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const text = await response.text().catch(() => "");
  let payload: T | { message?: string; error?: string; errors?: unknown } | null = null;
  try { payload = JSON.parse(text) as typeof payload; } catch { /* not JSON */ }

  if (!response.ok) {
    const p = payload as Record<string, unknown> | null;
    const message =
      (p?.message as string) ||
      (p?.error as string) ||
      (typeof p?.errors === "string" ? p.errors : "") ||
      text.slice(0, 200) ||
      `Error ${response.status}`;
    console.error(`[books API] ${response.status} ${path}`, text);
    throw new Error(message);
  }

  return payload as T;
}

function mapBackendBook(book: BackendBook): Book {
  const hasPrice = typeof book.price === "number" && !Number.isNaN(book.price);
  const mode: BookMode = hasPrice ? "sell" : "exchange";
  const bookId = String(book.id);
  const localCover = getLocalBookCover(bookId);

  return {
    id: bookId,
    title: book.title ?? "",
    author: book.author ?? "",
    cover: localCover || book.photo_url || "",
    description: book.description ?? "",
    genre: book.category?.name ?? "",
    year: undefined,
    language: "",
    condition: "" as BookCondition,
    mode,
    price: hasPrice ? Number(book.price) : undefined,
    available: book.available ?? true,
    ownerId: String(book.user_id),
    location: "",
    createdAt: book.created_at ?? "",
    isFeatured: false,
  };
}

function sortBooks(books: Book[], sortBy: BookFilters["sortBy"]): Book[] {
  const copy = [...books];
  switch (sortBy) {
    case "price-asc":
      return copy.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    case "price-desc":
      return copy.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    case "recent":
    default:
      return copy.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
  }
}

type PageResponse<T> = { content: T[] } | { data: T[] } | T[];

interface BackendPaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  size: number;
  total_pages: number;
}

function extractList<T>(raw: PageResponse<T>): T[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    if (Array.isArray(r.data))    return r.data as T[];
    if (Array.isArray(r.content)) return r.content as T[];
  }
  return [];
}

export async function getCategories(
  token: string
): Promise<ApiResponse<BackendCategory[]>> {
  try {
    const raw = await requestJson<PageResponse<BackendCategory>>("/categories", token);
    const categories = extractList(raw);
    return ok(categories, categories.length);
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "No se pudieron obtener las categorías"
    );
  }
}

export async function getBooks(
  token: string,
  filters: BookFilters = {},
  page = 1,
  pageSize = 20,
  categoryId?: number
): Promise<ApiResponse<Book[]>> {
  try {
    const searchParam = filters.query?.trim()
      ? `&search=${encodeURIComponent(filters.query.trim())}`
      : "";
    const categoryParam = categoryId ? `&category=${categoryId}` : "";

    const raw = await requestJson<BackendPaginatedResponse<BackendBook>>(
      `/books?page=${page}&size=${pageSize}${searchParam}${categoryParam}`,
      token
    );

    const books = Array.isArray(raw.data) ? raw.data : extractList(raw as unknown as PageResponse<BackendBook>);
    const total = raw.total ?? books.length;
    const totalPages = raw.total_pages ?? 1;

    const mapped = books.map(mapBackendBook);
    const sorted = sortBooks(mapped, filters.sortBy);

    return {
      ok: true,
      data: sorted,
      meta: { total, page, pageSize, totalPages },
    };
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "No se pudieron obtener los libros"
    );
  }
}

export async function getBookById(
  id: string,
  token: string
): Promise<ApiResponse<Book>> {
  try {
    const book = await requestJson<BackendBook>(`/books/${id}`, token);
    return ok(mapBackendBook(book));
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "No se pudo obtener el libro"
    );
  }
}

export async function getBooksByOwner(
  ownerId: string,
  token: string
): Promise<ApiResponse<Book[]>> {
  try {
    const raw = await requestJson<PageResponse<BackendBook>>(`/books/user/${ownerId}?page=1&size=100`, token);
    const books = extractList(raw);
    const mapped = books.map(mapBackendBook);
    return ok(mapped, mapped.length);
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "No se pudieron obtener los libros del usuario"
    );
  }
}

export async function createBook(
  payload: Omit<Book, "id" | "createdAt">,
  token: string
): Promise<ApiResponse<Book>> {
  try {
    const categoriesResponse = await getCategories(token);
    const categoryId = categoriesResponse.ok
      ? categoriesResponse.data.find((c) => c.name === payload.genre)?.id
      : undefined;

    const body: BackendBookPayload = {
      title: payload.title,
      author: payload.author,
      ...(payload.ownerId ? { user_id: Number(payload.ownerId) } : {}),
      ...(payload.description ? { description: payload.description } : {}),
      ...(payload.cover ? { photo_url: payload.cover } : {}),
      ...(payload.price !== undefined ? { price: payload.price } : {}),
      available: true,
      active: true,
      ...(categoryId !== undefined ? { category_id: categoryId } : {}),
    };

    const book = await requestJson<BackendBook>("/books", token, {
      method: "POST",
      body: JSON.stringify(body),
    });

    return ok(mapBackendBook(book));
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "No se pudo crear el libro"
    );
  }
}

export async function updateBook(
  id: string,
  patch: Partial<Omit<Book, "id" | "ownerId" | "createdAt">>,
  token: string
): Promise<ApiResponse<Book>> {
  try {
    const [categoriesResponse, currentBookResponse] = await Promise.all([
      getCategories(token),
      getBookById(id, token),
    ]);

    if (!currentBookResponse.ok) {
      return fail(currentBookResponse.error || "No se pudo obtener el libro actual");
    }

    const mergedBook = {
      ...currentBookResponse.data,
      ...patch,
    };

    const categoryId = categoriesResponse.ok
      ? categoriesResponse.data.find((category) => category.name === mergedBook.genre)?.id
      : undefined;

    const body: BackendBookPayload = {
      title: mergedBook.title,
      author: mergedBook.author,
      description: mergedBook.description,
      photo_url: mergedBook.cover,
      price: mergedBook.price,
      available: mergedBook.available ?? true,
      category_id: categoryId,
    };

    const book = await requestJson<BackendBook>(`/books/${id}`, token, {
      method: "PUT",
      body: JSON.stringify(body),
    });

    return ok(mapBackendBook(book));
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "No se pudo actualizar el libro"
    );
  }
}

export async function deleteBook(
  id: string,
  token: string
): Promise<ApiResponse<boolean>> {
  try {
    await requestJson<void>(`/books/${id}`, token, {
      method: "DELETE",
    });
    removeLocalBookCover(id);
    return ok(true);
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "No se pudo eliminar el libro"
    );
  }
}

export async function uploadBookPhoto(
  id: string,
  token: string,
  photo: File
): Promise<ApiResponse<Book>> {
  try {
    const formData = new FormData();
    formData.append("photo", photo);

    const response = await fetch(`${BOOKS_API_URL}/books/${id}/photo`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const payload = ((await response.json().catch(() => null)) as
      | BackendBook
      | { error?: string }
      | null) ?? null;

    if (!response.ok) {
      return fail((payload as { error?: string })?.error || "No se pudo subir la foto de portada");
    }

    return ok(mapBackendBook(payload as BackendBook));
  } catch {
    return fail("No se pudo conectar con el servicio de libros");
  }
}

export async function updateBookAvailability(
  id: string,
  available: boolean,
  token: string
): Promise<ApiResponse<Book>> {
  try {
    const book = await requestJson<BackendBook>(`/books/${id}/availability`, token, {
      method: "PUT",
      body: JSON.stringify({ available }),
    });

    return ok(mapBackendBook(book));
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "No se pudo actualizar la disponibilidad"
    );
  }
}

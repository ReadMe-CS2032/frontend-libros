// ─── Enums ────────────────────────────────────────────────────────────────────

export type BookCondition = "" | "new" | "like-new" | "good" | "acceptable" | "poor";

export type BookMode = "" | "sell" | "exchange" | "donate" | "loan";

export type TransactionStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "completed"
  | "cancelled";

export type NotificationType =
  | "message"
  | "transaction"
  | "review"
  | "system";

// ─── Core entities ────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  zoneId?: number | null;
  avatar: string;
  location: string;
  bio: string;
  rating: number;
  reviewCount: number;
  booksPosted: number;
  joinedAt: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  cover: string;
  description: string;
  genre: string;
  year?: number;
  language: string;
  condition: BookCondition;
  mode: BookMode;
  price?: number;
  available?: boolean;
  ownerId: string;
  location: string;
  createdAt: string;
  isFeatured?: boolean;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  createdAt?: string;
  active?: boolean;
}

export interface Transaction {
  id: string;
  bookId: string;
  sellerId: string;
  buyerId: string;
  mode: BookMode;
  status: TransactionStatus;
  offeredBookId?: string;
  agreedPrice?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  sentAt: string;
  read: boolean;
}

export type SolicitudStatus = "pendiente" | "aceptada" | "rechazada" | "cancelada" | "completada";

export interface Conversation {
  id: string;
  participantIds: [string, string];
  bookId: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  messages: Message[];
  status?: SolicitudStatus;
  buyerId?: string;
  sellerId?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  linkTo?: string;
}

export interface Review {
  id: string;
  reviewerId: string;
  reviewedUserId: string;
  transactionId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export interface StatsData {
  month: string;
  transactions: number;
  booksListed: number;
  revenue: number;
}

// ─── Filters ─────────────────────────────────────────────────────────────────

export interface BookFilters {
  query?: string;
  genre?: string;
  condition?: BookCondition;
  mode?: BookMode;
  minPrice?: number;
  maxPrice?: number;
  location?: string;
  language?: string;
  sortBy?: "recent" | "price-asc" | "price-desc" | "rating";
}

// ─── Generic API wrapper ──────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  ok: boolean;
  error?: string;
  meta?: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

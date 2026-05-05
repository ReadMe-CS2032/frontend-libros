import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { BookCondition, BookMode } from "@/types";

//Classnames

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

//Formatting

const priceFormatter = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatPrice(amount: number): string {
  return priceFormatter.format(amount);
}

const dateFormatter = new Intl.DateTimeFormat("es-PE", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatDate(dateString: string): string {
  return dateFormatter.format(new Date(dateString));
}

export function formatRelativeTime(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSecs < 60) return "justo ahora";
  if (diffMins < 60) return `hace ${diffMins} min`;
  if (diffHours < 24) return `hace ${diffHours} h`;
  if (diffDays === 1) return "ayer";
  if (diffDays < 7) return `hace ${diffDays} días`;
  if (diffWeeks === 1) return "hace 1 semana";
  if (diffWeeks < 5) return `hace ${diffWeeks} semanas`;
  if (diffMonths === 1) return "hace 1 mes";
  if (diffMonths < 12) return `hace ${diffMonths} meses`;
  if (diffYears === 1) return "hace 1 año";
  return `hace ${diffYears} años`;
}

//String helpers
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "…";
}

//Book condition
export const CONDITION_LABELS: Record<BookCondition, string> = {
  "": "",
  new: "Nuevo",
  "like-new": "Como nuevo",
  good: "Bueno",
  acceptable: "Aceptable",
  poor: "Deteriorado",
};

export const CONDITION_COLORS: Record<BookCondition, string> = {
  "": "",
  new: "bg-emerald-100 text-emerald-800",
  "like-new": "bg-teal-100 text-teal-800",
  good: "bg-sky-100 text-sky-800",
  acceptable: "bg-amber-100 text-amber-800",
  poor: "bg-red-100 text-red-800",
};

//Book mode
export const MODE_LABELS: Record<BookMode, string> = {
  "": "",
  sell:     "Venta",
  exchange: "Intercambio",
  donate:   "Donación",
  loan:     "Préstamo",
};

export const MODE_COLORS: Record<BookMode, string> = {
  "": "",
  sell:     "bg-violet-100 text-violet-800",
  exchange: "bg-blue-100 text-blue-800",
  donate:   "bg-green-100 text-green-800",
  loan:     "bg-orange-100 text-orange-800",
};

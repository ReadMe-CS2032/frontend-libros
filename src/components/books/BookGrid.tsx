import { AlertTriangle, BookOpen, RefreshCw } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/shared/LoadingCard";
import { cn } from "@/lib/utils";
import type { Book } from "@/types";
import BookCard, { type BookOwner } from "./BookCard";

type BookGridColumns = 2 | 3 | 4 | 5;

export interface BookGridProps {
  books?: Book[];
  ownersById?: Record<string, BookOwner | undefined>;
  columns?: BookGridColumns;
  loading?: boolean;
  skeletonCount?: number;
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  className?: string;
  itemClassName?: string;
  getBookHref?: (book: Book) => string;
  getProfileHref?: (book: Book, owner?: BookOwner) => string | undefined;
  initialSavedIds?: string[];
  onSavedChange?: (saved: boolean, book: Book) => void;
}

const GRID_COLUMNS: Record<BookGridColumns, string> = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  5: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
};

interface BookGridSkeletonProps {
  columns: BookGridColumns;
  count: number;
}

function BookGridSkeleton({ columns, count }: BookGridSkeletonProps) {
  return (
    <div className={cn("grid gap-4 sm:gap-5", GRID_COLUMNS[columns])}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-[24px] border border-border/80 bg-white p-3 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.2)] sm:p-4"
        >
          <Skeleton className="aspect-[2/3] w-full rounded-[20px]" />
          <div className="mt-4 flex gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <div className="mt-4 space-y-2">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-2xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function BookGrid({
  books = [],
  ownersById,
  columns = 4,
  loading = false,
  skeletonCount = 8,
  error,
  onRetry,
  emptyTitle = "No hay libros para mostrar",
  emptyDescription = "Cuando se publiquen nuevos libros aparecerán aquí.",
  emptyAction,
  className,
  itemClassName,
  getBookHref,
  getProfileHref,
  initialSavedIds,
  onSavedChange,
}: BookGridProps) {
  if (loading) {
    return <BookGridSkeleton columns={columns} count={skeletonCount} />;
  }

  if (error) {
    return (
      <div className="rounded-[28px] border border-red-100 bg-white p-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.2)] sm:p-5">
        <EmptyState
          icon={AlertTriangle}
          title="No se pudo cargar la colección"
          description={error}
          action={onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3.5 py-2 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-100"
            >
              <RefreshCw className="h-4 w-4" />
              Reintentar
            </button>
          ) : undefined}
          className="rounded-[24px] border border-dashed border-red-100 bg-red-50/40 py-14"
        />
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div className="rounded-[28px] border border-border/70 bg-white p-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.2)] sm:p-5">
        <EmptyState
          icon={BookOpen}
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
          className="rounded-[24px] border border-dashed border-border bg-muted/20 py-14"
        />
      </div>
    );
  }

  return (
    <div className={cn("grid gap-4 sm:gap-5", GRID_COLUMNS[columns], className)}>
      {books.map((book) => {
        const owner = ownersById?.[book.ownerId];
        const profileHref = getProfileHref?.(book, owner) ?? owner?.profileHref;

        return (
          <BookCard
            key={book.id}
            book={book}
            owner={owner ? { ...owner, profileHref } : undefined}
            href={getBookHref?.(book)}
            initialSaved={initialSavedIds?.includes(book.id)}
            onSavedChange={onSavedChange}
            className={itemClassName}
          />
        );
      })}
    </div>
  );
}

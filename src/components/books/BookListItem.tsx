import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, MapPin } from "lucide-react";
import Avatar from "@/components/shared/Avatar";
import { ConditionBadge, ModeBadge } from "@/components/shared/Badge";
import BookCoverPlaceholder from "@/components/shared/BookCoverPlaceholder";
import { cn, formatPrice, formatRelativeTime, truncate } from "@/lib/utils";
import type { Book } from "@/types";
import type { BookOwner } from "./BookCard";

export interface BookListItemProps {
  book: Book;
  owner?: BookOwner;
  href?: string;
  index?: number;
  saved?: boolean;
  initialSaved?: boolean;
  onSavedChange?: (saved: boolean, book: Book) => void;
  className?: string;
  showOwner?: boolean;
}

function getBookMeta(book: Book) {
  if (book.mode === "sell") {
    return book.price != null ? formatPrice(book.price) : "Consultar";
  }

  if (book.mode === "exchange") {
    return "Intercambio";
  }

  return "Donación";
}

export default function BookListItem({
  book,
  owner,
  href,
  index,
  saved,
  initialSaved = false,
  onSavedChange,
  className,
  showOwner = true,
}: BookListItemProps) {
  const [internalSaved, setInternalSaved] = useState(initialSaved);
  const isSaved = saved ?? internalSaved;
  const bookHref = href ?? `/libro/${book.id}`;
  const profileHref = owner?.profileHref ?? (owner ? "/perfil" : undefined);

  const handleToggleSaved = () => {
    const nextValue = !isSaved;

    if (saved == null) {
      setInternalSaved(nextValue);
    }

    onSavedChange?.(nextValue, book);
  };

  return (
    <article
      className={cn(
        "group flex items-center gap-3 rounded-[22px] border border-border/70 bg-white/90 p-3.5",
        "shadow-[0_14px_28px_-28px_rgba(15,23,42,0.25)] transition-all duration-200",
        "hover:border-violet-200/80 hover:bg-violet-50/[0.3] hover:shadow-[0_18px_32px_-28px_rgba(15,23,42,0.28)]",
        className
      )}
    >
      {index != null && (
        <span className="w-6 flex-shrink-0 text-center text-[11px] font-semibold tracking-[0.18em] text-muted-foreground/45">
          {String(index + 1).padStart(2, "0")}
        </span>
      )}

      <Link
        to={bookHref}
        className="relative block h-[88px] w-[62px] flex-shrink-0 overflow-hidden rounded-[16px] border border-border/70 bg-muted"
      >
        {book.cover ? (
          <img
            src={book.cover}
            alt={book.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <BookCoverPlaceholder title={book.title} />
        )}
      </Link>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <Link
              to={bookHref}
              className="block truncate text-sm font-semibold leading-tight text-foreground transition-colors hover:text-violet-700"
            >
              {book.title}
            </Link>
            <p className="truncate text-xs text-muted-foreground">{book.author}</p>
          </div>

          <button
            type="button"
            aria-pressed={isSaved}
            aria-label={isSaved ? "Quitar de guardados" : "Guardar libro"}
            onClick={handleToggleSaved}
            className={cn(
              "inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border",
              "border-border/70 bg-white text-muted-foreground shadow-sm transition-all duration-200",
              "hover:scale-105 hover:border-violet-200 hover:text-violet-700 active:scale-95",
              isSaved && "border-violet-200 bg-violet-50 text-violet-700"
            )}
          >
            <Heart className={cn("h-4 w-4", isSaved && "fill-current")} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {book.mode && <ModeBadge mode={book.mode} size="sm" />}
          {book.condition && <ConditionBadge condition={book.condition} size="sm" />}
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          {truncate(book.description, 110)}
        </p>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            {book.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {book.location}
              </span>
            )}
            {book.createdAt && <span>{formatRelativeTime(book.createdAt)}</span>}
          </div>

          <span className="text-sm font-semibold text-foreground">{getBookMeta(book)}</span>
        </div>

        {showOwner && owner && (
          profileHref ? (
            <Link to={profileHref} className="inline-flex max-w-full items-center gap-2.5 rounded-full border border-border/60 bg-muted/30 px-2.5 py-1.5 transition-colors hover:text-violet-700">
              <Avatar src={owner.avatar} name={owner.name} size="xs" />
              <span className="truncate text-xs font-medium text-foreground">{owner.name}</span>
            </Link>
          ) : (
            <div className="inline-flex max-w-full items-center gap-2.5 rounded-full border border-border/60 bg-muted/30 px-2.5 py-1.5">
              <Avatar src={owner.avatar} name={owner.name} size="xs" />
              <span className="truncate text-xs font-medium text-foreground">{owner.name}</span>
            </div>
          )
        )}
      </div>
    </article>
  );
}

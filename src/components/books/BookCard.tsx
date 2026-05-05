import { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Heart, MapPin } from "lucide-react";
import Avatar from "@/components/shared/Avatar";
import BookCoverPlaceholder from "@/components/shared/BookCoverPlaceholder";
import { ConditionBadge, ModeBadge } from "@/components/shared/Badge";
import { cn, formatPrice, formatRelativeTime } from "@/lib/utils";
import type { Book, User } from "@/types";

export type BookOwner = Pick<User, "id" | "name" | "avatar" | "location" | "rating"> & {
  profileHref?: string;
};

export interface BookCardProps {
  book: Book;
  owner?: BookOwner;
  href?: string;
  saved?: boolean;
  initialSaved?: boolean;
  onSavedChange?: (saved: boolean, book: Book) => void;
  className?: string;
  showOwner?: boolean;
  showLocation?: boolean;
}

function getBookPriceLabel(book: Book) {
  if (book.mode === "exchange") {
    return "Intercambio";
  }

  if (book.mode === "donate") {
    return "Donación";
  }

  return book.price != null ? formatPrice(book.price) : "Consultar";
}

export default function BookCard({
  book,
  owner,
  href,
  saved,
  initialSaved = false,
  onSavedChange,
  className,
  showOwner = true,
  showLocation = true,
}: BookCardProps) {
  const [internalSaved, setInternalSaved] = useState(initialSaved);
  const isSaved = saved ?? internalSaved;
  const bookHref = href ?? `/libro/${book.id}`;
  const profileHref = owner?.profileHref ?? (owner ? `/perfil` : undefined);

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
        "group relative overflow-hidden rounded-[24px] border border-border/80",
        "bg-gradient-to-b from-white via-white to-violet-50/[0.22]",
        "shadow-[0_18px_40px_-34px_rgba(15,23,42,0.35)] transition-all duration-300",
        "hover:-translate-y-1 hover:shadow-[0_26px_50px_-30px_rgba(15,23,42,0.28)]",
        className
      )}
    >
      <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-violet-200/70 to-transparent" />

      <div className="p-3 sm:p-4">
        <div className="relative overflow-hidden rounded-[20px] border border-border/70 bg-muted/50">
          <Link to={bookHref} className="block">
            <div className="relative aspect-[2/3] overflow-hidden">
              {book.cover ? (
                <img
                  src={book.cover}
                  alt={book.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.045]"
                />
              ) : (
                <BookCoverPlaceholder title={book.title} />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/24 via-transparent to-white/10" />
            </div>
          </Link>

          <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1.5">
            <ModeBadge mode={book.mode} size="sm" className="shadow-sm backdrop-blur-sm" />
            <ConditionBadge condition={book.condition} size="sm" className="shadow-sm backdrop-blur-sm" />
          </div>

          <button
            type="button"
            aria-pressed={isSaved}
            aria-label={isSaved ? "Quitar de guardados" : "Guardar libro"}
            onClick={handleToggleSaved}
            className={cn(
              "absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full",
              "border border-white/80 bg-white/92 text-slate-500 shadow-lg shadow-slate-950/10 backdrop-blur-md",
              "transition-all duration-200 hover:scale-105 hover:text-violet-700 active:scale-95",
              isSaved && "border-violet-200 bg-violet-50 text-violet-700"
            )}
          >
            <Heart className={cn("h-4 w-4", isSaved && "fill-current")} />
          </button>
        </div>

        <div className="space-y-4 px-1 pb-1 pt-4">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <Link
                  to={bookHref}
                  className="line-clamp-2 text-[15px] font-semibold leading-snug text-foreground transition-colors hover:text-violet-700"
                >
                  {book.title}
                </Link>
                <p className="truncate text-sm text-muted-foreground">{book.author}</p>
              </div>

              <div className="rounded-2xl border border-violet-100/80 bg-violet-50/70 px-3 py-2 text-right shadow-sm shadow-violet-100/40">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-violet-500/80">
                  {book.mode === "sell" ? "Precio" : "Modo"}
                </p>
                <p className="mt-0.5 text-sm font-semibold text-violet-900">
                  {getBookPriceLabel(book)}
                </p>
              </div>
            </div>

            {showLocation && (
              <div className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border/70 bg-muted/35 px-2.5 py-1 text-[11px] text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{book.location}</span>
              </div>
            )}
          </div>

          {showOwner && owner && (
            <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-3.5">
              {profileHref ? (
                <Link
                  to={profileHref}
                  className="flex min-w-0 items-center gap-3 rounded-2xl transition-colors hover:text-violet-700"
                >
                  <Avatar src={owner.avatar} name={owner.name} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{owner.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {owner.location || "Perfil del lector"}
                    </p>
                  </div>
                </Link>
              ) : (
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar src={owner.avatar} name={owner.name} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{owner.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {owner.location || "Perfil del lector"}
                    </p>
                  </div>
                </div>
              )}

              <div className="text-right">
                <p className="text-[11px] text-muted-foreground">Publicado</p>
                <p className="text-xs font-medium text-foreground">{formatRelativeTime(book.createdAt)}</p>
              </div>
            </div>
          )}

          {!showOwner && (
            <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                {book.genre}
              </span>
              <span>{formatRelativeTime(book.createdAt)}</span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

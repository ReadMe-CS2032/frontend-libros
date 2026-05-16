import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ShieldCheck, MapPin, BookOpen, Pencil,
  BookMarked, ArrowLeftRight, ShoppingBag,
  MessageSquare, Tag, Repeat2, Gift,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { getBooksByOwner } from "@/api/books";
import { getTransactionsByUser } from "@/api/transactions";
import { getCurrentUser, getReviewStatsForUser, getReviewsForUser, getUserById } from "@/api/users";
import type { User, Book, Transaction } from "@/types";
import StarRating    from "@/components/shared/StarRating";
import Avatar        from "@/components/shared/Avatar";
import EmptyState    from "@/components/shared/EmptyState";
import BookCoverPlaceholder from "@/components/shared/BookCoverPlaceholder";
import {
  cn,
  CONDITION_LABELS,
  CONDITION_COLORS,
  MODE_LABELS,
  MODE_COLORS,
  formatPrice,
  formatRelativeTime,
} from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProfileTab      = "books" | "reviews";
type ReviewWithUser  = import("@/types").Review & { reviewer: User | undefined };

// ─── Mode icon map ────────────────────────────────────────────────────────────

const MODE_ICONS: Record<string, React.ElementType> = {
  sell:     Tag,
  exchange: Repeat2,
  donate:   Gift,
};

function buildMissingProfile(profileId?: string, currentUser?: User | null): User {
  if (profileId && currentUser?.id === profileId) {
    return currentUser;
  }

  return {
    id: profileId ?? "",
    name: profileId ? `Usuario ${profileId}` : "Usuario no disponible",
    email: profileId ? `usuario${profileId}@pendiente.local` : "usuario@pendiente.local",
    zoneId: null,
    avatar: "",
    location: "Ubicacion pendiente",
    bio: "Perfil no disponible.",
    rating: 0,
    reviewCount: 0,
    booksPosted: 0,
    joinedAt: "",
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { id }      = useParams<{ id: string }>();
  const currentUser = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const setUser = useAuthStore((s) => s.setUser);

  const profileId    = id ?? currentUser?.id;
  const isOwnProfile = profileId === currentUser?.id;
  const fallbackProfile = useMemo(
    () => buildMissingProfile(profileId, currentUser),
    [currentUser, isOwnProfile, profileId]
  );
  const [profile, setProfile] = useState<User>(fallbackProfile);
  const [profileBooks, setProfileBooks] = useState<Book[]>([]);
  const [profileTransactions, setProfileTransactions] = useState<Transaction[]>([]);
  const [profileReviews, setProfileReviews] = useState<ReviewWithUser[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(Boolean(profileId && token));
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    setProfile(fallbackProfile);
  }, [fallbackProfile]);

  useEffect(() => {
    if (!profileId) return;

    let cancelled = false;
    const pid = profileId;
    const staticFallback = buildMissingProfile(pid, currentUser);

    async function loadProfile() {
      if (!token) {
        setProfile(fallbackProfile);
        setIsLoadingProfile(false);
        return;
      }

      const authToken = token;
      setIsLoadingProfile(true);
      setProfileError(null);

      const response = isOwnProfile
        ? await getCurrentUser(pid, authToken)
        : await getUserById(pid, authToken);

      if (cancelled) return;

      if (response.ok) {
        const statsResponse = await getReviewStatsForUser(pid, authToken);
        const profileWithStats = statsResponse.ok
          ? {
              ...response.data,
              rating: statsResponse.data.averageRating,
              reviewCount: statsResponse.data.totalReviews,
            }
          : response.data;

        setProfile(profileWithStats);
        if (isOwnProfile) {
          setUser(profileWithStats);
        }
      } else {
        setProfile(staticFallback);
        setProfileError(response.error || "No se pudo cargar el perfil");
      }

      setIsLoadingProfile(false);
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [isOwnProfile, profileId, setUser, token]);

  useEffect(() => {
    if (!profileId || !token) return;

    let cancelled = false;
    const pid = profileId;
    const authToken = token;

    async function loadRelatedData() {
      const [booksResponse, transactionsResponse, reviewsResponse] = await Promise.all([
        getBooksByOwner(pid, authToken),
        getTransactionsByUser(pid, authToken),
        getReviewsForUser(pid, authToken),
      ]);

      if (cancelled) return;

      if (booksResponse.ok) {
        setProfileBooks(booksResponse.data);
      }

      if (transactionsResponse.ok) {
        setProfileTransactions(transactionsResponse.data);
      }

      if (reviewsResponse.ok) {
        const reviewerIds = [...new Set(reviewsResponse.data.map((review) => review.reviewerId))];
        const reviewerResponses = await Promise.all(
          reviewerIds.map(async (reviewerId) => {
            const response = await getUserById(reviewerId, authToken);
            return response.ok ? response.data : null;
          })
        );

        if (cancelled) return;

        const reviewersById = Object.fromEntries(
          reviewerResponses
            .filter((reviewer): reviewer is User => reviewer !== null)
            .map((reviewer) => [reviewer.id, reviewer])
        );

        setProfileReviews(
          reviewsResponse.data.map((review) => ({
            ...review,
            reviewer: reviewersById[review.reviewerId],
          }))
        );
      }
    }

    loadRelatedData();

    return () => {
      cancelled = true;
    };
  }, [profileId, token]);

  const handle     = profile.email.split("@")[0];
  const isVerified = profile.reviewCount >= 20 || profile.rating >= 4.9;

  const genres = useMemo(
    () => [...new Set(profileBooks.map((b) => b.genre).filter(Boolean))],
    [profileBooks]
  );

  const stats = useMemo(() => ({
    books: profileBooks.length,
    transactions: profileTransactions.length,
    sales: profileTransactions.filter(
      (transaction) =>
        transaction.mode === "sell" && transaction.sellerId === profile.id
    ).length,
  }), [profile.id, profileBooks.length, profileTransactions]);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {isLoadingProfile && (
        <div className="rounded-2xl border border-border bg-white px-4 py-3 text-sm text-muted-foreground shadow-sm">
          Cargando perfil...
        </div>
      )}
      {profileError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
          {profileError}
        </div>
      )}
      <ProfileHeader
        profile={profile}
        handle={handle}
        isVerified={isVerified}
        isOwnProfile={isOwnProfile}
      />
      <ProfileStats stats={stats} />
      <ProfileAbout profile={profile} genres={genres} />
      <ProfileTabSection books={profileBooks} reviews={profileReviews} />
    </div>
  );
}

// ─── Profile header ───────────────────────────────────────────────────────────

interface ProfileHeaderProps {
  profile:      User;
  handle:       string;
  isVerified:   boolean;
  isOwnProfile: boolean;
}

function ProfileHeader({ profile, handle, isVerified, isOwnProfile }: ProfileHeaderProps) {
  return (
    <div className="rounded-3xl border border-border/60 bg-white shadow-sm">

      {/* Cover */}
      <div className="relative h-44 overflow-hidden rounded-t-3xl bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800">
        <svg aria-hidden className="absolute inset-0 w-full h-full opacity-[0.13]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="profile-dots" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.4" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#profile-dots)" />
        </svg>
        <div className="absolute -top-10 -left-10 w-52 h-52 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-14 right-10  w-60 h-60 rounded-full bg-indigo-400/20 blur-3xl pointer-events-none" />
        <div className="absolute top-4   right-1/3    w-32 h-32 rounded-full bg-purple-300/15 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
      </div>

      {/* Avatar + identity */}
      <div className="px-6 sm:px-8">
        <div className="-mt-14 relative z-10 inline-block">
          <div className="relative">
            <img
              src={profile.avatar}
              alt={profile.name}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover ring-4 ring-white shadow-2xl"
            />
            {isVerified && (
              <span aria-label="Verificado" className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center ring-2 ring-white shadow">
                <ShieldCheck className="w-3.5 h-3.5 text-white" />
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 pb-7 flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-none">
                {profile.name}
              </h1>
              {isVerified && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold leading-none">
                  <ShieldCheck className="w-3 h-3" />
                  Verificado
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-muted-foreground">@{handle}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <StarRating value={profile.rating} size="md" showValue />
              <span className="text-sm text-muted-foreground">· {profile.reviewCount} reseñas</span>
            </div>
          </div>

          {isOwnProfile && (
            <Link
              to="/perfil/editar"
              className={cn(
                "flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl mt-1",
                "border border-border text-sm font-medium text-foreground shadow-sm",
                "hover:bg-muted/50 transition-all duration-150"
              )}
            >
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
              Editar perfil
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Stats strip ──────────────────────────────────────────────────────────────

const STAT_ITEMS = [
  { key: "books"     as const, label: "Publicados",   icon: BookMarked,     color: "text-violet-600",  bg: "bg-violet-50"  },
  { key: "transactions" as const, label: "Transacciones", icon: ArrowLeftRight, color: "text-blue-600",    bg: "bg-blue-50"    },
  { key: "sales"     as const, label: "Ventas",       icon: ShoppingBag,    color: "text-emerald-600", bg: "bg-emerald-50" },
];

function ProfileStats({ stats }: { stats: { books: number; transactions: number; sales: number } }) {
  return (
    <div className="grid grid-cols-3 gap-px bg-border rounded-2xl overflow-hidden border border-border shadow-sm">
      {STAT_ITEMS.map(({ key, label, icon: Icon, color, bg }) => (
        <div key={key} className="bg-white px-4 py-5 flex flex-col items-center gap-3 hover:bg-muted/20 transition-colors">
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", bg)}>
            <Icon className={cn("w-4 h-4", color)} />
          </div>
          <div className="text-center">
            <p className={cn("text-2xl font-bold tabular-nums tracking-tight leading-none", color)}>{stats[key]}</p>
            <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest mt-1.5">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Profile about ────────────────────────────────────────────────────────────

function ProfileAbout({ profile, genres }: { profile: User; genres: string[] }) {
  return (
    <div className="rounded-3xl border border-border/60 bg-white shadow-sm px-6 sm:px-8 py-6 space-y-5">
      <p className="text-sm text-foreground/80 leading-relaxed">{profile.bio}</p>

      <div className="border-t border-border/50" />

      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-muted/60 flex items-center justify-center flex-shrink-0">
          <MapPin className="w-3.5 h-3.5 text-muted-foreground/70" />
        </div>
        <span className="text-sm text-muted-foreground">{profile.location}</span>
      </div>

      <div className="border-t border-border/50" />

      <div className="space-y-3">
        <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
          Géneros en su colección
        </p>
        {genres.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {genres.map((genre) => (
              <span key={genre} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700 border border-violet-100/80 hover:bg-violet-100 transition-colors">
                <BookOpen className="w-3 h-3 flex-shrink-0" />
                {genre}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sin géneros registrados.</p>
        )}
      </div>
    </div>
  );
}

// ─── Tab section ──────────────────────────────────────────────────────────────

function ProfileTabSection({ books, reviews }: { books: Book[]; reviews: ReviewWithUser[] }) {
  const [activeTab, setActiveTab] = useState<ProfileTab>("books");

  return (
    <div className="space-y-4">

      {/* Tab bar */}
      <div className="bg-muted/50 border border-border rounded-2xl p-1 flex gap-0.5">
        {([
          { value: "books"   as ProfileTab, label: "Libros publicados", icon: BookMarked,    count: books.length   },
          { value: "reviews" as ProfileTab, label: "Reseñas recibidas", icon: MessageSquare, count: reviews.length },
        ] as const).map(({ value, label, icon: Icon, count }) => {
          const active = activeTab === value;
          return (
            <button
              key={value}
              onClick={() => setActiveTab(value)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150",
                active
                  ? "bg-white text-violet-700 shadow-sm border border-border/60"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/60"
              )}
            >
              <Icon className={cn("w-3.5 h-3.5 flex-shrink-0", active ? "text-violet-600" : "text-current")} />
              <span className="hidden sm:inline">{label}</span>
              <span className={cn(
                "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold tabular-nums",
                active ? "bg-violet-100 text-violet-700" : "bg-muted text-muted-foreground"
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeTab === "books" ? (
        books.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {books.map((book) => <ProfileBookCard key={book.id} book={book} />)}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-border/60 shadow-sm">
            <EmptyState icon={BookMarked} title="Sin libros publicados" description="Este usuario aún no ha publicado ningún libro." />
          </div>
        )
      ) : (
        reviews.length > 0 ? (
          <div className="space-y-3">
            {reviews.map((r) => <ReviewCard key={r.id} review={r} />)}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-border/60 shadow-sm">
            <EmptyState icon={MessageSquare} title="Sin reseñas aún" description="Este usuario todavía no ha recibido reseñas." />
          </div>
        )
      )}

    </div>
  );
}

// ─── Profile book card ────────────────────────────────────────────────────────

function ProfileBookCard({ book }: { book: Book }) {
  const ModeIcon = MODE_ICONS[book.mode] ?? Tag;
  return (
    <div className="group flex flex-col rounded-2xl bg-white border border-border/60 shadow-sm hover:shadow-md hover:ring-2 hover:ring-violet-200/70 transition-all duration-200 overflow-hidden">
      <div className="relative aspect-[3/4] overflow-hidden bg-muted/40">
        {book.cover ? (
          <img
            src={book.cover}
            alt={book.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <BookCoverPlaceholder title={book.title} />
        )}
        <div className="absolute top-2 right-2 pointer-events-none">
          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shadow-sm", MODE_COLORS[book.mode])}>
            <ModeIcon className="w-2.5 h-2.5" />
            {MODE_LABELS[book.mode]}
          </span>
        </div>
      </div>
      <div className="flex flex-col flex-1 p-3 gap-1.5">
        <span className={cn("self-start text-[10px] font-semibold px-1.5 py-0.5 rounded-md", CONDITION_COLORS[book.condition])}>
          {CONDITION_LABELS[book.condition]}
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">{book.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{book.author}</p>
        </div>
        <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-border/50 mt-0.5">
          {book.mode === "sell" && book.price != null ? (
            <span className="text-sm font-bold text-violet-700 tabular-nums">{formatPrice(book.price)}</span>
          ) : (
            <span className="text-xs font-medium text-muted-foreground">
              {book.mode === "exchange" ? "Intercambio" : "Donación"}
            </span>
          )}
          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground/70 min-w-0 overflow-hidden">
            <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
            <span className="truncate">{book.location.split(",")[0]}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Review card ──────────────────────────────────────────────────────────────

function ReviewCard({ review }: { review: ReviewWithUser }) {
  const { reviewer, rating, comment, createdAt } = review;
  return (
    <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <Avatar src={reviewer?.avatar} name={reviewer?.name ?? "?"} size="sm" />
          <div>
            <p className="text-sm font-semibold text-foreground leading-none">{reviewer?.name ?? "Usuario"}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatRelativeTime(createdAt)}</p>
          </div>
        </div>
        <StarRating value={rating} size="sm" showValue />
      </div>
      <div className="border-l-2 border-violet-200 pl-4">
        <p className="text-sm text-foreground/75 leading-relaxed">"{comment}"</p>
      </div>
    </div>
  );
}

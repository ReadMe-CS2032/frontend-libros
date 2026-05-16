import { useState, useRef, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Send,
  Search,
  ArrowLeft,
  MessageCircle,
  ShoppingCart,
  CheckCircle2,
  Clock,
  Star,
  XCircle,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { getBookById } from "@/api/books";
import { getSolicitudesByUser, getSolicitudById, sendSolicitudMessage } from "@/api/solicitudes";
import { getUserById, createReview, getReviewsForUser } from "@/api/users";
import { acceptOrder, rejectOrder, cancelOrder } from "@/api/orders";
import { getTransactionsByBook } from "@/api/transactions";
import type { Book, Conversation, Message, User } from "@/types";
import Avatar from "@/components/shared/Avatar";
import BookCoverPlaceholder from "@/components/shared/BookCoverPlaceholder";
import { cn, formatRelativeTime } from "@/lib/utils";
import {
  createPurchaseAcceptSystemMessage,
  getConversationPreview,
  getVisibleConversationMessages,
} from "@/lib/solicitudWorkflow";

const timeFormatter = new Intl.DateTimeFormat("es-PE", {
  hour: "2-digit",
  minute: "2-digit",
});

const STATUS_META: Record<string, { label: string; class: string }> = {
  pendiente: { label: "Pendiente", class: "bg-amber-50 text-amber-700 border-amber-200" },
  aceptada:  { label: "Aceptada",  class: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rechazada: { label: "Rechazada", class: "bg-red-50 text-red-600 border-red-200" },
  cancelada: { label: "Cancelada", class: "bg-muted text-muted-foreground border-border" },
};

function msgTime(iso: string) {
  return timeFormatter.format(new Date(iso));
}

function otherParticipant(conv: Conversation, myId: string) {
  return conv.participantIds.find((participantId) => participantId !== myId) ?? conv.participantIds[0];
}

export default function MessagesPage() {
  const currentUser = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const [searchParams] = useSearchParams();
  const requestedConversationId = searchParams.get("c");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(requestedConversationId);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [mobileChat, setMobileChat] = useState(false);
  const [booksById, setBooksById] = useState<Record<string, Book>>({});
  const [usersById, setUsersById] = useState<Record<string, User>>({});
  const [isLoading, setIsLoading] = useState(Boolean(currentUser?.id && token));
  const [error, setError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // review state
  const [transactionIdBySolicitud, setTransactionIdBySolicitud] = useState<Record<string, string>>({});
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [isLoadingReview, setIsLoadingReview] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentUser?.id || !token) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const userId = currentUser.id;
    const authToken = token;

    async function loadConversations() {
      setIsLoading(true);
      setError(null);

      const response = await getSolicitudesByUser(userId, authToken);
      if (cancelled) return;

      if (!response.ok) {
        setError(response.error || "No se pudieron cargar las conversaciones");
        setIsLoading(false);
        return;
      }

      let convList = response.data;
      let nextSelectedId: string | null = null;

      if (requestedConversationId) {
        const existsInList = convList.some((c) => c.id === requestedConversationId);
        if (existsInList) {
          nextSelectedId = requestedConversationId;
        } else {
          // New solicitud may not be in the list yet (race condition) — fetch it directly
          const solicitudResponse = await getSolicitudById(requestedConversationId, userId, authToken);
          if (!cancelled && solicitudResponse.ok) {
            convList = [solicitudResponse.data, ...convList];
            nextSelectedId = requestedConversationId;
          } else {
            nextSelectedId = convList[0]?.id ?? null;
          }
        }
      } else {
        nextSelectedId = convList[0]?.id ?? null;
      }

      if (cancelled) return;

      const bookIds = [...new Set(convList.map((c) => c.bookId).filter(Boolean))];
      const peerIds = [...new Set(convList.map((c) => otherParticipant(c, userId)))];

      const [books, users] = await Promise.all([
        Promise.all(
          bookIds.map(async (bookId) => {
            const bookResponse = await getBookById(bookId, authToken);
            return bookResponse.ok ? bookResponse.data : null;
          })
        ),
        Promise.all(
          peerIds.map(async (uid) => {
            const userResponse = await getUserById(uid, authToken);
            return userResponse.ok ? userResponse.data : null;
          })
        ),
      ]);

      if (cancelled) return;

      const existingBookIds = new Set(
        books.filter((b): b is Book => b !== null).map((b) => b.id)
      );
      convList = convList.filter((c) => existingBookIds.has(c.bookId));

      if (!convList.some((c) => c.id === nextSelectedId)) {
        nextSelectedId = convList[0]?.id ?? null;
      }

      setConversations(convList);
      setSelectedId(nextSelectedId);

      setBooksById(
        Object.fromEntries(
          books
            .filter((book): book is Book => book !== null)
            .map((book) => [book.id, book])
        )
      );
      setUsersById(
        Object.fromEntries(
          users
            .filter((user): user is User => user !== null)
            .map((user) => [user.id, user])
        )
      );

      // Pre-cargar transactionIds y detectar reseñas ya enviadas para solicitudes aceptadas
      const acceptedConvs = convList.filter((c) => c.status === "aceptada");
      if (acceptedConvs.length > 0) {
        const txResults = await Promise.all(
          acceptedConvs.map(async (c) => {
            const r = await getTransactionsByBook(c.bookId, authToken);
            return { solicitudId: c.id, txId: r.ok && r.data[0] ? r.data[0].id : null };
          })
        );

        const txMap: Record<string, string> = {};
        txResults.forEach(({ solicitudId, txId }) => {
          if (txId) txMap[solicitudId] = txId;
        });
        if (!cancelled) setTransactionIdBySolicitud(txMap);

        const alreadyReviewed = new Set<string>();
        await Promise.all(
          acceptedConvs.map(async (c) => {
            const peerId = c.participantIds.find((id) => id !== userId);
            const txId = txMap[c.id];
            if (!peerId || !txId) return;
            const r = await getReviewsForUser(peerId, authToken);
            if (r.ok && r.data.some((rev) => rev.reviewerId === userId && rev.transactionId === txId)) {
              alreadyReviewed.add(c.id);
            }
          })
        );
        if (!cancelled && alreadyReviewed.size > 0) {
          setReviewedIds(alreadyReviewed);
        }
      }

      setIsLoading(false);
    }

    loadConversations();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, requestedConversationId, token]);

  const selected = conversations.find((conversation) => conversation.id === selectedId) ?? null;
  const book = selected ? booksById[selected.bookId] : null;
  const peerId = selected && currentUser ? otherParticipant(selected, currentUser.id) : null;
  const peer = peerId ? usersById[peerId] : null;
  const selectedMessages = selected ? getVisibleConversationMessages(selected.messages) : [];

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    const query = search.toLowerCase();

    return conversations.filter((conversation) => {
      const participantId = currentUser ? otherParticipant(conversation, currentUser.id) : "";
      const conversationUser = usersById[participantId];
      const conversationBook = booksById[conversation.bookId];

      return (
        conversationUser?.name.toLowerCase().includes(query) ||
        conversationBook?.title.toLowerCase().includes(query)
      );
    });
  }, [booksById, conversations, currentUser, search, usersById]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedMessages.length]);

  useEffect(() => {
    setReviewOpen(false);
    setReviewRating(0);
    setReviewComment("");
    setReviewError(null);
  }, [selectedId]);

  function selectConversation(id: string) {
    setSelectedId(id);
    setMobileChat(true);
    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id === id ? { ...conversation, unreadCount: 0 } : conversation
      )
    );
  }

  function appendSystemMessage(conversationId: string, message: Message, nextStatus?: Conversation["status"]) {
    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id !== conversationId
          ? conversation
          : {
              ...conversation,
              messages: [...conversation.messages, message],
              lastMessageAt: message.sentAt,
              ...(nextStatus ? { status: nextStatus } : {}),
            }
      )
    );
  }

  async function handleAcceptPurchase() {
    if (!selectedId || !token || !currentUser?.id || !selected) return;

    setIsAccepting(true);
    setError(null);

    const acceptResponse = await acceptOrder(selectedId, token);
    if (!acceptResponse.ok) {
      setError(acceptResponse.error || "No se pudo aceptar la solicitud");
      setIsAccepting(false);
      return;
    }
    if (acceptResponse.data.transactionId) {
      setTransactionIdBySolicitud((prev) => ({
        ...prev,
        [selectedId]: acceptResponse.data.transactionId!,
      }));
    }

    appendSystemMessage(
      selectedId,
      {
        id: `${selectedId}-${currentUser.id}-accept-${Date.now()}`,
        conversationId: selectedId,
        senderId: currentUser.id,
        text: createPurchaseAcceptSystemMessage(),
        sentAt: new Date().toISOString(),
        read: true,
      },
      "aceptada"
    );

    setIsAccepting(false);
  }

  async function handleRejectPurchase() {
    if (!selectedId || !token) return;
    setIsRejecting(true);
    setError(null);
    const res = await rejectOrder(selectedId, token);
    setIsRejecting(false);
    if (!res.ok) {
      setError(res.error || "No se pudo rechazar la solicitud");
      return;
    }
    setConversations((prev) =>
      prev.map((c) => c.id === selectedId ? { ...c, status: "rechazada" } : c)
    );
  }

  async function handleCancelPurchase() {
    if (!selectedId || !token) return;
    setIsCancelling(true);
    setError(null);
    const res = await cancelOrder(selectedId, token);
    setIsCancelling(false);
    if (!res.ok) {
      setError(res.error || "No se pudo cancelar la solicitud");
      return;
    }
    setConversations((prev) =>
      prev.map((c) => c.id === selectedId ? { ...c, status: "cancelada" } : c)
    );
  }

  async function handleOpenReview() {
    if (!selected || !token || !selectedId) return;
    setReviewOpen(true);
    if (transactionIdBySolicitud[selectedId]) return;
    setIsLoadingReview(true);
    const result = await getTransactionsByBook(selected.bookId, token);
    setIsLoadingReview(false);
    if (result.ok && result.data.length > 0) {
      setTransactionIdBySolicitud((prev) => ({
        ...prev,
        [selectedId]: result.data[0].id,
      }));
    }
  }

  async function handleSubmitReview() {
    if (!selected || !currentUser || !token || !selectedId || !peerId) return;
    const transactionId = transactionIdBySolicitud[selectedId];
    if (!transactionId || reviewRating === 0) return;
    setIsSubmittingReview(true);
    setReviewError(null);
    const result = await createReview(
      { reviewedUserId: peerId, transactionId, rating: reviewRating, comment: reviewComment },
      token
    );
    setIsSubmittingReview(false);
    if (!result.ok) {
      setReviewError(result.error || "No se pudo enviar la reseña");
      return;
    }
    setReviewedIds((prev) => new Set([...prev, selectedId]));
    setReviewOpen(false);
  }

  async function sendMessage() {
    if (!input.trim() || !selectedId || !currentUser || !token) return;

    const text = input.trim();
    const response = await sendSolicitudMessage(selectedId, text, token);
    if (!response.ok) {
      setError(response.error || "No se pudo enviar el mensaje");
      return;
    }

    const message: Message = {
      id: `${selectedId}-${currentUser.id}-${Date.now()}`,
      conversationId: selectedId,
      senderId: currentUser.id,
      text,
      sentAt: new Date().toISOString(),
      read: true,
    };

    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id !== selectedId
          ? conversation
          : {
              ...conversation,
              messages: [...conversation.messages, message],
              lastMessage: message.text,
              lastMessageAt: message.sentAt,
            }
      )
    );
    setInput("");
  }

  const totalUnread = conversations.reduce((total, conversation) => total + conversation.unreadCount, 0);

  return (
    <div className="-m-5 lg:-m-8 h-[calc(100vh-3.5rem)] flex overflow-hidden bg-white border-t border-border/40">
      <div
        className={cn(
          "w-full lg:w-72 xl:w-80 border-r border-border/60 flex-col flex-shrink-0 bg-white",
          mobileChat ? "hidden lg:flex" : "flex"
        )}
      >
        <div className="px-4 pt-5 pb-3 border-b border-border/60 flex-shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <h1 className="text-base font-bold tracking-tight text-foreground flex-1 leading-none">
              Mensajes
            </h1>
            {totalUnread > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-violet-600 text-white text-[10px] font-bold tabular-nums">
                {totalUnread}
              </span>
            )}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50 pointer-events-none" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por libro o usuario..."
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-border bg-muted/40 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-violet-300/60 focus:border-violet-400 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 px-6 text-center">
              <MessageCircle className="w-8 h-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Cargando conversaciones...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 px-6 text-center">
              <MessageCircle className="w-8 h-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Sin resultados</p>
            </div>
          ) : (
            filtered.map((conversation) => {
              const participantId = currentUser ? otherParticipant(conversation, currentUser.id) : "";
              const conversationUser = usersById[participantId];
              const conversationBook = booksById[conversation.bookId];
              const isActive = conversation.id === selectedId;

              const statusMeta = STATUS_META[conversation.status ?? "pendiente"] ?? STATUS_META["pendiente"];
              return (
                <button
                  key={conversation.id}
                  onClick={() => selectConversation(conversation.id)}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors border-b border-border/40",
                    isActive
                      ? "bg-violet-50 border-l-2 border-l-violet-500"
                      : "hover:bg-muted/40 border-l-2 border-l-transparent"
                  )}
                >
                  {/* Book cover */}
                  <div className="flex-shrink-0 w-9 h-12 rounded-md overflow-hidden bg-muted ring-1 ring-border/60 mt-0.5">
                    {conversationBook?.cover ? (
                      <img src={conversationBook.cover} alt={conversationBook.title} className="w-full h-full object-cover" />
                    ) : (
                      <BookCoverPlaceholder title={conversationBook?.title ?? "Libro"} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Book title + time */}
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <p className="text-xs font-semibold text-foreground/90 leading-tight line-clamp-2 flex-1">
                        {conversationBook?.title ?? "Libro"}
                      </p>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0 mt-0.5">
                        {conversation.lastMessageAt ? formatRelativeTime(conversation.lastMessageAt) : ""}
                      </span>
                    </div>

                    {/* User + status badge */}
                    <div className="flex items-center gap-1.5 mb-1">
                      <Avatar src={conversationUser?.avatar} name={conversationUser?.name} size="xs" />
                      <span className="text-[10px] text-muted-foreground truncate">
                        {conversationUser?.name ?? "Usuario"}
                      </span>
                      <span className={cn("flex-shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border", statusMeta.class)}>
                        {statusMeta.label}
                      </span>
                    </div>

                    <p className="text-[11px] truncate leading-relaxed text-muted-foreground/80">
                      {getConversationPreview(conversation)}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div
        className={cn(
          "flex-1 flex-col bg-white min-w-0",
          mobileChat ? "flex" : "hidden lg:flex"
        )}
      >
        {selected ? (
          <>
            <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-white border-b border-border/60 shadow-sm">
              <button
                onClick={() => setMobileChat(false)}
                className="lg:hidden p-1.5 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              {/* Book cover */}
              <div className="flex-shrink-0 w-8 h-11 rounded-md overflow-hidden bg-muted ring-1 ring-border/60">
                {book?.cover ? (
                  <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />
                ) : (
                  <BookCoverPlaceholder title={book?.title ?? "Libro"} />
                )}
              </div>

              {/* Book + peer info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground leading-tight truncate">
                  {book?.title ?? "Libro"}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Avatar src={peer?.avatar} name={peer?.name} size="xs" />
                  <span className="text-[11px] text-muted-foreground truncate">{peer?.name ?? "Usuario"}</span>
                  {book?.author && (
                    <span className="text-[11px] text-muted-foreground/50 truncate hidden sm:inline">· {book.author}</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              {selected.status === "pendiente" && currentUser?.id === selected.sellerId && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => void handleRejectPurchase()}
                    disabled={isRejecting || isAccepting}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 active:scale-95",
                      "border border-red-200 bg-red-50 text-red-600 hover:bg-red-100",
                      "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                    )}
                  >
                    <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {isRejecting ? "Rechazando..." : "Rechazar"}
                  </button>
                  <button
                    onClick={() => void handleAcceptPurchase()}
                    disabled={isAccepting || isRejecting}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 active:scale-95",
                      "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
                      "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                    )}
                  >
                    <ShoppingCart className="w-3.5 h-3.5 flex-shrink-0" />
                    {isAccepting ? "Aceptando..." : "Aceptar"}
                  </button>
                </div>
              )}

              {selected.status === "pendiente" && currentUser?.id === selected.buyerId && (
                <button
                  onClick={() => void handleCancelPurchase()}
                  disabled={isCancelling}
                  className={cn(
                    "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 active:scale-95",
                    "border border-border bg-muted text-muted-foreground hover:bg-muted/80",
                    "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                  )}
                >
                  <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {isCancelling ? "Cancelando..." : "Cancelar"}
                </button>
              )}

              {selected.status === "aceptada" && (
                <span className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  Aceptada
                </span>
              )}
            </div>

            {error && (
              <div className="mx-4 mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {selectedMessages.map((message, index) => {
                const isOwn = message.senderId === currentUser?.id;
                const sender = isOwn
                  ? (currentUser as User | null)
                  : usersById[message.senderId];
                const isLast = index === selectedMessages.length - 1;

                return (
                  <div key={message.id} className="flex gap-3">
                    <div className="flex flex-col items-center w-10 flex-shrink-0">
                      <Avatar src={sender?.avatar} name={sender?.name} size="sm" />
                      {!isLast && (
                        <div className="w-0.5 bg-border/40 flex-1 mt-1.5 rounded-full" />
                      )}
                    </div>

                    <div className={cn("flex-1 min-w-0", isLast ? "pb-2" : "pb-5")}>
                      <div className="flex items-center flex-wrap gap-x-1.5 mb-1">
                        <span
                          className={cn(
                            "text-sm font-bold leading-none",
                            isOwn ? "text-violet-700" : "text-foreground"
                          )}
                        >
                          {sender?.name ?? "Usuario"}
                        </span>
                        {isOwn && (
                          <span className="text-[11px] text-violet-400 font-medium leading-none">
                            · Tú
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground/50">·</span>
                        <span className="text-[11px] text-muted-foreground">
                          {msgTime(message.sentAt)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/90 leading-relaxed break-words">
                        {message.text}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {selected.status === "aceptada" && (
              <div className="flex-shrink-0 mx-4 mb-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-emerald-900 leading-tight">Solicitud aceptada</p>
                  <p className="text-xs text-emerald-700/70 mt-0.5">Coordinen la entrega por este hilo.</p>
                </div>
              </div>
            )}

            {!isLoading && selected.status === "aceptada" && selectedId && !reviewedIds.has(selectedId) && (
              <div className="flex-shrink-0 mx-4 mb-3 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3.5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-violet-900">
                      ¿Cómo fue tu experiencia con {peer?.name ?? "el otro usuario"}?
                    </p>
                    <p className="text-xs text-violet-700/70 mt-0.5">
                      Te recomendamos dejar la reseña luego de coordinar y concretar la entrega del libro.
                    </p>
                  </div>
                  {!reviewOpen && (
                    <button
                      onClick={() => void handleOpenReview()}
                      disabled={isLoadingReview}
                      className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50"
                    >
                      {isLoadingReview ? "Cargando..." : "Dejar reseña"}
                    </button>
                  )}
                </div>
                {reviewOpen && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setReviewRating(n)}
                          className="p-0.5 transition-transform hover:scale-110"
                        >
                          <Star
                            className={cn(
                              "w-6 h-6 transition-colors",
                              n <= reviewRating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                            )}
                          />
                        </button>
                      ))}
                      {reviewRating > 0 && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          {["", "Muy malo", "Malo", "Regular", "Bueno", "Excelente"][reviewRating]}
                        </span>
                      )}
                    </div>
                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Describe tu experiencia (opcional)..."
                      rows={2}
                      className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-violet-300/60 resize-none"
                    />
                    {reviewError && (
                      <p className="text-xs text-red-600">{reviewError}</p>
                    )}
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setReviewOpen(false)}
                        className="px-3 py-1.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-muted/50 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => void handleSubmitReview()}
                        disabled={reviewRating === 0 || isSubmittingReview || !transactionIdBySolicitud[selectedId]}
                        className="px-3 py-1.5 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmittingReview ? "Enviando..." : "Enviar reseña"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {selected.status === "pendiente" && (
              <div className="flex-shrink-0 mx-4 mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-amber-700 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">Esperando respuesta del vendedor</p>
                  <p className="text-xs text-amber-700/70 mt-0.5">
                    {currentUser?.id === selected.sellerId
                      ? "Puedes aceptar la solicitud desde el botón de arriba."
                      : "El vendedor aún no ha aceptado tu solicitud."}
                  </p>
                </div>
              </div>
            )}

            {selected.status === "rechazada" && (
              <div className="flex-shrink-0 mx-4 mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 flex items-center gap-2.5">
                <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <p className="text-sm font-semibold text-red-900">Solicitud rechazada</p>
              </div>
            )}

            {selected.status === "cancelada" && (
              <div className="flex-shrink-0 mx-4 mb-3 rounded-2xl border border-border bg-muted/50 px-4 py-3 flex items-center gap-2.5">
                <XCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <p className="text-sm font-semibold text-muted-foreground">Solicitud cancelada</p>
              </div>
            )}

            <div className="flex-shrink-0 px-4 py-3 bg-white border-t border-border/60">
              <div className="flex gap-3 items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <Avatar src={currentUser?.avatar} name={currentUser?.name} size="sm" />
                </div>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void sendMessage();
                  }}
                  className="flex-1 flex items-end gap-2 border border-border/60 rounded-2xl px-3 py-2 focus-within:ring-2 focus-within:ring-violet-300/60 focus-within:border-violet-400 bg-muted/30 focus-within:bg-white transition-all"
                >
                  <input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Escribe tu respuesta..."
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none py-1"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className={cn(
                      "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150",
                      "bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-sm shadow-violet-200",
                      "hover:from-violet-700 hover:to-purple-700 active:scale-95",
                      "disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
                    )}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Responder</span>
                  </button>
                </form>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center ring-1 ring-violet-100">
              <MessageCircle className="w-7 h-7 text-violet-400" />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-foreground">Selecciona una conversación</p>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-[220px]">
                Cuando envíes interés por un libro, aparecerá aquí el hilo con el vendedor.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

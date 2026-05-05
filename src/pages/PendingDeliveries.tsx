import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  PackageCheck,
  BookMarked,
  BookOpen,
  CheckCircle2,
  Truck,
  HandshakeIcon,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { getSolicitudesByUser, sendSolicitudMessage, updateSolicitudStatus } from "@/api/solicitudes";
import { getBookById } from "@/api/books";
import { getUserById } from "@/api/users";
import type { Book, Conversation, Message, User } from "@/types";
import Avatar from "@/components/shared/Avatar";
import EmptyState from "@/components/shared/EmptyState";
import { cn, formatRelativeTime } from "@/lib/utils";
import {
  createPickupConfirmSystemMessage,
  getConversationWorkflowState,
} from "@/lib/solicitudWorkflow";

function otherParticipant(conv: Conversation, myId: string) {
  return conv.participantIds.find((id) => id !== myId) ?? conv.participantIds[0];
}

export default function PendingDeliveriesPage() {
  const currentUser = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [booksById, setBooksById] = useState<Record<string, Book>>({});
  const [usersById, setUsersById] = useState<Record<string, User>>({});
  const [isLoading, setIsLoading] = useState(Boolean(currentUser?.id && token));
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser?.id || !token) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const userId = currentUser.id;
    const authToken = token as string;

    async function load() {
      setIsLoading(true);
      setError(null);

      const response = await getSolicitudesByUser(userId, authToken);
      if (cancelled) return;

      if (!response.ok) {
        setError(response.error || "No se pudieron cargar las entregas");
        setIsLoading(false);
        return;
      }

      const pending = response.data.filter((conversation) => {
        const workflow = getConversationWorkflowState(conversation);
        return conversation.status === "aceptada" || (conversation.status === "pendiente" && workflow.allAccepted);
      });
      setConversations(pending);

      const bookIds = [...new Set(pending.map((conversation) => conversation.bookId).filter(Boolean))];
      const peerIds = [...new Set(pending.map((conversation) => otherParticipant(conversation, userId)))];

      const [books, users] = await Promise.all([
        Promise.all(
          bookIds.map(async (id) => {
            const response = await getBookById(id, authToken);
            return response.ok ? response.data : null;
          })
        ),
        Promise.all(
          peerIds.map(async (id) => {
            const response = await getUserById(id, authToken);
            return response.ok ? response.data : null;
          })
        ),
      ]);

      if (cancelled) return;

      setBooksById(
        Object.fromEntries(
          books.filter((book): book is Book => book !== null).map((book) => [book.id, book])
        )
      );
      setUsersById(
        Object.fromEntries(
          users.filter((user): user is User => user !== null).map((user) => [user.id, user])
        )
      );

      setIsLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, token]);

  async function handleConfirmDelivery(conversation: Conversation) {
    if (!token || !currentUser?.id) return;

    setConfirmingId(conversation.id);
    setError(null);

    const sendResponse = await sendSolicitudMessage(
      conversation.id,
      createPickupConfirmSystemMessage(),
      token
    );

    if (!sendResponse.ok) {
      setError(sendResponse.error || "No se pudo confirmar el recojo");
      setConfirmingId(null);
      return;
    }

    const systemMessage: Message = {
      id: `${conversation.id}-${currentUser.id}-pickup-${Date.now()}`,
      conversationId: conversation.id,
      senderId: currentUser.id,
      text: createPickupConfirmSystemMessage(),
      sentAt: new Date().toISOString(),
      read: true,
    };

    const updatedConversation: Conversation = {
      ...conversation,
      messages: [...conversation.messages, systemMessage],
    };
    const workflow = getConversationWorkflowState(updatedConversation);

    if (workflow.allPickedUp) {
      const statusResponse = await updateSolicitudStatus(conversation.id, "aceptada", token);
      if (!statusResponse.ok) {
        setError(statusResponse.error || "No se pudo actualizar el estado");
        setConfirmingId(null);
        return;
      }
    }

    setConversations((previous) =>
      previous.map((item) =>
        item.id !== conversation.id
          ? item
          : {
              ...item,
              messages: [...item.messages, systemMessage],
              lastMessageAt: systemMessage.sentAt,
              status: workflow.allPickedUp ? "aceptada" : item.status,
            }
      )
    );

    setConfirmingId(null);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm shadow-emerald-200/60 flex-shrink-0">
          <Truck className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground leading-none">
            Recojo / Envío pendiente
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Solicitudes con compra confirmada por ambas partes
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-border bg-white px-4 py-8 text-center text-sm text-muted-foreground shadow-sm">
          Cargando entregas pendientes...
        </div>
      ) : conversations.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white shadow-sm">
          <EmptyState
            icon={PackageCheck}
            title="Sin entregas pendientes"
            description="Las solicitudes aparecerán aquí cuando ambas partes acepten la compra."
          />
        </div>
      ) : (
        <div className="space-y-3">
          {conversations.map((conversation) => {
            const peerId = otherParticipant(conversation, currentUser?.id ?? "");
            const peer = usersById[peerId];
            const book = booksById[conversation.bookId];
            const workflow = getConversationWorkflowState(conversation);
            const isConfirming = confirmingId === conversation.id;
            const isAccepted = conversation.status === "aceptada";
            const currentUserPickupDone =
              currentUser?.id === conversation.buyerId
                ? workflow.pickupByBuyer
                : workflow.pickupBySeller;

            return (
              <div
                key={conversation.id}
                className={cn(
                  "rounded-2xl border bg-white shadow-sm overflow-hidden transition-all",
                  isAccepted ? "border-violet-200" : "border-border"
                )}
              >
                <div className="flex items-stretch gap-0">
                  <Link
                    to={conversation.bookId ? `/libro/${conversation.bookId}` : "#"}
                    className="flex-shrink-0 w-20 bg-muted/40 flex items-center justify-center hover:opacity-80 transition-opacity"
                  >
                    {book?.cover ? (
                      <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />
                    ) : (
                      <BookMarked className="w-6 h-6 text-muted-foreground/30" />
                    )}
                  </Link>

                  <div className="flex-1 min-w-0 p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          to={conversation.bookId ? `/libro/${conversation.bookId}` : "#"}
                          className="text-sm font-semibold text-foreground hover:text-violet-700 transition-colors leading-tight truncate block"
                        >
                          {book?.title ?? "Libro no disponible"}
                        </Link>
                        {book && <p className="text-xs text-muted-foreground truncate">{book.author}</p>}
                      </div>

                      {isAccepted ? (
                        <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-200">
                          <CheckCircle2 className="w-3 h-3" />
                          Aceptada
                        </span>
                      ) : (
                        <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <PackageCheck className="w-3 h-3" />
                          Recojo pendiente
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar src={peer?.avatar} name={peer?.name} size="xs" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">
                            {peer?.name ?? "Usuario"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {conversation.sellerId === currentUser?.id ? "Comprador" : "Vendedor"}
                          </p>
                        </div>
                        {conversation.lastMessageAt && (
                          <span className="text-[10px] text-muted-foreground/60 flex-shrink-0">
                            · {formatRelativeTime(conversation.lastMessageAt)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Link
                          to={`/mensajes?c=${conversation.id}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          Ver chat
                        </Link>

                        {!isAccepted && !currentUserPickupDone && (
                          <button
                            onClick={() => void handleConfirmDelivery(conversation)}
                            disabled={isConfirming}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 active:scale-95",
                              "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-200/60",
                              "hover:from-emerald-600 hover:to-teal-700",
                              "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                            )}
                          >
                            <HandshakeIcon className="w-3.5 h-3.5 flex-shrink-0" />
                            {isConfirming ? "Confirmando..." : "Ya recogi / entregue"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

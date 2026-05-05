import type { Conversation, Message } from "@/types";

const SYSTEM_PREFIX = "[[system:";
const SYSTEM_SUFFIX = "]]";

type WorkflowAction = "purchase_accept" | "pickup_confirm";

function parseWorkflowAction(text: string): WorkflowAction | null {
  if (!text.startsWith(SYSTEM_PREFIX) || !text.endsWith(SYSTEM_SUFFIX)) {
    return null;
  }

  const rawAction = text.slice(SYSTEM_PREFIX.length, -SYSTEM_SUFFIX.length);
  if (rawAction === "purchase_accept" || rawAction === "pickup_confirm") {
    return rawAction;
  }

  return null;
}

export function createPurchaseAcceptSystemMessage(): string {
  return `${SYSTEM_PREFIX}purchase_accept${SYSTEM_SUFFIX}`;
}

export function createPickupConfirmSystemMessage(): string {
  return `${SYSTEM_PREFIX}pickup_confirm${SYSTEM_SUFFIX}`;
}

export function isWorkflowSystemMessage(text: string): boolean {
  return parseWorkflowAction(text) !== null;
}

export function getVisibleConversationMessages(messages: Message[]): Message[] {
  return messages.filter((message) => !isWorkflowSystemMessage(message.text));
}

export function getConversationWorkflowState(conversation: Conversation) {
  const buyerId = conversation.buyerId ?? "";
  const sellerId = conversation.sellerId ?? "";

  let acceptedByBuyer = false;
  let acceptedBySeller = false;
  let pickupByBuyer = false;
  let pickupBySeller = false;

  for (const message of conversation.messages) {
    const action = parseWorkflowAction(message.text);
    if (!action) continue;

    if (action === "purchase_accept") {
      if (message.senderId === buyerId) acceptedByBuyer = true;
      if (message.senderId === sellerId) acceptedBySeller = true;
    }

    if (action === "pickup_confirm") {
      if (message.senderId === buyerId) pickupByBuyer = true;
      if (message.senderId === sellerId) pickupBySeller = true;
    }
  }

  return {
    acceptedByBuyer,
    acceptedBySeller,
    pickupByBuyer,
    pickupBySeller,
    allAccepted: acceptedByBuyer && acceptedBySeller,
    allPickedUp: pickupByBuyer && pickupBySeller,
  };
}

export function getConversationPreview(conversation: Conversation): string {
  const visibleMessages = getVisibleConversationMessages(conversation.messages);
  const lastVisibleMessage = visibleMessages[visibleMessages.length - 1];
  if (lastVisibleMessage) return lastVisibleMessage.text;

  const workflow = getConversationWorkflowState(conversation);
  if (conversation.status === "aceptada") {
    return "Recojo confirmado por ambas partes";
  }
  if (workflow.allAccepted) {
    return "Compra confirmada por ambas partes";
  }
  if (workflow.acceptedByBuyer || workflow.acceptedBySeller) {
    return "Una parte ya confirmo la compra";
  }
  return conversation.lastMessage;
}

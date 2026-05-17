import { getFirebaseDb } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  type DocumentData,
} from "firebase/firestore";

export interface Chat {
  id: string;
  clientId: string;
  clientName: string;
  expertId: string;
  expertName: string;
  lastMessage: string;
  lastMessageSender: "client" | "expert" | "";
  updatedAt: any;
}

export interface Message {
  id: string;
  senderId: string;
  senderRole: "client" | "expert" | "system";
  content: string;
  timestamp: any;
  warning?: boolean;
}

/**
 * Get or create a chat room between a customer and an expert.
 * Returns the chat ID.
 */
export async function getOrCreateChat(
  clientId: string,
  clientName: string,
  expertId: string,
  expertName: string
): Promise<string> {
  const db = getFirebaseDb();
  const chatId = `${clientId}_${expertId}`;
  const chatRef = doc(db, "chats", chatId);

  const chatSnap = await getDoc(chatRef);
  if (!chatSnap.exists()) {
    const newChat: Omit<Chat, "id"> = {
      clientId,
      clientName,
      expertId,
      expertName,
      lastMessage: "",
      lastMessageSender: "",
      updatedAt: serverTimestamp(),
    };
    await setDoc(chatRef, newChat);
  } else {
    // Optionally update names in case they changed
    await updateDoc(chatRef, {
      clientName,
      expertName,
    });
  }

  return chatId;
}

/**
 * Send a message within a chat room.
 */
export async function sendMessage(
  chatId: string,
  senderId: string,
  senderRole: "client" | "expert" | "system",
  content: string,
  isWarning = false
): Promise<void> {
  const db = getFirebaseDb();
  const messagesRef = collection(db, "chats", chatId, "messages");

  // Add the message to the subcollection
  await addDoc(messagesRef, {
    senderId,
    senderRole,
    content,
    timestamp: serverTimestamp(),
    warning: isWarning,
  });

  // Update the chat summary (only for non-system messages, or system messages if applicable)
  if (senderRole !== "system") {
    const chatRef = doc(db, "chats", chatId);
    await updateDoc(chatRef, {
      lastMessage: content,
      lastMessageSender: senderRole,
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * Subscribe to the real-time messages of a chat room.
 */
export function subscribeToMessages(
  chatId: string,
  callback: (messages: Message[]) => void,
  onError?: (error: any) => void
) {
  const db = getFirebaseDb();
  const messagesRef = collection(db, "chats", chatId, "messages");
  const q = query(messagesRef, orderBy("timestamp", "asc"));

  return onSnapshot(
    q,
    (snapshot) => {
      const messages: Message[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          senderId: data.senderId,
          senderRole: data.senderRole,
          content: data.content,
          timestamp: data.timestamp,
          warning: data.warning ?? false,
        };
      });
      callback(messages);
    },
    (error) => {
      console.error("Error subscribing to messages:", error);
      if (onError) onError(error);
    }
  );
}

/**
 * Subscribe to all active chats for an expert.
 */
export function subscribeToExpertChats(
  expertId: string,
  callback: (chats: Chat[]) => void,
  onError?: (error: any) => void
) {
  const db = getFirebaseDb();
  const chatsRef = collection(db, "chats");
  const q = query(
    chatsRef,
    where("expertId", "==", expertId),
    orderBy("updatedAt", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const chats: Chat[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          clientId: data.clientId,
          clientName: data.clientName,
          expertId: data.expertId,
          expertName: data.expertName,
          lastMessage: data.lastMessage,
          lastMessageSender: data.lastMessageSender,
          updatedAt: data.updatedAt,
        };
      });
      callback(chats);
    },
    (error) => {
      console.error("Error subscribing to expert chats:", error);
      if (onError) onError(error);
    }
  );
}

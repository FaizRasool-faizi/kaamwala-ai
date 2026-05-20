import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../config/firebase";

export type ChatMessage = {
  id: string;
  senderId: string;
  senderRole: "client" | "expert" | "system";
  content: string;
  timestamp: unknown;
  warning?: boolean;
};

export type ChatRoom = {
  id: string;
  clientId: string;
  clientName: string;
  expertId: string;
  expertName: string;
  lastMessage: string;
  lastMessageSender: "client" | "expert" | "system" | "";
  updatedAt: unknown;
};

export async function getOrCreateChat(
  clientId: string,
  clientName: string,
  expertId: string,
  expertName: string
): Promise<string> {
  const chatId = `${clientId}_${expertId}`;
  const chatRef = doc(db, "chats", chatId);
  const chatSnap = await getDoc(chatRef);

  if (!chatSnap.exists()) {
    await setDoc(chatRef, {
      clientId,
      clientName,
      expertId,
      expertName,
      lastMessage: "",
      lastMessageSender: "",
      updatedAt: serverTimestamp(),
    });
  } else {
    await updateDoc(chatRef, { clientName, expertName });
  }

  return chatId;
}

export async function sendMessage(
  chatId: string,
  senderId: string,
  senderRole: "client" | "expert" | "system",
  content: string,
  isWarning = false
): Promise<void> {
  const messagesRef = collection(db, "chats", chatId, "messages");
  await addDoc(messagesRef, {
    senderId,
    senderRole,
    content,
    timestamp: serverTimestamp(),
    warning: isWarning,
  });

  if (senderRole !== "system") {
    await updateDoc(doc(db, "chats", chatId), {
      lastMessage: content,
      lastMessageSender: senderRole,
      updatedAt: serverTimestamp(),
    });
  }
}

export function subscribeToMessages(
  chatId: string,
  callback: (messages: ChatMessage[]) => void,
  onError?: (error: unknown) => void
) {
  const messagesRef = collection(db, "chats", chatId, "messages");
  const q = query(messagesRef, orderBy("timestamp", "asc"));

  return onSnapshot(
    q,
    (snapshot) => {
      callback(
        snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            senderId: data.senderId,
            senderRole: data.senderRole,
            content: data.content,
            timestamp: data.timestamp,
            warning: data.warning ?? false,
          };
        })
      );
    },
    (error) => {
      if (onError) onError(error);
    }
  );
}

/** All chats where this user is the expert (same as web `subscribeToExpertChats`). */
export function subscribeToExpertChats(
  expertId: string,
  callback: (chats: ChatRoom[]) => void,
  onError?: (error: unknown) => void
) {
  const chatsRef = collection(db, "chats");
  const q = query(chatsRef, where("expertId", "==", expertId), orderBy("updatedAt", "desc"));

  return onSnapshot(
    q,
    (snapshot) => {
      callback(
        snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            clientId: data.clientId,
            clientName: data.clientName,
            expertId: data.expertId,
            expertName: data.expertName,
            lastMessage: data.lastMessage ?? "",
            lastMessageSender: data.lastMessageSender ?? "",
            updatedAt: data.updatedAt,
          };
        })
      );
    },
    (error) => {
      if (onError) onError(error);
    }
  );
}

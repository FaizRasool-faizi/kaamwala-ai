import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Switch,
  Text,
  TextInput,
  Vibration,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  LogOut,
  MessageSquare,
  Navigation,
  Phone,
  Play,
  Send,
  Settings,
  Sparkles,
  Star,
  User,
  Wallet,
} from "lucide-react-native";
import { auth, db } from "../config/firebase";
import { signOut } from "firebase/auth";
import { collection, doc, getDoc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import tw from "twrnc";
import {
  sendMessage,
  subscribeToExpertChats,
  subscribeToMessages,
  type ChatMessage,
  type ChatRoom,
} from "../services/chatService";

type Booking = {
  id: string;
  providerId: string;
  providerName?: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  service?: string;
  scheduledTime?: string;
  status: string;
  amount?: string;
  distanceKm?: number;
  etaMinutes?: number;
  timestamp?: string;
  clientLocation?: { address?: string; lat?: number; lng?: number };
};

type ExpertProfile = {
  name: string;
  email?: string;
  phone?: string;
  category?: string;
  skills?: string;
  rate?: string;
  rating?: number;
  jobsCompleted?: number;
  profileImage?: string;
  status?: string;
};

type TabId = "overview" | "chat" | "bookings" | "earnings" | "profile" | "settings";

const TABS: { id: TabId; label: string; icon: typeof Sparkles }[] = [
  { id: "overview", label: "Overview", icon: Sparkles },
  { id: "chat", label: "Inbox", icon: MessageSquare },
  { id: "bookings", label: "Bookings", icon: Calendar },
  { id: "earnings", label: "Earnings", icon: Wallet },
  { id: "profile", label: "Profile", icon: User },
  { id: "settings", label: "Settings", icon: Settings },
];

function parseAmount(amount?: string): number {
  const n = parseInt(String(amount || "").replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

function normalizePhone(phone?: string) {
  let digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length === 11) return `92${digits.slice(1)}`;
  return digits;
}

export default function ExpertDashboard() {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [expert, setExpert] = useState<ExpertProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [selectedChat, setSelectedChat] = useState<ChatRoom | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [toast, setToast] = useState<{ chatId: string; sender: string; text: string } | null>(null);
  const [bookingToast, setBookingToast] = useState<{ bookingId: string; sender: string; text: string } | null>(null);
  const chatSigInitialized = useRef(false);
  const chatSigById = useRef<Record<string, string>>({});
  const bookingIdsInitialized = useRef(false);
  const seenBookingIds = useRef<Set<string>>(new Set());
  const bookingReminderTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const messagesListRef = useRef<FlatList<ChatMessage>>(null);

  const expertId = auth.currentUser?.uid;

  const completedBookings = useMemo(
    () => bookings.filter((b) => b.status === "COMPLETED" || b.status === "Completed"),
    [bookings]
  );
  const activeBookings = useMemo(
    () =>
      bookings.filter(
        (b) => b.status === "SCHEDULED" || b.status === "ON_THE_WAY" || b.status === "WORK_STARTED" || b.status === "PENDING"
      ),
    [bookings]
  );

  const totalEarnings = useMemo(
    () => completedBookings.reduce((sum, b) => sum + parseAmount(b.amount), 0),
    [completedBookings]
  );
  const formattedEarnings = `PKR ${totalEarnings.toLocaleString()}`;
  const displayRating = expert?.rating ?? 4.9;

  const unreadChatCount = useMemo(
    () => chats.filter((c) => c.lastMessageSender === "client" && c.lastMessage).length,
    [chats]
  );

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    (async () => {
      try {
        const snap = await getDoc(doc(db, "experts", user.uid));
        if (snap.exists()) {
          const d = snap.data();
          setExpert({
            name: d.name || user.displayName || "Expert",
            email: d.email || user.email || undefined,
            phone: d.phone,
            category: d.category || d.skills,
            skills: d.skills,
            rate: d.rate,
            rating: typeof d.rating === "number" ? d.rating : Number(d.rating) || 4.9,
            jobsCompleted: typeof d.jobsCompleted === "number" ? d.jobsCompleted : Number(d.jobsCompleted) || 0,
            profileImage: d.profileImage,
            status: d.status,
          });
          setIsOnline(String(d.status || "").toLowerCase() !== "offline");
        } else {
          setExpert({
            name: user.displayName || "Expert",
            email: user.email || undefined,
          });
        }
      } finally {
        setLoadingProfile(false);
      }
    })();
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(collection(db, "bookings"), where("providerId", "==", user.uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking));
        list.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
        if (bookingIdsInitialized.current) {
          const freshBooking = list.find((booking) => !seenBookingIds.current.has(booking.id));
          if (freshBooking) {
            setBookingToast({
              bookingId: freshBooking.id,
              sender: freshBooking.customerName || "Customer",
              text: `New booking for ${freshBooking.scheduledTime || "ASAP"}`,
            });
            Vibration.vibrate(500);
            setTimeout(() => setBookingToast(null), 7000);
          }
        }
        list.forEach((booking) => seenBookingIds.current.add(booking.id));
        bookingIdsInitialized.current = true;
        setBookings(list);
        setLoadingBookings(false);
      },
      () => setLoadingBookings(false)
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    Object.values(bookingReminderTimers.current).forEach(clearTimeout);
    bookingReminderTimers.current = {};

    bookings.forEach((booking) => {
      const status = String(booking.status || "").toUpperCase();
      if (!booking.scheduledTime || !["SCHEDULED", "ON_THE_WAY"].includes(status)) return;
      const match = String(booking.scheduledTime).match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (!match) return;

      let hour = Number(match[1]);
      const minute = Number(match[2]);
      const meridiem = match[3].toUpperCase();
      if (meridiem === "PM" && hour !== 12) hour += 12;
      if (meridiem === "AM" && hour === 12) hour = 0;

      const slot = new Date();
      slot.setHours(hour, minute, 0, 0);
      const delay = slot.getTime() - 60 * 60 * 1000 - Date.now();
      if (delay <= 0) return;

      bookingReminderTimers.current[booking.id] = setTimeout(() => {
        setBookingToast({
          bookingId: booking.id,
          sender: booking.customerName || "Customer",
          text: `Reminder: booking at ${booking.scheduledTime}`,
        });
        Vibration.vibrate([0, 300, 120, 300]);
        setTimeout(() => setBookingToast(null), 8000);
      }, delay);
    });

    return () => Object.values(bookingReminderTimers.current).forEach(clearTimeout);
  }, [bookings]);

  useEffect(() => {
    if (!expertId) return;
    const unsub = subscribeToExpertChats(expertId, setChats);
    return () => unsub();
  }, [expertId]);

  useEffect(() => {
    if (!activeChatId) {
      setChatMessages([]);
      return;
    }
    const unsub = subscribeToMessages(activeChatId, setChatMessages);
    return () => unsub();
  }, [activeChatId]);

  useEffect(() => {
    if (chatMessages.length === 0) return;
    const t = setTimeout(() => messagesListRef.current?.scrollToEnd({ animated: true }), 120);
    return () => clearTimeout(t);
  }, [chatMessages]);

  /** New customer message on any thread (Firestore chat summary updates). */
  useEffect(() => {
    if (!chatSigInitialized.current) {
      chats.forEach((c) => {
        chatSigById.current[c.id] = `${c.lastMessage}|${c.lastMessageSender}`;
      });
      chatSigInitialized.current = true;
      return;
    }
    for (const c of chats) {
      const sig = `${c.lastMessage}|${c.lastMessageSender}`;
      const prev = chatSigById.current[c.id];
      if (prev !== sig && c.lastMessageSender === "client" && c.lastMessage) {
        const viewing = activeTab === "chat" && selectedChat?.id === c.id;
        if (!viewing) {
          setToast({ chatId: c.id, sender: c.clientName, text: c.lastMessage });
          Vibration.vibrate(400);
          setTimeout(() => setToast(null), 6000);
        }
      }
      chatSigById.current[c.id] = sig;
    }
  }, [chats, activeTab, selectedChat?.id]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.replace("Login");
    } catch {
      Alert.alert("Error", "Failed to log out.");
    }
  };

  const handleOnlineToggle = async (v: boolean) => {
    setIsOnline(v);
    const user = auth.currentUser;
    if (!user) return;
    try {
      await updateDoc(doc(db, "experts", user.uid), {
        status: v ? "Available" : "offline",
      });
    } catch {
      // ignore
    }
  };

  const handleUpdateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "bookings", bookingId), { status: newStatus });
    } catch (e: any) {
      Alert.alert("Update failed", e?.message || "Could not update booking.");
    }
  };

  const openChat = useCallback((c: ChatRoom) => {
    setSelectedChat(c);
    setActiveChatId(c.id);
    setActiveTab("chat");
    setToast(null);
  }, []);

  const handleSendMessage = async () => {
    const text = newMessage.trim();
    const uid = auth.currentUser?.uid;
    if (!text || !activeChatId || !uid || sending) return;
    setSending(true);
    setNewMessage("");
    try {
      await sendMessage(activeChatId, uid, "expert", text);
    } catch {
      Alert.alert("Send failed", "Message could not be sent.");
      setNewMessage(text);
    } finally {
      setSending(false);
    }
  };

  const handleContactCustomer = (booking: Booking) => {
    const phone = booking.customerPhone;
    if (!phone) {
      Alert.alert("No phone", "Customer phone not on file for this booking.");
      return;
    }
    const msg = `Hi ${booking.customerName || "Customer"}, I am ${expert?.name || "your expert"} regarding your booking.`;
    Linking.openURL(`https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(msg)}`);
  };

  const displayName = expert?.name || auth.currentUser?.displayName || "Expert";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (loadingProfile || !expertId) {
    return (
      <View style={tw`flex-1 bg-[#0b0c10] items-center justify-center`}>
        <ActivityIndicator size="large" color="#f97316" />
        <Text style={tw`text-gray-500 text-sm mt-4`}>Loading expert dashboard…</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={["#1c0f05", "#0b0c10"]} style={tw`flex-1`}>
      <SafeAreaView style={tw`flex-1`}>
        {toast && (
          <Pressable
            onPress={() => {
              const c = chats.find((x) => x.id === toast.chatId);
              if (c) openChat(c);
              else {
                setActiveTab("chat");
              }
              setToast(null);
            }}
            style={tw`mx-4 mt-2 bg-[#111216] border border-orange-500/40 rounded-2xl p-4 flex-row items-start gap-3`}
          >
            <Bell size={18} color="#fb923c" />
            <View style={tw`flex-1`}>
              <Text style={tw`text-orange-400 text-[10px] font-black uppercase`}>New message</Text>
              <Text style={tw`text-white text-sm font-bold mt-0.5`} numberOfLines={2}>
                {toast.text}
              </Text>
              <Text style={tw`text-gray-500 text-[10px] mt-1`}>From {toast.sender} · tap to open Inbox</Text>
            </View>
            <Pressable onPress={() => setToast(null)} hitSlop={12}>
              <Text style={tw`text-gray-500 font-bold`}>✕</Text>
            </Pressable>
          </Pressable>
        )}
        {bookingToast && (
          <Pressable
            onPress={() => {
              setActiveTab("bookings");
              setBookingToast(null);
            }}
            style={tw`mx-4 mt-2 bg-[#111216] border border-green-500/40 rounded-2xl p-4 flex-row items-start gap-3`}
          >
            <Bell size={18} color="#22c55e" />
            <View style={tw`flex-1`}>
              <Text style={tw`text-white text-xs font-black uppercase`}>{bookingToast.sender}</Text>
              <Text style={tw`text-gray-300 text-xs mt-1`} numberOfLines={2}>
                {bookingToast.text}
              </Text>
            </View>
          </Pressable>
        )}

        <View style={tw`flex-row justify-between items-center px-4 py-3 border-b border-white/10 bg-black/40`}>
          <View>
            <Text style={tw`text-white text-lg font-black`}>
              Appointix
            </Text>
            <Text style={tw`text-gray-500 text-[10px]`}>Expert dashboard · Firestore live</Text>
          </View>
          <Pressable onPress={handleLogout} style={tw`p-2.5 bg-white/5 border border-white/10 rounded-full`}>
            <LogOut size={16} color="#f97316" />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`max-h-14 border-b border-white/5 bg-black/30`} contentContainerStyle={tw`px-2 py-2 gap-1`}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            const badge = tab.id === "chat" && unreadChatCount > 0;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={tw`px-3 py-2 rounded-xl mr-1 flex-row items-center gap-1.5 ${
                  active ? "bg-orange-500/15 border border-orange-500/30" : "bg-transparent border border-transparent"
                }`}
              >
                <Icon size={16} color={active ? "#fb923c" : "#9ca3af"} />
                <Text style={tw`${active ? "text-orange-400" : "text-gray-400"} text-xs font-bold`}>{tab.label}</Text>
                {badge && (
                  <View style={tw`bg-orange-600 min-w-[18px] h-[18px] rounded-full items-center justify-center px-1`}>
                    <Text style={tw`text-white text-[9px] font-black`}>{unreadChatCount}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        <KeyboardAvoidingView
          style={tw`flex-1`}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
        >
          {activeTab === "chat" ? (
            <View style={tw`flex-1 px-4 pt-4 pb-4`}>
              <Text style={tw`text-white font-black text-lg mb-1`}>Client inbox</Text>
              <Text style={tw`text-gray-500 text-xs mb-3`}>Real-time chats with customers</Text>

              <View style={tw`flex-1 flex-row gap-2 min-h-[420px]`}>
                <View style={tw`w-[38%] border border-white/10 rounded-2xl bg-black/40 overflow-hidden`}>
                  <FlatList
                    data={chats}
                    keyExtractor={(c) => c.id}
                    ListEmptyComponent={<Text style={tw`text-gray-500 text-xs p-3`}>No conversations yet.</Text>}
                    renderItem={({ item }) => (
                      <Pressable
                        onPress={() => {
                          setSelectedChat(item);
                          setActiveChatId(item.id);
                          setToast(null);
                        }}
                        style={tw`p-3 border-b border-white/5 ${selectedChat?.id === item.id ? "bg-orange-500/10" : ""}`}
                      >
                        <Text style={tw`text-white font-bold text-xs`} numberOfLines={1}>
                          {item.clientName}
                        </Text>
                        <Text style={tw`text-gray-500 text-[10px] mt-1`} numberOfLines={1}>
                          {item.lastMessage || "—"}
                        </Text>
                        {item.lastMessageSender === "client" && item.lastMessage ? (
                          <View style={tw`w-2 h-2 rounded-full bg-orange-500 mt-1`} />
                        ) : null}
                      </Pressable>
                    )}
                  />
                </View>

                <View style={tw`flex-1 border border-white/10 rounded-2xl bg-[#0a0a0a] overflow-hidden`}>
                  {!selectedChat ? (
                    <View style={tw`p-6 items-center justify-center flex-1`}>
                      <MessageSquare size={32} color="#4b5563" />
                      <Text style={tw`text-gray-500 text-xs text-center mt-2`}>Select a customer to reply</Text>
                    </View>
                  ) : (
                    <View style={tw`flex-1`}>
                      <View style={tw`px-3 py-2 border-b border-white/10 bg-black/50`}>
                        <Text style={tw`text-white font-bold text-sm`}>{selectedChat.clientName}</Text>
                        <Text style={tw`text-gray-500 text-[10px]`}>Chat ID: {selectedChat.id}</Text>
                      </View>
                      <FlatList
                        ref={messagesListRef}
                        data={chatMessages}
                        keyExtractor={(m) => m.id}
                        style={tw`flex-1 px-2`}
                        contentContainerStyle={tw`py-2 pb-2`}
                        renderItem={({ item: m }) => {
                          const mine = m.senderRole === "expert";
                          return (
                            <View style={tw`mb-2 ${mine ? "items-end" : "items-start"}`}>
                              <View
                                style={tw`max-w-[90%] px-3 py-2 rounded-xl ${
                                  mine ? "bg-orange-500" : m.warning ? "bg-red-500/20 border border-red-500/30" : "bg-white/10"
                                }`}
                              >
                                <Text style={tw`text-white text-xs`}>{m.content}</Text>
                              </View>
                            </View>
                          );
                        }}
                      />
                      <View style={tw`flex-row items-center gap-2 p-2 border-t border-white/10`}>
                        <TextInput
                          value={newMessage}
                          onChangeText={setNewMessage}
                          placeholder="Type a reply…"
                          placeholderTextColor="#6b7280"
                          style={tw`flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-xs max-h-24`}
                          multiline
                        />
                        <Pressable
                          onPress={handleSendMessage}
                          disabled={sending || !newMessage.trim()}
                          style={tw`bg-orange-500 w-10 h-10 rounded-full items-center justify-center ${sending ? "opacity-50" : ""}`}
                        >
                          <Send size={16} color="#fff" />
                        </Pressable>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            </View>
          ) : (
            <ScrollView contentContainerStyle={tw`pb-10 px-4 pt-4`} keyboardShouldPersistTaps="handled">
            {activeTab === "overview" && (
              <>
                <Text style={tw`text-white text-2xl font-black mb-1`}>Welcome back, {displayName.split(" ")[0]}!</Text>
                <Text style={tw`text-gray-500 text-xs mb-5`}>Live data from your expert account</Text>

                <View style={tw`flex-row items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-4 mb-4`}>
                  <View style={tw`flex-row items-center gap-3`}>
                    <View style={tw`w-12 h-12 rounded-2xl bg-orange-500/20 items-center justify-center`}>
                      <Text style={tw`text-orange-500 font-black`}>{initials}</Text>
                    </View>
                    <View>
                      <Text style={tw`text-white font-bold`}>{displayName}</Text>
                      <Text style={tw`text-orange-500/90 text-xs capitalize`}>{expert?.category || "Expert"}</Text>
                    </View>
                    <CheckCircle2 size={18} color="#3b82f6" />
                  </View>
                  <View style={tw`items-end`}>
                    <Text style={tw`text-gray-500 text-[9px] font-bold uppercase`}>Status</Text>
                    <Switch value={isOnline} onValueChange={handleOnlineToggle} trackColor={{ false: "#374151", true: "#f97316" }} />
                  </View>
                </View>

                <View style={tw`flex-row flex-wrap gap-2 mb-4`}>
                  <View style={tw`w-[48%] bg-white/5 border border-white/10 rounded-2xl p-4`}>
                    <Wallet size={18} color="#4ade80" style={tw`mb-2`} />
                    <Text style={tw`text-gray-500 text-[9px] uppercase font-bold`}>Real earnings</Text>
                    <Text style={tw`text-white font-black text-lg`}>{formattedEarnings}</Text>
                  </View>
                  <View style={tw`w-[48%] bg-white/5 border border-white/10 rounded-2xl p-4`}>
                    <CheckCircle2 size={18} color="#60a5fa" style={tw`mb-2`} />
                    <Text style={tw`text-gray-500 text-[9px] uppercase font-bold`}>Completed</Text>
                    <Text style={tw`text-white font-black text-lg`}>{completedBookings.length}</Text>
                    <Text style={tw`text-gray-600 text-[10px]`}>of {bookings.length} booked</Text>
                  </View>
                  <View style={tw`w-[48%] bg-white/5 border border-white/10 rounded-2xl p-4`}>
                    <Star size={18} color="#fbbf24" fill="#fbbf24" style={tw`mb-2`} />
                    <Text style={tw`text-gray-500 text-[9px] uppercase font-bold`}>Rating</Text>
                    <Text style={tw`text-white font-black text-lg`}>{displayRating}</Text>
                  </View>
                  <View style={tw`w-[48%] bg-white/5 border border-white/10 rounded-2xl p-4`}>
                    <Clock size={18} color="#fb923c" style={tw`mb-2`} />
                    <Text style={tw`text-gray-500 text-[9px] uppercase font-bold`}>Active jobs</Text>
                    <Text style={tw`text-white font-black text-lg`}>{activeBookings.length}</Text>
                  </View>
                </View>

                <Text style={tw`text-white font-black text-sm mb-2`}>Recent requests</Text>
                {loadingBookings ? (
                  <ActivityIndicator color="#f97316" />
                ) : bookings.length === 0 ? (
                  <View style={tw`bg-white/5 border border-dashed border-white/10 rounded-2xl p-6 items-center`}>
                    <Calendar size={28} color="#6b7280" />
                    <Text style={tw`text-gray-500 text-sm text-center mt-2`}>No bookings yet. Customers will appear here after they book you.</Text>
                  </View>
                ) : (
                  bookings.slice(0, 5).map((b) => (
                    <View key={b.id} style={tw`bg-[#121318] border border-white/10 rounded-2xl p-4 mb-2`}>
                      <View style={tw`flex-row justify-between items-start mb-2`}>
                        <Text style={tw`text-white font-bold flex-1`}>{b.customerName || "Customer"}</Text>
                        <Text style={tw`text-[10px] font-black uppercase px-2 py-1 rounded-full bg-blue-500/15 text-blue-300`}>{b.status}</Text>
                      </View>
                      <Text style={tw`text-gray-400 text-xs mb-2`} numberOfLines={2}>
                        {b.service || "Service"}
                      </Text>
                      <View style={tw`flex-row justify-between items-center`}>
                        <Text style={tw`text-gray-500 text-xs`}>{b.scheduledTime || "—"}</Text>
                        <Text style={tw`text-orange-500 font-bold text-sm`}>{b.amount || `PKR ${expert?.rate || "1,500"}`}</Text>
                      </View>
                      {b.status === "SCHEDULED" || b.status === "PENDING" ? (
                        <Pressable
                          onPress={() => handleUpdateBookingStatus(b.id, "ON_THE_WAY")}
                          style={tw`mt-3 bg-orange-500 py-3 rounded-xl flex-row items-center justify-center gap-2`}
                        >
                          <Navigation size={16} color="#fff" />
                          <Text style={tw`text-white font-black text-xs uppercase`}>Start journey</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ))
                )}
              </>
            )}

            {activeTab === "bookings" && (
              <>
                <Text style={tw`text-white font-black text-lg mb-1`}>All bookings</Text>
                <Text style={tw`text-gray-500 text-xs mb-3`}>Update status like the web dashboard</Text>
                {loadingBookings ? (
                  <ActivityIndicator color="#f97316" />
                ) : bookings.length === 0 ? (
                  <Text style={tw`text-gray-500 text-sm`}>No bookings yet.</Text>
                ) : (
                  bookings.map((b) => (
                    <View key={b.id} style={tw`bg-[#121318] border border-white/10 rounded-2xl p-4 mb-3`}>
                      <Text style={tw`text-gray-500 text-[10px] font-mono mb-1`}>{b.id}</Text>
                      <View style={tw`flex-row justify-between items-center mb-2`}>
                        <Text style={tw`text-white font-bold`}>{b.customerName || "Customer"}</Text>
                        <Text
                          style={tw`text-[10px] font-black uppercase px-2 py-1 rounded-full ${
                            b.status === "SCHEDULED" || b.status === "PENDING"
                              ? "bg-blue-500/20 text-blue-300"
                              : b.status === "ON_THE_WAY"
                                ? "bg-orange-500/20 text-orange-300"
                                : b.status === "WORK_STARTED"
                                  ? "bg-purple-500/20 text-purple-300"
                                  : "bg-green-500/20 text-green-300"
                          }`}
                        >
                          {b.status}
                        </Text>
                      </View>
                      <Text style={tw`text-gray-400 text-xs mb-1`}>{b.service}</Text>
                      <View style={tw`flex-row flex-wrap gap-3 mb-3`}>
                        <View style={tw`flex-row items-center gap-1`}>
                          <Clock size={12} color="#9ca3af" />
                          <Text style={tw`text-gray-500 text-xs`}>{b.scheduledTime || "—"}</Text>
                        </View>
                        <View style={tw`flex-row items-center gap-1`}>
                          <Wallet size={12} color="#9ca3af" />
                          <Text style={tw`text-gray-300 text-xs font-bold`}>{b.amount || `PKR ${expert?.rate}`}</Text>
                        </View>
                      </View>
                      <View style={tw`flex-row gap-2 flex-wrap`}>
                        {(b.status === "SCHEDULED" || b.status === "PENDING") && (
                          <Pressable onPress={() => handleUpdateBookingStatus(b.id, "ON_THE_WAY")} style={tw`bg-orange-500 px-4 py-2.5 rounded-xl flex-row items-center gap-1`}>
                            <Navigation size={14} color="#fff" />
                            <Text style={tw`text-white text-[10px] font-black uppercase`}>Start journey</Text>
                          </Pressable>
                        )}
                        {b.status === "ON_THE_WAY" && (
                          <Pressable onPress={() => handleUpdateBookingStatus(b.id, "WORK_STARTED")} style={tw`bg-purple-600 px-4 py-2.5 rounded-xl flex-row items-center gap-1`}>
                            <Play size={14} color="#fff" />
                            <Text style={tw`text-white text-[10px] font-black uppercase`}>Start work</Text>
                          </Pressable>
                        )}
                        {b.status === "WORK_STARTED" && (
                          <Pressable onPress={() => handleUpdateBookingStatus(b.id, "COMPLETED")} style={tw`bg-green-600 px-4 py-2.5 rounded-xl flex-row items-center gap-1`}>
                            <Check size={14} color="#fff" />
                            <Text style={tw`text-white text-[10px] font-black uppercase`}>Complete</Text>
                          </Pressable>
                        )}
                        <Pressable onPress={() => handleContactCustomer(b)} style={tw`bg-white/10 px-4 py-2.5 rounded-xl flex-row items-center gap-1 border border-white/10`}>
                          <Phone size={14} color="#f97316" />
                          <Text style={tw`text-orange-400 text-[10px] font-bold`}>WhatsApp</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))
                )}
              </>
            )}

            {activeTab === "earnings" && (
              <>
                <Text style={tw`text-white font-black text-lg mb-3`}>Earnings</Text>
                <View style={tw`bg-white/5 border border-white/10 rounded-2xl p-4 mb-3`}>
                  <Text style={tw`text-gray-500 text-xs uppercase font-bold`}>Gross (completed jobs)</Text>
                  <Text style={tw`text-white font-black text-2xl mt-1`}>{formattedEarnings}</Text>
                </View>
                <View style={tw`bg-white/5 border border-white/10 rounded-2xl p-4 mb-3`}>
                  <Text style={tw`text-gray-500 text-xs uppercase font-bold`}>Your rate</Text>
                  <Text style={tw`text-orange-400 font-black text-xl mt-1`}>PKR {expert?.rate || "1,500"}</Text>
                </View>
                {completedBookings.length === 0 ? (
                  <Text style={tw`text-gray-500 text-sm`}>Complete jobs to see earnings here.</Text>
                ) : (
                  completedBookings.map((b) => (
                    <View key={b.id} style={tw`flex-row justify-between py-3 border-b border-white/5`}>
                      <View>
                        <Text style={tw`text-white text-sm font-bold`}>{b.customerName}</Text>
                        <Text style={tw`text-gray-500 text-[10px]`}>{b.scheduledTime}</Text>
                      </View>
                      <Text style={tw`text-green-400 font-bold`}>{b.amount || `PKR ${expert?.rate}`}</Text>
                    </View>
                  ))
                )}
              </>
            )}

            {activeTab === "profile" && (
              <>
                <Text style={tw`text-white font-black text-lg mb-4`}>My profile</Text>
                <View style={tw`bg-[#121318] border border-white/10 rounded-2xl p-4 gap-3`}>
                  <Row label="Name" value={displayName} />
                  <Row label="Email" value={expert?.email || "—"} />
                  <Row label="Phone" value={expert?.phone || "—"} />
                  <Row label="Category" value={expert?.category || "—"} />
                  <Row label="Skills" value={expert?.skills || "—"} />
                  <Row label="Expert ID" value={expertId} />
                </View>
              </>
            )}

            {activeTab === "settings" && (
              <>
                <Text style={tw`text-white font-black text-lg mb-2`}>Settings</Text>
                <Text style={tw`text-gray-400 text-sm leading-relaxed mb-4`}>
                  Push notifications from the app store require extra setup. You already get in-app alerts and vibration when a customer sends a message while you are on another tab.
                </Text>
                <View style={tw`bg-white/5 border border-white/10 rounded-2xl p-4`}>
                  <Text style={tw`text-gray-500 text-xs`}>Expert UID</Text>
                  <Text style={tw`text-white text-xs font-mono mt-1`} selectable>
                    {expertId}
                  </Text>
                </View>
              </>
            )}
          </ScrollView>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={tw`text-gray-500 text-[10px] font-bold uppercase`}>{label}</Text>
      <Text style={tw`text-white text-sm mt-0.5`}>{value}</Text>
    </View>
  );
}

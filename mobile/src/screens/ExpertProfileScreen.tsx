import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowLeft,
  Award,
  BadgeCheck,
  Calendar,
  CalendarClock,
  Clock,
  DollarSign,
  Send,
  Shield,
  Star,
  Zap,
} from "lucide-react-native";
import { doc, getDoc, setDoc } from "firebase/firestore";
import axios from "axios";
import tw from "twrnc";
import { auth, db } from "../config/firebase";
import type { ProviderOption } from "../types/provider";
import ExpertAvatar from "../components/ExpertAvatar";
import { getOrCreateChat, sendMessage, subscribeToMessages, type ChatMessage } from "../services/chatService";

const API_URL = "https://faizrasool01-kaamwala-backend.hf.space";
const TIME_SLOTS = ["10:00 AM", "12:30 PM", "03:00 PM", "05:00 PM"];

type ExpertDoc = {
  id: string;
  name: string;
  phone?: string;
  skills?: string;
  bio?: string;
  experience?: string;
  rate?: string;
  hours?: string;
  profileImage?: string;
  rating?: number;
  jobsCompleted?: number;
};

function normalizeWhatsAppNumber(phone: string, defaultCountryCode = "92") {
  let digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length === 11) return `${defaultCountryCode}${digits.slice(1)}`;
  if (digits.length === 10 && !digits.startsWith(defaultCountryCode)) return `${defaultCountryCode}${digits}`;
  return digits;
}

function mergeExpert(preview: ProviderOption | undefined, docData: ExpertDoc | null): ExpertDoc | null {
  if (!preview && !docData) return null;
  return {
    id: docData?.id || preview?.id || "",
    name: docData?.name || preview?.name || "Expert",
    phone: docData?.phone || preview?.phone,
    skills: docData?.skills || preview?.skills || preview?.specialization || preview?.service,
    bio: docData?.bio || preview?.bio,
    experience: docData?.experience || preview?.experience,
    rate: docData?.rate || preview?.rate,
    hours: docData?.hours || preview?.hours,
    profileImage: docData?.profileImage || preview?.avatarUrl || preview?.profileImage,
    rating: preview?.rating ?? 4.8,
    jobsCompleted: preview?.jobsCompleted ?? 45,
  };
}

export default function ExpertProfileScreen({ navigation, route }: any) {
  const expertId: string = route.params?.expertId;
  const preview: ProviderOption | undefined = route.params?.preview;
  const lastRequest: string = route.params?.lastRequest || "Service request";
  const userLocation = route.params?.userLocation || { lat: 31.5204, lng: 74.3587 };

  const [expert, setExpert] = useState<ExpertDoc | null>(() => mergeExpert(preview, null));
  const [loading, setLoading] = useState(true);
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [profileName, setProfileName] = useState("Customer");

  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    async function loadExpert() {
      try {
        const snap = await getDoc(doc(db, "experts", expertId));
        if (snap.exists()) {
          const data = snap.data();
          setExpert(
            mergeExpert(preview, {
              id: expertId,
              name: data.name,
              phone: data.phone,
              skills: data.skills,
              bio: data.bio,
              experience: data.experience,
              rate: data.rate,
              hours: data.hours,
              profileImage: data.profileImage,
            })
          );
        } else if (!preview) {
          setExpert(null);
        }
      } catch {
        if (!preview) setExpert(null);
      } finally {
        setLoading(false);
      }
    }

    if (expertId) loadExpert();
    else setLoading(false);
  }, [expertId, preview]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user || !expert) return;

    let unsub: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      try {
        let clientName = user.displayName || "Customer";
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          clientName = userDoc.data().name || clientName;
          setProfileName(clientName);
        }

        const cId = await getOrCreateChat(user.uid, clientName, expert.id, expert.name);
        if (cancelled) return;
        setChatId(cId);
        unsub = subscribeToMessages(cId, setMessages);
      } catch (err) {
        console.warn("Chat init failed", err);
      }
    })();

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [expert?.id, expert?.name]);

  useEffect(() => {
    if (messages.length > 0) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  const handleSend = async () => {
    const text = newMessage.trim();
    const user = auth.currentUser;
    if (!text || !chatId || !user || sending) return;

    setSending(true);
    setNewMessage("");
    try {
      await sendMessage(chatId, user.uid, "client", text);
    } catch {
      Alert.alert("Message failed", "Could not send your message. Please try again.");
      setNewMessage(text);
    } finally {
      setSending(false);
    }
  };

  const handleBooking = async () => {
    if (!selectedTime || !expert) return;
    setBookingLoading(true);
    try {
      let phone = expert.phone || "";
      if (!phone) {
        const snap = await getDoc(doc(db, "experts", expert.id));
        if (snap.exists()) phone = snap.data().phone || "";
      }
      if (!phone) {
        Alert.alert("No Contact", "This expert has no phone number on file.");
        return;
      }

      const response = await axios.post(`${API_URL}/api/booking/create`, {
        providerId: expert.id,
        clientLocation: userLocation,
        service: lastRequest,
        scheduledTime: selectedTime,
      });

      if (response.data.success) {
        const bookingId = response.data.bookingId;
        const rate = expert.rate ? `PKR ${expert.rate}` : "PKR 1,500";
        await setDoc(doc(db, "bookings", bookingId), {
          id: bookingId,
          providerId: String(expert.id),
          providerName: expert.name,
          customerId: auth.currentUser?.uid || "anonymous",
          customerName: profileName,
          customerPhone: auth.currentUser?.phoneNumber || "None",
          expertPhone: phone,
          service: lastRequest,
          clientLocation: userLocation,
          status: "SCHEDULED",
          scheduledTime: selectedTime,
          timestamp: new Date().toISOString(),
          amount: rate,
          distanceKm: preview?.distanceKm || 2.4,
          etaMinutes: preview?.etaMinutes || 15,
        });

        const waMsg = [
          `Hi ${expert.name},`,
          "",
          "I have booked you through KaamWala AI App.",
          "",
          `Service: ${lastRequest}`,
          `Time: ${selectedTime}`,
          `Booking ID: ${bookingId}`,
        ].join("\n");

        setBookingOpen(false);
        Alert.alert("Booking Successful", "Open WhatsApp to coordinate with the expert?", [
          { text: "Later", style: "cancel" },
          {
            text: "Open WhatsApp",
            onPress: () => Linking.openURL(`https://wa.me/${normalizeWhatsAppNumber(phone)}?text=${encodeURIComponent(waMsg)}`),
          },
        ]);
      }
    } catch (err: any) {
      Alert.alert("Booking failed", err.message || "Could not create booking.");
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading && !expert) {
    return (
      <View style={tw`flex-1 bg-[#0b0c10] items-center justify-center`}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  if (!expert) {
    return (
      <SafeAreaView style={tw`flex-1 bg-[#0b0c10] items-center justify-center px-6`}>
        <Text style={tw`text-white text-xl font-bold mb-2`}>Expert Not Found</Text>
        <Pressable onPress={() => navigation.goBack()} style={tw`mt-4 bg-orange-500 px-6 py-3 rounded-2xl`}>
          <Text style={tw`text-white font-bold`}>Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const rates = expert.rate ? `PKR ${Number(expert.rate).toLocaleString()}` : "PKR 1,500";

  return (
    <LinearGradient colors={["#0b0c10", "#121318", "#0b0c10"]} style={tw`flex-1`}>
      <SafeAreaView style={tw`flex-1`}>
        <KeyboardAvoidingView
          style={tw`flex-1`}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        >
          <View style={tw`px-4 py-3 flex-row items-center justify-between border-b border-white/10`}>
            <Pressable onPress={() => navigation.goBack()} style={tw`flex-row items-center gap-2 py-1`}>
              <ArrowLeft size={20} color="#9ca3af" />
              <Text style={tw`text-gray-400 font-bold text-sm`}>Back to Search</Text>
            </Pressable>
            <View style={tw`flex-row items-center gap-1 bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-full`}>
              <Zap size={12} color="#fb923c" />
              <Text style={tw`text-orange-300 text-[10px] font-black uppercase`}>Verified</Text>
            </View>
          </View>

          <ScrollView style={tw`flex-1`} contentContainerStyle={tw`pb-4`} keyboardShouldPersistTaps="handled">
            <View style={tw`mx-4 mt-4 bg-[#111216] border border-white/10 rounded-3xl overflow-hidden p-4`}>
              <View style={tw`relative w-full h-52 rounded-2xl overflow-hidden mb-4`}>
                <ExpertAvatar
                  name={expert.name}
                  avatarUrl={preview?.avatarUrl || expert.profileImage}
                  profileImage={expert.profileImage}
                  style={tw`w-full h-full`}
                />
                <View style={tw`absolute top-3 left-3 flex-row items-center gap-1 bg-green-500/20 border border-green-500/30 px-2.5 py-1 rounded-xl`}>
                  <BadgeCheck size={14} color="#4ade80" />
                  <Text style={tw`text-green-300 text-xs font-bold`}>Available</Text>
                </View>
              </View>

              <View style={tw`flex-row justify-between items-start mb-3`}>
                <View style={tw`flex-1 pr-2`}>
                  <Text style={tw`text-white text-2xl font-black`}>{expert.name}</Text>
                  <Text style={tw`text-orange-400 font-bold text-xs uppercase mt-1`}>{expert.skills}</Text>
                </View>
                <View style={tw`flex-row items-center gap-1 bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-xl`}>
                  <Star size={14} color="#fbbf24" fill="#fbbf24" />
                  <Text style={tw`text-white font-bold text-sm`}>{expert.rating ?? 4.8}</Text>
                </View>
              </View>

              <Text style={tw`text-gray-500 text-[10px] font-bold uppercase mb-1`}>About Expert</Text>
              <Text style={tw`text-gray-300 text-sm leading-relaxed mb-4`}>
                {expert.bio ||
                  "Professional technician dedicated to offering outstanding technical skills, prompt service timelines, and high reliability for residential repairs."}
              </Text>

              <View style={tw`flex-row flex-wrap gap-2 mb-4`}>
                <View style={tw`w-[48%] flex-row items-center gap-2 bg-white/5 border border-white/5 rounded-xl p-2.5`}>
                  <Award size={16} color="#fb923c" />
                  <View>
                    <Text style={tw`text-gray-500 text-[8px] font-bold uppercase`}>Jobs</Text>
                    <Text style={tw`text-white text-xs font-bold`}>{expert.jobsCompleted}+ Completed</Text>
                  </View>
                </View>
                <View style={tw`w-[48%] flex-row items-center gap-2 bg-white/5 border border-white/5 rounded-xl p-2.5`}>
                  <Calendar size={16} color="#60a5fa" />
                  <View>
                    <Text style={tw`text-gray-500 text-[8px] font-bold uppercase`}>Experience</Text>
                    <Text style={tw`text-white text-xs font-bold`}>{expert.experience || "5 years"}</Text>
                  </View>
                </View>
                <View style={tw`w-[48%] flex-row items-center gap-2 bg-white/5 border border-white/5 rounded-xl p-2.5`}>
                  <Clock size={16} color="#c084fc" />
                  <View>
                    <Text style={tw`text-gray-500 text-[8px] font-bold uppercase`}>Availability</Text>
                    <Text style={tw`text-white text-xs font-bold`}>{expert.hours || "Full Time"}</Text>
                  </View>
                </View>
                <View style={tw`w-[48%] flex-row items-center gap-2 bg-white/5 border border-white/5 rounded-xl p-2.5`}>
                  <DollarSign size={16} color="#4ade80" />
                  <View>
                    <Text style={tw`text-gray-500 text-[8px] font-bold uppercase`}>Starting Rate</Text>
                    <Text style={tw`text-green-400 text-xs font-black`}>{rates} / Visit</Text>
                  </View>
                </View>
              </View>

              <Pressable
                onPress={() => expert.phone && Linking.openURL(`tel:${expert.phone}`)}
                style={tw`bg-white py-3.5 rounded-2xl items-center mb-2`}
              >
                <Text style={tw`text-black font-black text-xs uppercase tracking-wider`}>Call Expert Directly</Text>
              </Pressable>
              <Pressable onPress={() => setBookingOpen(true)} style={tw`bg-orange-500 py-3.5 rounded-2xl items-center`}>
                <Text style={tw`text-white font-black text-xs uppercase tracking-wider`}>Book Service Appointment</Text>
              </Pressable>
            </View>

            <View style={tw`mx-4 mt-3 bg-blue-500/5 border border-blue-500/10 rounded-2xl p-4 flex-row gap-3`}>
              <Shield size={22} color="#60a5fa" />
              <View style={tw`flex-1`}>
                <Text style={tw`text-white text-xs font-bold uppercase`}>KaamWala Guarantee</Text>
                <Text style={tw`text-gray-400 text-[10px] mt-1 leading-relaxed`}>
                  All platform experts undergo mandatory police verification and background checkups for maximum safety.
                </Text>
              </View>
            </View>

            <View style={tw`mx-4 mt-4 bg-[#111216] border border-white/10 rounded-3xl overflow-hidden min-h-[320px]`}>
              <View style={tw`flex-row items-center gap-3 px-4 py-3 border-b border-white/10 bg-black/30`}>
                <ExpertAvatar
                  name={expert.name}
                  avatarUrl={preview?.avatarUrl || expert.profileImage}
                  profileImage={expert.profileImage}
                  style={tw`w-10 h-10`}
                  rounded="full"
                />
                <View>
                  <Text style={tw`text-white font-black text-sm uppercase`}>{expert.name}</Text>
                  <Text style={tw`text-green-400 text-[10px] font-bold`}>AI Moderation Shield Active</Text>
                </View>
              </View>

              <FlatList
                ref={listRef}
                data={messages}
                keyExtractor={(item) => item.id}
                style={tw`max-h-64 px-4 py-3`}
                nestedScrollEnabled
                ListEmptyComponent={
                  <Text style={tw`text-gray-500 text-xs text-center py-8`}>
                    Send a message to start chatting with this expert.
                  </Text>
                }
                renderItem={({ item }) => {
                  const isClient = item.senderRole === "client";
                  return (
                    <View style={tw`mb-2 ${isClient ? "items-end" : "items-start"}`}>
                      <View
                        style={tw`max-w-[85%] px-3 py-2 rounded-2xl ${
                          isClient ? "bg-orange-500" : item.warning ? "bg-red-500/20 border border-red-500/30" : "bg-white/10"
                        }`}
                      >
                        <Text style={tw`${isClient ? "text-white" : "text-gray-200"} text-sm`}>{item.content}</Text>
                      </View>
                    </View>
                  );
                }}
              />

              <View style={tw`flex-row items-center gap-2 px-3 py-3 border-t border-white/10`}>
                <TextInput
                  value={newMessage}
                  onChangeText={setNewMessage}
                  placeholder="Ask in Roman Urdu or English..."
                  placeholderTextColor="#6b7280"
                  style={tw`flex-1 bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm`}
                />
                <Pressable
                  onPress={handleSend}
                  disabled={sending || !newMessage.trim()}
                  style={tw`bg-orange-500 w-11 h-11 rounded-full items-center justify-center ${sending ? "opacity-50" : ""}`}
                >
                  <Send size={18} color="#fff" />
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        <Modal visible={bookingOpen} animationType="slide" transparent onRequestClose={() => setBookingOpen(false)}>
          <View style={tw`flex-1 justify-end bg-black/60`}>
            <View style={tw`bg-[#121318] border-t border-white/10 rounded-t-[2rem] p-6`}>
              <Text style={tw`text-white text-xl font-bold mb-4`}>Confirm Time Slot</Text>
              <View style={tw`flex-row flex-wrap gap-2 mb-6`}>
                {TIME_SLOTS.map((time) => (
                  <Pressable
                    key={time}
                    onPress={() => setSelectedTime(time)}
                    style={tw`px-4 py-3 rounded-2xl border ${
                      selectedTime === time ? "bg-orange-500 border-orange-500" : "bg-black/40 border-white/10"
                    }`}
                  >
                    <Text style={tw`text-white text-xs font-bold`}>{time}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                onPress={handleBooking}
                disabled={bookingLoading}
                style={tw`bg-orange-500 py-4 rounded-2xl flex-row items-center justify-center gap-2`}
              >
                {bookingLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <CalendarClock size={18} color="#fff" />
                    <Text style={tw`text-white font-bold`}>Confirm Booking</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

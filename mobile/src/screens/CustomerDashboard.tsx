import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import {
  Bot,
  CalendarClock,
  Camera,
  CheckCircle2,
  Clock,
  Image as ImageIcon,
  MapPin,
  Mic,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  LogOut,
  Terminal,
  X,
  Zap,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { auth, db } from "../config/firebase";
import { signOut } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";
import axios from "axios";
import tw from "twrnc";
import MapView, { Marker } from "react-native-maps";
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from "expo-speech-recognition";
import type { ProviderOption } from "../types/provider";
import type { TraceEvent } from "../types/trace";
import { mapApiLogsToTraces } from "../types/trace";
import { enrichProvidersWithFirestore } from "../utils/enrichProviders";
import ExpertAvatar from "../components/ExpertAvatar";
import AgentTracePanel from "../components/AgentTracePanel";
import { io, Socket } from "socket.io-client";

const API_URL = "https://faizrasool01-kaamwala-backend.hf.space";
const LAHORE_FALLBACK = { lat: 31.5204, lng: 74.3587 };
const QUICK_REQUESTS = ["AC Repair", "Plumbing", "Electrician", "Home Cleaning", "Tutor"];
const TIME_SLOTS = ["10:00 AM", "12:30 PM", "03:00 PM", "05:00 PM"];
const ACTIVE_BOOKING_STATUSES = new Set(["SCHEDULED", "ON_THE_WAY", "WORK_STARTED", "PENDING"]);
const APP_BUILD = "1.0.2";

function appendTrace(prev: TraceEvent[], trace: TraceEvent): TraceEvent[] {
  const last = prev[prev.length - 1];
  if (last && last.agent === trace.agent && last.status === "pending" && trace.status !== "pending") {
    return [...prev.slice(0, -1), trace];
  }
  const exists = prev.some((t) => t.id === trace.id);
  if (exists) {
    return prev.map((t) => (t.id === trace.id ? trace : t));
  }
  return [...prev, trace];
}

export default function CustomerDashboard() {
  const navigation = useNavigation<any>();
  const [profileName, setProfileName] = useState("Customer");
  const [message, setMessage] = useState("");
  const [lastRequest, setLastRequest] = useState("");
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [traces, setTraces] = useState<TraceEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(LAHORE_FALLBACK);
  const [selectedProvider, setSelectedProvider] = useState<ProviderOption | null>(null);
  const [selectedTime, setSelectedTime] = useState("");
  const [providerBookings, setProviderBookings] = useState<any[]>([]);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [agentProcessing, setAgentProcessing] = useState(false);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const traceSocketRef = useRef<Socket | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const mapRef = useRef<React.ComponentRef<typeof MapView>>(null);
  const bookedSlots = useMemo(
    () =>
      new Set(
        providerBookings
          .filter((booking) => String(booking.providerId) === String(selectedProvider?.id || ""))
          .filter((booking) => ACTIVE_BOOKING_STATUSES.has(String(booking.status || "").toUpperCase()))
          .map((booking) => String(booking.scheduledTime || ""))
          .filter(Boolean)
      ),
    [providerBookings, selectedProvider?.id]
  );

  const openExpertProfile = (item: ProviderOption) => {
    if (!item?.id) {
      Alert.alert("Unavailable", "This expert profile could not be opened.");
      return;
    }
    navigation.navigate("ExpertProfile", {
      expertId: String(item.id),
      preview: item,
      lastRequest,
      userLocation,
    });
  };

  useSpeechRecognitionEvent("result", (event: any) => {
    if (event.results && event.results.length > 0) {
      setMessage(event.results[0].transcript);
    }
  });

  useSpeechRecognitionEvent("end", () => setIsRecording(false));
  useSpeechRecognitionEvent("error", () => setIsRecording(false));

  useEffect(() => {
    return () => {
      traceSocketRef.current?.disconnect();
    };
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleVoiceRecording = async () => {
    try {
      const { status } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission Denied", "Microphone access is required for voice recognition.");
        return;
      }
      if (isRecording) {
        ExpoSpeechRecognitionModule.stop();
        setIsRecording(false);
      } else {
        setIsRecording(true);
        ExpoSpeechRecognitionModule.start({ lang: "ur-PK" });
      }
    } catch (e: any) {
      setIsRecording(false);
      Alert.alert("Voice Error", "Failed to start voice recognition. Please use the APK build.");
    }
  };

  // Fetch logged in user profile details
  useEffect(() => {
    const fetchProfile = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setProfileName(userDoc.data().name || user.displayName || "Customer");
          } else {
            setProfileName(user.displayName || user.email?.split("@")[0] || "Customer");
          }
        } catch {
          // ignore
        }
      }
    };
    fetchProfile();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.replace("Login");
    } catch (error) {
      Alert.alert("Error", "Failed to log out.");
    }
  };

  async function useCurrentLocation() {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Location blocked", "Using Lahore fallback location for expert matching.");
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUserLocation({
        lat: current.coords.latitude,
        lng: current.coords.longitude,
      });
    } catch {
      Alert.alert("Location unavailable", "Using Lahore fallback location for now.");
    } finally {
      setLocationLoading(false);
    }
  }

  async function handleSearch(queryText: string) {
    const searchVal = queryText || message;
    if (!searchVal.trim() && !imageBase64) return;

    setLoading(true);
    setAgentProcessing(true);
    setProviders([]);
    setTraces([]);
    setSelectedProvider(null);
    setLastRequest(searchVal || "Image uploaded for analysis");

    traceSocketRef.current?.disconnect();
    const socket = io(API_URL, { transports: ["websocket", "polling"], autoConnect: true });
    traceSocketRef.current = socket;
    let liveTraces: TraceEvent[] = [];

    const onTrace = (trace: TraceEvent) => {
      liveTraces = appendTrace(liveTraces, trace);
      setTraces([...liveTraces]);
    };
    socket.on("trace", onTrace);

    try {
      const response = await axios.post(`${API_URL}/api/chat`, {
        message: searchVal.trim() || "Analyze this image and find an expert",
        userLocation: userLocation,
        image: imageBase64,
      });

      const apiTraces = response.data?.logs?.length
        ? mapApiLogsToTraces(response.data.logs)
        : liveTraces;

      if (apiTraces.length > 0) {
        setTraces(apiTraces);
      } else if (liveTraces.length > 0) {
        setTraces(liveTraces);
      }

      if (response.data && response.data.success) {
        const { data } = response.data;

        if (apiTraces.length === 0 && liveTraces.length === 0 && data.recommendation?.ai_reasoning) {
          setTraces([
            {
              id: "rec-summary",
              timestamp: new Date().toISOString(),
              agent: "RECOMMENDATION_AGENT",
              action: "Recommendation Ready",
              reasoningSummary: String(data.recommendation.ai_reasoning),
              confidenceScore: 95,
              latencyMs: 0,
              status: "success",
            },
          ]);
        }

        if (data.recommendation?.options && data.recommendation.options.length > 0) {
          const options: ProviderOption[] = data.recommendation.options.map((p: ProviderOption) => ({
            ...p,
            avatarUrl: p.avatarUrl || p.profileImage,
            profileImage: p.profileImage || p.avatarUrl,
          }));
          const enriched = await enrichProvidersWithFirestore(options);
          setProviders(enriched);

          if (data.booking?.message) {
            setAiMessage(data.booking.message);
          } else {
            setAiMessage(`I found ${enriched.length} verified experts near you!`);
          }
        } else {
          Alert.alert("No Match Found", "AI agent could not match any experts for your query.");
        }
        setImageBase64(null);
      } else {
        Alert.alert("No Match Found", "AI agent could not match any experts for your query.");
      }
    } catch (err: any) {
      Alert.alert("AI Engine Error", err.message || "Failed to process request with backend API.");
    } finally {
      socket.off("trace", onTrace);
      socket.disconnect();
      traceSocketRef.current = null;
      setAgentProcessing(false);
      setLoading(false);
    }
  }

  const handleFinalConfirm = async () => {
    if (!selectedTime) {
      Alert.alert("Time Slot", "Please select a time slot first.");
      return;
    }
    if (bookedSlots.has(selectedTime)) {
      Alert.alert("Slot Booked", "This expert is already busy at this time. Please select another slot.");
      return;
    }
    if (!selectedProvider) return;

    setBookingLoading(true);
    try {
      // Fetch fresh contact fallback from Firestore if unavailable
      let phone = selectedProvider.phone || "";
      if (!phone) {
        const expertDoc = await getDoc(doc(db, "experts", selectedProvider.id));
        if (expertDoc.exists()) {
          phone = expertDoc.data().phone || "";
        }
      }

      if (!phone) {
        Alert.alert("No Contact Details", "This expert does not have a registered contact number.");
        setBookingLoading(false);
        return;
      }

      // 1. Dispatch API call to backend booking creator
      const response = await axios.post(`${API_URL}/api/booking/create`, {
        providerId: selectedProvider.id,
        clientLocation: userLocation,
        service: lastRequest,
        scheduledTime: selectedTime,
        customerName: profileName,
      });

      if (response.data.success) {
        const bookingId = response.data.bookingId;
        const rate = selectedProvider.rate ? `PKR ${selectedProvider.rate}` : "PKR 1,500";

        // 2. Persist booking document to shared Firebase Firestore bookings collection
        await setDoc(doc(db, "bookings", bookingId), {
          id: bookingId,
          providerId: String(selectedProvider.id),
          providerName: selectedProvider.name,
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
          distanceKm: selectedProvider.distanceKm || 2.4,
          etaMinutes: selectedProvider.etaMinutes || 15,
        });

        setBookingModalOpen(false);
        Alert.alert(
          "Booking Successful",
          "Expert ko booking message aur 1-hour reminder automatically bhej diya jayega."
        );
      } else {
        throw new Error("API booking creation failed.");
      }
    } catch (err: any) {
      Alert.alert("Booking Failed", err.message || "Failed to create booking.");
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#1c0f05", "#0b0c10"]} style={tw`flex-1`}>
      <SafeAreaView style={tw`flex-1`}>
        {/* Navigation Bar */}
        <View style={tw`flex-row justify-between items-center px-5 py-4 border-b border-white/10 bg-black/40`}>
          <Text style={tw`text-white text-lg font-black tracking-tight`}>
            Appointix
          </Text>
          <View style={tw`flex-row items-center gap-3`}>
            <Text style={tw`text-gray-600 text-[10px] font-bold`}>v{APP_BUILD}</Text>
            <Text style={tw`text-gray-400 text-xs font-bold mr-1`}>{profileName}</Text>
            <Pressable
              onPress={handleLogout}
              style={tw`p-2.5 bg-white/5 border border-white/10 rounded-full`}
            >
              <LogOut size={15} color="#f97316" />
            </Pressable>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={tw`pb-8 px-4`}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          {/* Tagline */}
          <View style={tw`my-6`}>
            <Text style={tw`text-white text-2xl font-black mb-1`}>Hire Verified Local Experts</Text>
            <Text style={tw`text-gray-400 text-xs`}>Driven by Multi-Agent AI Search Orchestration</Text>
          </View>

          {/* Quick Request Buttons */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`mb-4`}>
            {QUICK_REQUESTS.map((req) => (
              <Pressable
                key={req}
                onPress={() => {
                  setMessage(req);
                  handleSearch(req);
                }}
                style={tw`px-4 py-2.5 rounded-full mr-2 border border-white/10 bg-white/5`}
              >
                <Text style={tw`text-xs font-bold text-gray-300`}>{req}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Search Box */}
          <View style={tw`bg-white/5 border border-white/10 rounded-3xl p-5 mb-5`}>
            {imageBase64 && (
              <View style={tw`mb-3 flex-row items-center justify-between bg-black/40 p-2.5 rounded-2xl border border-white/10`}>
                <View style={tw`flex-row items-center gap-2`}>
                  <ImageIcon size={16} color="#f97316" />
                  <Text style={tw`text-white text-xs font-bold`}>Image attached for AI analysis</Text>
                </View>
                <Pressable onPress={() => setImageBase64(null)} style={tw`p-1.5 bg-red-500/20 rounded-full`}>
                  <X size={14} color="#ef4444" />
                </Pressable>
              </View>
            )}
            <View style={tw`flex-row items-center bg-black/40 border border-white/10 rounded-2xl px-4 py-3.5 mb-3`}>
              <Search size={20} color="#f97316" style={tw`mr-3`} />
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="What service do you need today?"
                placeholderTextColor="#6b7280"
                style={tw`flex-1 text-white font-medium`}
              />
              <View style={tw`flex-row items-center gap-1`}>
                <Pressable onPress={pickImage} style={tw`p-1.5 rounded-lg`}>
                  <Camera size={20} color={imageBase64 ? "#f97316" : "#9ca3af"} />
                </Pressable>
                <Pressable onPress={handleVoiceRecording} style={tw`p-1.5 rounded-lg`}>
                  <Mic size={20} color={isRecording ? "#ef4444" : "#9ca3af"} />
                </Pressable>
                <Pressable onPress={useCurrentLocation} style={tw`p-1.5 rounded-lg ${locationLoading ? "opacity-50" : ""}`}>
                  <MapPin size={20} color={locationLoading ? "#9ca3af" : "#f97316"} />
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={() => handleSearch("")}
              disabled={loading}
              style={tw`w-full bg-orange-500 py-3.5 rounded-2xl font-bold shadow-lg items-center justify-center flex-row gap-2 ${
                loading ? "opacity-75" : ""
              }`}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Sparkles size={16} color="#ffffff" />
                  <Text style={tw`text-white font-bold text-sm`}>Find Matches with AI</Text>
                </>
              )}
            </Pressable>
          </View>

          {/* AI Response Bubble */}
          {aiMessage && (
            <View style={tw`bg-[#121318] border border-orange-500/30 rounded-3xl p-5 mb-5 shadow-lg shadow-orange-500/5`}>
              <View style={tw`flex-row items-center gap-2 mb-2`}>
                <Bot size={20} color="#f97316" />
                <Text style={tw`text-white font-black text-sm`}>Appointix</Text>
              </View>
              <Text style={tw`text-gray-300 text-sm leading-relaxed`}>{aiMessage}</Text>
            </View>
          )}

          {/* Map View */}
          {providers.length > 0 && (
            <View style={tw`bg-[#121318] border border-white/10 rounded-3xl overflow-hidden mb-5 h-48`}>
              <MapView
                ref={mapRef}
                style={tw`flex-1`}
                initialRegion={{
                  latitude: userLocation?.lat || 31.5204,
                  longitude: userLocation?.lng || 74.3587,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }}
              >
                <Marker
                  coordinate={{ latitude: Number(userLocation?.lat) || 31.5204, longitude: Number(userLocation?.lng) || 74.3587 }}
                  title="Your Location"
                  pinColor="blue"
                />
                {providers.map((p) => (
                  <Marker
                    key={p.id}
                    coordinate={{ latitude: Number(p.lat) || (Number(userLocation?.lat) || 31.5204) + 0.01, longitude: Number(p.lng) || (Number(userLocation?.lng) || 74.3587) + 0.01 }}
                    title={p.name}
                    description={p.specialization || p.service}
                    pinColor="orange"
                  />
                ))}
              </MapView>
            </View>
          )}

          {(agentProcessing || traces.length > 0) && providers.length > 0 && (
            <AgentTracePanel traces={traces} isProcessing={agentProcessing} />
          )}

          {/* Matches List */}
          {providers.length > 0 ? (
            <View style={tw`gap-4`}>
              <Text style={tw`text-white font-black text-base px-1`}>Matched Experts</Text>
              <Text style={tw`text-gray-500 text-xs px-1 -mt-2 mb-1`}>
                Tap any card to view profile or Google Maps listing
              </Text>
              {providers.map((item, index) => {
                const topMatch = index === 0 || item.isBestFit;
                const isExternal = item.source === "google_maps";
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      if (isExternal && item.mapsUrl) Linking.openURL(item.mapsUrl);
                      else openExpertProfile(item);
                    }}
                    android_ripple={{ color: "rgba(249,115,22,0.25)" }}
                    style={({ pressed }) =>
                      tw`bg-[#121318] border ${
                        topMatch ? "border-orange-500/40" : "border-white/10"
                      } rounded-3xl overflow-hidden ${pressed ? "opacity-90" : ""}`
                    }
                  >
                    <View style={tw`relative h-40 bg-black/40`} pointerEvents="none">
                      <ExpertAvatar
                        name={item.name}
                        avatarUrl={item.avatarUrl}
                        profileImage={item.profileImage}
                        style={tw`w-full h-full`}
                        rounded="2xl"
                      />
                      <View style={tw`absolute inset-0 bg-black/35`} />
                      {topMatch && (
                        <View style={tw`absolute top-3 left-3 bg-green-500/20 border border-green-500/30 px-2 py-1 rounded-lg`}>
                          <Text style={tw`text-green-400 text-[10px] font-black uppercase`}>Top Match</Text>
                        </View>
                      )}
                      <View style={tw`absolute bottom-3 left-3 right-3 flex-row justify-between items-end`}>
                        <View style={tw`flex-1 pr-2`}>
                          <Text style={tw`text-white font-black text-lg`}>{item.name}</Text>
                          <Text style={tw`text-orange-400 text-xs font-bold uppercase`}>
                            {item.specialization || item.service}
                          </Text>
                        </View>
                        <View style={tw`items-end`}>
                          <Text style={tw`text-orange-500 font-bold text-sm`}>PKR {item.rate || "1,500"}</Text>
                          <Text style={tw`text-gray-400 text-[10px]`}>Est. Price</Text>
                        </View>
                      </View>
                    </View>

                    <View style={tw`p-4`}>
                      {item.reason && (
                        <Text style={tw`text-gray-300 text-xs italic mb-4 bg-white/5 p-3 rounded-2xl border border-white/5`}>
                          "{item.reason}"
                        </Text>
                      )}

                      <View style={tw`flex-row justify-between mb-4`}>
                        <View style={tw`flex-row items-center gap-1.5`}>
                          <MapPin size={14} color="#f97316" />
                          <Text style={tw`text-gray-400 text-xs`}>
                            {item.distanceKm ? `${item.distanceKm} KM` : "N/A"}
                          </Text>
                        </View>
                        <View style={tw`flex-row items-center gap-1.5`}>
                          <Clock size={14} color="#f97316" />
                          <Text style={tw`text-gray-400 text-xs`}>
                            {item.etaMinutes ? `${item.etaMinutes} mins` : "N/A"}
                          </Text>
                        </View>
                        <View style={tw`flex-row items-center gap-1.5`}>
                          <Star size={14} color="#f97316" fill="#f97316" />
                          <Text style={tw`text-gray-400 text-xs font-bold`}>{item.rating || 4.8}</Text>
                        </View>
                      </View>

                      <Pressable
                        onPress={(e) => {
                          e?.stopPropagation?.();
                          if (isExternal && item.mapsUrl) Linking.openURL(item.mapsUrl);
                          else openExpertProfile(item);
                        }}
                        style={tw`w-full bg-orange-500 py-3.5 rounded-2xl items-center mb-2`}
                      >
                        <Text style={tw`text-white font-black text-sm uppercase tracking-wide`}>
                          {isExternal ? "View on Google Maps" : "Open Expert Profile & Chat"}
                        </Text>
                      </Pressable>
                      {!isExternal && (
                        <Pressable
                          onPress={async () => {
                            setSelectedProvider(item);
                            setSelectedTime("");
                            const snap = await getDocs(query(collection(db, "bookings"), where("providerId", "==", String(item.id))));
                            setProviderBookings(snap.docs.map((booking) => ({ id: booking.id, ...booking.data() })));
                            setBookingModalOpen(true);
                          }}
                          style={tw`w-full bg-orange-500/10 border border-orange-500/30 py-3 rounded-2xl items-center`}
                        >
                          <Text style={tw`text-orange-500 font-bold text-sm`}>Quick Book</Text>
                        </Pressable>
                      )}
                    </View>
                  </Pressable>
                );
              })}

              <AgentTracePanel traces={traces} isProcessing={agentProcessing} />
            </View>
          ) : (
            <>
              {!loading && lastRequest !== "" && (
                <View style={tw`items-center my-8`}>
                  <Text style={tw`text-gray-400 text-sm`}>No matches. Try another search query.</Text>
                </View>
              )}
              {(traces.length > 0 || agentProcessing) && (
                <AgentTracePanel traces={traces} isProcessing={agentProcessing} />
              )}
            </>
          )}
        </ScrollView>

        {/* Booking Dialog */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={bookingModalOpen}
          onRequestClose={() => setBookingModalOpen(false)}
        >
          <View style={tw`flex-1 justify-end bg-black/60`}>
            <View style={tw`bg-[#121318] border-t border-white/10 rounded-t-[2.5rem] p-6 pb-8`}>
              <View style={tw`w-12 h-1 bg-white/20 rounded-full mx-auto mb-6`} />

              <View style={tw`flex-row justify-between items-center mb-6`}>
                <Text style={tw`text-white text-xl font-bold`}>Confirm Time Slot</Text>
                <Pressable onPress={() => setBookingModalOpen(false)} style={tw`p-1`}>
                  <Text style={tw`text-gray-400 font-bold text-sm`}>Close</Text>
                </Pressable>
              </View>

              <Text style={tw`text-gray-400 text-xs font-bold uppercase tracking-wider mb-3 px-1`}>
                Select an available slot
              </Text>
              <View style={tw`flex-row flex-wrap gap-2.5 mb-6`}>
                {TIME_SLOTS.map((time) => {
                  const isBooked = bookedSlots.has(time);
                  return (
                  <Pressable
                    key={time}
                    onPress={() => !isBooked && setSelectedTime(time)}
                    disabled={isBooked}
                    style={tw`px-4 py-3.5 rounded-2xl border ${
                      isBooked
                        ? "bg-red-500/10 border-red-500/40"
                        : selectedTime === time
                        ? "bg-orange-500 border-orange-500"
                        : "bg-black/40 border-white/10"
                    }`}
                  >
                    <Text style={tw`text-xs font-bold ${isBooked ? "text-red-300" : "text-white"}`}>
                      {time}{isBooked ? " - Booked" : ""}
                    </Text>
                  </Pressable>
                  );
                })}
              </View>

              <Pressable
                onPress={handleFinalConfirm}
                disabled={bookingLoading}
                style={tw`w-full bg-orange-500 py-4 rounded-2xl font-bold shadow-lg items-center justify-center flex-row gap-2 ${
                  bookingLoading ? "opacity-75" : ""
                }`}
              >
                {bookingLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <CalendarClock size={18} color="#ffffff" />
                    <Text style={tw`text-white font-bold text-base`}>Confirm Booking</Text>
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

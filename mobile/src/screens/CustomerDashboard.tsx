import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import {
  Bot,
  CalendarClock,
  CheckCircle2,
  Clock,
  MapPin,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  LogOut,
  Terminal,
  Zap,
} from "lucide-react-native";
import { auth, db } from "../config/firebase";
import { signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import axios from "axios";
import tw from "twrnc";

type ProviderOption = {
  id: string;
  name: string;
  service?: string;
  specialization?: string;
  phone?: string;
  reason?: string;
  rating?: number;
  jobsCompleted?: number;
  distanceKm?: number;
  etaMinutes?: number;
  isBestFit?: boolean;
  priceEstimate?: string;
  reliabilityScore?: number;
  travelCharges?: number;
  rate?: string;
  lat?: number;
  lng?: number;
};

type TraceEvent = {
  id?: string;
  agent?: string;
  action?: string;
  reasoningSummary?: string;
  reasoning?: string;
  confidenceScore?: number;
  latencyMs?: number;
  status?: string;
};

const API_URL = "https://faizrasool01-kaamwala-backend.hf.space";
const LAHORE_FALLBACK = { lat: 31.5204, lng: 74.3587 };
const QUICK_REQUESTS = ["AC Repair", "Plumbing", "Electrician", "Home Cleaning", "Tutor"];
const TIME_SLOTS = ["10:00 AM", "12:30 PM", "03:00 PM", "05:00 PM"];

function normalizeWhatsAppNumber(phone: string, defaultCountryCode = "92") {
  let digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length === 11) return `${defaultCountryCode}${digits.slice(1)}`;
  if (digits.length === 10 && !digits.startsWith(defaultCountryCode)) return `${defaultCountryCode}${digits}`;
  return digits;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function CustomerDashboard({ navigation }: any) {
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
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [showTraces, setShowTraces] = useState(true);

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
    if (!searchVal.trim()) return;

    setLoading(true);
    setProviders([]);
    setTraces([]);
    setSelectedProvider(null);
    setLastRequest(searchVal);

    try {
      const response = await axios.post(`${API_URL}/api/expert-agent/process`, {
        query: searchVal.trim(),
        location: userLocation,
      });

      if (response.data && response.data.success) {
        setProviders(response.data.providers || []);
        setTraces(response.data.traces || []);
      } else {
        Alert.alert("No Match Found", "AI agent could not match any experts for your query.");
      }
    } catch (err: any) {
      Alert.alert("AI Engine Error", err.message || "Failed to process request with Hugging Face Space.");
    } finally {
      setLoading(false);
    }
  }

  const handleFinalConfirm = async () => {
    if (!selectedTime) {
      Alert.alert("Time Slot", "Please select a time slot first.");
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

        // 3. Dispatch WhatsApp redirect
        const waMsg = [
          `Hi ${selectedProvider.name},`,
          "",
          "I have booked you through KaamWala AI App.",
          "",
          "Booking Details:",
          `- Client: ${profileName}`,
          `- Service: ${lastRequest}`,
          `- Time: ${selectedTime}`,
          `- Booking ID: ${bookingId}`,
        ].join("\n");

        const waUrl = `https://wa.me/${normalizeWhatsAppNumber(phone)}?text=${encodeURIComponent(waMsg)}`;
        
        setBookingModalOpen(false);
        Alert.alert("Booking Successful", "Proceed to WhatsApp to coordinate with the expert?", [
          { text: "Cancel", style: "cancel" },
          { text: "Open WhatsApp", onPress: () => Linking.openURL(waUrl) },
        ]);
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
            KaamWala <Text style={tw`text-orange-500`}>AI</Text>
          </Text>
          <View style={tw`flex-row items-center gap-3`}>
            <Text style={tw`text-gray-400 text-xs font-bold mr-1`}>{profileName}</Text>
            <Pressable
              onPress={handleLogout}
              style={tw`p-2.5 bg-white/5 border border-white/10 rounded-full`}
            >
              <LogOut size={15} color="#f97316" />
            </Pressable>
          </View>
        </View>

        <ScrollView contentContainerStyle={tw`pb-8 px-4`}>
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
            <View style={tw`flex-row items-center bg-black/40 border border-white/10 rounded-2xl px-4 py-3.5 mb-3`}>
              <Search size={20} color="#f97316" style={tw`mr-3`} />
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="What service do you need today?"
                placeholderTextColor="#6b7280"
                style={tw`flex-1 text-white font-medium`}
              />
              <Pressable
                onPress={useCurrentLocation}
                style={tw`p-1 rounded-lg ${locationLoading ? "opacity-50" : ""}`}
              >
                <MapPin size={20} color={locationLoading ? "#9ca3af" : "#f97316"} />
              </Pressable>
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

          {/* Agent Orchestrator Trace panel */}
          {traces.length > 0 && (
            <View style={tw`bg-black/60 border border-white/10 rounded-3xl p-5 mb-5`}>
              <Pressable
                onPress={() => setShowTraces(!showTraces)}
                style={tw`flex-row justify-between items-center pb-3 border-b border-white/10 mb-3`}
              >
                <View style={tw`flex-row items-center gap-2`}>
                  <Terminal size={16} color="#f97316" />
                  <Text style={tw`text-white font-black text-sm uppercase tracking-wider`}>
                    AI Orchestration Log
                  </Text>
                </View>
                <Text style={tw`text-orange-500 text-xs font-bold`}>
                  {showTraces ? "Hide Logs" : "Show Logs"}
                </Text>
              </Pressable>

              {showTraces && (
                <View style={tw`gap-3`}>
                  {traces.map((trace, idx) => (
                    <View key={idx} style={tw`border-l-2 border-orange-500/50 pl-3 py-1`}>
                      <View style={tw`flex-row justify-between items-center mb-0.5`}>
                        <Text style={tw`text-orange-400 font-bold text-xs uppercase`}>
                          {trace.agent || "Agent"}
                        </Text>
                        <Text style={tw`text-gray-500 text-[10px]`}>
                          {trace.latencyMs}ms
                        </Text>
                      </View>
                      <Text style={tw`text-gray-300 text-xs`}>
                        {trace.reasoningSummary || trace.action}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Matches List */}
          {providers.length > 0 ? (
            <View style={tw`gap-4`}>
              <Text style={tw`text-white font-black text-base px-1`}>Matched Experts</Text>
              {providers.map((item, index) => {
                const topMatch = index === 0 || item.isBestFit;
                return (
                  <View
                    key={item.id}
                    style={tw`bg-[#121318] border ${
                      topMatch ? "border-orange-500/40 shadow-lg shadow-orange-500/5" : "border-white/10"
                    } rounded-3xl overflow-hidden`}
                  >
                    {/* Header Banner */}
                    <View style={tw`p-4 flex-row items-center justify-between border-b border-white/5 bg-black/20`}>
                      <View style={tw`flex-row items-center gap-3`}>
                        <View style={tw`w-10 h-10 rounded-xl bg-orange-500/10 items-center justify-center border border-orange-500/20`}>
                          <Text style={tw`text-orange-500 font-bold`}>{initials(item.name)}</Text>
                        </View>
                        <View>
                          <Text style={tw`text-white font-bold text-sm`}>{item.name}</Text>
                          <Text style={tw`text-gray-400 text-xs`}>{item.specialization || item.service}</Text>
                        </View>
                      </View>
                      <View style={tw`items-end`}>
                        <Text style={tw`text-orange-500 font-bold text-sm`}>
                          PKR {item.rate || "1,500"}
                        </Text>
                        <Text style={tw`text-gray-500 text-[10px]`}>Est. Price</Text>
                      </View>
                    </View>

                    {/* Stats Body */}
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
                        onPress={() => {
                          setSelectedProvider(item);
                          setBookingModalOpen(true);
                        }}
                        style={tw`w-full bg-orange-500/10 border border-orange-500/30 py-3 rounded-2xl items-center justify-center`}
                      >
                        <Text style={tw`text-orange-500 font-bold text-sm`}>Book Consultation</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            !loading &&
            lastRequest !== "" && (
              <View style={tw`items-center my-8`}>
                <Text style={tw`text-gray-400 text-sm`}>No matches. Try another search query.</Text>
              </View>
            )
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
                {TIME_SLOTS.map((time) => (
                  <Pressable
                    key={time}
                    onPress={() => setSelectedTime(time)}
                    style={tw`px-4 py-3.5 rounded-2xl border ${
                      selectedTime === time
                        ? "bg-orange-500 border-orange-500"
                        : "bg-black/40 border-white/10"
                    }`}
                  >
                    <Text style={tw`text-xs font-bold text-white`}>{time}</Text>
                  </Pressable>
                ))}
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

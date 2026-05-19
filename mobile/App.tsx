import { StatusBar } from "expo-status-bar";
import * as Location from "expo-location";
import { LinearGradient } from "expo-linear-gradient";
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
import { useMemo, useState } from "react";
import {
  Bot,
  CalendarClock,
  CheckCircle2,
  Clock,
  MapPin,
  MessageCircle,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  TerminalSquare,
  Zap,
} from "lucide-react-native";

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

const API_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://faizrasool01-kaamwala-backend.hf.space";

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

function buildWhatsAppUrl(input: {
  expertName: string;
  expertPhone: string;
  customerName: string;
  time: string;
  service: string;
  bookingId: string;
}) {
  const message = [
    `Hi ${input.expertName},`,
    "",
    "I want to book a consultation.",
    "",
    "Booking Details:",
    `- User Name: ${input.customerName}`,
    "- Date: Today",
    `- Time: ${input.time}`,
    `- Service: ${input.service}`,
    `- Booking ID: ${input.bookingId}`,
  ].join("\n");

  return `https://wa.me/${normalizeWhatsAppNumber(input.expertPhone)}?text=${encodeURIComponent(message)}`;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatDistance(distance?: number) {
  if (typeof distance !== "number") return "N/A";
  return `${distance} KM`;
}

function formatEta(minutes?: number) {
  if (typeof minutes !== "number") return "N/A";
  return `${minutes} mins`;
}

function ExpertCard({
  item,
  index,
  selected,
  onBook,
}: {
  item: ProviderOption;
  index: number;
  selected: boolean;
  onBook: (provider: ProviderOption) => void;
}) {
  const topMatch = index === 0 || item.isBestFit;

  return (
    <View style={[styles.card, topMatch && styles.cardTopMatch, selected && styles.cardSelected]}>
      <View style={styles.cardHero}>
        <LinearGradient colors={["#2a1a12", "#111216"]} style={StyleSheet.absoluteFill} />
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(item.name)}</Text>
        </View>
        <View style={styles.cardHeroBadges}>
          {topMatch ? (
            <View style={styles.topBadge}>
              <Zap size={12} color="#4ade80" fill="#4ade80" />
              <Text style={styles.topBadgeText}>TOP MATCH</Text>
            </View>
          ) : null}
          <View style={styles.ratingBadge}>
            <Star size={13} color="#fb923c" fill="#fb923c" />
            <Text style={styles.ratingText}>{item.rating || 4.7}</Text>
            <Text style={styles.ratingMuted}>({item.jobsCompleted || 120})</Text>
          </View>
        </View>
        <View style={styles.priceBadge}>
          <Text style={styles.priceText}>{item.priceEstimate || `PKR ${item.rate || "1,500"}`}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <View style={styles.cardTitleWrap}>
            <View style={styles.nameRow}>
              <Text style={styles.expertName} numberOfLines={1}>
                {item.name}
              </Text>
              <ShieldCheck size={16} color="#60a5fa" fill="#2563eb" />
            </View>
            <Text style={styles.specialization} numberOfLines={1}>
              {item.specialization || item.service || "Verified home service expert"}
            </Text>
          </View>
          <Pressable style={styles.iconButton}>
            <SlidersHorizontal size={17} color="#cbd5e1" />
          </Pressable>
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricBox}>
            <MapPin size={15} color="#fb923c" />
            <View>
              <Text style={styles.metricLabel}>Distance</Text>
              <Text style={styles.metricValue}>{formatDistance(item.distanceKm)}</Text>
            </View>
          </View>
          <View style={styles.metricBox}>
            <Clock size={15} color="#60a5fa" />
            <View>
              <Text style={styles.metricLabel}>Arrival</Text>
              <Text style={styles.metricValue}>{formatEta(item.etaMinutes)}</Text>
            </View>
          </View>
        </View>

        <Pressable
          onPress={() => onBook(item)}
          style={[styles.bookButton, selected && styles.selectedButton]}
        >
          {selected ? <CheckCircle2 size={18} color="#bbf7d0" /> : null}
          <Text style={[styles.bookButtonText, selected && styles.selectedButtonText]}>
            {selected ? "Selected" : "Book Now"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function App() {
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

  const topProvider = providers[0];
  const hasResults = providers.length > 0;

  const tracePreview = useMemo(() => traces.slice(-5).reverse(), [traces]);

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

  async function runOrchestration(requestText = message) {
    const query = requestText.trim();
    if (!query) return;

    setLoading(true);
    setLastRequest(query);
    setProviders([]);
    setTraces([]);

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          userLocation,
          radius: 10,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data?.details || data?.error || "AI orchestration failed");
      }

      const options = data.data?.recommendation?.options || [];
      setProviders(options);
      setTraces(data.logs || []);
    } catch (error) {
      Alert.alert(
        "Could not find experts",
        error instanceof Error ? error.message : "Please check backend URL and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function confirmBooking() {
    if (!selectedProvider) return;
    if (!selectedTime) {
      Alert.alert("Select a time", "Please select a timeslot first.");
      return;
    }

    const phone = normalizeWhatsAppNumber(selectedProvider.phone || "");
    if (!/^\d{11,15}$/.test(phone)) {
      Alert.alert("Missing WhatsApp number", `${selectedProvider.name} does not have a valid WhatsApp number.`);
      return;
    }

    setBookingLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/booking/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId: selectedProvider.id,
          clientLocation: userLocation,
          service: lastRequest || message,
          scheduledTime: selectedTime,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data?.message || "Booking failed");
      }

      const url = buildWhatsAppUrl({
        expertName: selectedProvider.name,
        expertPhone: phone,
        customerName: "Customer",
        time: selectedTime,
        service: lastRequest || message,
        bookingId: data.bookingId,
      });

      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen && Platform.OS === "android") {
        Alert.alert("WhatsApp not detected", "Opening WhatsApp Web fallback in browser.");
      }

      await Linking.openURL(url);
      setBookingModalOpen(false);
    } catch (error) {
      Alert.alert("Booking error", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBookingLoading(false);
    }
  }

  function resetSearch() {
    setMessage("");
    setLastRequest("");
    setProviders([]);
    setTraces([]);
    setSelectedProvider(null);
    setSelectedTime("");
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <LinearGradient colors={["#070707", "#111216", "#080808"]} style={styles.root}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.nav}>
            <Text style={styles.logo}>
              KaamWala <Text style={styles.logoAccent}>AI</Text>
            </Text>
            <Pressable style={styles.portalButton}>
              <Text style={styles.portalText}>Expert Portal</Text>
            </Pressable>
          </View>

          <View style={styles.hero}>
            <View style={styles.pill}>
              <Sparkles size={15} color="#fb923c" />
              <Text style={styles.pillText}>KaamWala AI Orchestrator v2.0</Text>
            </View>
            <Text style={styles.heroTitle}>
              Describe the Problem.{"\n"}
              <Text style={styles.heroAccent}>We'll Handle the Rest.</Text>
            </Text>
            <Text style={styles.heroCopy}>
              Tell our AI what you need in English or Roman Urdu. We instantly find,
              rank, and connect you with the right expert.
            </Text>
          </View>

          <View style={styles.searchPanel}>
            <View style={styles.inputRow}>
              <Search size={20} color="#64748b" />
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="e.g. Urgent plumber required in DHA..."
                placeholderTextColor="#64748b"
                style={styles.input}
                multiline
              />
            </View>
            <View style={styles.actionRow}>
              <Pressable
                onPress={useCurrentLocation}
                style={[styles.smallAction, userLocation !== LAHORE_FALLBACK && styles.locationActive]}
              >
                {locationLoading ? (
                  <ActivityIndicator color="#4ade80" />
                ) : (
                  <MapPin size={18} color="#4ade80" />
                )}
              </Pressable>
              <Pressable
                onPress={() => runOrchestration()}
                disabled={loading || !message.trim()}
                style={[styles.orchestrateButton, (!message.trim() || loading) && styles.disabledButton]}
              >
                {loading ? <ActivityIndicator color="#ffffff" /> : <Bot size={18} color="#ffffff" />}
                <Text style={styles.orchestrateText}>{loading ? "Working..." : "Orchestrate"}</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.quickRow}>
            {QUICK_REQUESTS.map((item) => (
              <Pressable
                key={item}
                onPress={() => {
                  const query = `I need ${item.toLowerCase()}`;
                  setMessage(query);
                  runOrchestration(query);
                }}
                style={styles.quickChip}
              >
                <Text style={styles.quickText}>{item}</Text>
              </Pressable>
            ))}
          </View>

          {lastRequest ? (
            <View style={styles.activeRequest}>
              <View style={styles.activeIcon}>
                <Search size={18} color="#ffffff" />
              </View>
              <View style={styles.activeCopy}>
                <Text style={styles.activeLabel}>Active request</Text>
                <Text style={styles.activeText} numberOfLines={1}>
                  {lastRequest}
                </Text>
              </View>
              <Pressable onPress={resetSearch} style={styles.resetButton}>
                <RotateCcw size={17} color="#cbd5e1" />
              </Pressable>
            </View>
          ) : null}

          {hasResults ? (
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>
                Results ready! <Text style={styles.resultsMuted}>Found {providers.length} experts.</Text>
              </Text>
              {topProvider ? <Text style={styles.topFit}>Top fit: {topProvider.name}</Text> : null}
            </View>
          ) : null}

          <FlatList
            data={providers}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item, index }) => (
              <ExpertCard
                item={item}
                index={index}
                selected={selectedProvider?.id === item.id}
                onBook={(provider) => {
                  setSelectedProvider(provider);
                  setSelectedTime("");
                  setBookingModalOpen(true);
                }}
              />
            )}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
            contentContainerStyle={styles.listContent}
          />

          {(loading || tracePreview.length > 0) && (
            <View style={styles.tracePanel}>
              <View style={styles.traceHeader}>
                <TerminalSquare size={18} color="#fb923c" />
                <Text style={styles.traceTitle}>Orchestration Trace</Text>
              </View>
              {loading && tracePreview.length === 0 ? (
                <Text style={styles.traceEmpty}>Multi-agent reasoning pipeline active...</Text>
              ) : (
                tracePreview.map((trace, index) => (
                  <View key={`${trace.agent}-${trace.action}-${index}`} style={styles.traceItem}>
                    <Text style={styles.traceAgent}>{trace.agent || "Agent"}</Text>
                    <Text style={styles.traceAction}>{trace.action || "Thinking..."}</Text>
                    <Text style={styles.traceReason} numberOfLines={2}>
                      {trace.reasoningSummary || trace.reasoning || "Analyzing context."}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>

        <Modal visible={bookingModalOpen} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Book Appointment</Text>
                <Pressable onPress={() => setBookingModalOpen(false)}>
                  <Text style={styles.closeText}>Close</Text>
                </Pressable>
              </View>

              {selectedProvider ? (
                <View style={styles.selectedExpertBox}>
                  <View style={styles.selectedAvatar}>
                    <Text style={styles.avatarText}>{initials(selectedProvider.name)}</Text>
                  </View>
                  <View>
                    <Text style={styles.selectedName}>{selectedProvider.name}</Text>
                    <Text style={styles.selectedMeta}>
                      {selectedProvider.priceEstimate || `PKR ${selectedProvider.rate || "1,500"}`}
                    </Text>
                  </View>
                </View>
              ) : null}

              <Text style={styles.timeLabel}>Available Timeslots Today</Text>
              <View style={styles.timeGrid}>
                {TIME_SLOTS.map((slot) => (
                  <Pressable
                    key={slot}
                    onPress={() => setSelectedTime(slot)}
                    style={[styles.timeButton, selectedTime === slot && styles.timeButtonActive]}
                  >
                    <CalendarClock size={16} color={selectedTime === slot ? "#ffffff" : "#cbd5e1"} />
                    <Text style={[styles.timeText, selectedTime === slot && styles.timeTextActive]}>{slot}</Text>
                  </Pressable>
                ))}
              </View>

              <Pressable
                onPress={confirmBooking}
                disabled={bookingLoading || !selectedTime}
                style={[styles.confirmButton, (!selectedTime || bookingLoading) && styles.disabledButton]}
              >
                {bookingLoading ? <ActivityIndicator color="#06120a" /> : <MessageCircle size={19} color="#06120a" />}
                <Text style={styles.confirmText}>
                  {bookingLoading ? "Creating Booking..." : "Confirm & Open WhatsApp"}
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#070707",
  },
  root: {
    flex: 1,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 42,
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  logo: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0,
  },
  logoAccent: {
    color: "#f97316",
  },
  portalButton: {
    borderWidth: 1,
    borderColor: "rgba(249,115,22,0.35)",
    backgroundColor: "rgba(249,115,22,0.1)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  portalText: {
    color: "#fdba74",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  hero: {
    alignItems: "center",
    marginBottom: 24,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  pillText: {
    color: "#60a5fa",
    fontWeight: "700",
    fontSize: 12,
  },
  heroTitle: {
    color: "#ffffff",
    fontSize: 36,
    lineHeight: 42,
    textAlign: "center",
    fontWeight: "900",
    letterSpacing: 0,
  },
  heroAccent: {
    color: "#fb923c",
  },
  heroCopy: {
    color: "#94a3b8",
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 14,
    maxWidth: 340,
  },
  searchPanel: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(0,0,0,0.58)",
    borderRadius: 24,
    padding: 12,
    shadowColor: "#f97316",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },
  inputRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 10,
    paddingTop: 12,
  },
  input: {
    flex: 1,
    color: "#ffffff",
    fontSize: 16,
    lineHeight: 22,
    minHeight: 44,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  smallAction: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  locationActive: {
    backgroundColor: "rgba(34,197,94,0.14)",
    borderColor: "rgba(34,197,94,0.28)",
  },
  orchestrateButton: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#ea580c",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 9,
  },
  disabledButton: {
    opacity: 0.55,
  },
  orchestrateText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 15,
  },
  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 9,
    marginTop: 16,
  },
  quickChip: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  quickText: {
    color: "#cbd5e1",
    fontWeight: "700",
    fontSize: 12,
  },
  activeRequest: {
    marginTop: 24,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(0,0,0,0.45)",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  activeIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f97316",
  },
  activeCopy: {
    flex: 1,
  },
  activeLabel: {
    color: "#fdba74",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  activeText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 2,
  },
  resetButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  resultsHeader: {
    marginTop: 24,
    marginBottom: 14,
  },
  resultsTitle: {
    color: "#4ade80",
    fontSize: 18,
    fontWeight: "900",
  },
  resultsMuted: {
    color: "#ffffff",
    fontWeight: "700",
  },
  topFit: {
    color: "#fdba74",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 7,
  },
  listContent: {
    paddingTop: 2,
  },
  card: {
    overflow: "hidden",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(17,18,22,0.95)",
  },
  cardTopMatch: {
    borderColor: "rgba(249,115,22,0.45)",
    backgroundColor: "#1d1b19",
  },
  cardSelected: {
    borderColor: "rgba(34,197,94,0.55)",
    backgroundColor: "rgba(34,197,94,0.12)",
  },
  cardHero: {
    height: 164,
    padding: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  avatar: {
    width: 82,
    height: 82,
    borderRadius: 28,
    backgroundColor: "rgba(249,115,22,0.22)",
    borderWidth: 1,
    borderColor: "rgba(249,115,22,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fed7aa",
    fontSize: 24,
    fontWeight: "900",
  },
  cardHeroBadges: {
    position: "absolute",
    top: 12,
    left: 12,
    gap: 8,
  },
  topBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.35)",
    backgroundColor: "rgba(34,197,94,0.16)",
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  topBadgeText: {
    color: "#4ade80",
    fontSize: 10,
    fontWeight: "900",
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(0,0,0,0.42)",
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  ratingText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900",
  },
  ratingMuted: {
    color: "#94a3b8",
    fontSize: 10,
  },
  priceBadge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  priceText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 12,
  },
  cardBody: {
    padding: 16,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  cardTitleWrap: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  expertName: {
    color: "#ffffff",
    fontSize: 19,
    fontWeight: "900",
    flexShrink: 1,
  },
  specialization: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 3,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  metricBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    padding: 11,
  },
  metricLabel: {
    color: "#64748b",
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  metricValue: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 2,
  },
  bookButton: {
    marginTop: 16,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#f97316",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  selectedButton: {
    backgroundColor: "rgba(34,197,94,0.2)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.45)",
  },
  bookButtonText: {
    color: "#111111",
    fontWeight: "900",
    fontSize: 15,
  },
  selectedButtonText: {
    color: "#bbf7d0",
  },
  tracePanel: {
    marginTop: 22,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(0,0,0,0.48)",
    padding: 15,
  },
  traceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 12,
  },
  traceTitle: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 16,
  },
  traceEmpty: {
    color: "#94a3b8",
    fontSize: 13,
  },
  traceItem: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    paddingTop: 11,
    marginTop: 11,
  },
  traceAgent: {
    color: "#fb923c",
    fontWeight: "900",
    fontSize: 11,
    textTransform: "uppercase",
  },
  traceAction: {
    color: "#ffffff",
    fontWeight: "800",
    marginTop: 3,
  },
  traceReason: {
    color: "#94a3b8",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.78)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#161719",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: 20,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  modalTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
  },
  closeText: {
    color: "#94a3b8",
    fontWeight: "800",
  },
  selectedExpertBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 18,
    padding: 13,
  },
  selectedAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(249,115,22,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  selectedName: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 16,
  },
  selectedMeta: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 2,
  },
  timeLabel: {
    color: "#94a3b8",
    fontWeight: "800",
    fontSize: 13,
    marginTop: 20,
    marginBottom: 10,
  },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  timeButton: {
    width: "48%",
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  timeButtonActive: {
    backgroundColor: "#f97316",
    borderColor: "#f97316",
  },
  timeText: {
    color: "#cbd5e1",
    fontWeight: "900",
    fontSize: 13,
  },
  timeTextActive: {
    color: "#ffffff",
  },
  confirmButton: {
    height: 54,
    borderRadius: 999,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 9,
    marginTop: 22,
  },
  confirmText: {
    color: "#06120a",
    fontWeight: "900",
    fontSize: 15,
  },
});

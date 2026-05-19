import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  LogOut,
  MapPin,
  MessageSquare,
  Sparkles,
  Star,
  TrendingUp,
  User,
  Wallet,
} from "lucide-react-native";
import { auth, db } from "../config/firebase";
import { signOut } from "firebase/auth";
import { collection, doc, getDoc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import tw from "twrnc";

type Booking = {
  id: string;
  providerId: string;
  providerName: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  service: string;
  scheduledTime: string;
  status: string;
  amount: string;
  distanceKm?: number;
  etaMinutes?: number;
  timestamp: string;
};

export default function ExpertDashboard({ navigation }: any) {
  const [expertName, setExpertName] = useState("Expert");
  const [expertCategory, setExpertCategory] = useState("Verified Partner");
  const [isOnline, setIsOnline] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [expertStats, setExpertStats] = useState({
    rating: 4.9,
    completedJobs: 48,
    earnings: "PKR 72,000",
  });

  // 1. Fetch Expert Profile
  useEffect(() => {
    const fetchExpertProfile = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const docSnap = await getDoc(doc(db, "experts", user.uid));
          if (docSnap.exists()) {
            const data = docSnap.data();
            setExpertName(data.name || user.displayName || "Expert");
            setExpertCategory(data.category || "Service Expert");
            setExpertStats({
              rating: data.rating || 4.9,
              completedJobs: data.jobsCompleted || 48,
              earnings: data.earnings || `PKR ${(data.jobsCompleted || 48) * (data.rate || 1500)}`,
            });
          }
        } catch {
          // ignore
        }
      }
    };
    fetchExpertProfile();
  }, []);

  // 2. Setup Real-time listener for incoming bookings matching providerId
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const bookingsRef = collection(db, "bookings");
    const q = query(bookingsRef, where("providerId", "==", user.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Booking[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Booking);
        });
        // Sort bookings by date descending
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setBookings(list);
        setLoadingBookings(false);
      },
      (error) => {
        console.error("Firestore real-time error:", error);
        setLoadingBookings(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.replace("Login");
    } catch {
      Alert.alert("Error", "Failed to log out.");
    }
  };

  const handleUpdateStatus = async (status: boolean) => {
    setIsOnline(status);
    const user = auth.currentUser;
    if (user) {
      try {
        await updateDoc(doc(db, "experts", user.uid), {
          status: status ? "online" : "offline",
        });
      } catch {
        // ignore
      }
    }
  };

  const normalizePhone = (phone?: string) => {
    let digits = String(phone || "").replace(/\D/g, "");
    if (digits.startsWith("00")) digits = digits.slice(2);
    if (digits.startsWith("0") && digits.length === 11) return `92${digits.slice(1)}`;
    return digits;
  };

  const handleContactCustomer = (booking: Booking) => {
    const phone = booking.customerPhone;
    if (!phone) {
      Alert.alert("No Contact Phone", "The customer did not list their contact number.");
      return;
    }

    const message = `Hi ${booking.customerName},\n\nI am ${expertName}, your matched ${expertCategory} expert. I received your booking request for ${booking.service} scheduled at ${booking.scheduledTime}. Ready to assist!`;
    const waUrl = `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(message)}`;
    Linking.openURL(waUrl);
  };

  return (
    <LinearGradient colors={["#1c0f05", "#0b0c10"]} style={tw`flex-1`}>
      <SafeAreaView style={tw`flex-1`}>
        {/* Navigation / Header */}
        <View style={tw`flex-row justify-between items-center px-5 py-4 border-b border-white/10 bg-black/40`}>
          <View style={tw`flex-row items-center gap-2`}>
            <View style={tw`w-2 h-2 rounded-full ${isOnline ? "bg-green-500 animate-ping" : "bg-gray-500"}`} />
            <Text style={tw`text-white text-lg font-black tracking-tight`}>
              Expert <Text style={tw`text-orange-500`}>Portal</Text>
            </Text>
          </View>
          <Pressable
            onPress={handleLogout}
            style={tw`p-2.5 bg-white/5 border border-white/10 rounded-full`}
          >
            <LogOut size={15} color="#f97316" />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={tw`pb-8 px-4`}>
          {/* Expert Hero */}
          <View style={tw`my-6 flex-row items-center justify-between bg-white/5 border border-white/10 rounded-3xl p-5`}>
            <View style={tw`flex-row items-center gap-3`}>
              <View style={tw`w-12 h-12 rounded-2xl bg-orange-500/10 items-center justify-center border border-orange-500/20`}>
                <Briefcase size={22} color="#f97316" />
              </View>
              <View>
                <Text style={tw`text-white font-black text-lg`}>{expertName}</Text>
                <Text style={tw`text-orange-500 text-xs font-bold uppercase tracking-wider`}>
                  {expertCategory}
                </Text>
              </View>
            </View>

            {/* Toggle Status */}
            <View style={tw`items-end gap-1`}>
              <Text style={tw`text-gray-400 text-[10px] font-bold uppercase`}>
                {isOnline ? "ONLINE" : "OFFLINE"}
              </Text>
              <Switch
                value={isOnline}
                onValueChange={handleUpdateStatus}
                trackColor={{ false: "#374151", true: "#f97316" }}
                thumbColor={isOnline ? "#ffffff" : "#9ca3af"}
              />
            </View>
          </View>

          {/* Stats Section */}
          <View style={tw`flex-row gap-3 mb-6`}>
            <View style={tw`flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 items-center`}>
              <Wallet size={20} color="#f97316" style={tw`mb-2`} />
              <Text style={tw`text-white font-black text-sm`}>{expertStats.earnings}</Text>
              <Text style={tw`text-gray-400 text-[10px] uppercase font-bold mt-0.5`}>Earnings</Text>
            </View>

            <View style={tw`flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 items-center`}>
              <CheckCircle2 size={20} color="#f97316" style={tw`mb-2`} />
              <Text style={tw`text-white font-black text-sm`}>{expertStats.completedJobs}</Text>
              <Text style={tw`text-gray-400 text-[10px] uppercase font-bold mt-0.5`}>Completed</Text>
            </View>

            <View style={tw`flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 items-center`}>
              <Star size={20} color="#f97316" fill="#f97316" style={tw`mb-2`} />
              <Text style={tw`text-white font-black text-sm`}>{expertStats.rating}</Text>
              <Text style={tw`text-gray-400 text-[10px] uppercase font-bold mt-0.5`}>Rating</Text>
            </View>
          </View>

          {/* Booking Request List */}
          <View style={tw`mb-2 flex-row justify-between items-center px-1`}>
            <Text style={tw`text-white font-black text-base`}>Service Bookings</Text>
            <Text style={tw`text-orange-500 text-xs font-bold`}>{bookings.length} Total</Text>
          </View>

          {loadingBookings ? (
            <ActivityIndicator size="large" color="#f97316" style={tw`my-12`} />
          ) : bookings.length === 0 ? (
            <View style={tw`bg-white/5 border border-white/10 rounded-3xl p-8 items-center my-6`}>
              <Calendar size={32} color="#6b7280" style={tw`mb-3`} />
              <Text style={tw`text-gray-400 text-sm text-center`}>No active booking requests yet.</Text>
            </View>
          ) : (
            <FlatList
              data={bookings}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View style={tw`bg-[#121318] border border-white/10 rounded-3xl p-5 mb-4`}>
                  {/* Status Tag */}
                  <View style={tw`flex-row justify-between items-center mb-3`}>
                    <View style={tw`flex-row items-center gap-1.5`}>
                      <Clock size={13} color="#f97316" />
                      <Text style={tw`text-white font-bold text-xs`}>{item.scheduledTime}</Text>
                    </View>
                    <View style={tw`px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20`}>
                      <Text style={tw`text-orange-500 text-[10px] font-black uppercase`}>
                        {item.status}
                      </Text>
                    </View>
                  </View>

                  {/* Customer details */}
                  <View style={tw`flex-row items-center gap-2 mb-3 bg-white/5 p-3 rounded-2xl border border-white/5`}>
                    <User size={15} color="#9ca3af" />
                    <Text style={tw`text-gray-300 text-xs font-bold`}>
                      {item.customerName || "Customer"}
                    </Text>
                  </View>

                  {/* Service Description */}
                  <Text style={tw`text-white font-black text-sm mb-1`}>Request details:</Text>
                  <Text style={tw`text-gray-400 text-xs mb-4 leading-relaxed`}>
                    "{item.service || "Home repair request"}"
                  </Text>

                  {/* Action Bar */}
                  <View style={tw`flex-row gap-3`}>
                    <Pressable
                      onPress={() => handleContactCustomer(item)}
                      style={tw`flex-1 bg-orange-500 py-3 rounded-2xl flex-row items-center justify-center gap-2`}
                    >
                      <MessageSquare size={16} color="#ffffff" />
                      <Text style={tw`text-white font-bold text-xs`}>Contact Customer</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            />
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

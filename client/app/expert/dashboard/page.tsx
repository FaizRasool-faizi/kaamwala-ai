"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, Calendar, Wallet, User as UserIcon, Settings, 
  Bell, Search, TrendingUp, Star, Clock, CheckCircle2,
  MoreVertical, Filter, Download, ArrowUpRight, ArrowDownRight,
  ShieldCheck, Loader2, Navigation, AlertCircle, Phone, MapPin, Check, Play, User,
  MessageSquare, AlertTriangle, Languages, Activity, Sparkles, X, ChevronRight, Send
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useAuth } from "@/context/AuthContext";
import { logoutExpert } from "@/services/expertAuth";
import { useRouter } from "next/navigation";
import { getFirebaseDb } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { io, Socket } from "socket.io-client";
import { 
  subscribeToExpertChats, 
  subscribeToMessages, 
  sendMessage, 
  type Chat, 
  type Message 
} from "@/services/chatService";
import axios from "axios";

// Passive AI Copilot Analysis Generator
function getAIPassiveInsights(text: string) {
  const t = text.toLowerCase();
  
  // 1. Urgency Level
  const isUrgent = /(urgent|emergency|jaldi|foran|fori|danger|spark|water leak|broken|broken pipe|current|blast|emergency|accident)/i.test(t);
  
  // 2. Client Sentiment
  let sentiment = "😊 Curious / Interested";
  if (/(kya|kab|kaise|how|why|when|where|kitna|charges|rate|fees|paisa|cost|\?)/i.test(t)) {
    sentiment = "❓ Information Inquiring";
  } else if (/(gussa|bad|worst|slow|late|bakwas|bekar|fraud|nonsense|scam|idiot|stupid|bad service|worst repair)/i.test(t)) {
    sentiment = "😠 Dissatisfied / Impatient";
  } else if (/(thanks|shukriya|shokriya|great|good|nice|perfect|excellent|behtreen|love|sweet|jazakallah)/i.test(t)) {
    sentiment = "💖 Grateful / Polite";
  }
  
  // 3. Roman Urdu -> English Translation
  let translation = "Evaluating client request details...";
  if (t.includes("experince") || t.includes("tajurba") || t.includes("experience")) {
    translation = "What is your professional work experience?";
  } else if (t.includes("charges") || t.includes("rate") || t.includes("visit") || t.includes("paise") || t.includes("price") || t.includes("kitne")) {
    translation = "How much do you charge for a checking/home visit?";
  } else if (t.includes("time") || t.includes("kab") || t.includes("minutes") || t.includes("hour") || t.includes("wqt") || t.includes("aoge")) {
    translation = "When will you arrive and how long will it take?";
  } else if (t.includes("address") || t.includes("kahan") || t.includes("location") || t.includes("rehte")) {
    translation = "Where are you located / share your exact address?";
  } else if (t.includes("masla") || t.includes("kharab") || t.includes("chalta") || t.includes("problem") || t.includes("ac")) {
    translation = "My home appliance/AC is not working properly.";
  } else if (t.length > 3) {
    translation = `Inquiry: "${text}"`;
  }
  
  // 4. Scam / Fraud Risk
  const isScam = /(advance|payment upfront|easypaisa upfront|otp|code|card details|password|deposit first|link click|pay before|card pin)/i.test(t);
  
  // 5. Smart Suggested Replies (Manual Click Trigger)
  let suggestions = [
    "G zaroor, main aap ke kaam ke liye bilkul available hoon.",
    "Aap problem ki picture ya details share kar sakte hain?",
    "Main abhi free hoon aur foran pohnch sakta hoon."
  ];
  
  if (t.includes("experince") || t.includes("tajurba") || t.includes("experience")) {
    suggestions = [
      "Mera is technical repair kaam mein 5 saal se zayada ka behtareen tajurba hai.",
      "Main ne is area mein 100+ se zayada kamyaab jobs mukammal kiye hain.",
      "Aap fkr na karein, mera kaam hamesha standard quality ka hota hai."
    ];
  } else if (t.includes("charges") || t.includes("rate") || t.includes("visit") || t.includes("paise") || t.includes("price") || t.includes("kitne")) {
    suggestions = [
      "Mera start visit and diagnostic fee PKR 1,500 hai. Baqi kaam dekh kar teh hoga.",
      "Standard visit charges PKR 1,500 hain. Aap fkr na karein, reasonable rates honge.",
      "Diagnostic and checking visit fee PKR 1,500 hai."
    ];
  } else if (t.includes("time") || t.includes("kab") || t.includes("minutes") || t.includes("hour") || t.includes("wqt") || t.includes("jaldi") || t.includes("foran") || t.includes("aoge")) {
    suggestions = [
      "Main takreeban 30 se 40 minutes ke andar aap ke paas pohnch jaunga.",
      "Main abhi nikal raha hoon aur jald se jald wahan pohnchne ki koshish karunga.",
      "Aap apna exact address share karein, main direct wahan aata hoon."
    ];
  }
  
  return {
    isUrgent,
    sentiment,
    translation,
    isScam,
    suggestions
  };
}

export default function ExpertDashboard() {
  const { t, isRTL } = useLanguage();
  const { expert, user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState("overview");
  const [bookings, setBookings] = useState<any[]>([]);
  const [dbLoading, setDbLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [trackingBookingId, setTrackingBookingId] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Real-Time Chat System States
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [inAppNotification, setInAppNotification] = useState<{ sender: string; text: string } | null>(null);

  // AI Suggestions and approvals
  const [aiDraftMessage, setAiDraftMessage] = useState<string | null>(null);

  // Scroll ref
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Redirect to login if not authenticated as an expert
  useEffect(() => {
    if (!authLoading) {
      if (!user || !expert) {
        router.push("/expert/login");
      }
    }
  }, [user, expert, authLoading, router]);

  // Subscribe to real-time bookings from Firestore
  useEffect(() => {
    if (!expert?.id) return;

    const db = getFirebaseDb();
    const q = query(
      collection(db, "bookings"),
      where("providerId", "==", expert.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bookingsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a: any, b: any) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
      
      setBookings(bookingsList);
      setDbLoading(false);
    }, (error) => {
      console.error("Firestore real-time subscription error:", error);
      setDbLoading(false);
    });

    return () => unsubscribe();
  }, [expert?.id]);

  // Subscribe to real-time active customer chats
  useEffect(() => {
    if (!expert?.id) return;

    const unsubscribe = subscribeToExpertChats(expert.id, (expertChats) => {
      setChats(expertChats);
    });

    return () => unsubscribe();
  }, [expert?.id]);

  // Subscribe to messages when active chat changes
  useEffect(() => {
    if (!activeChatId) {
      setChatMessages([]);
      return;
    }

    setChatLoading(true);
    const unsubscribe = subscribeToMessages(activeChatId, (messages) => {
      setChatMessages(messages);
      setChatLoading(false);

      // Scroll to bottom
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);

      // Play sound and trigger in-app notification if last message is from client
      if (messages.length > 0) {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg.senderRole === "client") {
          playNotificationSound();
          // Trigger in-app notification if we are not actively viewing this chat OR if the dashboard is on another tab
          const chatInfo = chats.find(c => c.id === activeChatId);
          if (activeTab !== "chat" || !activeChatId) {
            setInAppNotification({
              sender: chatInfo?.clientName || "Customer",
              text: lastMsg.content
            });
            setTimeout(() => setInAppNotification(null), 5000);
          }
        }
      }
    });

    return () => unsubscribe();
  }, [activeChatId, activeTab, chats]);

  // Establish socket.io connection
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    const socketInstance = io(apiUrl);
    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Control Browser Geolocation Tracking when status is "ON_THE_WAY"
  const startTracking = (bookingId: string) => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    setTrackingBookingId(bookingId);

    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          if (socket) {
            socket.emit("update_location", {
              bookingId,
              expertId: expert?.id,
              location,
              speed: position.coords.speed,
              heading: position.coords.heading
            });
            console.log("[GPS TRACKING] Sent live expert coordinates:", location);
          }
        },
        (error) => {
          console.error("[GPS TRACKING] Geolocation error:", error.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  };

  const stopTracking = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTrackingBookingId(null);
    console.log("[GPS TRACKING] Stopped watching expert coordinates.");
  };

  // Monitor active waypoints and auto-start or stop tracking
  useEffect(() => {
    const activeWayBooking = bookings.find(b => b.status === "ON_THE_WAY");
    if (activeWayBooking) {
      if (trackingBookingId !== activeWayBooking.id) {
        startTracking(activeWayBooking.id);
      }
    } else {
      if (trackingBookingId) {
        stopTracking();
      }
    }
    return () => {
      if (!activeWayBooking && watchIdRef.current) {
        stopTracking();
      }
    };
  }, [bookings, socket]);

  const handleLogout = async () => {
    await logoutExpert();
    router.push("/expert/login");
  };

  // Play notification chime sound
  const playNotificationSound = () => {
    if (typeof window === "undefined") return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {
      console.log("Audio play blocked by browser policy:", e);
    }
  };

  // Handle live status updates
  const handleUpdateStatus = async (bookingId: string, newStatus: string) => {
    try {
      const db = getFirebaseDb();
      const bookingRef = doc(db, "bookings", bookingId);
      
      // Update in Firestore
      await updateDoc(bookingRef, { status: newStatus });
      
      // Update in memory on backend server via socket
      if (socket) {
        socket.emit("update_status", { bookingId, status: newStatus });
      }

      console.log(`[STATUS] Successfully updated booking ${bookingId} to ${newStatus}`);
    } catch (err) {
      console.error("Failed to update status in database:", err);
      alert("Status update failed. Please check your internet connection.");
    }
  };

  // Send message from Expert
  const handleSendMessage = async (textOverride?: string) => {
    const text = (textOverride || newMessage).trim();
    if (!text || !activeChatId || !expert) return;

    setNewMessage("");
    setAiDraftMessage(null); // Clear any active drafts

    try {
      await sendMessage(activeChatId, expert.id, "expert", text);
    } catch (err) {
      console.error("Expert failed to send message:", err);
    }
  };

  // Manual approval trigger for AI Suggestions
  const handleApproveAiSuggestion = (suggestion: string) => {
    // Populate the draft state, requesting manual review and "Send as Expert" approval
    setAiDraftMessage(suggestion);
    setNewMessage(suggestion);
  };

  const displayName = expert?.name || user?.displayName || "Expert";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Dynamic statistics calculations
  const completedBookings = bookings.filter(b => b.status === "COMPLETED" || b.status === "Completed");
  const activeBookings = bookings.filter(b => b.status === "SCHEDULED" || b.status === "ON_THE_WAY" || b.status === "WORK_STARTED");
  
  const totalEarnings = completedBookings.reduce((sum, b) => {
    const amtStr = String(b.amount || "").replace(/[^0-9]/g, "");
    const amt = amtStr ? parseInt(amtStr) : 0;
    return sum + amt;
  }, 0);

  const formattedEarnings = `PKR ${totalEarnings.toLocaleString()}`;
  const avgRating = (expert as any)?.rating || "4.9";

  const stats = [
    { label: "dash.earnings", value: formattedEarnings, trend: completedBookings.length > 0 ? "Real Earnings" : "No sales", isPositive: true, icon: Wallet, color: "text-green-400" },
    { label: "dash.jobs", value: String(completedBookings.length), trend: `Total booked: ${bookings.length}`, isPositive: true, icon: CheckCircle2, color: "text-blue-400" },
    { label: "dash.rating", value: String(avgRating), trend: "Verified Rating", isPositive: true, icon: Star, color: "text-yellow-400" },
    { label: "Active Jobs", value: String(activeBookings.length), trend: activeBookings.length > 0 ? "Live tracking active" : "No active work", isPositive: activeBookings.length > 0, icon: Clock, color: "text-orange-400" },
  ];

  if (authLoading || dbLoading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
        <p className="text-gray-400 font-medium animate-pulse">Loading dashboard database...</p>
      </div>
    );
  }

  // Derive active AI insights for the expert
  const lastClientMessage = [...chatMessages].reverse().find(msg => msg.senderRole === "client");
  const aiInsights = lastClientMessage ? getAIPassiveInsights(lastClientMessage.content) : null;
  const activeClientBookings = selectedChat ? bookings.filter(b => b.customerId === selectedChat.clientId) : [];

  return (
    <div className="min-h-screen bg-[#050505] text-white flex relative overflow-hidden font-sans">
      
      {/* Dynamic Glow Orbs for premium SaaS aesthetics */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-orange-500/5 blur-[150px] -z-10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-[150px] -z-10" />

      {/* TOP NOTIFICATION TOAST */}
      <AnimatePresence>
        {inAppNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            onClick={() => {
              setActiveTab("chat");
              setInAppNotification(null);
            }}
            className="fixed top-6 right-6 z-50 bg-[#111216]/95 border border-orange-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-xl flex gap-3 items-center max-w-sm cursor-pointer hover:border-orange-500/80 transition-colors"
          >
            <div className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-ping shrink-0" />
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-black uppercase text-orange-400">Incoming Customer Message</h4>
              <p className="text-slate-300 text-xs font-bold truncate mt-0.5">"{inAppNotification.text}"</p>
              <p className="text-[10px] text-slate-500 mt-1 font-semibold">From: {inAppNotification.sender}</p>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setInAppNotification(null);
              }}
              className="text-slate-600 hover:text-white shrink-0 self-start"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`w-64 bg-[#0a0a0a] border-r border-white/5 flex flex-col p-6 fixed h-full ${isRTL ? "right-0 border-l" : "left-0"}`}>
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center font-bold text-xl">K</div>
          <span className="text-xl font-bold tracking-tight">KaamWala <span className="text-orange-500">AI</span></span>
        </div>

        <nav className="space-y-2 flex-1">
          {[
            { id: "overview", icon: LayoutDashboard, label: "Overview" },
            { id: "chat", icon: MessageSquare, label: "Client Inbox" },
            { id: "bookings", icon: Calendar, label: "My Bookings" },
            { id: "earnings", icon: Wallet, label: "Earnings" },
            { id: "profile", icon: UserIcon, label: "My Profile" },
            { id: "settings", icon: Settings, label: "Settings" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all border ${
                activeTab === item.id 
                ? "bg-orange-500/10 text-orange-500 font-medium border-orange-500/20 shadow-[0_0_12px_rgba(249,115,22,0.1)]" 
                : "text-gray-400 hover:bg-white/5 border-transparent"
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </div>
              
              {item.id === "chat" && chats.length > 0 && (
                <span className="bg-orange-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                  {chats.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-white/5">
          <div className="flex items-center gap-3 p-2 bg-white/5 rounded-2xl">
            {expert?.profileImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={expert.profileImage} alt={displayName} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center font-bold text-sm">{initials}</div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-white">{displayName}</p>
              <p className="text-xs text-gray-500 truncate capitalize">{expert?.category || "Expert"}</p>
            </div>
            <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
          </div>
          <button type="button" onClick={handleLogout} className="w-full text-xs text-gray-400 hover:text-white py-2 rounded-lg hover:bg-white/5 mt-3 transition-colors">
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 ${isRTL ? "mr-64" : "ml-64"} p-8 overflow-y-auto min-h-screen`}>
        
        {/* Top Header (For all tabs except chat which has its own layout) */}
        {activeTab !== "chat" && (
          <header className="flex justify-between items-center mb-10">
            <div>
              <h2 className="text-2xl font-bold">{t("dash.welcome")}, {displayName.split(" ")[0]}!</h2>
              <p className="text-gray-500">Live operational data connected to Firestore.</p>
            </div>
            <div className="flex items-center gap-4">
              <LanguageToggle />
            </div>
          </header>
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Live GPS Broadcast Toast */}
            {trackingBookingId && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-2xl flex items-center justify-between text-orange-400"
              >
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-orange-500"></span>
                  </span>
                  <p className="text-sm font-medium">GPS Location Broadcast Active for booking {trackingBookingId}. Customer is viewing your live position.</p>
                </div>
                <button 
                  onClick={stopTracking} 
                  className="px-3 py-1 bg-orange-500/20 hover:bg-orange-500/30 rounded-lg text-xs font-semibold uppercase tracking-wider"
                >
                  Pause GPS
                </button>
              </motion.div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-[#0a0a0a] border border-white/5 p-6 rounded-[2rem] hover:border-orange-500/30 transition-all group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 rounded-2xl bg-white/5 group-hover:bg-orange-500/10 transition-all">
                      <stat.icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-semibold uppercase px-2 py-1 rounded-full bg-white/5 text-gray-400">
                      {stat.trend}
                    </div>
                  </div>
                  <p className="text-gray-500 text-sm mb-1">{t(stat.label)}</p>
                  <h3 className="text-2xl font-bold">{stat.value}</h3>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Bookings Area */}
              <div className="lg:col-span-2 space-y-8">
                {/* Recent Bookings */}
                <div className="bg-[#0a0a0a] border border-white/5 p-8 rounded-[2.5rem]">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-bold">Recent Live Requests</h3>
                    <button onClick={() => setActiveTab("bookings")} className="text-sm text-orange-500 hover:underline font-semibold">View All</button>
                  </div>
                  
                  {bookings.length === 0 ? (
                    <div className="text-center py-12">
                      <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400 font-medium">No live bookings found in the database.</p>
                      <p className="text-gray-600 text-sm mt-1">Bookings requested by customers will show up here in real time.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-gray-500 text-xs border-b border-white/5">
                            <th className="pb-4 font-medium uppercase tracking-wider">Customer</th>
                            <th className="pb-4 font-medium uppercase tracking-wider">Service</th>
                            <th className="pb-4 font-medium uppercase tracking-wider">Scheduled Time</th>
                            <th className="pb-4 font-medium uppercase tracking-wider">Amount</th>
                            <th className="pb-4 font-medium uppercase tracking-wider">Status</th>
                            <th className="pb-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {bookings.slice(0, 5).map((booking) => (
                            <tr key={booking.id} className="group">
                              <td className="py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold uppercase">{booking.customerName ? booking.customerName[0] : "C"}</div>
                                  <span className="text-sm font-medium">{booking.customerName || "Customer"}</span>
                                </div>
                              </td>
                              <td className="py-4 text-sm text-gray-400 capitalize">{booking.service || expert?.category}</td>
                              <td className="py-4 text-sm text-gray-400">{booking.scheduledTime || "ASAP"}</td>
                              <td className="py-4 text-sm font-semibold text-orange-400">{booking.amount || `PKR ${expert?.rate || "1,500"}`}</td>
                              <td className="py-4">
                                <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                                  booking.status === "SCHEDULED" ? "bg-blue-500/10 text-blue-400" :
                                  booking.status === "ON_THE_WAY" ? "bg-orange-500/10 text-orange-400 animate-pulse" :
                                  booking.status === "WORK_STARTED" ? "bg-purple-500/10 text-purple-400" :
                                  booking.status === "COMPLETED" ? "bg-green-500/10 text-green-400" :
                                  "bg-red-500/10 text-red-400"
                                }`}>
                                  {booking.status === "SCHEDULED" ? "Pending" : booking.status.replace("_", " ")}
                                </span>
                              </td>
                              <td className="py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {booking.status === "SCHEDULED" && (
                                    <button 
                                      onClick={() => handleUpdateStatus(booking.id, "ON_THE_WAY")}
                                      className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                                    >
                                      <Navigation className="w-3.5 h-3.5" /> Start Journey
                                    </button>
                                  )}
                                  {booking.status === "ON_THE_WAY" && (
                                    <button 
                                      onClick={() => handleUpdateStatus(booking.id, "WORK_STARTED")}
                                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                                    >
                                      <Play className="w-3.5 h-3.5 fill-white" /> Start Work
                                    </button>
                                  )}
                                  {booking.status === "WORK_STARTED" && (
                                    <button 
                                      onClick={() => handleUpdateStatus(booking.id, "COMPLETED")}
                                      className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                                    >
                                      <Check className="w-3.5 h-3.5" /> Complete
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar Area */}
              <div className="space-y-8">
                {/* Profile Verification */}
                <div className="bg-[#0a0a0a] border border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-all">
                    <ShieldCheck className="w-24 h-24 text-orange-500" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">Profile Status</h3>
                  <p className="text-sm text-gray-400 mb-6">Expert verification parameters in Firestore database.</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Expert ID</span>
                      <span className="text-gray-300 font-mono text-xs max-w-[120px] truncate">{expert?.id}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Account Type</span>
                      <span className="text-orange-400 font-medium capitalize">{expert?.category}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Verification</span>
                      <span className="text-green-500 flex items-center gap-1 font-medium">Approved <CheckCircle2 className="w-3.5 h-3.5" /></span>
                    </div>
                    <div className="w-full bg-white/5 h-1.5 rounded-full mt-4 overflow-hidden">
                      <div className="bg-gradient-to-r from-orange-500 to-green-500 h-full w-[100%]" />
                    </div>
                  </div>
                </div>

                {/* Reviews */}
                <div className="bg-[#0a0a0a] border border-white/5 p-8 rounded-[2.5rem]">
                  <h3 className="text-lg font-bold mb-6">Customer Reviews</h3>
                  <div className="text-center py-6">
                    <Star className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-400">No active reviews yet</p>
                    <p className="text-xs text-gray-600 mt-1 max-w-[200px] mx-auto">Reviews from completed customer bookings will display here.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CLIENT CHAT INBOX (EXPERT INBOX) */}
        {activeTab === "chat" && (
          <div className="h-[calc(100vh-6rem)] flex gap-6 -mt-2">
            
            {/* Conversations Sidebar (1/3 Width) */}
            <div className="w-80 bg-[#0a0a0a] border border-white/5 rounded-3xl p-4 flex flex-col gap-4 overflow-hidden h-full shadow-lg">
              <div>
                <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                  🗣️ Conversations
                </h3>
                <p className="text-xs text-slate-500 mt-1">Real-time incoming customer messages.</p>
              </div>

              {/* Chat List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-chat-scrollbar">
                {chats.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-600">
                    <MessageSquare size={32} className="text-slate-700 animate-pulse mb-3" />
                    <p className="text-xs font-bold uppercase tracking-wider">No Active Chats</p>
                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">Customers requesting matches or visiting your detail card will populate active conversations.</p>
                  </div>
                ) : (
                  chats.map((c) => {
                    const isSelected = activeChatId === c.id;
                    const isLastMsgFromClient = c.lastMessageSender === "client";
                    return (
                      <button
                        key={c.id}
                        onClick={() => {
                          setActiveChatId(c.id);
                          setSelectedChat(c);
                        }}
                        className={`w-full text-left p-3.5 rounded-2xl border transition-all flex flex-col gap-1.5 relative overflow-hidden group cursor-pointer ${
                          isSelected 
                            ? "bg-orange-500/10 border-orange-500/20 text-white shadow-md shadow-orange-500/5" 
                            : "bg-white/2 hover:bg-white/5 border-white/5 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {/* New message indicator */}
                        {isLastMsgFromClient && !isSelected && (
                          <div className="absolute top-3.5 right-3.5 w-2 h-2 bg-orange-500 rounded-full animate-pulse shadow-[0_0_6px_rgba(249,115,22,0.6)]" />
                        )}
                        <div className="flex justify-between items-center">
                          <span className="font-extrabold text-sm truncate pr-4 text-white">
                            {c.clientName}
                          </span>
                          <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">
                            {c.updatedAt?.toDate ? c.updatedAt.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "Recent"}
                          </span>
                        </div>
                        <p className={`text-xs truncate font-medium ${isLastMsgFromClient && !isSelected ? "text-slate-200 font-semibold" : "text-slate-400"}`}>
                          {c.lastMessage || "Click to start conversation"}
                        </p>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Chat Thread Panel & AI Copilot / History (2/3 Width) */}
            {selectedChat ? (
              <div className="flex-1 flex gap-6 h-full overflow-hidden">
                
                {/* Main conversation Pane */}
                <div className="flex-1 bg-[#0a0a0a] border border-white/5 rounded-3xl overflow-hidden flex flex-col h-full shadow-2xl relative">
                  
                  {/* Pane Header */}
                  <div className="p-4 border-b border-white/5 bg-black/40 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-orange-600/20 text-orange-400 font-black border border-orange-500/10 flex items-center justify-center text-sm uppercase">
                        {selectedChat.clientName[0]}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white">{selectedChat.clientName}</h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                          <span className="text-[9px] font-bold text-green-400 uppercase tracking-widest">
                            AI Moderation Protected
                          </span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setActiveChatId(null);
                        setSelectedChat(null);
                      }}
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all shrink-0 cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Message Thread stream */}
                  <div className="flex-1 overflow-y-auto space-y-4 px-6 py-4 bg-[#07080a] custom-chat-scrollbar flex flex-col">
                    {chatLoading ? (
                      <div className="flex-1 flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider animate-pulse">Retrieving Messages...</p>
                      </div>
                    ) : chatMessages.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-600">
                        <p className="text-xs font-bold uppercase tracking-wider">Empty Conversation</p>
                        <p className="text-[10px] text-slate-500 mt-1 max-w-xs">Write a greeting message to start the correspondence with {selectedChat.clientName}.</p>
                      </div>
                    ) : (
                      chatMessages.map((msg) => {
                        if (msg.senderRole === "system") {
                          return (
                            <div key={msg.id} className="flex justify-center my-2">
                              <div className="bg-red-500/10 border border-red-500/25 text-red-400 rounded-2xl px-5 py-3 text-xs text-center max-w-md font-semibold shadow-lg shadow-red-500/5 flex gap-2 items-center">
                                <AlertTriangle size={16} className="text-red-400 shrink-0" />
                                <span>{msg.content}</span>
                              </div>
                            </div>
                          );
                        }

                        const isMe = msg.senderRole === "expert";
                        return (
                          <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"} items-end gap-2`}>
                            {!isMe && (
                              <div className="w-6 h-6 rounded-full bg-orange-600/20 text-orange-400 font-black border border-orange-500/10 flex items-center justify-center text-[9px] uppercase shrink-0">
                                {selectedChat.clientName[0]}
                              </div>
                            )}
                            <div className={`max-w-[70%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                              isMe 
                                ? "bg-gradient-to-br from-orange-600 to-orange-500 text-white rounded-br-none shadow-[0_4px_16px_rgba(249,115,22,0.15)] border border-orange-500/20"
                                : "bg-white/5 border border-white/10 text-slate-200 rounded-tl-none shadow-md"
                            }`}>
                              <p className="font-medium">{msg.content}</p>
                              <span className="block text-[8px] text-right text-white/40 mt-1.5 uppercase tracking-widest font-semibold">
                                {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* AI Copilot Suggestion Box (Expert Only) */}
                  {aiInsights && (
                    <div className="bg-[#101115] border-t border-white/5 p-4 space-y-3 z-10 relative">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Sparkles size={14} className="text-orange-400 animate-pulse" />
                          <span className="text-[10px] font-black uppercase tracking-wider text-orange-400 font-bold">
                            AI Expert Copilot Assistance
                          </span>
                        </div>
                        <div className="flex gap-2">
                          {/* Urgency Badge */}
                          <span className={`text-[8px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                            aiInsights.isUrgent 
                              ? "bg-red-500/15 border border-red-500/30 text-red-400 animate-pulse" 
                              : "bg-green-500/10 border border-green-500/20 text-green-400"
                          }`}>
                            {aiInsights.isUrgent ? "🚨 Urgent Inquiry" : "🟢 Normal Inquiry"}
                          </span>
                          
                          {/* Scam Risk Alert */}
                          <span className={`text-[8px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                            aiInsights.isScam 
                              ? "bg-red-500/20 border border-red-500/40 text-red-400 animate-bounce" 
                              : "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                          }`}>
                            {aiInsights.isScam ? "🚨 SCAM RISK: HIGH" : "✅ Safe"}
                          </span>
                        </div>
                      </div>

                      {/* Translation & Sentiment */}
                      <div className="grid grid-cols-2 gap-3 text-[11px] bg-black/40 border border-white/5 rounded-xl p-2.5">
                        <div className="space-y-0.5 border-r border-white/5 pr-2">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                            <Languages size={10} /> Roman Urdu ↔ English
                          </span>
                          <p className="text-slate-300 italic font-medium truncate">"{aiInsights.translation}"</p>
                        </div>
                        <div className="space-y-0.5 pl-2">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                            <Activity size={10} /> Client Sentiment
                          </span>
                          <p className="text-slate-300 font-extrabold flex items-center gap-1">
                            {aiInsights.sentiment}
                          </p>
                        </div>
                      </div>

                      {/* AI Suggested Replies */}
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                          AI Suggested Replies (Requires confirmation before send):
                        </span>
                        <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                          {aiInsights.suggestions.map((suggestion, i) => (
                            <button
                              key={i}
                              onClick={() => handleApproveAiSuggestion(suggestion)}
                              className="text-[10px] font-bold text-orange-300 hover:text-white bg-orange-500/10 hover:bg-orange-600/20 border border-orange-500/20 hover:border-orange-500/40 px-3 py-1.5 rounded-xl transition-all text-left cursor-pointer"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Message Input box */}
                  <div className="p-4 border-t border-white/5 bg-black/40 flex flex-col gap-2 relative z-10">
                    {/* Draft approval container */}
                    <AnimatePresence>
                      {aiDraftMessage && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-2.5 flex justify-between items-center text-xs"
                        >
                          <div className="flex items-center gap-2 text-orange-300">
                            <Sparkles size={14} className="text-orange-400" />
                            <span className="font-extrabold uppercase text-[9px] tracking-wider bg-orange-600/20 px-2 py-0.5 rounded-md">Drafting AI Reply</span>
                            <span className="font-semibold truncate max-w-sm">"{aiDraftMessage}"</span>
                          </div>
                          <button 
                            onClick={() => {
                              setAiDraftMessage(null);
                              setNewMessage("");
                            }}
                            className="text-slate-500 hover:text-white text-xs cursor-pointer font-bold uppercase tracking-wider"
                          >
                            Cancel
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => {
                          setNewMessage(e.target.value);
                          if (e.target.value !== aiDraftMessage) {
                            setAiDraftMessage(null); // Clear draft flag if they manually edit
                          }
                        }}
                        placeholder="Type a response to the customer..."
                        className="flex-1 bg-[#15161a] border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/40 transition-colors"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSendMessage();
                        }}
                      />
                      <button
                        onClick={() => handleSendMessage()}
                        disabled={!newMessage.trim()}
                        className={`px-5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer ${
                          aiDraftMessage 
                            ? "bg-orange-600 hover:bg-orange-500 text-white shadow-[0_0_12px_rgba(249,115,22,0.4)] border border-orange-500/25 scale-[1.02]" 
                            : "bg-white hover:bg-slate-100 text-black disabled:opacity-50"
                        }`}
                      >
                        {aiDraftMessage ? "Send as Expert" : "Send Response"}
                      </button>
                    </div>
                  </div>

                </div>

                {/* Sidebar Widget (Right side of detail - 1/3 Width): Job & History Management */}
                <div className="w-80 flex flex-col gap-6 h-full">
                  
                  {/* Job/Booking Management */}
                  <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-5 shadow-lg flex flex-col gap-4 flex-1 overflow-y-auto custom-chat-scrollbar">
                    <div>
                      <h4 className="text-xs font-black uppercase text-orange-400 tracking-wider">
                        🛠️ Active Bookings
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">Control live statuses for this client.</p>
                    </div>

                    <div className="space-y-3 flex-1 overflow-y-auto">
                      {activeClientBookings.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-600">
                          <AlertCircle size={20} className="text-slate-700 mb-2" />
                          <p className="text-[10px] font-bold uppercase tracking-wider">No Active Jobs</p>
                          <p className="text-[9px] text-slate-500 mt-0.5 leading-relaxed">Bookings scheduled by this customer will display here.</p>
                        </div>
                      ) : (
                        activeClientBookings.map((b) => (
                          <div 
                            key={b.id} 
                            className="bg-white/2 border border-white/5 rounded-2xl p-4 flex flex-col gap-3 hover:border-orange-500/20 transition-all"
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-mono text-[9px] text-slate-500 bg-white/5 px-2 py-0.5 rounded-md">{b.id}</span>
                              <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                                b.status === "SCHEDULED" ? "bg-blue-500/10 text-blue-400" :
                                b.status === "ON_THE_WAY" ? "bg-orange-500/10 text-orange-400 animate-pulse" :
                                b.status === "WORK_STARTED" ? "bg-purple-500/10 text-purple-400" :
                                "bg-green-500/10 text-green-400"
                              }`}>
                                {b.status}
                              </span>
                            </div>

                            <div className="space-y-1.5 text-[11px] text-slate-400">
                              <div className="flex items-center gap-1.5">
                                <Clock size={12} className="text-orange-500 shrink-0" />
                                <span>{b.scheduledTime || "ASAP"}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Wallet size={12} className="text-orange-500 shrink-0" />
                                <span className="font-bold text-white">{b.amount || `PKR ${expert?.rate || "1,500"}`}</span>
                              </div>
                            </div>

                            {/* Job actions directly in chat */}
                            <div className="border-t border-white/5 pt-2.5 mt-0.5 flex gap-2">
                              {b.status === "SCHEDULED" && (
                                <button
                                  onClick={() => handleUpdateStatus(b.id, "ON_THE_WAY")}
                                  className="w-full py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <Navigation size={10} /> Start Journey
                                </button>
                              )}
                              {b.status === "ON_THE_WAY" && (
                                <button
                                  onClick={() => handleUpdateStatus(b.id, "WORK_STARTED")}
                                  className="w-full py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <Play size={10} className="fill-white" /> Start Work
                                </button>
                              )}
                              {b.status === "WORK_STARTED" && (
                                <button
                                  onClick={() => handleUpdateStatus(b.id, "COMPLETED")}
                                  className="w-full py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <Check size={10} /> Complete
                                </button>
                              )}
                              {b.status === "COMPLETED" && (
                                <div className="text-green-400 font-extrabold text-[9px] text-center w-full flex items-center justify-center gap-1">
                                  <CheckCircle2 size={10} /> Finished successfully
                                </div>
                              )}
                            </div>

                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Client Booking History */}
                  <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-5 shadow-lg flex flex-col gap-4 h-64">
                    <div>
                      <h4 className="text-xs font-black uppercase text-blue-400 tracking-wider">
                        📅 Customer History
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">Historical booking patterns.</p>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-chat-scrollbar text-[11px] text-slate-400">
                      <div className="flex justify-between items-center p-2 bg-white/2 rounded-xl">
                        <span>Total Bookings Requested</span>
                        <strong className="text-white font-extrabold">{activeClientBookings.length}</strong>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-white/2 rounded-xl">
                        <span>Completed Jobs Ledger</span>
                        <strong className="text-green-400 font-extrabold">
                          {activeClientBookings.filter(b => b.status === "COMPLETED").length}
                        </strong>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-white/2 rounded-xl">
                        <span>Reliability Status</span>
                        <span className="text-blue-400 font-extrabold">High Match</span>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            ) : (
              <div className="flex-1 bg-[#0a0a0a] border border-white/5 rounded-3xl flex flex-col items-center justify-center text-center p-8 shadow-lg">
                <div className="p-4 bg-white/2 border border-white/5 rounded-full mb-4">
                  <MessageSquare size={32} className="text-slate-600 animate-pulse" />
                </div>
                <h3 className="text-base font-black text-white uppercase tracking-wider">Select a Conversation</h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1">Select a customer thread from the conversations panel on the left to start real-time messaging, review translation and sentiment, or control jobs.</p>
              </div>
            )}

          </div>
        )}

        {/* TAB 3: BOOKINGS */}
        {activeTab === "bookings" && (
          <div className="bg-[#0a0a0a] border border-white/5 p-8 rounded-[2.5rem] space-y-6">
            <div>
              <h3 className="text-xl font-bold">All Bookings Ledger</h3>
              <p className="text-sm text-gray-500">Real-time status controls linked with Customer Tracking Map.</p>
            </div>

            {bookings.length === 0 ? (
              <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400 font-semibold">No bookings registered for your expert account yet.</p>
                <p className="text-gray-600 text-sm mt-1 max-w-sm mx-auto">Complete customer matches inside KaamWala AI customer search to receive jobs.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <div 
                    key={booking.id} 
                    className="p-6 bg-white/5 rounded-3xl border border-white/5 flex flex-col md:flex-row justify-between gap-6 items-start md:items-center hover:border-orange-500/20 transition-all"
                  >
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs px-2.5 py-1 bg-white/5 rounded-lg text-gray-400">{booking.id}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest ${
                          booking.status === "SCHEDULED" ? "bg-blue-500/10 text-blue-400" :
                          booking.status === "ON_THE_WAY" ? "bg-orange-500/10 text-orange-400 animate-pulse" :
                          booking.status === "WORK_STARTED" ? "bg-purple-500/10 text-purple-400" :
                          "bg-green-500/10 text-green-400"
                        }`}>
                          {booking.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                          <User className="w-4 h-4 text-orange-500" />
                          <span className="font-semibold">{booking.customerName || "Customer"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <MapPin className="w-4 h-4 text-orange-500" />
                          <span>{booking.clientLocation?.address || "Address in Lahore"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Clock className="w-4 h-4 text-orange-500" />
                          <span>Scheduled: {booking.scheduledTime || "ASAP"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Wallet className="w-4 h-4 text-orange-500" />
                          <span>Earnings: <strong className="text-white font-semibold">{booking.amount || `PKR ${expert?.rate || "1,500"}`}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 justify-end">
                      {booking.status === "SCHEDULED" && (
                        <button 
                          onClick={() => handleUpdateStatus(booking.id, "ON_THE_WAY")}
                          className="w-full md:w-auto px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(249,115,22,0.3)] border-transparent cursor-pointer"
                        >
                          <Navigation className="w-4 h-4" /> Start Journey
                        </button>
                      )}
                      
                      {booking.status === "ON_THE_WAY" && (
                        <button 
                          onClick={() => handleUpdateStatus(booking.id, "WORK_STARTED")}
                          className="w-full md:w-auto px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(147,51,234,0.3)] border-transparent cursor-pointer"
                        >
                          <Play className="w-4 h-4 fill-white" /> Start Work
                        </button>
                      )}

                      {booking.status === "WORK_STARTED" && (
                        <button 
                          onClick={() => handleUpdateStatus(booking.id, "COMPLETED")}
                          className="w-full md:w-auto px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(34,197,94,0.3)] border-transparent cursor-pointer"
                        >
                          <Check className="w-4 h-4" /> Complete Work
                        </button>
                      )}

                      {booking.status === "COMPLETED" && (
                        <div className="flex items-center gap-1.5 text-green-400 font-semibold text-xs py-2 px-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                          <CheckCircle2 className="w-4 h-4" /> Work Completed Successfully
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: EARNINGS */}
        {activeTab === "earnings" && (
          <div className="bg-[#0a0a0a] border border-white/5 p-8 rounded-[2.5rem] space-y-6">
            <div>
              <h3 className="text-xl font-bold">Earnings Ledger</h3>
              <p className="text-sm text-gray-500">Real ledger calculations based on Firestore completed jobs.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-white/5 border border-white/5 rounded-3xl">
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Gross Revenue</p>
                <h3 className="text-2xl font-black text-white">{formattedEarnings}</h3>
              </div>
              <div className="p-6 bg-white/5 border border-white/5 rounded-3xl">
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Completed Jobs</p>
                <h3 className="text-2xl font-black text-blue-400">{completedBookings.length} Jobs</h3>
              </div>
              <div className="p-6 bg-white/5 border border-white/5 rounded-3xl">
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Average rate</p>
                <h3 className="text-2xl font-black text-orange-400">PKR {expert?.rate || "1,500"}</h3>
              </div>
            </div>

            {completedBookings.length === 0 ? (
              <div className="text-center py-16 bg-white/5 rounded-3xl border border-white/5">
                <Wallet className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-400 font-medium">No sales recorded yet.</p>
                <p className="text-xs text-gray-600 mt-1">Earnings will accumulate once completed jobs are recorded.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-gray-500 text-xs border-b border-white/5">
                      <th className="pb-4 font-medium uppercase">Booking ID</th>
                      <th className="pb-4 font-medium uppercase">Customer</th>
                      <th className="pb-4 font-medium uppercase">Service Completed</th>
                      <th className="pb-4 font-medium uppercase">Completion Date</th>
                      <th className="pb-4 font-medium uppercase text-right">Earning Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm">
                    {completedBookings.map((b) => (
                      <tr key={b.id}>
                        <td className="py-4 font-mono text-xs text-gray-400">{b.id}</td>
                        <td className="py-4 font-medium">{b.customerName || "Customer"}</td>
                        <td className="py-4 text-gray-400 capitalize">{b.service || expert?.category}</td>
                        <td className="py-4 text-gray-400">{b.scheduledTime || "N/A"}</td>
                        <td className="py-4 text-right font-black text-green-400">{b.amount || `PKR ${expert?.rate || "1,500"}`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: PROFILE */}
        {activeTab === "profile" && (
          <div className="bg-[#0a0a0a] border border-white/5 p-8 rounded-[2.5rem] space-y-8">
            <div>
              <h3 className="text-xl font-bold">My Verified Profile</h3>
              <p className="text-sm text-gray-500">Official registered profile parameters as saved in database.</p>
            </div>

            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="relative border-transparent shrink-0">
                {expert?.profileImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={expert.profileImage} alt={displayName} className="w-32 h-32 rounded-3xl object-cover border border-white/10" />
                ) : (
                  <div className="w-32 h-32 rounded-3xl bg-orange-500 flex items-center justify-center font-bold text-3xl">{initials}</div>
                )}
                <div className="absolute -bottom-2 -right-2 p-1.5 bg-blue-500 rounded-full border-4 border-black" title="Verified Expert">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 flex-1 w-full">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Full Name</label>
                  <p className="text-base font-semibold text-white">{expert?.name || displayName}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Email Address</label>
                  <p className="text-base font-semibold text-white">{expert?.email}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Phone Number</label>
                  <p className="text-base font-semibold text-white">{expert?.phone}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Primary Skill / Category</label>
                  <p className="text-base font-semibold text-orange-400 capitalize">{expert?.category}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Specific Sub-Skills</label>
                  <p className="text-base font-semibold text-white">{expert?.skills || "General Maintenance"}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Service Location / City</label>
                  <p className="text-base font-semibold text-white">{expert?.location?.address} ({expert?.location?.city})</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Work Hours Selection</label>
                  <p className="text-base font-semibold text-white">{expert?.hours || "Full Time"}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Rate Charge per Job</label>
                  <p className="text-base font-black text-green-400">PKR {expert?.rate || "1,500"}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: SETTINGS */}
        {activeTab === "settings" && (
          <div className="bg-[#0a0a0a] border border-white/5 p-8 rounded-[2.5rem] space-y-6">
            <div>
              <h3 className="text-xl font-bold">Expert Panel Settings</h3>
              <p className="text-sm text-gray-500">Configure your panel settings.</p>
            </div>

            <div className="p-6 bg-white/5 rounded-3xl border border-white/5 space-y-4 max-w-xl">
              <h4 className="font-semibold text-sm">Security & Privacy</h4>
              <p className="text-xs text-gray-500">Your profile data is encrypted and validated on Google Cloud Platform Firestore services.</p>
              
              <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                <div>
                  <p className="text-sm font-semibold">Delete Expert Account</p>
                  <p className="text-xs text-gray-500">Permanently remove your expert listings.</p>
                </div>
                <button className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer">
                  Request Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

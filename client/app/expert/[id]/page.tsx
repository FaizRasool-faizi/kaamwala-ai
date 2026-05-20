"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { 
  ArrowLeft, Star, Shield, Award, Calendar, Clock, DollarSign, 
  Mic, MicOff, Send, ShieldAlert, BadgeCheck, Zap, Loader2,
  Bell, Activity, User, ShieldCheck, AlertTriangle
} from "lucide-react";
import { getExpertProfile } from "@/services/expertAuth";
import type { ExpertProfile } from "@/types/expert";
import { useAuth } from "@/context/AuthContext";
import { 
  getOrCreateChat, 
  sendMessage, 
  subscribeToMessages, 
  type Message 
} from "@/services/chatService";
import axios from "axios";

// Speech Recognition Type Definitions
type SpeechRecognitionResultEvent = Event & {
  results: SpeechRecognitionResultList;
};

type SpeechRecognitionErrorEvent = Event & {
  error: string;
};

type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onstart?: (() => void) | null;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export default function ExpertDetailPage() {
  const params = useParams();
  const router = useRouter();
  const expertId = params.id as string;

  const { user, customer, expert: currentExpertProfile, loading: authLoading } = useAuth();
  
  const [expert, setExpert] = useState<ExpertProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [violationsCount, setViolationsCount] = useState(0);
  const [moderationWarning, setModerationWarning] = useState<string | null>(null);
  const [isRestricted, setIsRestricted] = useState(false);
  const [isModerating, setIsModerating] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);

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

  // Secure Role-Based Routing
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        // If not logged in at all, redirect to client login
        router.push(`/login?redirect=/expert/${expertId}`);
      } else if (currentExpertProfile) {
        // If logged in as an Expert, redirect to expert dashboard (strictly prevent role mixing/switching)
        router.push("/expert/dashboard");
      }
    }
  }, [user, currentExpertProfile, authLoading, router, expertId]);

  // Fetch expert profile on load
  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        const profile = await getExpertProfile(expertId);
        if (profile) {
          setExpert(profile);
        }
      } catch (err) {
        console.error("Failed to load expert profile:", err);
      } finally {
        setLoading(false);
      }
    }

    if (expertId) {
      loadProfile();
    }
  }, [expertId]);

  // Establish real-time chat room and subscribe to Firestore messages
  useEffect(() => {
    if (!user || !expert || currentExpertProfile) return;

    const currentUid = user.uid;
    const currentExpertId = expert.id;
    const currentExpertName = expert.name;
    const clientName = customer?.name || user.displayName || "Customer";

    let unsubscribe: () => void;

    async function initChatRoom() {
      try {
        const cId = await getOrCreateChat(currentUid, clientName, currentExpertId, currentExpertName);
        setChatId(cId);

        // Subscribe to real-time message stream
        unsubscribe = subscribeToMessages(cId, (msgs) => {
          setMessages(msgs);
          // Play a sound if the last message is from the expert
          if (msgs.length > 0) {
            const lastMsg = msgs[msgs.length - 1];
            if (lastMsg.senderRole === "expert") {
              playNotificationSound();
            }
          }
        });
      } catch (err) {
        console.error("Failed to setup chat room:", err);
      }
    }

    initChatRoom();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, expert, customer, currentExpertProfile]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Handle Speech-to-Text Voice Chat
  const handleVoiceInput = () => {
    if (typeof window === "undefined") return;

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser. Please try Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "ur-PK";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0]?.transcript || "")
        .join(" ")
        .trim();

      if (transcript) {
        setNewMessage(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech Recognition Error:", event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  // Send message to expert (Strictly client only)
  const handleSendMessage = async () => {
    const text = newMessage.trim();
    if (!text || isRestricted || isModerating || !chatId || !user) return;

    setNewMessage("");
    setModerationWarning(null);

    // 1. Client-Side Real-Time AI Moderation
    setIsModerating(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await axios.post(`${apiUrl}/api/chat/moderate`, {
        message: text,
        violationsCount: violationsCount
      });

      if (response.data.success) {
        const { inappropriate, warning, restricted } = response.data;

        if (inappropriate) {
          const newViolations = violationsCount + 1;
          setViolationsCount(newViolations);

          // Add System warning message directly into Firestore chat
          await sendMessage(chatId, "system", "system", warning || "Inappropriate message blocked by AI Moderation.", true);
          setModerationWarning(warning || "Inappropriate message blocked.");

          if (restricted) {
            setIsRestricted(true);
            await sendMessage(chatId, "system", "system", "Chat temporarily restricted due to policy violations.", true);
          }
          setIsModerating(false);
          return;
        }
      }
    } catch (err) {
      console.error("AI Moderation API failed. Sending directly...", err);
    } finally {
      setIsModerating(false);
    }

    // 2. Post the client message to Firestore chat
    try {
      await sendMessage(chatId, user.uid, "client", text);
    } catch (err) {
      console.error("Failed to send message to Firestore:", err);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Loading Expert Profile...</p>
      </div>
    );
  }

  if (!expert) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6">
        <div className="max-w-md text-center space-y-6">
          <ShieldAlert className="w-20 h-20 text-red-500 mx-auto" />
          <h2 className="text-3xl font-black">Expert Not Found</h2>
          <p className="text-slate-400 leading-relaxed">
            The profile you are trying to access does not exist or has been removed.
          </p>
          <Link 
            href="/"
            className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-full font-bold transition-all active:scale-95"
          >
            <ArrowLeft size={16} /> Return to Search
          </Link>
        </div>
      </div>
    );
  }

  const jobsCompletedCount = expertId.startsWith("seed_") ? (expertId === "seed_expert_rizwan" ? 248 : expertId === "seed_expert_sajid" ? 195 : expertId === "seed_expert_imran" ? 312 : expertId === "seed_expert_zafar" ? 114 : 180) : 45;
  const ratingValue = expertId.startsWith("seed_") ? (expertId === "seed_expert_rizwan" ? 4.9 : expertId === "seed_expert_sajid" ? 4.7 : expertId === "seed_expert_imran" ? 4.8 : expertId === "seed_expert_zafar" ? 4.6 : 4.85) : 4.8;
  const rates = expert.rate ? `PKR ${Number(expert.rate).toLocaleString()}` : "PKR 1,500";

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col relative overflow-hidden font-sans">
      
      {/* Decorative Premium Glow Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-orange-500/10 blur-[150px] -z-10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-[150px] -z-10" />

      {/* HEADER NAV */}
      <header className="sticky top-0 z-40 bg-black/40 border-b border-white/5 backdrop-blur-2xl px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link 
            href="/"
            className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={18} /> Back to Search
          </Link>
          <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 px-3 py-1.5 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.1)]">
            <Zap size={14} className="text-orange-400 fill-orange-400/20 animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-widest text-orange-300">Verified Partner</span>
          </div>
        </div>
      </header>

      {/* 2-COLUMN PROFESSIONAL LAYOUT */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8 pb-16 items-start">
        
        {/* LEFT COLUMN: EXPERT PROFILE CARD */}
        <section className="w-full lg:w-[40%] flex flex-col gap-6 lg:sticky lg:top-24">
          
          <div className="bg-[#111216]/90 border border-white/10 rounded-[20px] overflow-hidden shadow-2xl backdrop-blur-xl p-6 relative group">
            
            {/* Top Image */}
            <div className="relative w-full aspect-[4/3] rounded-[16px] overflow-hidden mb-6">
              <img 
                src={expert.profileImage || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(expert.name)}`} 
                alt={expert.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
              <div className="absolute top-4 left-4 backdrop-blur-md bg-green-500/20 border border-green-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-md">
                <BadgeCheck className="w-4 h-4 fill-green-400 text-slate-900" />
                <span className="text-xs font-bold text-green-300">Available</span>
              </div>
            </div>

            {/* Expert Info */}
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                    {expert.name}
                  </h1>
                  <p className="text-orange-400 font-bold uppercase tracking-wider text-xs mt-1">
                    {expert.skills}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl shadow-md">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="font-extrabold text-white text-sm">{ratingValue}</span>
                </div>
              </div>

              {/* Bio */}
              <div className="pt-4 border-t border-white/5 space-y-2">
                <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">About Expert</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  {expert.bio || "Professional technician dedicated to offering outstanding technical skills, prompt service timelines, and high reliability for residential repairs."}
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
                
                <div className="flex items-center gap-2.5 px-3 py-2.5 bg-white/5 rounded-xl border border-white/5 shadow-xs">
                  <Award size={16} className="text-orange-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Jobs</p>
                    <p className="text-white font-extrabold text-xs truncate">{jobsCompletedCount}+ Completed</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 px-3 py-2.5 bg-white/5 rounded-xl border border-white/5 shadow-xs">
                  <Calendar size={16} className="text-blue-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Experience</p>
                    <p className="text-white font-extrabold text-xs truncate">{expert.experience || "5 years"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 px-3 py-2.5 bg-white/5 rounded-xl border border-white/5 shadow-xs">
                  <Clock size={16} className="text-purple-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Availability</p>
                    <p className="text-white font-extrabold text-xs truncate">{expert.hours || "Full Time"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 px-3 py-2.5 bg-white/5 rounded-xl border border-white/5 shadow-xs">
                  <DollarSign size={16} className="text-green-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Starting Rate</p>
                    <p className="text-green-400 font-black text-xs truncate">{rates} / Visit</p>
                  </div>
                </div>

              </div>

              {/* Booking Actions */}
              <div className="flex flex-col gap-2 pt-2">
                <a 
                  href={`tel:${expert.phone}`}
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-white hover:bg-slate-100 text-black font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95 cursor-pointer text-center"
                >
                  Call Expert Directly
                </a>
                <Link 
                  href={`/?book=${expert.id}`}
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95 text-center"
                >
                  Book Service Appointment
                </Link>
              </div>

            </div>

          </div>

          {/* Secure Trust Badge */}
          <div className="bg-gradient-to-br from-blue-500/5 to-slate-900 border border-blue-500/10 rounded-2xl p-4 flex gap-3 shadow-lg">
            <Shield className="w-6 h-6 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Appointix Guarantee</h4>
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                All platform experts undergo mandatory police verification and background checkups for maximum safety.
              </p>
            </div>
          </div>

        </section>

        {/* RIGHT COLUMN: CLIENT CHAT STREAM */}
        <section className="w-full lg:w-[60%] flex flex-col bg-[#111216]/95 border border-white/10 rounded-[20px] shadow-2xl h-[700px] overflow-hidden relative">
          
          {/* Chat Header */}
          <div className="flex items-center justify-between border-b border-white/10 bg-black/40 px-6 py-4 z-10">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img 
                  src={expert.profileImage || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(expert.name)}`} 
                  alt="" 
                  className="w-10 h-10 rounded-full border border-white/10"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#111216]" />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-widest text-slate-200">{expert.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${violationsCount > 0 ? "bg-red-500" : "bg-green-500"}`} />
                  <p className={`text-[10px] font-bold ${violationsCount > 0 ? "text-red-400" : "text-green-400"}`}>
                    {violationsCount > 0 ? "AI Shield Intervention: Active" : "AI Moderation Shield Active"}
                  </p>
                </div>
              </div>
            </div>

            {/* Inappropriate Warnings Banner */}
            <AnimatePresence>
              {moderationWarning && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-red-500/20 border border-red-500/30 text-red-400 px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1.5 shadow-lg shadow-red-500/5 animate-pulse"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>{moderationWarning} ({violationsCount} warning)</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto space-y-4 px-6 py-4 custom-chat-scrollbar bg-[#090a0d] flex flex-col">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-full">
                  <Zap size={24} className="text-orange-500 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold uppercase tracking-wider text-slate-300">Secure Live Connection Established</p>
                  <p className="text-xs text-slate-500 max-w-sm">Write a message below in Roman Urdu or English to request services or ask questions. Your chat is encrypted and secure.</p>
                </div>
              </div>
            ) : (
              messages.map((msg) => {
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

                const isMe = msg.senderRole === "client";
                return (
                  <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"} items-end gap-2`}>
                    {!isMe && (
                      <img 
                        src={expert.profileImage || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(expert.name)}`} 
                        alt="" 
                        className="w-6 h-6 rounded-full border border-white/5 shrink-0" 
                      />
                    )}
                    <div className={`max-w-[70%] rounded-2xl p-4 text-sm leading-relaxed ${
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
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Inputs & Voice Trigger */}
          <div className="p-4 border-t border-white/10 bg-black/40 flex flex-col gap-3 relative z-10">
            
            {/* Waveform visualizer overlay */}
            <AnimatePresence>
              {isRecording && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-[#0c0d10] flex items-center justify-between px-6 z-20 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <Mic className="w-5 h-5 text-red-500 animate-pulse" />
                    <span className="text-xs text-red-400 font-bold uppercase tracking-widest animate-pulse">Voice Recording... Speak now</span>
                  </div>
                  <div className="flex gap-1 items-center">
                    {[1, 2, 3, 4, 5, 4, 3, 2, 1].map((h, i) => (
                      <motion.div 
                        key={i}
                        animate={{ height: [8, h * 6, 8] }}
                        transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.08 }}
                        className="w-1 bg-orange-500 rounded-full"
                      />
                    ))}
                  </div>
                  <button 
                    onClick={handleVoiceInput}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer"
                  >
                    Stop Voice
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Moderation loading overlay */}
            <AnimatePresence>
              {isModerating && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center gap-2 z-20 rounded-xl">
                  <Loader2 className="w-4 h-4 text-orange-400 animate-spin" />
                  <span className="text-[10px] text-orange-300 font-bold uppercase tracking-widest animate-pulse">Moderating Message...</span>
                </div>
              )}
            </AnimatePresence>

            {/* Input Bar */}
            {isRestricted ? (
              <div className="w-full py-4 bg-red-500/10 border border-red-500/30 text-red-400 text-center font-bold rounded-xl text-xs uppercase tracking-widest animate-pulse">
                Chat temporarily restricted due to policy violations
              </div>
            ) : (
              <div className="flex gap-2 items-center">
                <input 
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Ask a question or describe service needs in Roman Urdu..."
                  className="flex-1 bg-[#15161a] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/40 transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSendMessage();
                  }}
                />

                <button
                  onClick={handleVoiceInput}
                  className="p-3.5 bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                  title="Voice Chat with Expert"
                >
                  <Mic size={18} />
                </button>

                <button
                  onClick={() => handleSendMessage()}
                  disabled={!newMessage.trim()}
                  className="p-3.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-xl transition-all shadow-[0_0_12px_rgba(249,115,22,0.3)] cursor-pointer"
                >
                  <Send size={18} />
                </button>
              </div>
            )}

          </div>

        </section>

      </main>

    </div>
  );
}

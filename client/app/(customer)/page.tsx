"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Activity, Mic, MapPin, Zap, Loader2, Terminal, Search, RotateCcw, SlidersHorizontal, ChevronRight, User, Camera, X } from "lucide-react";
import { ProviderOption, useOrchestratorStore } from "../../store/useOrchestratorStore";
import { MockAiEngine } from "../../services/mockAiEngine";
import {
  fetchCurrentPosition,
  GEOLOCATION_OPTIONS,
  LAHORE_FALLBACK,
} from "@/lib/location";
import { TracePanel } from "../../components/features/TracePanel";
import { ProviderCard } from "../../components/features/ProviderCard";
import { LanguageToggle } from "../../components/LanguageToggle";
import axios from "axios";

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

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type UserLocation = {
  lat: number;
  lng: number;
};

type GoogleLatLng = {
  lat: number;
  lng: number;
};

type GoogleMapInstance = {
  fitBounds: (bounds: GoogleLatLngBounds) => void;
  setCenter: (center: GoogleLatLng) => void;
  setZoom: (zoom: number) => void;
};

type GoogleLatLngBounds = {
  extend: (position: GoogleLatLng) => void;
};

type GoogleMarker = {
  setMap: (map: GoogleMapInstance | null) => void;
};

type GoogleMapsApi = {
  Map: new (
    element: HTMLElement,
    options: {
      center: GoogleLatLng;
      zoom: number;
      disableDefaultUI?: boolean;
      zoomControl?: boolean;
      styles?: Array<Record<string, unknown>>;
      mapId?: string;
    }
  ) => GoogleMapInstance;
  Marker: new (options: {
    position: GoogleLatLng;
    map: GoogleMapInstance;
    title: string;
    label?: string;
    icon?: {
      path: number;
      scale: number;
      fillColor: string;
      fillOpacity: number;
      strokeColor: string;
      strokeWeight: number;
    };
  }) => GoogleMarker;
  LatLngBounds: new () => GoogleLatLngBounds;
  SymbolPath: {
    CIRCLE: number;
  };
};

type GoogleNamespace = {
  maps: GoogleMapsApi;
};

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    google?: any;
    initKaamwalaMap?: () => void;
  }
}

const mapStyles = [
  { elementType: "geometry", stylers: [{ color: "#0f172a" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#cbd5e1" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#020617" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0c4a6e" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
];

function loadGoogleMaps(apiKey: string) {
  if (typeof window === "undefined") return Promise.reject();
  if (window.google?.maps) return Promise.resolve();

  const existingScript = document.querySelector<HTMLScriptElement>(
    "script[data-kaamwala-google-maps='true']"
  );

  if (existingScript) {
    return new Promise<void>((resolve, reject) => {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(), { once: true });
    });
  }

  return new Promise<void>((resolve, reject) => {
    window.initKaamwalaMap = () => resolve();

    const script = document.createElement("script");
    script.dataset.kaamwalaGoogleMaps = "true";
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker,geometry&callback=initKaamwalaMap&loading=async`;
    script.onerror = () => reject();
    document.head.appendChild(script);
  });
}

function ProviderMap({
  userLocation,
  providers,
}: {
  userLocation: UserLocation | null;
  providers: ProviderOption[];
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<GoogleMapInstance | null>(null);
  const markersRef = useRef<GoogleMarker[]>([]);
  const [mapStatus, setMapStatus] = useState<"idle" | "ready" | "error">("idle");
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const visibleMapStatus = apiKey ? mapStatus : "missing-key";

  useEffect(() => {
    if (!apiKey) return;

    let cancelled = false;

    loadGoogleMaps(apiKey)
      .then(() => {
        if (cancelled) return;
        setMapStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setMapStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  useEffect(() => {
    const googleMaps = window.google?.maps;
    const mapElement = mapRef.current;

    if (visibleMapStatus !== "ready" || !googleMaps || !mapElement) return;

    const center = userLocation ?? LAHORE_FALLBACK;

    if (!mapInstanceRef.current && googleMaps.Map) {
      mapInstanceRef.current = new googleMaps.Map(mapElement, {
        center,
        zoom: 13,
        disableDefaultUI: true,
        zoomControl: true,
        mapId: "4504f8b37365c3d0",
      });
    }

    const map = mapInstanceRef.current;
    if (!map) return;

    map.setCenter(center);

    markersRef.current.forEach((marker) => (marker as any).setMap?.(null));
    markersRef.current = [];

    const { AdvancedMarkerElement } = (googleMaps as any).marker || {};
    if (!AdvancedMarkerElement) {
        console.error("Google Maps AdvancedMarkerElement not loaded. Check if 'marker' library is enabled in script URL.");
        return;
    }
    const bounds = new googleMaps.LatLngBounds();
    const points: GoogleLatLng[] = [];

    const activeUserLocation = userLocation ?? LAHORE_FALLBACK;
    points.push(activeUserLocation);

    const userDiv = document.createElement("div");
      userDiv.className = "relative flex items-center justify-center";
      userDiv.innerHTML = `
        <div class="absolute w-6 h-6 bg-blue-500/30 rounded-full animate-ping"></div>
        <div class="relative w-3.5 h-3.5 bg-blue-500 border-2 border-white rounded-full shadow-[0_0_10px_rgba(59,130,246,0.6)]"></div>
      `;

      markersRef.current.push(
        new (googleMaps as any).marker.AdvancedMarkerElement({
          map,
          position: activeUserLocation,
          title: "Your location",
          content: userDiv,
        })
      );

    providers.forEach((provider, index) => {
      if (typeof provider.lat !== "number" || typeof provider.lng !== "number") return;

      const position = { lat: provider.lat, lng: provider.lng };
      points.push(position);
      
      const expertDiv = document.createElement("div");
      expertDiv.className = "group relative cursor-pointer";
      const color = provider.isBestFit ? "from-green-400 to-green-600" : "from-orange-400 to-orange-600";
      
      expertDiv.innerHTML = `
        <div class="relative flex flex-col items-center">
          <div class="bg-gradient-to-br ${color} p-1 rounded-xl shadow-lg border border-white/20 transform transition-transform group-hover:scale-110 group-hover:-translate-y-1">
             <div class="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center text-[10px] font-black text-white">
                ${provider.isBestFit ? "BEST" : index + 1}
             </div>
          </div>
          <div class="w-0.5 h-1.5 bg-slate-400/50 rounded-full"></div>
          <div class="mt-1 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl">
            <p class="text-[9px] font-bold text-white uppercase tracking-wider">${provider.name}</p>
          </div>
        </div>
      `;

      markersRef.current.push(
        new (googleMaps as any).marker.AdvancedMarkerElement({
          map,
          position,
          title: provider.name,
          content: expertDiv,
        })
      );
    });

    if (points.length > 1) {
      // Calculate distance between user and first expert
      const p1 = points[0];
      const p2 = points[1];
      const dist = Math.sqrt(Math.pow(p1.lat - p2.lat, 2) + Math.pow(p1.lng - p2.lng, 2));
      
      // If distance is too large (> 0.5 degrees, roughly 50km), don't fit bounds
      // This prevents zooming out to see the whole country/subcontinent
      if (dist > 0.5) {
        map.setCenter(activeUserLocation);
        map.setZoom(13);
      } else {
        points.forEach((point) => bounds.extend(point));
        map.fitBounds(bounds);
      }
    } else {
      map.setCenter(center);
      map.setZoom(13);
    }
  }, [visibleMapStatus, providers, userLocation]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="relative h-full overflow-hidden bg-black/40"
    >
      <div className="absolute left-4 top-4 z-10 rounded-xl border border-white/10 bg-black/70 px-3 py-2 backdrop-blur-md">
        <p className="text-xs font-bold uppercase tracking-widest text-orange-300">Expert Proximity</p>
        <p className="text-[11px] text-slate-300">Real-time distance calculation</p>
      </div>

      <div className="relative h-full min-h-[420px]">
        <div ref={mapRef} className="h-full w-full" />

        {visibleMapStatus === "missing-key" && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950 p-4 text-center">
            <p className="max-w-sm text-sm text-slate-300">
              Add <span className="font-semibold text-orange-400">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</span> in client/.env.local to enable Google Maps.
            </p>
          </div>
        )}

        {visibleMapStatus === "error" && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950 p-4 text-center">
            <p className="text-sm text-red-300">Google Maps load nahi ho saka. API key aur domain restrictions check karein.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function KaamWalaAI() {
  const [message, setMessage] = useState("");
  const [lastRequest, setLastRequest] = useState("");
  const [compareMode, setCompareMode] = useState(false);
  const [currentProviderIndex, setCurrentProviderIndex] = useState(0);
  const store = useOrchestratorStore();
  const loading = store.isProcessing;
  const messages = store.messages;
  const providerOptions = store.matches;
  const selectedProviderId = store.selectedProviderId;

  const [finalLoading, setFinalLoading] = useState(false);
  const [bookingStep, setBookingStep] = useState<"idle" | "timeslot" | "confirming" | "success" | "tracking">("idle");
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [searchRadius, setSearchRadius] = useState<number>(10);
  const [locating, setLocating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const userLocation = store.userLocation;
  const setUserLocation = store.setUserLocation;

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Real-time user location on mount, then watch for updates
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setUserLocation(LAHORE_FALLBACK);
      return;
    }

    let cancelled = false;

    fetchCurrentPosition()
      .then((coords) => {
        if (!cancelled) setUserLocation(coords);
      })
      .catch((error) => {
        console.warn("Geolocation unavailable, using Lahore fallback:", error);
        if (!cancelled) setUserLocation(LAHORE_FALLBACK);
      });

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (cancelled) return;
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.warn("Location watch error:", error.message);
      },
      GEOLOCATION_OPTIONS
    );

    return () => {
      cancelled = true;
      navigator.geolocation.clearWatch(watchId);
    };
  }, [setUserLocation]);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleChat = async (messageOverride?: string) => {
    const userMessage = messageOverride ?? message;

    if ((!userMessage.trim() && !imageFile) || loading) return;

    setLastRequest(userMessage || (imageFile ? `Uploaded Image (${imageFile.name})` : "Service Request"));
    setMessage(""); // clear input immediately
    
    let base64Image: string | undefined = undefined;
    if (imageFile) {
      try {
        base64Image = await fileToBase64(imageFile);
      } catch (err) {
        console.error("Error converting image to Base64:", err);
      }
    }

    store.addMessage({ role: 'user', content: userMessage || "Service request with uploaded image" });
    
    // Clear preview after sending request
    handleRemoveImage();
    
    try {
      await (MockAiEngine as any).processRequest(userMessage, searchRadius, base64Image);
    } catch (err) {
      console.error("Chat Error:", err);
    }
  };

  const submitted = messages.length > 0;
  const topProvider = providerOptions[0];
  const selectedProvider = providerOptions.find((provider) => provider.id === selectedProviderId);
  const requestSummary = lastRequest || messages.find((item) => item.role === "user")?.content || "Service request";

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Location is not supported in this browser.");
      return;
    }

    // Graceful permission request
    const confirmed = window.confirm("KaamWala AI needs your location to find the nearest experts and provide accurate ETA. Allow location access?");
    if (!confirmed) return;

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocating(false);
      },
      (error) => {
        console.error("Location Error:", error);
        alert("Location permission nahi mili. Lahore, Pakistan default use kiya ja raha hai.");
        setUserLocation(LAHORE_FALLBACK);
        setLocating(false);
      },
      GEOLOCATION_OPTIONS
    );
  };

  const handleVoiceInput = () => {
    if (typeof window === "undefined") return;

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser. Please try Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "ur-PK";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .trim();

      if (transcript) {
        setMessage(transcript);
        void handleChat(transcript);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech Recognition Error:", event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setIsRecording(true);
    recognition.start();
  };

  // =========================
  // SELECT PROVIDER
  // =========================
  const handleBook = (providerId: string) => {
    store.setSelectedProvider(providerId);
    setBookingStep("timeslot");
    setSelectedTime("");
  };

  // =========================
  // FINAL BOOKING CONFIRMATION
  // =========================
  const handleFinalConfirm = async () => {
    if (!selectedTime) {
      alert("Please select a timeslot first.");
      return;
    }
    setBookingStep("confirming");

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await axios.post(`${apiUrl}/api/booking/create`, {
        providerId: selectedProviderId,
        clientLocation: userLocation ?? LAHORE_FALLBACK,
        service: requestSummary,
        scheduledTime: selectedTime
      });

      if (response.data.success) {
        setActiveBookingId(response.data.bookingId);
        setBookingStep("success");
      }
    } catch (err) {
      console.error("Booking Error:", err);
      setBookingStep("idle");
    }
  };


  return (
    <main className="min-h-screen bg-transparent text-white flex flex-col relative overflow-hidden">
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-black/60 px-4 py-4 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between">
          <div className="flex items-center gap-10">
            <Link href="/" className="text-xl font-black tracking-tighter hover:opacity-80 transition-opacity">
              KaamWala <span className="text-orange-500">AI</span>
            </Link>
            <div className="hidden items-center gap-8 text-[13px] font-medium text-slate-400 md:flex">
              <Link href="/" className="text-white">Home</Link>
              <Link href="#" className="hover:text-white transition-colors">Find Experts</Link>
              <Link href="#" className="hover:text-white transition-colors">How it Works</Link>
              <Link href="#" className="hover:text-white transition-colors">About</Link>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Expert Portal Access - Distinctive Style */}
            <div className="hidden lg:flex items-center mr-2 pr-6 border-r border-white/10 gap-6">
              <Link 
                href="/expert/register" 
                className="group relative flex items-center gap-2 text-[12px] font-bold text-orange-400 hover:text-orange-300 transition-all uppercase tracking-widest"
              >
                <div className="absolute -inset-2 rounded-lg bg-orange-500/0 group-hover:bg-orange-500/5 transition-all" />
                <Zap size={14} className="fill-orange-400/20" />
                Join as Expert
              </Link>
              <Link 
                href="/expert/login" 
                className="text-[12px] font-bold text-slate-400 hover:text-white transition-all uppercase tracking-widest"
              >
                Expert Login
              </Link>
            </div>

            {/* Main Auth Actions */}
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <Link 
                href="/login" 
                className="px-5 py-2 text-[13px] font-semibold text-slate-300 hover:text-white transition-colors"
              >
                Login
              </Link>
              <Link 
                href="/register" 
                className="relative group overflow-hidden px-6 py-2.5 text-[13px] font-bold bg-white text-black rounded-full transition-all hover:pr-8 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
              >
                <span className="relative z-10">Get Started</span>
                <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all" />
              </Link>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Top Right Toggle */}
      {submitted && (
        <button
          onClick={store.toggleTracePanel}
          className="fixed bottom-8 right-8 z-50 bg-black/80 border border-white/10 p-3 rounded-2xl text-slate-400 hover:text-white hover:border-orange-500/50 backdrop-blur-md transition-all shadow-lg"
          title="Toggle AI Trace Panel"
        >
          <Terminal size={20} className={store.isTracePanelOpen ? "text-orange-500" : ""} />
        </button>
      )}

      {/* TOP SECTION: Hero & Search */}
      {!submitted && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-5xl flex-col items-center justify-center px-5 text-center"
        >
          <div className="pointer-events-none absolute inset-x-0 top-32 -z-10 overflow-hidden text-center blur-[8px]">
            <h1 className="text-[13vw] font-black leading-none tracking-tighter text-white/[0.01] select-none">
              AI ORCHESTRATION
            </h1>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6 text-sm text-blue-400 font-medium">
            <Zap className="w-4 h-4 text-orange-500" />
            KaamWala AI Orchestrator v2.0
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1] text-white">
            Describe the Problem.<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-amber-400 to-orange-400 drop-shadow-sm">
              We’ll Handle the Rest.
            </span>
          </h1>
          <p className="text-slate-400 max-w-xl text-lg mb-8 font-medium leading-relaxed">
            Just tell our AI what you need in English or Roman Urdu. We'll instantly find, rank, and connect you with the perfect expert.
          </p>

          {/* Centered Search Box */}
          <div className="w-full max-w-3xl flex flex-col gap-4">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageChange} 
            />
            
            <div className="flex gap-2 relative bg-black/60 p-2 rounded-2xl border border-white/10 shadow-[0_0_40px_rgba(249,115,22,0.15)] backdrop-blur-xl group hover:border-orange-500/30 transition-all">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. Urgent plumber required in DHA phase 6..."
                className="flex-1 bg-transparent px-4 py-3 text-lg text-white placeholder-slate-500 focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleChat();
                }}
              />
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={loading || locating}
                className={`p-3 rounded-xl transition-all ${
                  userLocation
                    ? "bg-green-500/20 text-green-400"
                    : "bg-white/5 text-slate-400 hover:bg-white/10"
                }`}
              >
                {locating ? <Activity className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className={`p-3 rounded-xl transition-all cursor-pointer ${
                  imagePreview
                    ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                    : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                }`}
                title="Camera se photo upload karein"
              >
                <Camera className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleVoiceInput}
                disabled={loading}
                className={`p-3 rounded-xl transition-all ${
                  isRecording
                    ? "bg-red-500/20 text-red-400 animate-pulse"
                    : "bg-white/5 text-slate-400 hover:bg-white/10"
                }`}
              >
                <Mic className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => void handleChat()}
                disabled={loading || (!message.trim() && !imageFile)}
                className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white px-6 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(249,115,22,0.4)] cursor-pointer"
              >
                {loading ? <Activity className="w-5 h-5 animate-spin" /> : "Orchestrate"}
              </button>
            </div>

            {imagePreview && (
              <div className="relative self-start flex items-center gap-3 bg-slate-900/90 border border-slate-700/80 p-2.5 rounded-xl shadow-xl backdrop-blur-md overflow-hidden max-w-xs group animate-fadeIn mt-1 text-left">
                <img
                  src={imagePreview}
                  alt="Upload preview"
                  className="w-12 h-12 rounded-lg object-cover border border-slate-700"
                />
                <div className="flex flex-col min-w-0 pr-6">
                  <span className="text-xs font-semibold text-slate-200 truncate max-w-[150px]">
                    {imageFile?.name}
                  </span>
                  <span className="text-[10px] text-orange-400">
                    Ready for AI Orchestration!
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute right-1.5 top-1.5 p-1 bg-slate-800 hover:bg-red-500/20 hover:text-red-400 rounded-lg text-slate-400 transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-2 mt-4 items-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mr-2">Search Radius:</span>
              {[5, 10, 20, 50].map(r => (
                <button 
                  key={r}
                  onClick={() => setSearchRadius(r)}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all border ${
                    searchRadius === r 
                      ? "bg-orange-500 text-white border-orange-500 shadow-lg" 
                      : "bg-white/5 text-slate-400 border-white/5 hover:border-white/20"
                  }`}
                >
                  {r} KM
                </button>
              ))}
              
              <div className="w-px h-3 bg-white/10 mx-2" />
              
              {['AC Repair', 'Plumbing', 'Electrician', 'Home Cleaning', 'Tutor'].map(cat => (
                <button 
                  key={cat}
                  onClick={() => setMessage(`I need ${cat.toLowerCase()}`)}
                  className="px-4 py-1.5 rounded-full text-xs font-medium bg-white/5 text-slate-400 hover:text-white hover:bg-orange-500/10 border border-white/5 hover:border-orange-500/40 transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(249,115,22,0.08)] cursor-pointer"
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* MAIN EXPERIENCE AREA */}
      {submitted && (
        <div className="relative w-full flex-1 px-3 pb-28 pt-6 lg:px-6">
          
          {/* Faded Background Title */}
          <div className="absolute top-4 left-0 w-full text-center pointer-events-none z-0 overflow-hidden opacity-[0.03] blur-[10px]">
            <h1 className="text-[clamp(72px,10vw,150px)] font-black tracking-tighter whitespace-nowrap bg-clip-text text-transparent bg-gradient-to-b from-white to-transparent select-none">
              AI ORCHESTRATION
            </h1>
          </div>

          <motion.div
            initial={{ y: -24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="relative z-20 mx-auto mb-8 flex max-w-[1200px] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-black/60 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex min-w-0 items-center gap-3 border-b border-white/10 p-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-orange-500 text-white shadow-[0_0_24px_rgba(249,115,22,0.45)]">
                <Search size={22} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-orange-300">Active request</p>
                <p className="truncate text-lg font-semibold text-white">{requestSummary}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 p-4">
              <span className="text-lg font-semibold text-white">
                <span className="font-black text-green-400">{loading ? "Working..." : "Results ready!"}</span>{" "}
                {loading ? "Finding experts." : `Found ${providerOptions.length || 0} experts.`}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {topProvider && (
                  <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-200">
                    Top fit: {topProvider.name}
                  </span>
                )}
                <button
                  onClick={() => setCompareMode((value) => !value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    compareMode
                      ? "border-blue-400/40 bg-blue-500/15 text-blue-200"
                      : "border-white/10 bg-white/5 text-slate-300 hover:text-white"
                  }`}
                >
                  <SlidersHorizontal className="mr-1 inline h-3.5 w-3.5" />
                  Compare
                </button>
                <button
                  onClick={() => {
                    store.resetOrchestration();
                    setLastRequest("");
                    setMessage("");
                  }}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:text-white"
                >
                  <RotateCcw className="mr-1 inline h-3.5 w-3.5" />
                  New request
                </button>
              </div>
            </div>
          </motion.div>

          {/* EXPERT RESULTS GRID */}
          {!loading && providerOptions.length > 0 && (
            <div className="mx-auto max-w-[1200px] mb-12">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {providerOptions.map((provider, index) => (
                  <div key={provider.id} className="h-full">
                    <ProviderCard 
                      provider={provider} 
                      onBook={handleBook}
                      onCompare={() => {
                        setCurrentProviderIndex(index);
                        setCompareMode(!compareMode);
                      }}
                      isSelected={selectedProviderId === String(provider.id)}
                      isTopMatch={index === 0}
                    />
                  </div>
                ))}
              </div>

              {/* Comparison Mode (Simplified for Grid) */}
              <AnimatePresence>
                {compareMode && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-8 overflow-hidden"
                  >
                    <div className="p-6 bg-blue-500/5 border border-blue-500/20 rounded-[28px] backdrop-blur-xl">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-1">AI Intelligence</p>
                          <h3 className="text-xl font-bold text-white">Expert Comparison Summary</h3>
                        </div>
                        <button 
                          onClick={() => setCompareMode(false)}
                          className="p-2 rounded-full hover:bg-white/5 text-slate-400 transition-colors"
                        >
                          <Activity className="w-5 h-5 rotate-45" />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="p-5 bg-black/40 rounded-2xl border border-orange-500/30 relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-2">
                            <span className="text-[8px] font-black bg-orange-500 text-black px-1.5 py-0.5 rounded">BEST FIT</span>
                          </div>
                          <p className="text-orange-400 font-bold mb-3 flex items-center gap-2">
                            {providerOptions[0].name}
                          </p>
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs"><span className="text-slate-500">Rating</span><span className="text-white font-bold">{providerOptions[0].rating} ⭐</span></div>
                            <div className="flex justify-between text-xs"><span className="text-slate-500">Distance</span><span className="text-white font-bold">{providerOptions[0].distanceKm} km</span></div>
                            <div className="flex justify-between text-xs"><span className="text-slate-500">Price</span><span className="text-white font-bold">{providerOptions[0].priceEstimate}</span></div>
                          </div>
                        </div>
                        
                        {currentProviderIndex !== 0 && (
                          <div className="p-5 bg-black/40 rounded-2xl border border-white/10">
                            <p className="text-white font-bold mb-3">{providerOptions[currentProviderIndex].name}</p>
                            <div className="space-y-2">
                              <div className="flex justify-between text-xs"><span className="text-slate-500">Rating</span><span className="text-white font-bold">{providerOptions[currentProviderIndex].rating} ⭐</span></div>
                              <div className="flex justify-between text-xs"><span className="text-slate-500">Distance</span><span className="text-white font-bold">{providerOptions[currentProviderIndex].distanceKm} km</span></div>
                              <div className="flex justify-between text-xs"><span className="text-slate-500">Price</span><span className="text-white font-bold">{providerOptions[currentProviderIndex].priceEstimate}</span></div>
                            </div>
                          </div>
                        )}

                        <div className="p-5 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-center text-center">
                          <p className="text-xs text-slate-500 italic">
                            AI analyzed {providerOptions.length} experts to find your best match based on proximity, rating, and value.
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* SPLIT PANEL: LOGS & MAP */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[500px] w-full">
            {/* Detailed AI Log */}
            <div className="h-full rounded-2xl overflow-hidden bg-black/60 border border-white/5 shadow-2xl backdrop-blur-md flex flex-col">
              <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                <h3 className="text-base font-semibold text-white">Detailed AI Log</h3>
                <ChevronRight className="text-slate-500 w-5 h-5 -rotate-90" />
              </div>
              <div className="flex-1 overflow-y-auto">
                <TracePanel />
              </div>
            </div>

            {/* Live Expert Map */}
            <div className="h-full rounded-2xl overflow-hidden bg-black/60 border border-white/5 shadow-2xl backdrop-blur-md flex flex-col">
              <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                <h3 className="text-xs font-bold tracking-widest text-slate-300 uppercase">Live Expert Map</h3>
                <MapPin className="text-orange-500 w-4 h-4" />
              </div>
              <div className="flex-1 relative">
                <ProviderMap userLocation={userLocation} providers={providerOptions} />
              </div>
            </div>
          </div>

          {/* Compact Follow-up Input */}
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-3xl z-50 px-4"
          >
            <div className="flex gap-2 bg-[#1a1b1e]/95 p-1.5 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] border border-white/10 backdrop-blur-xl">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Modify search or ask follow-up..."
                className="flex-1 bg-transparent px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleChat();
                }}
              />
              <button
                type="button"
                onClick={handleVoiceInput}
                disabled={loading}
                className={`p-2.5 rounded-xl transition-all ${
                  isRecording ? "bg-red-500/20 text-red-400 animate-pulse" : "hover:bg-white/5 text-slate-400"
                }`}
              >
                <Mic className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => void handleChat()}
                disabled={loading || !message.trim()}
                className="bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-50 p-2.5 rounded-xl transition-all"
              >
                <Activity className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* BOOKING / TIMESLOT MODAL */}
      <AnimatePresence>
        {bookingStep !== "idle" && selectedProvider && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="w-full max-w-md bg-[#161719] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">Book Appointment</h2>
                  {bookingStep === "timeslot" && (
                    <button 
                      onClick={() => {
                        setBookingStep("idle");
                        store.setSelectedProvider(null);
                      }}
                      className="text-slate-500 hover:text-white"
                    >
                      <Activity className="w-5 h-5 rotate-45" />
                    </button>
                  )}
                </div>
              </div>

              <div className="p-6">
                {bookingStep === "timeslot" && (
                  <div className="space-y-6">
                    <div>
                      <p className="text-slate-400 text-sm mb-3">Expert Selected</p>
                      <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/10">
                        <img src={selectedProvider.avatarUrl} alt="" className="w-10 h-10 rounded-full" />
                        <div>
                          <p className="text-white font-bold">{selectedProvider.name}</p>
                          <p className="text-xs text-slate-400">{selectedProvider.priceEstimate}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-slate-400 text-sm mb-3">Available Timeslots (Today)</p>
                      <div className="grid grid-cols-2 gap-3">
                        {["10:00 AM", "12:30 PM", "03:00 PM", "05:00 PM"].map((time) => (
                          <button
                            key={time}
                            onClick={() => setSelectedTime(time)}
                            className={`p-3 rounded-xl text-sm font-semibold transition-all border ${
                              selectedTime === time 
                                ? "bg-orange-500 text-white border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]" 
                                : "bg-black/30 border-white/10 text-slate-300 hover:border-white/30"
                            }`}
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleFinalConfirm}
                      disabled={!selectedTime}
                      className="w-full py-4 rounded-full bg-green-500 text-black font-black disabled:opacity-50 disabled:bg-white/10 disabled:text-slate-500 transition-all shadow-[0_5px_20px_rgba(34,197,94,0.3)]"
                    >
                      Confirm Booking
                    </button>
                  </div>
                )}

                {bookingStep === "confirming" && (
                  <div className="flex flex-col items-center justify-center py-10 space-y-4">
                    <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
                    <p className="text-white font-bold text-lg">Dispatching to WhatsApp...</p>
                    <p className="text-slate-400 text-sm text-center">Syncing with expert and client...</p>
                  </div>
                )}

                {bookingStep === "success" && (
                  <div className="flex flex-col items-center justify-center py-6 space-y-6">
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center border-2 border-green-500/50">
                      <Zap className="w-10 h-10 text-green-400" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-2xl font-black text-white mb-2">Booking Confirmed!</h3>
                      <p className="text-slate-400 text-sm px-4">
                        WhatsApp messages have been automatically sent to both you and <strong>{selectedProvider.name}</strong>.
                      </p>
                    </div>

                    <div className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm space-y-2">
                      <div className="flex justify-between"><span className="text-slate-500">Expert:</span><span className="text-white font-medium">{selectedProvider.name}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Time:</span><span className="text-white font-medium">{selectedTime}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Est. Charges:</span><span className="text-white font-medium">{selectedProvider.priceEstimate}</span></div>
                    </div>

                    <div className="w-full pt-4 space-y-3">
                      <a 
                        href={`https://wa.me/${selectedProvider.phone || ''}?text=${encodeURIComponent(`*KaamWala AI Booking*\n\nExpert: ${selectedProvider.name}\nTime: ${selectedTime}\nIssue: ${requestSummary}\nCharges: ${selectedProvider.priceEstimate}`)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-all text-sm"
                      >
                        View WhatsApp Message
                      </a>
                      <button
                        onClick={() => {
                          setBookingStep("idle");
                          store.resetOrchestration();
                        }}
                        className="w-full py-4 rounded-full bg-orange-500 text-black font-black transition-all hover:bg-orange-400 shadow-[0_5px_20px_rgba(249,115,22,0.3)]"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

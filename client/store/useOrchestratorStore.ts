import { create } from 'zustand';

export type AgentName = 'INTENT_AGENT' | 'LOCATION_AGENT' | 'DISTANCE_AGENT' | 'RANKING_AGENT' | 'RECOMMENDATION_AGENT' | 'ORCHESTRATOR';
export type TraceStatus = 'pending' | 'success' | 'warning' | 'error';
export type SeverityLevel = 'info' | 'low' | 'medium' | 'high' | 'critical';

export interface TraceEvent {
  id: string;
  timestamp: string;
  agent: AgentName;
  action: string;
  reasoningSummary: string;
  confidenceScore: number;
  latencyMs: number;
  severity: SeverityLevel;
  status: TraceStatus;
  metadata?: Record<string, unknown>;
}

export interface ProviderOption {
  id: string;
  name: string;
  avatarUrl?: string;
  specialization?: string;
  badge?: string;
  phone?: string;
  reason?: string;
  rating?: number;
  jobsCompleted?: number;
  reasoning?: string;
  distanceKm?: number;
  etaMinutes?: number;
  isBestFit?: boolean;
  lat?: number;
  lng?: number;
  priceEstimate?: string;
  reliabilityScore?: number;
  cancellationRisk?: 'Low' | 'Medium' | 'High';
  availabilityStatus?: 'Available Now' | 'Available Later' | 'Busy';
  travelCharges?: number;
  comparisonHighlight?: string;
  bio?: string;
  skills?: string;
  experience?: string;
  hours?: string;
  rate?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
}

interface OrchestratorState {
  // Demo Mode
  demoMode: boolean;
  setDemoMode: (enabled: boolean) => void;
  
  // UI State
  isTracePanelOpen: boolean;
  toggleTracePanel: () => void;
  setTracePanelOpen: (isOpen: boolean) => void;

  // Chat State
  messages: ChatMessage[];
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  
  // Traces State
  traces: TraceEvent[];
  isProcessing: boolean;
  addTrace: (trace: Omit<TraceEvent, 'id' | 'timestamp'>) => void;
  clearTraces: () => void;
  setProcessing: (status: boolean) => void;
  
  // Provider Matches
  matches: ProviderOption[];
  setMatches: (matches: ProviderOption[]) => void;
  selectedProviderId: string | null;
  setSelectedProvider: (id: string | null) => void;
  
  // User Location
  userLocation: { lat: number, lng: number } | null;
  setUserLocation: (loc: { lat: number, lng: number } | null) => void;

  // App Reset
  resetOrchestration: () => void;
}

export const useOrchestratorStore = create<OrchestratorState>((set) => ({
  demoMode: true,
  setDemoMode: (enabled) => set({ demoMode: enabled }),
  
  isTracePanelOpen: true,
  toggleTracePanel: () => set((state) => ({ isTracePanelOpen: !state.isTracePanelOpen })),
  setTracePanelOpen: (isOpen) => set({ isTracePanelOpen: isOpen }),
  
  messages: [],
  addMessage: (msg) => set((state) => ({
    messages: [...state.messages, { ...msg, id: crypto.randomUUID(), timestamp: new Date().toISOString() }]
  })),
  
  traces: [],
  isProcessing: false,
  addTrace: (trace) => set((state) => ({
    traces: [...state.traces, { ...trace, id: crypto.randomUUID(), timestamp: new Date().toISOString() }]
  })),
  clearTraces: () => set({ traces: [] }),
  setProcessing: (status) => set({ isProcessing: status }),
  
  matches: [],
  setMatches: (matches) => set({ matches }),
  selectedProviderId: null,
  setSelectedProvider: (id) => set({ selectedProviderId: id }),
  
  userLocation: null,
  setUserLocation: (loc) => set({ userLocation: loc }),
  
  resetOrchestration: () => set({
    messages: [],
    traces: [],
    matches: [],
    selectedProviderId: null,
    isProcessing: false,
    userLocation: null
  })
}));

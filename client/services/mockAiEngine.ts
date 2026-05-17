import { useOrchestratorStore, AgentName, ProviderOption, TraceEvent } from '../store/useOrchestratorStore';
import { LAHORE_FALLBACK } from '@/lib/location';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

const getSocket = () => {
  if (!socket) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    socket = io(apiUrl);
    
    socket.on('trace', (trace: TraceEvent) => {
      const store = useOrchestratorStore.getState();
      
      // Update existing trace if it's a 'success' or 'error' update for a 'pending' trace
      // Or just add if it's new. 
      // For simplicity and real-time feel, we'll just add them.
      // But we should check if the last trace is the same agent and was pending.
      
      const traces = store.traces;
      const lastTrace = traces[traces.length - 1];
      
      if (lastTrace && lastTrace.agent === trace.agent && lastTrace.status === 'pending' && trace.status !== 'pending') {
        // This is an update to a pending trace. We'll replace it for a cleaner UI.
        // Actually, let's just add it, the TracePanel handles sequential display well.
        store.addTrace(trace);
      } else {
        store.addTrace(trace);
      }
    });
  }
  return socket;
};

export const MockAiEngine = {
  async processRequest(userMessage: string, radius?: number, imageBase64?: string) {
    const store = useOrchestratorStore.getState();
    const socket = getSocket();

    store.setProcessing(true);
    store.clearTraces();
    store.setMatches([]);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      
      // We don't need to add the "Sending request" trace manually anymore 
      // as the server will emit traces as soon as it starts processing.
      
      const response = await axios.post(`${apiUrl}/api/chat`, {
        message: userMessage,
        userLocation: store.userLocation || LAHORE_FALLBACK,
        radius: radius,
        image: imageBase64
      });

      if (response.data.success) {
        const { data } = response.data;
        
        if (data.recommendation?.options) {
          store.setMatches(data.recommendation.options);
        }

        if (data.booking?.message) {
          store.addMessage({ role: 'ai', content: data.booking.message });
        }
      }
    } catch (err) {
      console.error("API Error:", err);
      store.addTrace({
        agent: 'ORCHESTRATOR',
        action: 'API Error',
        reasoningSummary: 'Failed to connect to backend AI pipeline.',
        confidenceScore: 0,
        latencyMs: 0,
        severity: 'critical',
        status: 'error'
      });
    } finally {
      // Small delay to let the last traces finish animating
      setTimeout(() => {
        store.setProcessing(false);
      }, 1000);
    }
  }
};


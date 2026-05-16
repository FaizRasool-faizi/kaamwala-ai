import React from "react";
import { Activity, ShieldAlert, Cpu, Network } from "lucide-react";

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <h2 className="text-2xl font-bold text-white tracking-widest">[ SYSTEM_ANALYTICS ]</h2>
        <div className="flex items-center gap-2 text-xs font-mono text-green-400">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
          LIVE UPDATES
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        <div className="bg-black/60 border border-purple-500/30 rounded p-4 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
          <div className="flex items-center gap-3 text-purple-400 mb-2">
            <Activity className="w-5 h-5" />
            <h3 className="text-sm">TOTAL_REQUESTS</h3>
          </div>
          <p className="text-3xl font-bold text-white">1,204</p>
          <div className="w-full bg-white/10 h-1 mt-4 rounded overflow-hidden">
            <div className="bg-purple-500 h-full w-[70%]"></div>
          </div>
        </div>
        
        <div className="bg-black/60 border border-blue-500/30 rounded p-4 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
          <div className="flex items-center gap-3 text-blue-400 mb-2">
            <Network className="w-5 h-5" />
            <h3 className="text-sm">ACTIVE_PROVIDERS</h3>
          </div>
          <p className="text-3xl font-bold text-white">342</p>
          <div className="w-full bg-white/10 h-1 mt-4 rounded overflow-hidden">
            <div className="bg-blue-500 h-full w-[45%]"></div>
          </div>
        </div>
        
        <div className="bg-black/60 border border-green-500/30 rounded p-4 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
          <div className="flex items-center gap-3 text-green-400 mb-2">
            <Cpu className="w-5 h-5" />
            <h3 className="text-sm">AI_CONFIDENCE</h3>
          </div>
          <p className="text-3xl font-bold text-white">94.2%</p>
          <div className="w-full bg-white/10 h-1 mt-4 rounded overflow-hidden">
            <div className="bg-green-500 h-full w-[94%]"></div>
          </div>
        </div>

        <div className="bg-black/60 border border-red-500/30 rounded p-4 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
          <div className="flex items-center gap-3 text-red-400 mb-2">
            <ShieldAlert className="w-5 h-5" />
            <h3 className="text-sm">OPEN_DISPUTES</h3>
          </div>
          <p className="text-3xl font-bold text-white">7</p>
          <div className="w-full bg-white/10 h-1 mt-4 rounded overflow-hidden">
            <div className="bg-red-500 h-full w-[5%]"></div>
          </div>
        </div>
      </div>
      
      {/* Live AI Traces Stream */}
      <div className="bg-black/80 border border-white/10 rounded p-4 h-[400px] flex flex-col font-mono text-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,255,0,0.03)_0%,transparent_100%)] pointer-events-none"></div>
        <h3 className="text-green-500 font-bold mb-4 border-b border-green-500/30 pb-2">~ tail -f /var/log/ai/orchestrator.log</h3>
        <div className="flex-1 overflow-y-auto space-y-2 text-green-400/80 text-xs">
          <p><span className="text-slate-500">[10:42:01]</span> [INTENT_AGENT] Extracted: {`{ "service": "AC Repair", "lang": "ur" }`}</p>
          <p><span className="text-slate-500">[10:42:02]</span> [MATCHING_AGENT] Found 14 providers in 5km radius.</p>
          <p><span className="text-slate-500">[10:42:02]</span> [RANKING_AGENT] Scoring providers based on rating, distance, price...</p>
          <p><span className="text-slate-500">[10:42:03]</span> [PRICING_AGENT] Estimated range: Rs. 1500 - 2500</p>
          <p className="text-blue-400"><span className="text-slate-500">[10:42:03]</span> [ORCHESTRATOR] Response sent to client ID: #99283</p>
          <p><span className="text-slate-500">[10:42:15]</span> [INTENT_AGENT] Extracted: {`{ "service": "Plumbing", "urgency": "high" }`}</p>
          <p><span className="text-slate-500">[10:42:16]</span> [MATCHING_AGENT] Found 3 providers available immediately.</p>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CircleDot, CheckCircle2, AlertCircle, Loader2, Terminal } from "lucide-react";
import { useOrchestratorStore, TraceEvent } from "../../store/useOrchestratorStore";

const statusIcons = {
  pending: <Loader2 className="w-4 h-4 text-orange-400 animate-spin" />,
  success: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  warning: <AlertCircle className="w-4 h-4 text-yellow-500" />,
  error: <AlertCircle className="w-4 h-4 text-red-500" />
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'success': return 'border-green-500/30 bg-green-500/5';
    case 'warning': return 'border-yellow-500/30 bg-yellow-500/5';
    case 'error': return 'border-red-500/30 bg-red-500/5';
    default: return 'border-orange-500/30 bg-orange-500/5';
  }
};

export function TracePanel() {
  const { traces, isProcessing } = useOrchestratorStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [traces]);

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[22px] border border-white/10 bg-[#0a0a0c]/80 p-5 font-mono shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
      {/* Dynamic scanline effect */}
      <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden opacity-[0.03]">
        <div className="h-[2px] w-full bg-white animate-scanline" />
      </div>

      <div className="absolute left-0 top-0 h-full w-px bg-gradient-to-b from-orange-500/80 via-blue-500/40 to-orange-500/60 shadow-[0_0_15px_rgba(249,115,22,0.3)]" />
      
      <div className="mb-6 flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex flex-col">
          <h2 className="flex items-center gap-3 text-base font-bold tracking-widest text-white uppercase">
            <Terminal className="w-4 h-4 text-orange-500" />
            Orchestration Trace
          </h2>
          <span className="text-[9px] text-slate-500 mt-1">Multi-Agent reasoning pipeline active</span>
        </div>
        
        {isProcessing ? (
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.1)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
            </span>
            <span className="text-[10px] font-black text-orange-400 tracking-tighter">STREAMING_TRACE</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/5 border border-green-500/10">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
            <span className="text-[10px] font-bold text-green-500/70 tracking-tighter uppercase">Idle_System</span>
          </div>
        )}
      </div>

      <div ref={scrollRef} className="relative flex-1 space-y-0 overflow-y-auto pb-4 pl-4 pr-2 custom-scrollbar">
        {/* Continuous glowing line for traces */}
        {traces.length > 0 && (
          <div className="absolute left-[11px] top-6 bottom-10 w-px bg-gradient-to-b from-orange-500/50 via-blue-500/20 to-transparent" />
        )}

        <AnimatePresence mode="popLayout">
          {traces.map((trace: TraceEvent, i: number) => (
            <motion.div
              key={trace.id}
              initial={{ x: -10, opacity: 0, scale: 0.98 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="relative py-3 pl-6"
            >
              {/* Timeline Node */}
              <div className="absolute left-[-16px] top-[24px] z-10 flex items-center justify-center">
                <div className={`h-3 w-3 rounded-full border-2 bg-black transition-all duration-500 ${
                  trace.status === 'success' ? 'border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 
                  trace.status === 'pending' ? 'border-orange-500 animate-pulse' : 'border-red-500'
                }`} />
              </div>
              
              <div className={`group rounded-2xl border transition-all duration-500 hover:border-white/20 ${getStatusColor(trace.status)}`}>
                <div className="flex justify-between items-start mb-2 px-4 pt-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg bg-black/40 border border-white/5`}>
                      {statusIcons[trace.status]}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-orange-400 text-[10px] font-black tracking-[0.15em] uppercase">
                        {trace.agent.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <span className="text-[9px] font-medium text-slate-600 bg-black/30 px-2 py-0.5 rounded-full">
                    {new Date(trace.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                  </span>
                </div>
                
                <div className="px-4 pb-4">
                  <h3 className="mb-2 text-xs font-bold text-white tracking-wide group-hover:text-orange-400 transition-colors">
                    {trace.action}
                  </h3>
                  
                  <p className={`text-[11px] leading-relaxed font-medium ${trace.status === 'pending' ? 'text-slate-500 italic' : 'text-slate-400'}`}>
                    {trace.reasoningSummary}
                  </p>

                  {trace.status === 'success' && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }} 
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 flex items-center gap-5 border-t border-white/5 pt-3"
                    >
                      {trace.confidenceScore > 0 && (
                        <div className="flex flex-col gap-1">
                          <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Confidence</span>
                          <span className={`text-[10px] font-bold ${trace.confidenceScore > 90 ? 'text-green-400' : 'text-yellow-400'}`}>
                            {trace.confidenceScore.toFixed(1)}%
                          </span>
                        </div>
                      )}
                      <div className="flex flex-col gap-1">
                        <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Latency</span>
                        <span className="text-[10px] font-bold text-blue-400">{trace.latencyMs}ms</span>
                      </div>
                      
                      {trace.metadata && (
                         <div className="flex-1 text-right">
                           <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest block mb-1">Payload</span>
                           <span className="text-[9px] font-bold text-slate-500">Structured_Data</span>
                         </div>
                      )}
                    </motion.div>
                  )}

                  {trace.metadata && trace.status === 'success' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }} 
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3 bg-[#050505] p-3 rounded-xl text-[10px] font-medium text-blue-400/70 border border-white/5 overflow-hidden shadow-inner"
                    >
                      <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <span className="uppercase text-[8px] font-black tracking-widest">Output Metadata</span>
                      </div>
                      <pre className="whitespace-pre-wrap font-mono opacity-80 max-h-40 overflow-y-auto">
                        {JSON.stringify(trace.metadata, null, 2)}
                      </pre>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );

}

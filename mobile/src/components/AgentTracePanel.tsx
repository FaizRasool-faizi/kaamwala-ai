import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { CheckCircle2, ChevronDown, ChevronUp, Loader2, Terminal } from "lucide-react-native";
import tw from "twrnc";
import type { TraceEvent } from "../types/trace";

type Props = {
  traces: TraceEvent[];
  isProcessing?: boolean;
};

function statusBorder(status: string) {
  if (status === "success") return "border-green-500/30 bg-green-500/5";
  if (status === "error") return "border-red-500/30 bg-red-500/5";
  if (status === "pending") return "border-orange-500/30 bg-orange-500/5";
  return "border-white/10 bg-white/5";
}

export default function AgentTracePanel({ traces, isProcessing = false }: Props) {
  const [expanded, setExpanded] = useState(true);

  if (traces.length === 0 && !isProcessing) return null;

  return (
    <View style={tw`bg-black/60 border border-white/10 rounded-3xl overflow-hidden mb-5`}>
      <Pressable
        onPress={() => setExpanded(!expanded)}
        style={tw`flex-row justify-between items-center px-4 py-3 border-b border-white/10 bg-white/5`}
      >
        <View style={tw`flex-row items-center gap-2`}>
          <Terminal size={16} color="#f97316" />
          <Text style={tw`text-white font-semibold text-sm`}>Detailed AI Log</Text>
        </View>
        <View style={tw`flex-row items-center gap-2`}>
          {isProcessing ? (
            <View style={tw`flex-row items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 px-2 py-1 rounded-full`}>
              <Loader2 size={10} color="#fb923c" />
              <Text style={tw`text-orange-400 text-[9px] font-black`}>STREAMING</Text>
            </View>
          ) : (
            <View style={tw`flex-row items-center gap-1 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-full`}>
              <View style={tw`w-1.5 h-1.5 rounded-full bg-green-500`} />
              <Text style={tw`text-green-500/80 text-[9px] font-bold uppercase`}>Idle_System</Text>
            </View>
          )}
          {expanded ? <ChevronUp size={18} color="#6b7280" /> : <ChevronDown size={18} color="#6b7280" />}
        </View>
      </Pressable>

      {expanded && (
        <ScrollView style={tw`min-h-72 max-h-96 px-3 py-3`} nestedScrollEnabled showsVerticalScrollIndicator>
          <Text style={tw`text-gray-500 text-[9px] font-bold uppercase tracking-widest mb-3 px-1`}>
            Orchestration Trace — Multi-Agent reasoning pipeline
          </Text>

          {traces.map((trace) => (
            <View key={trace.id} style={tw`mb-3 pl-3 border-l-2 border-orange-500/40`}>
              <View style={tw`rounded-2xl border p-3 ${statusBorder(trace.status)}`}>
                <View style={tw`flex-row justify-between items-start mb-2`}>
                  <View style={tw`flex-row items-center gap-2 flex-1`}>
                    {trace.status === "pending" ? (
                      <Loader2 size={14} color="#fb923c" />
                    ) : (
                      <CheckCircle2 size={14} color={trace.status === "error" ? "#ef4444" : "#4ade80"} />
                    )}
                    <Text style={tw`text-orange-400 text-[10px] font-black uppercase`}>
                      {String(trace.agent).replace(/_/g, " ")}
                    </Text>
                  </View>
                  <Text style={tw`text-gray-600 text-[9px]`}>
                    {new Date(trace.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: false,
                    })}
                  </Text>
                </View>

                <Text style={tw`text-white text-xs font-bold mb-1`}>{trace.action}</Text>
                <Text
                  style={tw`text-[11px] leading-relaxed ${
                    trace.status === "pending" ? "text-gray-500 italic" : "text-gray-400"
                  }`}
                >
                  {trace.reasoningSummary}
                </Text>

                {trace.status === "success" && (trace.confidenceScore > 0 || trace.latencyMs > 0) && (
                  <View style={tw`flex-row gap-4 mt-3 pt-2 border-t border-white/5`}>
                    {trace.confidenceScore > 0 && (
                      <View>
                        <Text style={tw`text-[8px] text-gray-600 font-bold uppercase`}>Confidence</Text>
                        <Text style={tw`text-green-400 text-[10px] font-bold`}>{trace.confidenceScore}%</Text>
                      </View>
                    )}
                    {trace.latencyMs > 0 && (
                      <View>
                        <Text style={tw`text-[8px] text-gray-600 font-bold uppercase`}>Latency</Text>
                        <Text style={tw`text-blue-400 text-[10px] font-bold`}>{trace.latencyMs}ms</Text>
                      </View>
                    )}
                  </View>
                )}

                {trace.metadata && trace.status === "success" && (
                  <View style={tw`mt-3 bg-[#050505] border border-white/5 rounded-xl p-2.5`}>
                    <Text style={tw`text-[8px] text-blue-400/80 font-black uppercase mb-1`}>Output Metadata</Text>
                    <Text style={tw`text-[9px] text-blue-300/70 font-mono`} selectable>
                      {JSON.stringify(trace.metadata, null, 2)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))}

          {isProcessing && traces.length === 0 && (
            <View style={tw`items-center py-6`}>
              <Loader2 size={24} color="#f97316" />
              <Text style={tw`text-gray-500 text-xs mt-2`}>Agents are analyzing your request...</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

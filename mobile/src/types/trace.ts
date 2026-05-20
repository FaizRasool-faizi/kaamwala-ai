export type TraceStatus = "pending" | "success" | "warning" | "error";

export type TraceEvent = {
  id: string;
  timestamp: string;
  agent: string;
  action: string;
  reasoningSummary: string;
  confidenceScore: number;
  latencyMs: number;
  status: TraceStatus;
  metadata?: Record<string, unknown>;
};

export function mapApiLogsToTraces(logs: unknown[]): TraceEvent[] {
  if (!Array.isArray(logs)) return [];

  return logs
    .map((raw, index) => {
      const log = raw as Record<string, unknown>;
      if (log.type === "system") {
        return {
          id: String(log.timestamp || index),
          timestamp: String(log.timestamp || new Date().toISOString()),
          agent: "ORCHESTRATOR",
          action: "System Log",
          reasoningSummary: String(log.message || ""),
          confidenceScore: 100,
          latencyMs: 0,
          status: "success" as TraceStatus,
        };
      }

      if (!log.agent) return null;

      const meta =
        log.metadata && typeof log.metadata === "object"
          ? (log.metadata as Record<string, unknown>)
          : undefined;

      return {
        id: String(log.id || index),
        timestamp: String(log.timestamp || new Date().toISOString()),
        agent: String(log.agent),
        action: String(log.action || meta?.action || "Analysis"),
        reasoningSummary: String(
          log.reasoningSummary ||
            log.reasoning ||
            meta?.reasoning ||
            meta?.message ||
            ""
        ),
        confidenceScore: Number(log.confidenceScore ?? log.confidence ?? meta?.confidence ?? 0),
        latencyMs: Number(log.latencyMs ?? 0),
        status: (log.status as TraceStatus) || "success",
        metadata: meta,
      };
    })
    .filter((t): t is TraceEvent => t !== null);
}

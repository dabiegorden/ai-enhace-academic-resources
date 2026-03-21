"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Sparkles,
  TrendingUp,
  Users,
  MessageSquare,
  BarChart3,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Zap,
} from "lucide-react";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AiMetrics {
  totalMessages: number;
  uniqueParticipants: number;
  avgLength: number;
  activityByDay: number[];
  sentiment: "positive" | "neutral" | "negative" | "mixed";
  engagementScore: number;
  topics: string[];
  emotionalTone: string;
  riskFlags: string[];
}

// ─── Sentiment config ─────────────────────────────────────────────────────────
const sentimentConfig = {
  positive: {
    color: "text-green-400",
    bg: "bg-green-500/10 border-green-500/20",
    label: "Positive",
  },
  neutral: {
    color: "text-gray-400",
    bg: "bg-gray-500/10 border-gray-500/20",
    label: "Neutral",
  },
  negative: {
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
    label: "Negative",
  },
  mixed: {
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
    label: "Mixed",
  },
};

// ─── Mini bar chart ───────────────────────────────────────────────────────────
function MiniBarChart({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  const days = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const today = new Date().getDay();
  const labels = Array.from(
    { length: 7 },
    (_, i) => days[(today - 6 + i + 7) % 7],
  );

  return (
    <div className="flex items-end gap-1 h-12">
      {data.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
          <div
            className="w-full rounded-sm bg-linear-to-t from-blue-500 to-orange-400 transition-all duration-500 min-h-0.5"
            style={{ height: `${Math.round((v / max) * 44)}px` }}
          />
          <span className="text-[9px] text-gray-600">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Engagement ring ──────────────────────────────────────────────────────────
function EngagementRing({ score }: { score: number }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 70 ? "#22c55e" : score >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <svg width="52" height="52" viewBox="0 0 52 52" className="-rotate-90">
      <circle
        cx="26"
        cy="26"
        r={r}
        fill="none"
        stroke="#374151"
        strokeWidth="5"
      />
      <circle
        cx="26"
        cy="26"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        className="transition-all duration-700"
      />
    </svg>
  );
}

// ─── Typing text ──────────────────────────────────────────────────────────────
function TypingText({ text, done }: { text: string; done: boolean }) {
  return (
    <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
      {text}
      {!done && (
        <span className="inline-block w-0.5 h-4 bg-orange-400 ml-0.5 animate-pulse align-middle" />
      )}
    </p>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────
export default function AiChatInsightPanel({
  roomId,
  roomName,
  autoLoad = false,
}: {
  roomId: string | null;
  roomName?: string;
  autoLoad?: boolean;
}) {
  const [metrics, setMetrics] = useState<AiMetrics | null>(null);
  const [insightText, setInsightText] = useState("");
  const [isDone, setIsDone] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async () => {
    if (!roomId) return;

    // abort any previous stream
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setIsLoading(true);
    setMetrics(null);
    setInsightText("");
    setIsDone(false);
    setError(null);

    const token = localStorage.getItem("token") || "";

    try {
      const res = await fetch(`${apiUrl}/ai/chat-analysis/${roomId}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${res.status}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "metrics") {
              setMetrics(event.payload);
              setIsLoading(false);
            } else if (event.type === "text") {
              setInsightText((prev) => prev + event.chunk);
            } else if (event.type === "done") {
              setIsDone(true);
            } else if (event.type === "error") {
              setError(event.message);
              setIsDone(true);
            }
          } catch {
            // malformed line — skip
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message || "Analysis failed");
      }
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  // Auto-load when a room is selected
  useEffect(() => {
    if (autoLoad && roomId) run();
    return () => abortRef.current?.abort();
  }, [autoLoad, roomId, run]);

  // ── Empty / no room state ────────────────────────────────────────────────
  if (!roomId) {
    return (
      <div className="rounded-2xl bg-gray-800/40 border border-gray-700/40 p-5 flex flex-col items-center justify-center gap-2 text-center min-h-30">
        <Sparkles className="h-6 w-6 text-gray-600" />
        <p className="text-sm text-gray-500">
          Select a chat room to enable AI analysis
        </p>
      </div>
    );
  }

  const sent = metrics
    ? (sentimentConfig[metrics.sentiment] ?? sentimentConfig.neutral)
    : null;

  return (
    <div className="rounded-2xl bg-gray-800/60 border border-gray-700/50 backdrop-blur-sm overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/50 bg-linear-to-r from-blue-500/10 to-orange-500/10">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-linear-to-br from-blue-500 to-orange-500">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-white uppercase tracking-wider">
              AI Insight
            </p>
            {roomName && (
              <p className="text-[10px] text-gray-500 truncate max-w-35">
                {roomName}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={run}
            disabled={isLoading}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-900/60 border border-gray-700 text-xs text-gray-300 hover:text-white hover:border-orange-500/40 transition-all disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`}
            />
            {isLoading ? "Analysing…" : "Analyse"}
          </button>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-700/50 transition-colors"
          >
            {collapsed ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="p-5 space-y-5">
          {/* ── Loading skeleton ── */}
          {isLoading && !metrics && (
            <div className="space-y-3 animate-pulse">
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 rounded-xl bg-gray-700/50" />
                ))}
              </div>
              <div className="h-12 rounded-xl bg-gray-700/50" />
              <div className="h-4 rounded bg-gray-700/50 w-3/4" />
              <div className="h-4 rounded bg-gray-700/50 w-1/2" />
            </div>
          )}

          {/* ── Metrics grid ── */}
          {metrics && (
            <>
              <div className="grid grid-cols-3 gap-3">
                {/* Messages */}
                <div className="rounded-xl bg-gray-900/50 border border-gray-700/40 p-3 flex flex-col gap-1">
                  <MessageSquare className="h-4 w-4 text-blue-400" />
                  <p className="text-lg font-bold text-white">
                    {metrics.totalMessages}
                  </p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">
                    Messages
                  </p>
                </div>
                {/* Participants */}
                <div className="rounded-xl bg-gray-900/50 border border-gray-700/40 p-3 flex flex-col gap-1">
                  <Users className="h-4 w-4 text-purple-400" />
                  <p className="text-lg font-bold text-white">
                    {metrics.uniqueParticipants}
                  </p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">
                    Participants
                  </p>
                </div>
                {/* Engagement */}
                <div className="rounded-xl bg-gray-900/50 border border-gray-700/40 p-3 flex flex-col items-center justify-center gap-0.5 relative">
                  <EngagementRing score={metrics.engagementScore} />
                  <p className="absolute text-xs font-bold text-white">
                    {metrics.engagementScore}
                  </p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">
                    Score
                  </p>
                </div>
              </div>

              {/* Activity chart */}
              <div className="rounded-xl bg-gray-900/50 border border-gray-700/40 p-3 space-y-2">
                <div className="flex items-center gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5 text-orange-400" />
                  <p className="text-xs text-gray-400 font-medium">
                    7-Day Activity
                  </p>
                </div>
                <MiniBarChart data={metrics.activityByDay} />
              </div>

              {/* Sentiment + tone */}
              <div className="flex gap-2">
                {sent && (
                  <span
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${sent.bg} ${sent.color}`}
                  >
                    <TrendingUp className="h-3 w-3" />
                    {sent.label}
                  </span>
                )}
                {metrics.emotionalTone && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-700/50 border border-gray-600/50 text-gray-300 capitalize">
                    <Zap className="h-3 w-3 text-yellow-400" />
                    {metrics.emotionalTone}
                  </span>
                )}
              </div>

              {/* Topics */}
              {metrics.topics.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                    Topics Detected
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {metrics.topics.map((t) => (
                      <span
                        key={t}
                        className="px-2.5 py-0.5 rounded-full text-xs bg-blue-500/10 border border-blue-500/20 text-blue-300"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Risk flags */}
              {metrics.riskFlags.length > 0 && (
                <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                    <p className="text-xs font-semibold text-red-400">Flags</p>
                  </div>
                  {metrics.riskFlags.map((f, i) => (
                    <p key={i} className="text-xs text-gray-400">
                      • {f}
                    </p>
                  ))}
                </div>
              )}

              {/* Divider */}
              {insightText && (
                <div className="border-t border-gray-700/50 pt-4 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-orange-400" />
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      AI Insight
                    </p>
                  </div>
                  <TypingText text={insightText} done={isDone} />
                </div>
              )}
            </>
          )}

          {/* ── Typing insight only (if metrics already rendered) ── */}
          {!metrics && insightText && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-orange-400" />
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  AI Insight
                </p>
              </div>
              <TypingText text={insightText} done={isDone} />
            </div>
          )}

          {/* ── Error ── */}
          {error && (
            <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-3">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {/* ── Idle CTA ── */}
          {!isLoading && !metrics && !error && !insightText && (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <Sparkles className="h-8 w-8 text-gray-600" />
              <p className="text-sm text-gray-500">
                Click <strong className="text-gray-400">Analyse</strong> to run
                AI analysis on this room's conversation.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

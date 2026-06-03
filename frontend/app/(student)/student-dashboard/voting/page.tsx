"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Vote,
  Trophy,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  Award,
  FileText,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  Users,
  Lock,
  RefreshCw,
  X,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Candidate {
  _id: string;
  name: string;
  studentId: string;
  position: string;
  manifesto: string;
  imageUrl?: string;
  manifestoFileUrl?: string | null;
  votes?: number;
}

interface YesNoTally {
  position: string;
  yes?: number;
  no?: number;
}

interface VotingEvent {
  _id: string;
  title: string;
  description: string;
  type: "src" | "faculty";
  faculty?: string;
  votingMode: "candidate" | "yesno";
  positions: string[];
  candidates: Candidate[];
  yesNoTallies: YesNoTally[];
  startDate: string;
  endDate: string;
  isActive: boolean;
  resultsPublished: boolean;
  // KEY FIX: backend returns per-position tracking
  hasVoted?: boolean; // true only when ALL positions voted
  votedPositions?: string[]; // list of positions already voted on
}

type TabType = "active" | "upcoming" | "completed";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const formatDate = (ds: string) =>
  new Date(ds).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

// Progress ring showing how many positions voted
function VoteProgressRing({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : done / total;
  const r = 18;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;

  return (
    <div className="relative flex items-center justify-center w-12 h-12">
      <svg width="48" height="48" viewBox="0 0 48 48" className="-rotate-90">
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke="#1e293b"
          strokeWidth="4"
        />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke={done === total && total > 0 ? "#22c55e" : "#6366f1"}
          strokeWidth="4"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.5s ease" }}
        />
      </svg>
      <span className="absolute text-[10px] font-bold text-white">
        {done}/{total}
      </span>
    </div>
  );
}

// Candidate card used inside the vote dialog
function CandidateCard({
  candidate,
  selected,
  onClick,
}: {
  candidate: Candidate;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-2xl border-2 p-4 transition-all duration-200 group ${
        selected
          ? "border-indigo-500 bg-indigo-950/60 shadow-lg shadow-indigo-900/30"
          : "border-slate-700 bg-slate-800/60 hover:border-slate-500 hover:bg-slate-800"
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          {candidate.imageUrl ? (
            <img
              src={candidate.imageUrl}
              alt={candidate.name}
              className="w-16 h-16 rounded-xl object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-linear-to-br from-indigo-600 to-purple-700 flex items-center justify-center">
              <span className="text-white text-xl font-bold">
                {getInitials(candidate.name)}
              </span>
            </div>
          )}
          {selected && (
            <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-base">{candidate.name}</p>
          <p className="text-slate-400 text-xs mb-2">{candidate.studentId}</p>
          {candidate.manifesto && (
            <p className="text-slate-300 text-sm line-clamp-2">
              {candidate.manifesto}
            </p>
          )}
          {candidate.manifestoFileUrl && (
            <a
              href={candidate.manifestoFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 mt-2 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              <FileText className="w-3 h-3" /> View Manifesto
            </a>
          )}
        </div>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function StudentVotingPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [activeTab, setActiveTab] = useState<TabType>("active");
  const [votingEvents, setVotingEvents] = useState<VotingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Detail / vote dialog state
  const [detailEvent, setDetailEvent] = useState<VotingEvent | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Vote dialog state
  const [voteEvent, setVoteEvent] = useState<VotingEvent | null>(null);
  const [votePosition, setVotePosition] = useState("");
  const [voteDialogOpen, setVoteDialogOpen] = useState(false);
  // candidate mode
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(
    null,
  );
  // yesno mode
  const [selectedYesNo, setSelectedYesNo] = useState<"yes" | "no" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchVotingEvents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiUrl}/voting?status=${activeTab}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setVotingEvents(data.data || []);
      else toast.error(data.message || "Failed to fetch voting events");
    } catch {
      toast.error("Failed to fetch voting events");
    } finally {
      setLoading(false);
    }
  }, [token, apiUrl, activeTab]);

  useEffect(() => {
    fetchVotingEvents();
  }, [fetchVotingEvents]);

  const fetchVotingDetails = async (votingId: string) => {
    try {
      const res = await fetch(`${apiUrl}/voting/${votingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setDetailEvent(data.data);
        setDetailOpen(true);
      } else toast.error(data.message || "Failed to load details");
    } catch {
      toast.error("Failed to load details");
    }
  };

  // ── Open vote dialog ──────────────────────────────────────────────────────
  const openVoteDialog = (event: VotingEvent, position: string) => {
    setVoteEvent(event);
    setVotePosition(position);
    setSelectedCandidate(null);
    setSelectedYesNo(null);
    setVoteDialogOpen(true);
  };

  // ── Cast vote ─────────────────────────────────────────────────────────────
  const handleVote = async () => {
    if (!voteEvent) return;

    if (voteEvent.votingMode === "candidate" && !selectedCandidate) {
      toast.error("Please select a candidate");
      return;
    }
    if (voteEvent.votingMode === "yesno" && !selectedYesNo) {
      toast.error("Please choose Yes or No");
      return;
    }

    try {
      setSubmitting(true);
      const body =
        voteEvent.votingMode === "yesno"
          ? { position: votePosition, yesNo: selectedYesNo }
          : { candidateId: selectedCandidate };

      const res = await fetch(`${apiUrl}/voting/${voteEvent._id}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.success) {
        const remaining: string[] = data.remainingPositions ?? [];

        // Optimistically update local state so buttons reflect voted positions
        setVotingEvents((prev) =>
          prev.map((v) => {
            if (v._id !== voteEvent._id) return v;
            const newVoted = [...(v.votedPositions ?? []), votePosition];
            return {
              ...v,
              votedPositions: newVoted,
              hasVoted: remaining.length === 0,
            };
          }),
        );

        setVoteDialogOpen(false);

        if (remaining.length > 0) {
          toast.success(
            `Vote recorded! ${remaining.length} position${remaining.length !== 1 ? "s" : ""} remaining.`,
          );
        } else {
          toast.success("All positions voted — you're done! 🎉");
        }
      } else {
        toast.error(data.message || "Failed to cast vote");
      }
    } catch {
      toast.error("Failed to cast vote");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Derived helpers ───────────────────────────────────────────────────────
  const getStatus = (v: VotingEvent) => {
    const now = new Date(),
      start = new Date(v.startDate),
      end = new Date(v.endDate);
    if (v.isActive && now >= start && now <= end) return "Active";
    if (now < start) return "Upcoming";
    return "Ended";
  };

  const isPositionVoted = (v: VotingEvent, pos: string) =>
    (v.votedPositions ?? []).includes(pos);

  const votedCount = (v: VotingEvent) =>
    v.positions.filter((p) => isPositionVoted(v, p)).length;

  const groupByPosition = (candidates: Candidate[]) => {
    const out: Record<string, Candidate[]> = {};
    candidates.forEach((c) => {
      if (!out[c.position]) out[c.position] = [];
      out[c.position].push(c);
    });
    return out;
  };

  // ── Tab counts ────────────────────────────────────────────────────────────
  const tabLabels: { key: TabType; icon: React.ReactNode; label: string }[] = [
    { key: "active", icon: <Clock className="w-4 h-4" />, label: "Active" },
    {
      key: "upcoming",
      icon: <Calendar className="w-4 h-4" />,
      label: "Upcoming",
    },
    {
      key: "completed",
      icon: <Trophy className="w-4 h-4" />,
      label: "Completed",
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-900/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-900/15 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Vote className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Student Voting
            </h1>
          </div>
          <p className="text-slate-400 pl-13">
            Participate in campus elections and view results
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-900/70 border border-slate-800 rounded-2xl p-1 w-fit">
          {tabLabels.map(({ key, icon, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === key
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/50"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
          </div>
        ) : votingEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500 gap-3">
            <Vote className="w-14 h-14 opacity-30" />
            <p className="text-lg">No {activeTab} voting events</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {votingEvents.map((v) => {
              const status = getStatus(v);
              const done = votedCount(v);
              const total = v.positions.length;
              const isActive = status === "Active";
              const byPos =
                v.votingMode === "candidate"
                  ? groupByPosition(v.candidates)
                  : {};

              return (
                <div
                  key={v._id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm overflow-hidden flex flex-col hover:border-slate-700 transition-colors duration-200"
                >
                  {/* Card top accent */}
                  <div
                    className={`h-1 w-full ${
                      status === "Active"
                        ? "bg-linear-to-r from-indigo-500 to-purple-500"
                        : status === "Upcoming"
                          ? "bg-linear-to-r from-blue-500 to-cyan-500"
                          : "bg-linear-to-r from-slate-600 to-slate-700"
                    }`}
                  />

                  <div className="p-5 flex flex-col flex-1 gap-4">
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-white text-base leading-tight">
                        {v.title}
                      </h3>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            status === "Active"
                              ? "bg-green-500/20 text-green-400"
                              : status === "Upcoming"
                                ? "bg-blue-500/20 text-blue-400"
                                : "bg-slate-700 text-slate-400"
                          }`}
                        >
                          {status}
                        </span>
                        <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                          {v.type}
                        </span>
                      </div>
                    </div>

                    <p className="text-slate-400 text-sm line-clamp-2">
                      {v.description}
                    </p>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2">
                      {v.votingMode === "yesno" ? (
                        <span className="flex items-center gap-1 text-xs bg-amber-500/15 text-amber-400 border border-amber-700/40 px-2 py-1 rounded-full">
                          <ThumbsUp className="w-3 h-3" /> Yes / No Ballot
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs bg-indigo-500/15 text-indigo-400 border border-indigo-700/40 px-2 py-1 rounded-full">
                          <Users className="w-3 h-3" /> Candidate Ballot
                        </span>
                      )}
                      {v.type === "faculty" && v.faculty && (
                        <span className="flex items-center gap-1 text-xs bg-slate-700 text-slate-300 border border-slate-600 px-2 py-1 rounded-full">
                          <Lock className="w-3 h-3" /> {v.faculty}
                        </span>
                      )}
                    </div>

                    {/* Dates */}
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        {formatDate(v.startDate)} — {formatDate(v.endDate)}
                      </span>
                    </div>

                    {/* Vote progress (active events) */}
                    {isActive && (
                      <div className="flex items-center gap-3 rounded-xl bg-slate-800/60 border border-slate-700 p-3">
                        <VoteProgressRing done={done} total={total} />
                        <div>
                          <p className="text-xs font-semibold text-white">
                            {done === total && total > 0
                              ? "All positions voted ✓"
                              : `${done} of ${total} positions voted`}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {total - done > 0
                              ? `${total - done} remaining`
                              : "You're all done!"}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Completed banner */}
                    {!isActive && v.hasVoted && (
                      <div className="flex items-center gap-2 rounded-xl bg-green-900/20 border border-green-800/50 px-3 py-2">
                        <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                        <span className="text-xs font-medium text-green-300">
                          You voted in this election
                        </span>
                      </div>
                    )}

                    {/* Voting still open but haven't voted */}
                    {isActive && done === 0 && (
                      <div className="flex items-center gap-2 rounded-xl bg-amber-900/20 border border-amber-800/50 px-3 py-2">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="text-xs font-medium text-amber-300">
                          Your vote is needed!
                        </span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="mt-auto space-y-2 pt-2">
                      {/* View candidates / details */}
                      <button
                        onClick={() => fetchVotingDetails(v._id)}
                        className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-700 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                      >
                        {v.resultsPublished ? (
                          <>
                            <Trophy className="w-4 h-4 text-yellow-400" /> View
                            Results
                          </>
                        ) : (
                          <>
                            <Users className="w-4 h-4" /> View Candidates
                          </>
                        )}
                        <ChevronRight className="w-4 h-4 ml-auto" />
                      </button>

                      {/* Per-position vote buttons (active + not yet voted on that position) */}
                      {isActive &&
                        v.positions.map((pos) => {
                          const voted = isPositionVoted(v, pos);
                          return voted ? (
                            <div
                              key={pos}
                              className="flex items-center gap-2 rounded-xl bg-green-900/20 border border-green-800/40 px-4 py-2"
                            >
                              <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                              <span className="text-xs font-medium text-green-300 truncate">
                                {pos} — voted
                              </span>
                            </div>
                          ) : (
                            <button
                              key={pos}
                              onClick={() => openVoteDialog(v, pos)}
                              className="w-full flex items-center justify-between gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
                            >
                              <span className="flex items-center gap-2">
                                <Vote className="w-4 h-4" />
                                Vote — {pos}
                              </span>
                              <ChevronRight className="w-4 h-4 opacity-70" />
                            </button>
                          );
                        })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Detail Dialog ───────────────────────────────────────────────────── */}
      {detailOpen && detailEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#0f172a] border border-slate-700 shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 p-6 bg-[#0f172a] border-b border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {detailEvent.title}
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  {detailEvent.description}
                </p>
              </div>
              <button
                onClick={() => setDetailOpen(false)}
                className="shrink-0 w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors"
              >
                <X className="w-4 h-4 text-slate-300" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Yes/No results */}
              {detailEvent.votingMode === "yesno" && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                    Yes / No Positions
                  </h3>
                  {detailEvent.positions.map((pos) => {
                    const tally = detailEvent.yesNoTallies?.find(
                      (t) => t.position === pos,
                    );
                    const yes = tally?.yes ?? 0;
                    const no = tally?.no ?? 0;
                    const total = yes + no || 1;
                    const yesPct = Math.round((yes / total) * 100);
                    const resultsVisible = detailEvent.resultsPublished;
                    const outcome =
                      yes > no ? "APPROVED" : yes < no ? "REJECTED" : "TIE";

                    return (
                      <div
                        key={pos}
                        className="rounded-xl bg-slate-800/60 border border-slate-700 p-4 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white">
                            {pos}
                          </span>
                          {resultsVisible && (
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                outcome === "APPROVED"
                                  ? "bg-green-500/20 text-green-400"
                                  : outcome === "REJECTED"
                                    ? "bg-red-500/20 text-red-400"
                                    : "bg-slate-600 text-slate-400"
                              }`}
                            >
                              {outcome}
                            </span>
                          )}
                        </div>
                        {resultsVisible && (
                          <>
                            <div className="flex gap-4 text-sm">
                              <span className="text-green-400 font-medium">
                                Yes: {yes}
                              </span>
                              <span className="text-red-400 font-medium">
                                No: {no}
                              </span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-slate-700 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-green-500 transition-all"
                                style={{ width: `${yesPct}%` }}
                              />
                            </div>
                            <p className="text-xs text-slate-500">
                              {yesPct}% Yes
                            </p>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Candidate results */}
              {detailEvent.votingMode === "candidate" &&
                Object.entries(groupByPosition(detailEvent.candidates)).map(
                  ([pos, cands]) => (
                    <div key={pos} className="space-y-3">
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-400 uppercase tracking-wider">
                        <Award className="w-4 h-4 text-purple-400" /> {pos}
                      </h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {cands.map((c) => (
                          <div
                            key={c._id}
                            className="rounded-xl bg-slate-800/60 border border-slate-700 p-4"
                          >
                            <div className="flex items-start gap-3">
                              {c.imageUrl ? (
                                <img
                                  src={c.imageUrl}
                                  alt={c.name}
                                  className="w-14 h-14 rounded-xl object-cover shrink-0"
                                />
                              ) : (
                                <div className="w-14 h-14 rounded-xl bg-linear-to-br from-indigo-600 to-purple-700 flex items-center justify-center shrink-0">
                                  <span className="text-white font-bold">
                                    {getInitials(c.name)}
                                  </span>
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-white text-sm">
                                  {c.name}
                                </p>
                                <p className="text-slate-400 text-xs">
                                  {c.studentId}
                                </p>
                                {c.manifesto && (
                                  <p className="text-slate-300 text-xs mt-1 line-clamp-2">
                                    {c.manifesto}
                                  </p>
                                )}
                                {c.manifestoFileUrl && (
                                  <a
                                    href={c.manifestoFileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 mt-1 text-xs text-indigo-400 hover:text-indigo-300"
                                  >
                                    <FileText className="w-3 h-3" /> Manifesto
                                  </a>
                                )}
                                {detailEvent.resultsPublished &&
                                  c.votes !== undefined && (
                                    <p className="mt-2 text-yellow-400 font-bold text-sm flex items-center gap-1">
                                      <Trophy className="w-3.5 h-3.5" />{" "}
                                      {c.votes} vote{c.votes !== 1 ? "s" : ""}
                                    </p>
                                  )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ),
                )}
            </div>
          </div>
        </div>
      )}

      {/* ── Vote Dialog ─────────────────────────────────────────────────────── */}
      {voteDialogOpen && voteEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#0f172a] border border-slate-700 shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 p-6 bg-[#0f172a] border-b border-slate-800">
              <div>
                <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
                  {voteEvent.title}
                </p>
                <h2 className="text-xl font-bold text-white">
                  {voteEvent.votingMode === "yesno"
                    ? `Vote on: ${votePosition}`
                    : `Vote for ${votePosition}`}
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  {voteEvent.votingMode === "yesno"
                    ? "Choose Yes to approve or No to reject this position."
                    : "Select one candidate. You can return to vote on other positions after this."}
                </p>
              </div>
              <button
                onClick={() => setVoteDialogOpen(false)}
                className="shrink-0 w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors"
              >
                <X className="w-4 h-4 text-slate-300" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* ── CANDIDATE MODE ── */}
              {voteEvent.votingMode === "candidate" && (
                <>
                  {voteEvent.candidates
                    .filter((c) => c.position === votePosition)
                    .map((c) => (
                      <CandidateCard
                        key={c._id}
                        candidate={c}
                        selected={selectedCandidate === c._id}
                        onClick={() => setSelectedCandidate(c._id)}
                      />
                    ))}
                  {voteEvent.candidates.filter(
                    (c) => c.position === votePosition,
                  ).length === 0 && (
                    <p className="text-slate-400 text-center py-8">
                      No candidates for this position.
                    </p>
                  )}
                </>
              )}

              {/* ── YES/NO MODE ── */}
              {voteEvent.votingMode === "yesno" && (
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setSelectedYesNo("yes")}
                    className={`flex flex-col items-center gap-3 rounded-2xl border-2 p-8 transition-all duration-200 ${
                      selectedYesNo === "yes"
                        ? "border-green-500 bg-green-950/50 shadow-lg shadow-green-900/30"
                        : "border-slate-700 bg-slate-800/60 hover:border-green-700 hover:bg-slate-800"
                    }`}
                  >
                    <ThumbsUp
                      className={`w-10 h-10 ${selectedYesNo === "yes" ? "text-green-400" : "text-slate-500"}`}
                    />
                    <span
                      className={`text-xl font-bold ${selectedYesNo === "yes" ? "text-green-300" : "text-slate-400"}`}
                    >
                      Yes
                    </span>
                    <span className="text-xs text-slate-500 text-center">
                      Approve this position
                    </span>
                    {selectedYesNo === "yes" && (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedYesNo("no")}
                    className={`flex flex-col items-center gap-3 rounded-2xl border-2 p-8 transition-all duration-200 ${
                      selectedYesNo === "no"
                        ? "border-red-500 bg-red-950/50 shadow-lg shadow-red-900/30"
                        : "border-slate-700 bg-slate-800/60 hover:border-red-700 hover:bg-slate-800"
                    }`}
                  >
                    <ThumbsDown
                      className={`w-10 h-10 ${selectedYesNo === "no" ? "text-red-400" : "text-slate-500"}`}
                    />
                    <span
                      className={`text-xl font-bold ${selectedYesNo === "no" ? "text-red-300" : "text-slate-400"}`}
                    >
                      No
                    </span>
                    <span className="text-xs text-slate-500 text-center">
                      Reject this position
                    </span>
                    {selectedYesNo === "no" && (
                      <CheckCircle className="w-5 h-5 text-red-400" />
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 flex gap-3 p-6 bg-[#0f172a] border-t border-slate-800">
              <button
                onClick={() => setVoteDialogOpen(false)}
                className="flex-1 rounded-xl border border-slate-700 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleVote}
                disabled={
                  submitting ||
                  (voteEvent.votingMode === "candidate" &&
                    !selectedCandidate) ||
                  (voteEvent.votingMode === "yesno" && !selectedYesNo)
                }
                className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed py-3 text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Submitting…
                  </>
                ) : (
                  <>
                    <Vote className="w-4 h-4" /> Confirm Vote
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

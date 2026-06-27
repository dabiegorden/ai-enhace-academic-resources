"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Plus,
  Edit2,
  Trash2,
  Clock,
  Download,
  FileText,
  Lock,
  ThumbsUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";

// Build a forced-download URL for a manifesto file. Cloudinary honours the
// `fl_attachment` delivery flag to send a Content-Disposition: attachment
// header; for any other host we just return the original URL.
const manifestoDownloadUrl = (url: string) => {
  if (url.includes("/upload/") && url.includes("res.cloudinary.com")) {
    return url.replace("/upload/", "/upload/fl_attachment/");
  }
  return url;
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Candidate {
  _id?: string;
  name: string;
  studentId: string;
  position: string;
  manifesto: string;
  imageUrl: string | null;
  manifestoFileUrl?: string | null;
  image?: File;
  manifestoFile?: File;
  votes: number;
}

interface YesNoTally {
  position: string;
  yes?: number;
  no?: number;
}

interface Voting {
  _id: string;
  title: string;
  description: string;
  type: "src" | "faculty";
  faculty: string | null;
  votingMode: "candidate" | "yesno";
  positions: string[];
  candidates: Candidate[];
  yesNoTallies: YesNoTally[];
  startDate: string;
  endDate: string;
  isActive: boolean;
  resultsPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  title: string;
  description: string;
  type: "src" | "faculty";
  faculty: string;
  votingMode: "candidate" | "yesno";
  positions: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const DEFAULT_POSITIONS = [
  "PRESIDENT",
  "VICE-PRESIDENT",
  "SECRETARY",
  "TREASURER",
  "WELFARE OFFICER",
  "WEEKEND REP",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function VotingAdmin() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const [votings, setVotings] = useState<Voting[]>([]);
  const [filteredVotings, setFilteredVotings] = useState<Voting[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);

  const [selectedVoting, setSelectedVoting] = useState<Voting | null>(null);
  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    type: "src",
    faculty: "",
    votingMode: "candidate",
    positions: DEFAULT_POSITIONS.join(", "),
    startDate: "",
    endDate: "",
    // Default to a full-day window so a vote created for "today" stays Active
    // for the whole day instead of being marked completed once 17:00 passes.
    startTime: "00:00",
    endTime: "23:59",
  });

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  // Ballot style chosen via tabs:
  //   "single"   → exactly one candidate per position → Yes/No approval ballot
  //   "multiple" → several candidates per position → voters pick one
  // Both map to votingMode "candidate"; the student side automatically renders
  // a Yes/No ballot for any position that has a single (unopposed) candidate.
  const [ballotType, setBallotType] = useState<"single" | "multiple">(
    "single",
  );
  const [currentCandidate, setCurrentCandidate] = useState<Candidate>({
    name: "",
    studentId: "",
    position: "",
    manifesto: "",
    imageUrl: null,
    manifestoFileUrl: null,
    image: undefined,
    manifestoFile: undefined,
    votes: 0,
  });

  const manifestoFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchVotings();
  }, []);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchVotings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/voting`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch votings");
      const data = await response.json();
      setVotings(data.data);
      filterVotings(data.data, searchTerm, typeFilter);
    } catch {
      toast.error("Failed to fetch votings");
    } finally {
      setLoading(false);
    }
  };

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filterVotings = (list: Voting[], search: string, type: string) => {
    let filtered = list;
    if (search)
      filtered = filtered.filter((v) =>
        v.title.toLowerCase().includes(search.toLowerCase()),
      );
    if (type !== "all") filtered = filtered.filter((v) => v.type === type);
    setFilteredVotings(filtered);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    filterVotings(votings, value, typeFilter);
  };

  // ── Candidate helpers ──────────────────────────────────────────────────────
  const resetCandidate = () => {
    setCurrentCandidate({
      name: "",
      studentId: "",
      position: "",
      manifesto: "",
      imageUrl: null,
      manifestoFileUrl: null,
      image: undefined,
      manifestoFile: undefined,
      votes: 0,
    });
    if (manifestoFileRef.current) manifestoFileRef.current.value = "";
  };

  const handleAddCandidate = () => {
    if (
      !currentCandidate.name ||
      !currentCandidate.studentId ||
      !currentCandidate.position
    ) {
      toast.error("Please fill in name, student ID and position");
      return;
    }
    const exists = candidates.some(
      (c) => c.studentId === currentCandidate.studentId,
    );
    if (exists && !currentCandidate._id) {
      toast.error("Candidate with this student ID already added");
      return;
    }
    // In single-candidate (Yes/No) mode each position may have only ONE
    // candidate — students then approve or reject that candidate.
    if (ballotType === "single") {
      const positionTaken = candidates.some(
        (c) =>
          c.position === currentCandidate.position &&
          c.studentId !== currentCandidate.studentId,
      );
      if (positionTaken) {
        toast.error(
          `"${currentCandidate.position}" already has a candidate. Single-candidate (Yes/No) mode allows only one candidate per position.`,
        );
        return;
      }
    }
    if (currentCandidate._id) {
      setCandidates(
        candidates.map((c) =>
          c._id === currentCandidate._id ? currentCandidate : c,
        ),
      );
    } else {
      setCandidates([...candidates, currentCandidate]);
    }
    resetCandidate();
  };

  const handleRemoveCandidate = (studentId: string) => {
    setCandidates(candidates.filter((c) => c.studentId !== studentId));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file)
      setCurrentCandidate({
        ...currentCandidate,
        image: file,
        imageUrl: URL.createObjectURL(file),
      });
  };

  const handleManifestoFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file)
      setCurrentCandidate({
        ...currentCandidate,
        manifestoFile: file,
        manifestoFileUrl: URL.createObjectURL(file),
      });
  };

  // ── Date/time helpers ──────────────────────────────────────────────────────
  const combineDateTime = (date: string, time: string): string => {
    if (!date || !time) return "";
    const [year, month, day] = date.split("-").map(Number);
    const [hours, minutes] = time.split(":").map(Number);
    return new Date(year, month - 1, day, hours, minutes, 0, 0).toISOString();
  };

  const extractTime = (isoString: string): string => {
    const date = new Date(isoString);
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  };

  // ── Build FormData payload ─────────────────────────────────────────────────
  const buildFormPayload = (isEdit = false) => {
    const form = new FormData();
    form.append("title", formData.title);
    form.append("description", formData.description);
    form.append("type", formData.type);
    form.append("votingMode", formData.votingMode);
    form.append(
      "positions",
      JSON.stringify(
        formData.positions
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean),
      ),
    );
    form.append(
      "startDate",
      combineDateTime(formData.startDate, formData.startTime),
    );
    form.append("endDate", combineDateTime(formData.endDate, formData.endTime));
    if (formData.type === "faculty") form.append("faculty", formData.faculty);

    // Only attach candidates in candidate mode
    if (formData.votingMode === "candidate") {
      const candidatesData = candidates.map((c) => ({
        ...(isEdit && c._id ? { _id: c._id } : {}),
        name: c.name,
        studentId: c.studentId,
        position: c.position,
        manifesto: c.manifesto || "",
        imageUrl: c.imageUrl,
        manifestoFileUrl: c.manifestoFileUrl,
      }));
      form.append("candidates", JSON.stringify(candidatesData));

      candidates.forEach((candidate, index) => {
        if (candidate.image instanceof File)
          form.append(`candidate_${index}`, candidate.image);
      });
      candidates.forEach((candidate, index) => {
        if (candidate.manifestoFile instanceof File)
          form.append(`manifesto_${index}`, candidate.manifestoFile);
      });
    }

    return form;
  };

  // ── Create ─────────────────────────────────────────────────────────────────
  const handleCreateVoting = async () => {
    if (
      !formData.title ||
      !formData.description ||
      !formData.positions ||
      !formData.startDate ||
      !formData.endDate ||
      !formData.startTime ||
      !formData.endTime
    ) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (formData.type === "faculty" && !formData.faculty) {
      toast.error(
        "Please specify the faculty for this faculty-type voting event",
      );
      return;
    }
    if (formData.votingMode === "candidate" && candidates.length === 0) {
      toast.error("Please add at least one candidate");
      return;
    }
    // Guard against an end date/time that is already in the past — otherwise the
    // event would be created already "completed".
    const endsAt = new Date(
      combineDateTime(formData.endDate, formData.endTime),
    );
    if (!Number.isNaN(endsAt.getTime()) && endsAt.getTime() <= Date.now()) {
      toast.error(
        "The end date and time are already in the past. Please choose a future end time.",
      );
      return;
    }
    try {
      setActionLoading(true);
      const response = await fetch(`${apiUrl}/voting`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: buildFormPayload(false),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create voting event");
      }
      toast.success("Voting event created successfully");
      setAddDialogOpen(false);
      resetForm();
      fetchVotings();
    } catch (error: any) {
      toast.error(error.message || "Failed to create voting event");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Update ─────────────────────────────────────────────────────────────────
  const handleUpdateVoting = async () => {
    if (!selectedVoting) return;
    if (
      !formData.title ||
      !formData.description ||
      !formData.positions ||
      !formData.startDate ||
      !formData.endDate ||
      !formData.startTime ||
      !formData.endTime
    ) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      setActionLoading(true);
      const response = await fetch(`${apiUrl}/voting/${selectedVoting._id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: buildFormPayload(true),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update voting event");
      }
      toast.success("Voting event updated successfully");
      setEditDialogOpen(false);
      resetForm();
      fetchVotings();
    } catch (error: any) {
      toast.error(error.message || "Failed to update voting event");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Publish ────────────────────────────────────────────────────────────────
  const handlePublishResults = async () => {
    if (!selectedVoting) return;
    try {
      setActionLoading(true);
      const response = await fetch(
        `${apiUrl}/voting/${selectedVoting._id}/publish-results`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
          body: JSON.stringify({}),
        },
      );
      if (!response.ok) throw new Error("Failed to publish results");
      const data = await response.json();
      const updated = votings.map((v) =>
        v._id === selectedVoting._id ? data.data : v,
      );
      setVotings(updated);
      filterVotings(updated, searchTerm, typeFilter);
      setPublishDialogOpen(false);
      setSelectedVoting(null);
      toast.success("Results published successfully");
    } catch {
      toast.error("Failed to publish results");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!selectedVoting) return;
    try {
      setActionLoading(true);
      const response = await fetch(`${apiUrl}/voting/${selectedVoting._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });
      if (!response.ok) throw new Error("Failed to delete voting event");
      const updated = votings.filter((v) => v._id !== selectedVoting._id);
      setVotings(updated);
      filterVotings(updated, searchTerm, typeFilter);
      setDeleteDialogOpen(false);
      setSelectedVoting(null);
      toast.success("Voting event deleted successfully");
    } catch {
      toast.error("Failed to delete voting event");
    } finally {
      setActionLoading(false);
    }
  };

  // ── CSV Download ───────────────────────────────────────────────────────────
  const handleDownloadResults = (voting: Voting) => {
    let rows: string[][];

    if (voting.votingMode === "yesno") {
      rows = [["Position", "Yes Votes", "No Votes", "Outcome"]];
      voting.yesNoTallies.forEach((t) => {
        const yes = t.yes ?? 0;
        const no = t.no ?? 0;
        const outcome = yes > no ? "APPROVED" : yes < no ? "REJECTED" : "TIE";
        rows.push([t.position, String(yes), String(no), outcome]);
      });
    } else {
      rows = [["Position", "Candidate Name", "Student ID", "Votes"]];
      const byPosition: Record<string, Candidate[]> = {};
      voting.candidates.forEach((c) => {
        if (!byPosition[c.position]) byPosition[c.position] = [];
        byPosition[c.position].push(c);
      });
      Object.entries(byPosition).forEach(([position, cands]) => {
        const sorted = [...cands].sort(
          (a, b) => (b.votes ?? 0) - (a.votes ?? 0),
        );
        sorted.forEach((c) =>
          rows.push([position, c.name, c.studentId, String(c.votes ?? 0)]),
        );
      });
    }

    const csv = rows
      .map((r) => r.map((cell) => `"${cell}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${voting.title.replace(/\s+/g, "_")}_results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Reset ──────────────────────────────────────────────────────────────────
  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      type: "src",
      faculty: "",
      votingMode: "candidate",
      positions: DEFAULT_POSITIONS.join(", "),
      startDate: "",
      endDate: "",
      // Full-day window default (see initial formData for rationale).
      startTime: "00:00",
      endTime: "23:59",
    });
    setBallotType("single");
    setCandidates([]);
    resetCandidate();
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getVotingStatus = (voting: Voting) => {
    const now = new Date();
    const start = new Date(voting.startDate);
    const end = new Date(voting.endDate);
    if (now < start) return "Upcoming";
    if (now > end) return "Completed";
    return "Active";
  };

  const formatDateTime = (dateString: string) =>
    new Date(dateString).toLocaleString();

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-700 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Voting Management
        </h1>
        <Button
          onClick={() => {
            resetForm();
            setAddDialogOpen(true);
          }}
          className="bg-linear-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Voting Event
        </Button>
      </div>

      {/* Filter & Search */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <Input
            placeholder="Search voting events..."
            value={searchTerm}
            onChange={handleSearch}
            className="border-gray-700 bg-gray-800"
          />
          <Select
            value={typeFilter}
            onValueChange={(value) => {
              setTypeFilter(value);
              filterVotings(votings, searchTerm, value);
            }}
          >
            <SelectTrigger className="border-gray-700 bg-gray-800">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="src">SRC</SelectItem>
              <SelectItem value="faculty">Faculty</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredVotings.length === 0 ? (
          <div className="py-8 text-center text-gray-400">
            No voting events found
          </div>
        ) : (
          <div className="space-y-4">
            {filteredVotings.map((voting) => {
              const status = getVotingStatus(voting);
              return (
                <div
                  key={voting._id}
                  className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800 p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      {voting.votingMode === "candidate" &&
                        voting.candidates.find((c) => c.imageUrl)?.imageUrl && (
                          <img
                            src={
                              voting.candidates.find((c) => c.imageUrl)!
                                .imageUrl!
                            }
                            alt="Candidate"
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        )}
                      {voting.votingMode === "yesno" && (
                        <div className="w-12 h-12 rounded-lg bg-amber-900/40 border border-amber-600 flex items-center justify-center">
                          <ThumbsUp className="h-5 w-5 text-amber-400" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-white">
                          {voting.title}
                        </h3>
                        <p className="text-sm text-gray-400 mt-1">
                          {formatDateTime(voting.startDate)} —{" "}
                          {formatDateTime(voting.endDate)}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          <span
                            className={`px-2 py-1 rounded-full font-medium ${
                              status === "Active"
                                ? "bg-green-500/20 text-green-400"
                                : status === "Upcoming"
                                  ? "bg-blue-500/20 text-blue-400"
                                  : "bg-gray-500/20 text-gray-400"
                            }`}
                          >
                            {status}
                          </span>
                          <span className="capitalize bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full">
                            {voting.type}
                          </span>
                          {/* Ballot mode badge */}
                          <span
                            className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                              voting.votingMode === "yesno"
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-blue-500/20 text-blue-400"
                            }`}
                          >
                            {voting.votingMode === "yesno" ? (
                              <>
                                <ThumbsUp className="h-3 w-3" /> Yes/No
                              </>
                            ) : (
                              <>
                                <Users className="h-3 w-3" /> Candidates
                              </>
                            )}
                          </span>
                          {voting.type === "faculty" && voting.faculty && (
                            <span className="flex items-center gap-1 bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full">
                              <Lock className="h-3 w-3" />
                              {voting.faculty} only
                            </span>
                          )}
                          {voting.votingMode === "candidate" && (
                            <span>
                              {voting.candidates.length} candidate
                              {voting.candidates.length !== 1 ? "s" : ""}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {voting.positions.length} position
                            {voting.positions.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {voting.resultsPublished && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadResults(voting)}
                        className="border-green-600 text-green-400 hover:bg-green-900/20"
                        title="Download results as CSV"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedVoting(voting);
                        if (voting.resultsPublished) setViewDialogOpen(true);
                        else setPublishDialogOpen(true);
                      }}
                      className="border-gray-500 text-gray-300 hover:bg-gray-600"
                    >
                      {voting.resultsPublished ? "View" : "Publish"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedVoting(voting);
                        setFormData({
                          title: voting.title,
                          description: voting.description,
                          type: voting.type,
                          faculty: voting.faculty || "",
                          // New events are always candidate-based; "single" vs
                          // "multiple" is decided by the ballot-type tab.
                          votingMode: "candidate",
                          positions: voting.positions.join(", "),
                          startDate: voting.startDate.split("T")[0],
                          endDate: voting.endDate.split("T")[0],
                          startTime: extractTime(voting.startDate),
                          endTime: extractTime(voting.endDate),
                        });
                        setCandidates(voting.candidates);
                        // Derive the tab: if any position has more than one
                        // candidate it's a multiple-candidate ballot.
                        const counts: Record<string, number> = {};
                        (voting.candidates || []).forEach((c) => {
                          counts[c.position] = (counts[c.position] || 0) + 1;
                        });
                        const hasMultiple = Object.values(counts).some(
                          (n) => n > 1,
                        );
                        setBallotType(hasMultiple ? "multiple" : "single");
                        setEditDialogOpen(true);
                      }}
                      className="text-gray-300 hover:bg-gray-600"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedVoting(voting);
                        setDeleteDialogOpen(true);
                      }}
                      className="text-red-400 hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Add / Edit Dialog ─────────────────────────────────────────────── */}
      <Dialog
        open={addDialogOpen || editDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setAddDialogOpen(false);
            setEditDialogOpen(false);
          }
        }}
      >
        <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editDialogOpen ? "Edit Voting Event" : "Create Voting Event"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Title
              </label>
              <Input
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <Input
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>

            {/* Type + Faculty */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Audience Type
                </label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      type: value as "src" | "faculty",
                    })
                  }
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="src" className="text-white">
                      SRC (all students)
                    </SelectItem>
                    <SelectItem value="faculty" className="text-white">
                      Faculty-specific
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.type === "faculty" && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Faculty / Department
                    <span className="ml-2 text-xs text-amber-400 font-normal">
                      (only this faculty's students see this)
                    </span>
                  </label>
                  <Input
                    value={formData.faculty}
                    onChange={(e) =>
                      setFormData({ ...formData, faculty: e.target.value })
                    }
                    placeholder="e.g. Computer Science"
                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                  />
                </div>
              )}
            </div>

            {/* Faculty restriction banner */}
            {formData.type === "faculty" && formData.faculty && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-700/50 bg-amber-900/20 p-3">
                <Lock className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-300">
                  This election will only be visible to students whose faculty
                  is set to <strong>{formData.faculty}</strong>. Students from
                  other faculties will not see or participate in this poll.
                </p>
              </div>
            )}

            {/* ── Ballot Type (tabs) ── */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Ballot Type
              </label>
              <Tabs
                value={ballotType}
                onValueChange={(v) => {
                  const next = v as "single" | "multiple";
                  setBallotType(next);
                  // Both ballot types are candidate-based.
                  setFormData((prev) => ({ ...prev, votingMode: "candidate" }));
                }}
              >
                <TabsList className="grid w-full grid-cols-2 bg-gray-800">
                  <TabsTrigger
                    value="single"
                    className="data-[state=active]:bg-amber-600 data-[state=active]:text-white"
                  >
                    <ThumbsUp className="mr-1.5 h-4 w-4" />
                    Single Candidate (Yes/No)
                  </TabsTrigger>
                  <TabsTrigger
                    value="multiple"
                    className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                  >
                    <Users className="mr-1.5 h-4 w-4" />
                    Multiple Candidates
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="single">
                  <div className="rounded-lg border border-amber-700/50 bg-amber-900/20 p-3 text-sm text-amber-300">
                    Add <strong>one candidate per position</strong>. Students
                    will vote <strong>Yes</strong> to approve or{" "}
                    <strong>No</strong> to reject that candidate for each
                    position.
                  </div>
                </TabsContent>

                <TabsContent value="multiple">
                  <div className="rounded-lg border border-blue-700/50 bg-blue-900/20 p-3 text-sm text-blue-300">
                    Add <strong>several candidates per position</strong>.
                    Students will choose <strong>one candidate</strong> per
                    position. Voting on one position doesn't close the others.
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Positions */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Positions (comma-separated)
              </label>
              <Input
                value={formData.positions}
                onChange={(e) =>
                  setFormData({ ...formData, positions: e.target.value })
                }
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                placeholder="PRESIDENT, VICE-PRESIDENT, SECRETARY"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Start Time
                </label>
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  End Date
                </label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  End Time
                </label>
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData({ ...formData, endTime: e.target.value })
                  }
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>

            {/* ── Candidates section (candidate mode only) ── */}
            {formData.votingMode === "candidate" && (
              <div className="border-t border-gray-700 pt-4">
                <h3 className="text-lg font-semibold text-white mb-4">
                  {ballotType === "single"
                    ? "Add Candidate (one per position)"
                    : "Add Candidate"}
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Name
                    </label>
                    <Input
                      value={currentCandidate.name}
                      onChange={(e) =>
                        setCurrentCandidate({
                          ...currentCandidate,
                          name: e.target.value,
                        })
                      }
                      className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                      placeholder="Full name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Student ID
                      </label>
                      <Input
                        value={currentCandidate.studentId}
                        onChange={(e) =>
                          setCurrentCandidate({
                            ...currentCandidate,
                            studentId: e.target.value,
                          })
                        }
                        className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                        placeholder="e.g. UG/2021/001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Position
                      </label>
                      <Select
                        value={currentCandidate.position}
                        onValueChange={(value) =>
                          setCurrentCandidate({
                            ...currentCandidate,
                            position: value,
                          })
                        }
                      >
                        <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                          <SelectValue placeholder="Select position" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          {formData.positions
                            .split(",")
                            .map((p) => p.trim())
                            .filter((p) => p)
                            .map((position) => (
                              <SelectItem
                                key={position}
                                value={position}
                                className="text-white"
                              >
                                {position}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Manifesto (text)
                    </label>
                    <textarea
                      value={currentCandidate.manifesto}
                      onChange={(e) =>
                        setCurrentCandidate({
                          ...currentCandidate,
                          manifesto: e.target.value,
                        })
                      }
                      rows={3}
                      className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder:text-gray-500 text-sm resize-none"
                      placeholder="Brief manifesto or leave blank if uploading a file below"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Manifesto File (PDF or image — optional)
                    </label>
                    <div className="flex items-center gap-3">
                      <Input
                        ref={manifestoFileRef}
                        type="file"
                        accept=".pdf,.doc,.docx,image/*"
                        onChange={handleManifestoFileUpload}
                        className="bg-gray-800 border-gray-700 text-white flex-1"
                      />
                      {currentCandidate.manifestoFile && (
                        <span className="flex items-center gap-1 text-xs text-green-400 shrink-0">
                          <FileText className="h-4 w-4" />
                          {currentCandidate.manifestoFile.name.slice(0, 20)}
                          {currentCandidate.manifestoFile.name.length > 20
                            ? "…"
                            : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Profile Photo
                    </label>
                    <div className="flex items-center gap-4">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="bg-gray-800 border-gray-700 text-white flex-1"
                      />
                      {currentCandidate.imageUrl && (
                        <img
                          src={currentCandidate.imageUrl}
                          alt="Preview"
                          className="w-12 h-12 rounded-full object-cover shrink-0"
                        />
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={handleAddCandidate}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {currentCandidate._id
                      ? "Update Candidate"
                      : "Add Candidate"}
                  </Button>
                </div>

                {candidates.length > 0 && (
                  <div className="mt-6 space-y-2">
                    <p className="text-sm font-medium text-gray-300 mb-2">
                      Added Candidates ({candidates.length})
                    </p>
                    {candidates.map((candidate) => (
                      <div
                        key={candidate.studentId}
                        className="flex items-center justify-between bg-gray-800 border border-gray-700 p-3 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {candidate.imageUrl ? (
                            <img
                              src={candidate.imageUrl}
                              alt={candidate.name}
                              className="w-10 h-10 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                              <span className="text-white text-sm font-bold">
                                {candidate.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="text-white font-semibold text-sm">
                              {candidate.name}
                            </p>
                            <p className="text-gray-300 text-xs">
                              {candidate.studentId} • {candidate.position}
                            </p>
                            {candidate.manifestoFile && (
                              <p className="text-blue-400 text-xs flex items-center gap-1 mt-0.5">
                                <FileText className="h-3 w-3" />
                                Manifesto file attached
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setCurrentCandidate(candidate)}
                            className="text-blue-400 hover:bg-blue-900/20 hover:text-blue-300"
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              handleRemoveCandidate(candidate.studentId)
                            }
                            className="text-red-400 hover:bg-red-900/20 hover:text-red-300"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Yes/No mode summary */}
            {formData.votingMode === "yesno" && (
              <div className="border-t border-gray-700 pt-4">
                <h3 className="text-base font-semibold text-white mb-3">
                  Positions to Vote On
                </h3>
                <div className="space-y-2">
                  {formData.positions
                    .split(",")
                    .map((p) => p.trim())
                    .filter((p) => p)
                    .map((position) => (
                      <div
                        key={position}
                        className="flex items-center justify-between rounded-lg bg-gray-800 border border-gray-700 px-3 py-2"
                      >
                        <span className="text-white text-sm font-medium">
                          {position}
                        </span>
                        <div className="flex gap-2">
                          <span className="rounded-full bg-green-900/40 px-2 py-0.5 text-xs text-green-400 border border-green-700">
                            Yes
                          </span>
                          <span className="rounded-full bg-red-900/40 px-2 py-0.5 text-xs text-red-400 border border-red-700">
                            No
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddDialogOpen(false);
                setEditDialogOpen(false);
              }}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={editDialogOpen ? handleUpdateVoting : handleCreateVoting}
              disabled={actionLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {actionLoading
                ? "Loading..."
                : editDialogOpen
                  ? "Update"
                  : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View Results Dialog ────────────────────────────────────────────── */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="border-gray-700 bg-gray-900 max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-white">
                {selectedVoting?.title} — Results
              </DialogTitle>
              {selectedVoting && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownloadResults(selectedVoting)}
                  className="border-green-600 text-green-400 hover:bg-green-900/20 ml-4"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download CSV
                </Button>
              )}
            </div>
          </DialogHeader>

          {selectedVoting && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-400">Description</p>
                <p className="text-gray-300">{selectedVoting.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Type</p>
                  <p className="text-white capitalize">{selectedVoting.type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Ballot Mode</p>
                  <p className="text-white capitalize">
                    {selectedVoting.votingMode === "yesno"
                      ? "Yes / No"
                      : "Candidate"}
                  </p>
                </div>
              </div>

              {selectedVoting.faculty && (
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-amber-400" />
                  <div>
                    <p className="text-sm text-gray-400">
                      Faculty-restricted to
                    </p>
                    <p className="text-amber-300 font-medium">
                      {selectedVoting.faculty}
                    </p>
                  </div>
                </div>
              )}

              {/* Yes/No results */}
              {selectedVoting.votingMode === "yesno" && (
                <div>
                  <p className="text-sm text-gray-400 mb-3">Yes / No Results</p>
                  <div className="space-y-3">
                    {selectedVoting.yesNoTallies.map((tally) => {
                      const yes = tally.yes ?? 0;
                      const no = tally.no ?? 0;
                      const total = yes + no || 1;
                      const yesPct = Math.round((yes / total) * 100);
                      const outcome =
                        yes > no ? "APPROVED" : yes < no ? "REJECTED" : "TIE";
                      const outcomeCls =
                        outcome === "APPROVED"
                          ? "text-green-400"
                          : outcome === "REJECTED"
                            ? "text-red-400"
                            : "text-gray-400";

                      return (
                        <div
                          key={tally.position}
                          className="rounded-lg bg-gray-800 p-4 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-white">
                              {tally.position}
                            </p>
                            <span
                              className={`text-xs font-bold uppercase ${outcomeCls}`}
                            >
                              {outcome}
                            </span>
                          </div>
                          <div className="flex gap-4 text-sm">
                            <span className="text-green-400 font-medium">
                              Yes: {yes}
                            </span>
                            <span className="text-red-400 font-medium">
                              No: {no}
                            </span>
                          </div>
                          {/* Progress bar */}
                          <div className="h-2 w-full rounded-full bg-gray-700 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-green-500 transition-all"
                              style={{ width: `${yesPct}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-500">{yesPct}% Yes</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Candidate results */}
              {selectedVoting.votingMode === "candidate" && (
                <div>
                  <p className="text-sm text-gray-400 mb-3">
                    Candidates &amp; Results
                  </p>
                  <div className="space-y-3">
                    {selectedVoting.candidates.map((candidate) => (
                      <div
                        key={candidate._id}
                        className="flex items-start justify-between bg-gray-800 p-3 rounded"
                      >
                        <div className="flex items-start gap-3 flex-1">
                          {candidate.imageUrl ? (
                            <img
                              src={candidate.imageUrl}
                              alt={candidate.name}
                              className="w-12 h-12 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                              <span className="text-white font-bold">
                                {candidate.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="font-semibold text-white">
                              {candidate.name}
                            </p>
                            <p className="text-xs text-gray-400">
                              {candidate.studentId}
                            </p>
                            <p className="text-xs text-purple-400 mt-1">
                              Position: {candidate.position}
                            </p>
                            {candidate.manifesto && (
                              <p className="text-sm text-gray-400 mt-2">
                                {candidate.manifesto}
                              </p>
                            )}
                            {candidate.manifestoFileUrl && (
                              <div className="flex items-center gap-3 mt-1">
                                <a
                                  href={candidate.manifestoFileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                                >
                                  <FileText className="h-3 w-3" />
                                  Preview
                                </a>
                                <a
                                  href={manifestoDownloadUrl(
                                    candidate.manifestoFileUrl,
                                  )}
                                  download
                                  className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                                >
                                  <Download className="h-3 w-3" />
                                  Download
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-2xl font-bold text-blue-400">
                            {candidate.votes}
                          </p>
                          <p className="text-xs text-gray-500">votes</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-400">Voting Period</p>
                <p className="text-gray-300 text-sm">
                  Start: {formatDateTime(selectedVoting.startDate)}
                </p>
                <p className="text-gray-300 text-sm">
                  End: {formatDateTime(selectedVoting.endDate)}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Publish Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Publish Results</DialogTitle>
          </DialogHeader>
          <p className="text-gray-300">
            Are you sure you want to publish the results for{" "}
            <span className="font-semibold">{selectedVoting?.title}</span>?
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPublishDialogOpen(false)}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePublishResults}
              disabled={actionLoading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {actionLoading ? "Publishing..." : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              Delete Voting Event
            </DialogTitle>
          </DialogHeader>
          <p className="text-gray-300">
            Are you sure you want to delete{" "}
            <span className="font-semibold">{selectedVoting?.title}</span>? This
            action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {actionLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

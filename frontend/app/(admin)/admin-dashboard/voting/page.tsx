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
import { Plus, Edit2, Trash2, Clock, Download, FileText } from "lucide-react";
import { toast } from "sonner";

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

interface Voting {
  _id: string;
  title: string;
  description: string;
  type: "src" | "faculty";
  faculty: string | null;
  positions: string[];
  candidates: Candidate[];
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
  positions: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
}

// Default positions including "Weekend Rep"
const DEFAULT_POSITIONS = [
  "PRESIDENT",
  "VICE-PRESIDENT",
  "SECRETARY",
  "TREASURER",
  "WELFARE OFFICER",
  "WEEKEND REP",
];

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
    positions: DEFAULT_POSITIONS.join(", "),
    startDate: "",
    endDate: "",
    startTime: "09:00",
    endTime: "17:00",
  });

  const [candidates, setCandidates] = useState<Candidate[]>([]);
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
    if (file) {
      setCurrentCandidate({
        ...currentCandidate,
        image: file,
        imageUrl: URL.createObjectURL(file),
      });
    }
  };

  const handleManifestoFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setCurrentCandidate({
        ...currentCandidate,
        manifestoFile: file,
        manifestoFileUrl: URL.createObjectURL(file),
      });
    }
  };

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

  const buildFormPayload = (isEdit = false) => {
    const form = new FormData();
    form.append("title", formData.title);
    form.append("description", formData.description);
    form.append("type", formData.type);
    form.append(
      "positions",
      JSON.stringify(formData.positions.split(",").map((p) => p.trim())),
    );
    form.append(
      "startDate",
      combineDateTime(formData.startDate, formData.startTime),
    );
    form.append("endDate", combineDateTime(formData.endDate, formData.endTime));
    if (formData.type === "faculty") form.append("faculty", formData.faculty);

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

    // Attach profile images
    candidates.forEach((candidate, index) => {
      if (candidate.image instanceof File) {
        form.append(`candidate_${index}`, candidate.image);
      }
    });

    // Attach manifesto files
    candidates.forEach((candidate, index) => {
      if (candidate.manifestoFile instanceof File) {
        form.append(`manifesto_${index}`, candidate.manifestoFile);
      }
    });

    return form;
  };

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
      toast.error("Please select a faculty for faculty-type voting");
      return;
    }
    if (candidates.length === 0) {
      toast.error("Please add at least one candidate");
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

  // Download results as CSV
  const handleDownloadResults = (voting: Voting) => {
    const rows: string[][] = [
      ["Position", "Candidate Name", "Student ID", "Votes"],
    ];

    // Group by position and sort by votes descending
    const byPosition: Record<string, Candidate[]> = {};
    voting.candidates.forEach((c) => {
      if (!byPosition[c.position]) byPosition[c.position] = [];
      byPosition[c.position].push(c);
    });

    Object.entries(byPosition).forEach(([position, cands]) => {
      const sorted = [...cands].sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0));
      sorted.forEach((c) => {
        rows.push([position, c.name, c.studentId, String(c.votes ?? 0)]);
      });
    });

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

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      type: "src",
      faculty: "",
      positions: DEFAULT_POSITIONS.join(", "),
      startDate: "",
      endDate: "",
      startTime: "09:00",
      endTime: "17:00",
    });
    setCandidates([]);
    resetCandidate();
  };

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

      {/* Filter and Search */}
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
                      {voting.candidates.find((c) => c.imageUrl)?.imageUrl && (
                        <img
                          src={
                            voting.candidates.find((c) => c.imageUrl)!.imageUrl!
                          }
                          alt="Candidate"
                          className="w-12 h-12 rounded-lg object-cover"
                        />
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
                          <span>
                            {voting.candidates.length} candidate
                            {voting.candidates.length !== 1 ? "s" : ""}
                          </span>
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
                        if (voting.resultsPublished) {
                          setViewDialogOpen(true);
                        } else {
                          setPublishDialogOpen(true);
                        }
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
                          positions: voting.positions.join(", "),
                          startDate: voting.startDate.split("T")[0],
                          endDate: voting.endDate.split("T")[0],
                          startTime: extractTime(voting.startDate),
                          endTime: extractTime(voting.endDate),
                        });
                        setCandidates(voting.candidates);
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

      {/* Add / Edit Dialog */}
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
                  Type
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
                      SRC
                    </SelectItem>
                    <SelectItem value="faculty" className="text-white">
                      Faculty
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.type === "faculty" && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Faculty
                  </label>
                  <Input
                    value={formData.faculty}
                    onChange={(e) =>
                      setFormData({ ...formData, faculty: e.target.value })
                    }
                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                  />
                </div>
              )}
            </div>

            {/* Positions — includes Weekend Rep by default */}
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
                placeholder="PRESIDENT, VICE-PRESIDENT, SECRETARY, WEEKEND REP"
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

            {/* Candidates Section */}
            <div className="border-t border-gray-700 pt-4">
              <h3 className="text-lg font-semibold text-white mb-4">
                Add Candidate
              </h3>

              <div className="space-y-3">
                {/* Name */}
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
                  {/* Student ID */}
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

                  {/* Position */}
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

                {/* Manifesto text */}
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

                {/* Manifesto file */}
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

                {/* Profile image */}
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
                  {currentCandidate._id ? "Update Candidate" : "Add Candidate"}
                </Button>
              </div>

              {/* Candidates List — FIX: explicit light text on dark bg */}
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
                          {/* FIX: text-white and text-gray-300 so it's visible on dark bg */}
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

      {/* View Results Dialog */}
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
                  <p className="text-sm text-gray-400">Status</p>
                  <p className="text-white">
                    {getVotingStatus(selectedVoting)}
                  </p>
                </div>
              </div>
              {selectedVoting.faculty && (
                <div>
                  <p className="text-sm text-gray-400">Faculty</p>
                  <p className="text-white">{selectedVoting.faculty}</p>
                </div>
              )}
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
                            <a
                              href={candidate.manifestoFileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-1"
                            >
                              <FileText className="h-3 w-3" />
                              View Manifesto File
                            </a>
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

      {/* Publish Results Dialog */}
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

      {/* Delete Dialog */}
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

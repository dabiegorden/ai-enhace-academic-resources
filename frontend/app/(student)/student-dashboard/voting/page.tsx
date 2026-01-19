"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Vote,
  Users,
  Trophy,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Candidate {
  _id: string;
  name: string;
  studentId: string;
  position: string;
  manifesto: string;
  imageUrl?: string;
  votes?: number;
}

interface VotingEvent {
  _id: string;
  title: string;
  description: string;
  type: "src" | "faculty";
  faculty?: string;
  positions: string[];
  candidates: Candidate[];
  startDate: string;
  endDate: string;
  isActive: boolean;
  resultsPublished: boolean;
  hasVoted?: boolean;
}

export default function StudentVotingPage() {
  const [activeTab, setActiveTab] = useState<
    "active" | "upcoming" | "completed"
  >("active");
  const [votingEvents, setVotingEvents] = useState<VotingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVoting, setSelectedVoting] = useState<VotingEvent | null>(
    null,
  );
  const [selectedPosition, setSelectedPosition] = useState<string>("");
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(
    null,
  );
  const [viewDetailsDialog, setViewDetailsDialog] = useState(false);
  const [voteDialogOpen, setVoteDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // Fetch voting events
  const fetchVotingEvents = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/voting?status=${activeTab}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setVotingEvents(data.data || []);
      } else {
        toast.error(data.message || "Failed to fetch voting events");
      }
    } catch (error) {
      toast.error("Failed to fetch voting events");
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, [token, apiUrl, activeTab]);

  useEffect(() => {
    fetchVotingEvents();
  }, [fetchVotingEvents]);

  // Fetch detailed voting event
  const fetchVotingDetails = async (votingId: string) => {
    try {
      const response = await fetch(`${apiUrl}/voting/${votingId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setSelectedVoting(data.data);
        setViewDetailsDialog(true);
      } else {
        toast.error(data.message || "Failed to fetch voting details");
      }
    } catch (error) {
      toast.error("Failed to fetch voting details");
      console.error("Fetch error:", error);
    }
  };

  // Open vote dialog for a position
  const openVoteDialog = (voting: VotingEvent, position: string) => {
    setSelectedVoting(voting);
    setSelectedPosition(position);
    setSelectedCandidate(null);
    setVoteDialogOpen(true);
  };

  // Submit vote
  const handleVote = async () => {
    if (!selectedCandidate || !selectedVoting) {
      toast.error("Please select a candidate");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(
        `${apiUrl}/voting/${selectedVoting._id}/vote`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ candidateId: selectedCandidate }),
        },
      );

      const data = await response.json();
      if (data.success) {
        toast.success("Vote cast successfully!");
        setVoteDialogOpen(false);
        fetchVotingEvents(); // Refresh to update hasVoted status
      } else {
        toast.error(data.message || "Failed to cast vote");
      }
    } catch (error) {
      toast.error("Failed to cast vote");
      console.error("Vote error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  // Get voting status - prioritize isActive flag from backend
  const getVotingStatus = (voting: VotingEvent) => {
    const now = new Date();
    const start = new Date(voting.startDate);
    const end = new Date(voting.endDate);

    // If backend marks it as active, trust that
    if (voting.isActive && now >= start && now <= end) {
      return { label: "Active", color: "bg-green-100 text-green-700" };
    }
    if (now < start)
      return { label: "Upcoming", color: "bg-blue-100 text-blue-700" };
    if (now > end)
      return { label: "Ended", color: "bg-gray-100 text-gray-700" };
    return { label: "Active", color: "bg-green-100 text-green-700" };
  };

  // Group candidates by position
  const groupCandidatesByPosition = (candidates: Candidate[]) => {
    const grouped: Record<string, Candidate[]> = {};
    candidates.forEach((candidate) => {
      if (!grouped[candidate.position]) {
        grouped[candidate.position] = [];
      }
      grouped[candidate.position].push(candidate);
    });
    return grouped;
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Vote className="size-8 text-blue-400" />
            Student Voting
          </h1>
          <p className="text-gray-400">
            Participate in campus elections and view voting results
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {votingEvents.length} Event{votingEvents.length !== 1 ? "s" : ""}
        </Badge>
        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
        >
          <TabsList>
            <TabsTrigger value="active" className="flex items-center gap-2">
              <Clock className="size-4" />
              Active
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="flex items-center gap-2">
              <Calendar className="size-4" />
              Upcoming
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <Trophy className="size-4" />
              Completed
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
          </div>
        ) : votingEvents.length === 0 ? (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Vote className="size-12 text-gray-600 mb-4" />
              <p className="text-gray-400 text-center">
                No {activeTab} voting events found
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {votingEvents.map((voting) => {
              const status = getVotingStatus(voting);
              const candidatesByPosition = groupCandidatesByPosition(
                voting.candidates,
              );

              return (
                <Card
                  key={voting._id}
                  className="hover:shadow-lg transition-shadow bg-gray-800 border-gray-700"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <Badge className={status.color}>{status.label}</Badge>
                      <Badge
                        variant="outline"
                        className="bg-gray-700 text-gray-300 border-gray-600"
                      >
                        {voting.type.toUpperCase()}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl text-white">
                      {voting.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 text-gray-400">
                      {voting.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Voting Period */}
                    <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-3 space-y-1">
                      <div className="flex items-center gap-2 text-sm text-purple-300">
                        <Calendar className="size-4" />
                        <span className="font-semibold">Voting Period</span>
                      </div>
                      <p className="text-xs text-purple-400">
                        {formatDate(voting.startDate)} -{" "}
                        {formatDate(voting.endDate)}
                      </p>
                    </div>

                    {/* Positions & Candidates */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-300">
                        <Users className="size-4" />
                        Positions ({Object.keys(candidatesByPosition).length})
                      </div>
                      <div className="space-y-1">
                        {Object.entries(candidatesByPosition).map(
                          ([position, candidates]) => (
                            <div
                              key={position}
                              className="flex items-center justify-between text-xs bg-gray-700 rounded p-2"
                            >
                              <span className="font-medium text-gray-200">
                                {position}
                              </span>
                              <Badge
                                variant="secondary"
                                className="text-xs bg-gray-600 text-gray-200"
                              >
                                {candidates.length} candidate
                                {candidates.length !== 1 ? "s" : ""}
                              </Badge>
                            </div>
                          ),
                        )}
                      </div>
                    </div>

                    {/* Voting Status */}
                    {voting.hasVoted ? (
                      <div className="bg-green-900/30 border border-green-700 rounded-lg p-3 flex items-center gap-2">
                        <CheckCircle className="size-5 text-green-400" />
                        <span className="text-sm font-semibold text-green-300">
                          You have voted
                        </span>
                      </div>
                    ) : status.label === "Active" ? (
                      <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3 flex items-center gap-2">
                        <AlertCircle className="size-5 text-blue-400" />
                        <span className="text-sm font-semibold text-blue-300">
                          Voting in progress
                        </span>
                      </div>
                    ) : null}

                    {/* Action Buttons */}
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full bg-transparent"
                        onClick={() => fetchVotingDetails(voting._id)}
                      >
                        View Candidates
                      </Button>
                      {status.label === "Active" && !voting.hasVoted && (
                        <div className="space-y-1">
                          {Object.keys(candidatesByPosition).map((position) => (
                            <Button
                              key={position}
                              size="sm"
                              className="w-full bg-purple-600 hover:bg-purple-700"
                              onClick={() => openVoteDialog(voting, position)}
                            >
                              <Vote className="mr-2 size-4" />
                              Vote for {position}
                            </Button>
                          ))}
                        </div>
                      )}
                      {voting.resultsPublished && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full bg-transparent"
                          onClick={() => fetchVotingDetails(voting._id)}
                        >
                          <Trophy className="mr-2 size-4" />
                          View Results
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* View Details Dialog */}
      <Dialog open={viewDetailsDialog} onOpenChange={setViewDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedVoting?.title}</DialogTitle>
            <DialogDescription>{selectedVoting?.description}</DialogDescription>
          </DialogHeader>
          {selectedVoting && (
            <div className="space-y-6">
              {Object.entries(
                groupCandidatesByPosition(selectedVoting.candidates),
              ).map(([position, candidates]) => (
                <div key={position} className="space-y-3">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Award className="size-5 text-purple-600" />
                    {position}
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {candidates.map((candidate) => (
                      <Card key={candidate._id} className="overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <Avatar className="size-16">
                              <AvatarImage
                                src={candidate.imageUrl || "/placeholder.svg"}
                                alt={candidate.name}
                              />
                              <AvatarFallback className="bg-purple-100 text-purple-700 text-lg font-bold">
                                {getInitials(candidate.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-gray-900">
                                {candidate.name}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {candidate.studentId}
                              </p>
                              {candidate.manifesto && (
                                <p className="text-xs text-gray-700 mt-2 line-clamp-3">
                                  {candidate.manifesto}
                                </p>
                              )}
                              {selectedVoting.resultsPublished &&
                                candidate.votes !== undefined && (
                                  <div className="mt-2 flex items-center gap-2">
                                    <Trophy className="size-4 text-yellow-600" />
                                    <span className="text-sm font-bold text-gray-900">
                                      {candidate.votes} vote
                                      {candidate.votes !== 1 ? "s" : ""}
                                    </span>
                                  </div>
                                )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setViewDetailsDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vote Dialog */}
      <Dialog open={voteDialogOpen} onOpenChange={setVoteDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cast Your Vote - {selectedPosition}</DialogTitle>
            <DialogDescription>
              Select a candidate to vote for. You can only vote once per
              position.
            </DialogDescription>
          </DialogHeader>
          {selectedVoting && (
            <div className="space-y-4">
              {selectedVoting.candidates
                .filter((c) => c.position === selectedPosition)
                .map((candidate) => (
                  <Card
                    key={candidate._id}
                    className={`cursor-pointer transition-all ${
                      selectedCandidate === candidate._id
                        ? "ring-2 ring-purple-600 bg-purple-50"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => setSelectedCandidate(candidate._id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Avatar className="size-16">
                          <AvatarImage
                            src={candidate.imageUrl || "/placeholder.svg"}
                            alt={candidate.name}
                          />
                          <AvatarFallback className="bg-purple-100 text-purple-700 text-lg font-bold">
                            {getInitials(candidate.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-gray-900">
                              {candidate.name}
                            </h4>
                            {selectedCandidate === candidate._id && (
                              <CheckCircle className="size-6 text-purple-600" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            {candidate.studentId}
                          </p>
                          {candidate.manifesto && (
                            <p className="text-sm text-gray-700 mt-2">
                              {candidate.manifesto}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleVote}
              disabled={!selectedCandidate || submitting}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {submitting ? "Submitting..." : "Cast Vote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

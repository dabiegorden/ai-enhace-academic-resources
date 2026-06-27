"use client";

import React from "react";

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Calendar,
  Clock,
  Upload,
  CheckCircle,
  AlertCircle,
  Download,
  Award,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";

interface Assignment {
  _id: string;
  title: string;
  description: string;
  course: string;
  courseCode: string;
  faculty: string;
  program: string;
  yearOfStudy: number;
  lecturer: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  dueDate: string;
  totalMarks: number;
  attachments: Array<{
    url: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  }>;
  submissions: Array<{
    _id: string;
    student: string | { _id: string }; // Can be ObjectId string or populated object
    fileUrl: string;
    fileName: string;
    submittedAt: string;
    grade?: number;
    feedback?: string;
    status: "submitted" | "graded" | "late";
  }>;
  // Provided by the backend (getMyAssignments) so the client doesn't have to
  // match submissions by user id.
  mySubmission?: Assignment["submissions"][number] | null;
  hasSubmitted?: boolean;
  isActive: boolean;
  createdAt: string;
}

const StudentsAssignments = () => {
  const [activeTab, setActiveTab] = useState<"pending" | "submitted">(
    "pending",
  );
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] =
    useState<Assignment | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editingSubmission, setEditingSubmission] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  // The app stores the logged-in user as a JSON object under "user" (there is
  // no separate "userId" key), so derive the id from there.
  const userId = (() => {
    if (typeof window === "undefined") return null;
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null");
      return u?.id || u?._id || null;
    } catch {
      return null;
    }
  })();

  // Fetch assignments
  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/assignments/my-assignments`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setAssignments(data.data || []);
      } else {
        toast.error(data.message || "Failed to fetch assignments");
      }
    } catch (error) {
      toast.error("Failed to fetch assignments");
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, [token, apiUrl]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  // Check if assignment is submitted by current student. Prefer the
  // backend-provided `mySubmission` (always accurate); fall back to matching
  // the submissions array by the current user's id.
  const getStudentSubmission = (assignment: Assignment) => {
    if (assignment.mySubmission) return assignment.mySubmission;
    if (assignment.hasSubmitted && assignment.submissions.length === 0)
      return undefined;
    if (!userId) return undefined;

    return assignment.submissions.find((sub) => {
      const studentId =
        typeof sub.student === "string" ? sub.student : sub.student?._id;
      return studentId === userId;
    });
  };

  // Check if assignment is overdue
  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  // Format date
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Format time remaining
  const getTimeRemaining = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diff = due.getTime() - now.getTime();

    if (diff < 0) return "Overdue";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days} day${days !== 1 ? "s" : ""} remaining`;
    if (hours > 0) return `${hours} hour${hours !== 1 ? "s" : ""} remaining`;
    return "Due soon";
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setSelectedFile(file);
    }
  };

  // Submit assignment
  const handleSubmit = async () => {
    if (!selectedFile || !selectedAssignment) {
      toast.error("Please select a file to submit");
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(
        `${apiUrl}/assignments/${selectedAssignment._id}/submit`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

      const data = await response.json();
      if (data.success) {
        toast.success("Assignment submitted successfully");
        setSubmitDialogOpen(false);
        setSelectedFile(null);
        fetchAssignments();
      } else {
        toast.error(data.message || "Failed to submit assignment");
      }
    } catch (error) {
      toast.error("Failed to submit assignment");
      console.error("Submit error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  // Update (replace) an existing submission
  const handleUpdateSubmission = async () => {
    if (!selectedFile || !selectedAssignment) {
      toast.error("Please select a file");
      return;
    }
    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("file", selectedFile);
      const response = await fetch(
        `${apiUrl}/assignments/${selectedAssignment._id}/submit`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        },
      );
      const data = await response.json();
      if (data.success) {
        toast.success("Submission updated successfully");
        setSubmitDialogOpen(false);
        setSelectedFile(null);
        setEditingSubmission(false);
        fetchAssignments();
      } else {
        toast.error(data.message || "Failed to update submission");
      }
    } catch (error) {
      toast.error("Failed to update submission");
      console.error("Update error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete an existing submission
  const handleDeleteSubmission = async (assignment: Assignment) => {
    if (!confirm("Are you sure you want to delete your submission?")) return;
    try {
      const response = await fetch(
        `${apiUrl}/assignments/${assignment._id}/submit`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await response.json();
      if (data.success) {
        toast.success("Submission deleted");
        setViewDialogOpen(false);
        fetchAssignments();
      } else {
        toast.error(data.message || "Failed to delete submission");
      }
    } catch (error) {
      toast.error("Failed to delete submission");
      console.error("Delete error:", error);
    }
  };

  // Fetch a protected file (assignment attachment or own submission) and either
  // open it inline (preview) or trigger a download.
  const openProtectedFile = async (
    endpoint: string,
    opts: { download?: boolean; fileName?: string } = {},
  ) => {
    try {
      const url = `${apiUrl}${endpoint}${opts.download ? "?download=1" : ""}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        let msg = "File not available";
        try {
          const d = await response.json();
          msg = d.message || msg;
        } catch {}
        throw new Error(msg);
      }
      const blob = await response.blob();
      const objUrl = window.URL.createObjectURL(blob);
      if (opts.download) {
        const a = document.createElement("a");
        a.href = objUrl;
        a.download = opts.fileName || "file";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(objUrl);
      } else {
        window.open(objUrl, "_blank", "noopener,noreferrer");
        setTimeout(() => window.URL.revokeObjectURL(objUrl), 60000);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to open file",
      );
    }
  };

  // Open view dialog
  const openViewDialog = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setViewDialogOpen(true);
  };

  // Open submit dialog
  const openSubmitDialog = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setSubmitDialogOpen(true);
  };

  // Filter assignments based on active tab - only show active assignments
  const filteredAssignments = assignments.filter((assignment) => {
    // Only show active assignments
    if (!assignment.isActive) return false;

    const submission = getStudentSubmission(assignment);
    if (activeTab === "pending") {
      return !submission;
    } else {
      return !!submission;
    }
  });

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Assignments</h1>
            <p className="text-muted-foreground">
              View and submit your course assignments
            </p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            {assignments.filter((a) => a.isActive).length} Active
          </Badge>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "pending" | "submitted")}
        >
          <TabsList>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <AlertCircle className="size-4" />
              Pending (
              {
                assignments.filter(
                  (a) => a.isActive && !getStudentSubmission(a),
                ).length
              }
              )
            </TabsTrigger>
            <TabsTrigger value="submitted" className="flex items-center gap-2">
              <CheckCircle className="size-4" />
              Submitted (
              {
                assignments.filter((a) => a.isActive && getStudentSubmission(a))
                  .length
              }
              )
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading assignments...</p>
            </div>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="size-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                {activeTab === "pending"
                  ? "No pending assignments"
                  : "No submitted assignments"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Showing {filteredAssignments.length} assignment
              {filteredAssignments.length !== 1 ? "s" : ""}
            </p>

            {/* Assignments Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredAssignments.map((assignment) => {
                const submission = getStudentSubmission(assignment);
                const overdue = isOverdue(assignment.dueDate);

                return (
                  <Card
                    key={assignment._id}
                    className="hover:shadow-lg transition-shadow"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="secondary">
                          {assignment.courseCode}
                        </Badge>
                        {submission ? (
                          <Badge
                            className={
                              submission.status === "graded"
                                ? "bg-green-100 text-green-700"
                                : submission.status === "late"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-blue-100 text-blue-700"
                            }
                          >
                            {submission.status === "graded"
                              ? "Graded"
                              : submission.status === "late"
                                ? "Late"
                                : "Submitted"}
                          </Badge>
                        ) : overdue ? (
                          <Badge className="bg-red-100 text-red-700">
                            Overdue
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-700">
                            Pending
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="line-clamp-2">
                        {assignment.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-2">
                        {assignment.course}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="size-4" />
                          <span>Due: {formatDate(assignment.dueDate)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="size-4" />
                          <span>{getTimeRemaining(assignment.dueDate)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Award className="size-4" />
                          <span>{assignment.totalMarks} marks</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <BookOpen className="size-4" />
                          <span>
                            Year {assignment.yearOfStudy} - {assignment.program}
                          </span>
                        </div>
                      </div>

                      {submission && submission.status === "graded" && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <p className="text-sm font-semibold text-green-800">
                            Grade: {submission.grade}/{assignment.totalMarks}
                          </p>
                          {submission.feedback && (
                            <p className="text-xs text-green-700 mt-1">
                              {submission.feedback}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 bg-transparent"
                          onClick={() => openViewDialog(assignment)}
                        >
                          View Details
                        </Button>
                        {!submission && !overdue && (
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => openSubmitDialog(assignment)}
                          >
                            <Upload className="size-4 mr-2" />
                            Submit
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {/* View Assignment Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedAssignment?.title}</DialogTitle>
              <DialogDescription>
                {selectedAssignment?.course} - {selectedAssignment?.courseCode}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2 text-foreground">
                  Description
                </h3>
                <p className="text-sm text-muted-foreground">
                  {selectedAssignment?.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2 text-foreground">Details</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>
                      <strong>Faculty:</strong> {selectedAssignment?.faculty}
                    </p>
                    <p>
                      <strong>Program:</strong> {selectedAssignment?.program}
                    </p>
                    <p>
                      <strong>Year:</strong> {selectedAssignment?.yearOfStudy}
                    </p>
                    <p>
                      <strong>Total Marks:</strong>{" "}
                      {selectedAssignment?.totalMarks}
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-foreground">Timeline</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>
                      <strong>Due Date:</strong>{" "}
                      {selectedAssignment?.dueDate &&
                        formatDate(selectedAssignment.dueDate)}
                    </p>
                    <p>
                      <strong>Time Remaining:</strong>{" "}
                      {selectedAssignment?.dueDate &&
                        getTimeRemaining(selectedAssignment.dueDate)}
                    </p>
                    <p>
                      <strong>Posted:</strong>{" "}
                      {selectedAssignment?.createdAt &&
                        formatDate(selectedAssignment.createdAt)}
                    </p>
                  </div>
                </div>
              </div>

              {selectedAssignment?.attachments &&
                selectedAssignment.attachments.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 text-foreground">
                      Assignment Files
                    </h3>
                    <div className="space-y-2">
                      {selectedAssignment.attachments.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="size-4 text-gray-600" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {file.fileName}
                              </p>
                              <p className="text-xs text-gray-600">
                                {(file.fileSize / 1024).toFixed(2)} KB
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                openProtectedFile(
                                  `/assignments/${selectedAssignment?._id}/attachments/${idx}/file`,
                                )
                              }
                            >
                              <FileText className="size-4 mr-2" />
                              Preview
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                openProtectedFile(
                                  `/assignments/${selectedAssignment?._id}/attachments/${idx}/file`,
                                  { download: true, fileName: file.fileName },
                                )
                              }
                            >
                              <Download className="size-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {selectedAssignment &&
                getStudentSubmission(selectedAssignment) && (
                  <div>
                    <h3 className="font-semibold mb-2 text-foreground">
                      Your Submission
                    </h3>
                    {(() => {
                      const submission =
                        getStudentSubmission(selectedAssignment);
                      return (
                        <div className="border rounded-lg p-4 bg-blue-50">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-gray-900">
                              {submission?.fileName}
                            </p>
                            <Badge
                              className={
                                submission?.status === "graded"
                                  ? "bg-green-100 text-green-700"
                                  : submission?.status === "late"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-blue-100 text-blue-700"
                              }
                            >
                              {submission?.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600 mb-3">
                            Submitted:{" "}
                            {submission?.submittedAt &&
                              new Date(submission.submittedAt).toLocaleString()}
                          </p>
                          {submission?.status === "graded" && (
                            <div className="bg-green-100 border border-green-200 rounded p-3 mb-2">
                              <p className="text-sm font-semibold text-green-800">
                                Grade: {submission.grade}/
                                {selectedAssignment.totalMarks}
                              </p>
                              {submission.feedback && (
                                <p className="text-xs text-green-700 mt-1">
                                  Feedback: {submission.feedback}
                                </p>
                              )}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                submission &&
                                openProtectedFile(
                                  `/assignments/${selectedAssignment._id}/submissions/${submission._id}/file`,
                                )
                              }
                            >
                              <FileText className="size-4 mr-2" />
                              Preview
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                submission &&
                                openProtectedFile(
                                  `/assignments/${selectedAssignment._id}/submissions/${submission._id}/file`,
                                  { download: true, fileName: submission.fileName },
                                )
                              }
                            >
                              <Download className="size-4 mr-2" />
                              Download
                            </Button>
                            {submission?.status !== "graded" && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedFile(null);
                                    setEditingSubmission(true);
                                    setViewDialogOpen(false);
                                    setSubmitDialogOpen(true);
                                  }}
                                >
                                  <Upload className="size-4 mr-2" />
                                  Update
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() =>
                                    handleDeleteSubmission(selectedAssignment)
                                  }
                                >
                                  Delete
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setViewDialogOpen(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Submit Assignment Dialog */}
        <Dialog
          open={submitDialogOpen}
          onOpenChange={(open) => {
            setSubmitDialogOpen(open);
            if (!open) setEditingSubmission(false);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingSubmission ? "Update Submission" : "Submit Assignment"}
              </DialogTitle>
              <DialogDescription>{selectedAssignment?.title}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="file">Select File</Label>
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileChange}
                  className="mt-2"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.gif"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Supported formats: PDF and images (JPG, PNG, WEBP, GIF) (Max
                  10MB)
                </p>
              </div>

              {selectedFile && (
                <div className="border rounded-lg p-3 bg-blue-50">
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-gray-600">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setSubmitDialogOpen(false);
                  setSelectedFile(null);
                  setEditingSubmission(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={editingSubmission ? handleUpdateSubmission : handleSubmit}
                disabled={!selectedFile || submitting}
              >
                {submitting
                  ? editingSubmission
                    ? "Updating..."
                    : "Submitting..."
                  : editingSubmission
                    ? "Update Submission"
                    : "Submit Assignment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default StudentsAssignments;

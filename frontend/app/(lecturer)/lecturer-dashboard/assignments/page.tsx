"use client";

import React from "react";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Calendar,
  FileText,
  Trash2,
  Edit,
  Eye,
  Upload,
  X,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { FACULTY_NAMES, FACULTY_PROGRAMS } from "@/constants/faculties";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Assignment {
  _id: string;
  title: string;
  description: string;
  course: string;
  courseCode: string;
  faculty: string;
  program: string;
  yearOfStudy: number;
  dueDate: string;
  totalMarks: number;
  attachments: Array<{
    url: string;
    fileName: string;
    fileSize: number;
  }>;
  submissions: Array<any>;
  isActive: boolean;
  createdAt: string;
}

export default function LecturerAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] =
    useState<Assignment | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [viewLoading, setViewLoading] = useState(false);
  // Per-submission grading inputs keyed by submission id.
  const [gradeInputs, setGradeInputs] = useState<
    Record<string, { grade: string; feedback: string }>
  >({});
  const [gradingId, setGradingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    course: "",
    courseCode: "",
    faculty: "",
    program: "",
    yearOfStudy: "",
    dueDate: "",
    totalMarks: "100",
  });

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/assignments`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        const normalized = data.data.map((assignment: Assignment) => ({
          ...assignment,
          attachments: assignment.attachments ?? [],
          submissions: assignment.submissions ?? [],
        }));
        setAssignments(normalized);
      }
    } catch (error) {
      console.error("[v0] Error fetching assignments:", error);
      toast.error("Failed to fetch assignments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles([...selectedFiles, ...filesArray]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const handleAddAssignment = async () => {
    if (
      !formData.title ||
      !formData.description ||
      !formData.course ||
      !formData.courseCode ||
      !formData.faculty ||
      !formData.program ||
      !formData.yearOfStudy ||
      !formData.dueDate
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      setActionLoading(true);

      const formDataToSend = new FormData();
      formDataToSend.append("title", formData.title);
      formDataToSend.append("description", formData.description);
      formDataToSend.append("course", formData.course);
      formDataToSend.append("courseCode", formData.courseCode);
      formDataToSend.append("faculty", formData.faculty);
      formDataToSend.append("program", formData.program);
      formDataToSend.append("yearOfStudy", formData.yearOfStudy);
      formDataToSend.append("dueDate", formData.dueDate);
      formDataToSend.append("totalMarks", formData.totalMarks);

      // Add files if any (optional)
      selectedFiles.forEach((file) => {
        formDataToSend.append("files", file);
      });

      console.log("[v0] Creating assignment with files:", selectedFiles.length);

      const response = await fetch(`${apiUrl}/assignments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataToSend,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create assignment");
      }

      toast.success("Assignment created successfully");
      setAddDialogOpen(false);
      setFormData({
        title: "",
        description: "",
        course: "",
        courseCode: "",
        faculty: "",
        program: "",
        yearOfStudy: "",
        dueDate: "",
        totalMarks: "100",
      });
      setSelectedFiles([]);
      fetchAssignments();
    } catch (error) {
      console.error("[v0] Error creating assignment:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create assignment",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateAssignment = async () => {
    if (!selectedAssignment) return;

    try {
      setActionLoading(true);

      const response = await fetch(
        `${apiUrl}/assignments/${selectedAssignment._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: formData.title,
            description: formData.description,
            dueDate: formData.dueDate,
            totalMarks: Number.parseInt(formData.totalMarks),
            isActive: selectedAssignment.isActive,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update assignment");
      }

      toast.success("Assignment updated successfully");
      setEditDialogOpen(false);
      setSelectedAssignment(null);
      fetchAssignments();
    } catch (error) {
      console.error("[v0] Error updating assignment:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update assignment",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!confirm("Are you sure you want to delete this assignment?")) return;

    try {
      const response = await fetch(`${apiUrl}/assignments/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete assignment");
      }

      toast.success("Assignment deleted successfully");
      fetchAssignments();
    } catch (error) {
      console.error("[v0] Error deleting assignment:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete assignment",
      );
    }
  };

  const openEditDialog = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setFormData({
      title: assignment.title,
      description: assignment.description,
      course: assignment.course,
      courseCode: assignment.courseCode,
      faculty: assignment.faculty,
      program: assignment.program,
      yearOfStudy: assignment.yearOfStudy.toString(),
      dueDate: new Date(assignment.dueDate).toISOString().split("T")[0],
      totalMarks: assignment.totalMarks.toString(),
    });
    setEditDialogOpen(true);
  };

  const openViewDialog = async (assignment: Assignment) => {
    // Show immediately with what we have, then fetch the fully-populated
    // record (submissions include the student's name/email/studentId).
    setSelectedAssignment(assignment);
    setViewDialogOpen(true);
    setGradeInputs({});
    try {
      setViewLoading(true);
      const response = await fetch(`${apiUrl}/assignments/${assignment._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setSelectedAssignment({
          ...data.data,
          attachments: data.data.attachments ?? [],
          submissions: data.data.submissions ?? [],
        });
        // Seed grade inputs from existing grades.
        const seed: Record<string, { grade: string; feedback: string }> = {};
        (data.data.submissions ?? []).forEach((s: any) => {
          seed[s._id] = {
            grade: s.grade !== undefined && s.grade !== null ? String(s.grade) : "",
            feedback: s.feedback || "",
          };
        });
        setGradeInputs(seed);
      }
    } catch (error) {
      console.error("Failed to load submissions:", error);
      toast.error("Failed to load submissions");
    } finally {
      setViewLoading(false);
    }
  };

  // Fetch a submission file (auth-protected) and open it inline for preview.
  const previewSubmission = async (submissionId: string) => {
    if (!selectedAssignment) return;
    try {
      const response = await fetch(
        `${apiUrl}/assignments/${selectedAssignment._id}/submissions/${submissionId}/file`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!response.ok) {
        let msg = "File not available";
        try {
          const d = await response.json();
          msg = d.message || msg;
        } catch {}
        throw new Error(msg);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to preview file",
      );
    }
  };

  // Fetch a submission file (auth-protected) and trigger a download.
  const downloadSubmission = async (submissionId: string, fileName: string) => {
    if (!selectedAssignment) return;
    try {
      const response = await fetch(
        `${apiUrl}/assignments/${selectedAssignment._id}/submissions/${submissionId}/file?download=1`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!response.ok) {
        let msg = "File not available";
        try {
          const d = await response.json();
          msg = d.message || msg;
        } catch {}
        throw new Error(msg);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName || "submission";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to download file",
      );
    }
  };

  const handleGradeSubmission = async (submissionId: string) => {
    if (!selectedAssignment) return;
    const entry = gradeInputs[submissionId];
    if (!entry || entry.grade === "") {
      toast.error("Please enter a grade");
      return;
    }
    const gradeNum = Number(entry.grade);
    if (
      Number.isNaN(gradeNum) ||
      gradeNum < 0 ||
      gradeNum > selectedAssignment.totalMarks
    ) {
      toast.error(`Grade must be between 0 and ${selectedAssignment.totalMarks}`);
      return;
    }
    try {
      setGradingId(submissionId);
      const response = await fetch(
        `${apiUrl}/assignments/${selectedAssignment._id}/submissions/${submissionId}/grade`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ grade: gradeNum, feedback: entry.feedback }),
        },
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to grade submission");
      }
      toast.success("Submission graded");
      // Reflect the new grade/status locally.
      setSelectedAssignment((prev) =>
        prev
          ? {
              ...prev,
              submissions: prev.submissions.map((s: any) =>
                s._id === submissionId
                  ? { ...s, grade: gradeNum, feedback: entry.feedback, status: "graded" }
                  : s,
              ),
            }
          : prev,
      );
      fetchAssignments();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to grade submission",
      );
    } finally {
      setGradingId(null);
    }
  };

  const getStatusBadge = (assignment: Assignment) => {
    const isPastDue = new Date(assignment.dueDate) < new Date();
    if (!assignment.isActive) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    if (isPastDue) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    return <Badge className="bg-green-600">Active</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Assignments Management</h1>
          <p className="text-muted-foreground">
            Create and manage course assignments
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="size-4 mr-2" />
          Add Assignment
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {assignments.map((assignment) => (
          <Card key={assignment._id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{assignment.title}</CardTitle>
                  <CardDescription>
                    {assignment.course} ({assignment.courseCode})
                  </CardDescription>
                </div>
                {getStatusBadge(assignment)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="size-4 text-muted-foreground" />
                  <span>
                    Due: {new Date(assignment.dueDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="size-4 text-muted-foreground" />
                  <span>{assignment.totalMarks} marks</span>
                </div>
                {assignment.attachments.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Upload className="size-4 text-muted-foreground" />
                    <span>
                      {assignment.attachments.length} file(s) attached
                    </span>
                  </div>
                )}
                <div className="text-sm text-muted-foreground">
                  {assignment.submissions.length} submission(s)
                </div>

                <div className="pt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openViewDialog(assignment)}
                  >
                    <Eye className="size-4 mr-1" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDialog(assignment)}
                  >
                    <Edit className="size-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteAssignment(assignment._id)}
                  >
                    <Trash2 className="size-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Assignment Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Assignment</DialogTitle>
            <DialogDescription>
              Add a new assignment for students. File attachments are optional.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Assignment title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Assignment description and instructions"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="course">Course *</Label>
                <Input
                  id="course"
                  value={formData.course}
                  onChange={(e) =>
                    setFormData({ ...formData, course: e.target.value })
                  }
                  placeholder="e.g., Mathematics"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="courseCode">Course Code *</Label>
                <Input
                  id="courseCode"
                  value={formData.courseCode}
                  onChange={(e) =>
                    setFormData({ ...formData, courseCode: e.target.value })
                  }
                  placeholder="e.g., MATH101"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="faculty">Faculty *</Label>
                <Select
                  value={formData.faculty}
                  onValueChange={(value) =>
                    setFormData({ ...formData, faculty: value, program: "" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select faculty" />
                  </SelectTrigger>
                  <SelectContent>
                    {FACULTY_NAMES.map((faculty) => (
                      <SelectItem key={faculty} value={faculty}>
                        {faculty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="program">Program *</Label>
                {formData.faculty &&
                FACULTY_PROGRAMS[formData.faculty]?.length > 0 ? (
                  <Select
                    value={formData.program}
                    onValueChange={(value) =>
                      setFormData({ ...formData, program: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select program" />
                    </SelectTrigger>
                    <SelectContent>
                      {FACULTY_PROGRAMS[formData.faculty].map((program) => (
                        <SelectItem key={program} value={program}>
                          {program}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="program"
                    value={formData.program}
                    onChange={(e) =>
                      setFormData({ ...formData, program: e.target.value })
                    }
                    placeholder={
                      formData.faculty
                        ? "Enter program"
                        : "Select a faculty first"
                    }
                    disabled={!formData.faculty}
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="yearOfStudy">Year of Study *</Label>
                <Select
                  value={formData.yearOfStudy}
                  onValueChange={(value) =>
                    setFormData({ ...formData, yearOfStudy: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Year 1</SelectItem>
                    <SelectItem value="2">Year 2</SelectItem>
                    <SelectItem value="3">Year 3</SelectItem>
                    <SelectItem value="4">Year 4</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date *</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) =>
                    setFormData({ ...formData, dueDate: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalMarks">Total Marks</Label>
              <Input
                id="totalMarks"
                type="number"
                value={formData.totalMarks}
                onChange={(e) =>
                  setFormData({ ...formData, totalMarks: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="files">Attachments (Optional)</Label>
              <Input
                id="files"
                type="file"
                multiple
                onChange={handleFileSelect}
                accept=".pdf,.jpg,.jpeg,.png,.webp,.gif"
              />
              {selectedFiles.length > 0 && (
                <div className="mt-2 space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-muted rounded"
                    >
                      <span className="text-sm truncate">{file.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFile(index)}
                      >
                        <X className="size-4" />
                      </Button>
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
                setSelectedFiles([]);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddAssignment} disabled={actionLoading}>
              {actionLoading ? "Creating..." : "Create Assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Assignment Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Assignment</DialogTitle>
            <DialogDescription>Update assignment details</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-dueDate">Due Date</Label>
              <Input
                id="edit-dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) =>
                  setFormData({ ...formData, dueDate: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-totalMarks">Total Marks</Label>
              <Input
                id="edit-totalMarks"
                type="number"
                value={formData.totalMarks}
                onChange={(e) =>
                  setFormData({ ...formData, totalMarks: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateAssignment} disabled={actionLoading}>
              {actionLoading ? "Updating..." : "Update Assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Assignment Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedAssignment?.title}</DialogTitle>
            <DialogDescription>Assignment Details</DialogDescription>
          </DialogHeader>

          {selectedAssignment && (
            <div className="space-y-4 py-4">
              <div>
                <Label>Description</Label>
                <p className="text-sm mt-1">{selectedAssignment.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Course</Label>
                  <p className="text-sm mt-1">{selectedAssignment.course}</p>
                </div>
                <div>
                  <Label>Course Code</Label>
                  <p className="text-sm mt-1">
                    {selectedAssignment.courseCode}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Faculty</Label>
                  <p className="text-sm mt-1">{selectedAssignment.faculty}</p>
                </div>
                <div>
                  <Label>Program</Label>
                  <p className="text-sm mt-1">{selectedAssignment.program}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Year of Study</Label>
                  <p className="text-sm mt-1">
                    Year {selectedAssignment.yearOfStudy}
                  </p>
                </div>
                <div>
                  <Label>Total Marks</Label>
                  <p className="text-sm mt-1">
                    {selectedAssignment.totalMarks}
                  </p>
                </div>
              </div>

              <div>
                <Label>Due Date</Label>
                <p className="text-sm mt-1">
                  {new Date(selectedAssignment.dueDate).toLocaleDateString()}
                </p>
              </div>

              {selectedAssignment.attachments.length > 0 && (
                <div>
                  <Label>Attachments</Label>
                  <div className="mt-2 space-y-2">
                    {selectedAssignment.attachments.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 bg-muted rounded"
                      >
                        <FileText className="size-4" />
                        <span className="text-sm">{file.fileName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label>
                  Submissions ({selectedAssignment.submissions.length})
                </Label>

                {viewLoading ? (
                  <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                    Loading submissions...
                  </div>
                ) : selectedAssignment.submissions.length === 0 ? (
                  <p className="text-sm mt-2 text-muted-foreground">
                    No students have submitted yet.
                  </p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {selectedAssignment.submissions.map((sub: any) => {
                      const student = sub.student || {};
                      const studentName =
                        typeof student === "object"
                          ? `${student.firstName || ""} ${student.lastName || ""}`.trim() ||
                            "Unknown Student"
                          : "Unknown Student";
                      const input = gradeInputs[sub._id] || {
                        grade: "",
                        feedback: "",
                      };
                      return (
                        <div
                          key={sub._id}
                          className="rounded-lg border p-3 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold">
                                {studentName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {typeof student === "object" &&
                                  (student.studentId || student.email)}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Submitted:{" "}
                                {sub.submittedAt
                                  ? new Date(sub.submittedAt).toLocaleString()
                                  : "—"}
                              </p>
                            </div>
                            <Badge
                              className={
                                sub.status === "graded"
                                  ? "bg-green-100 text-green-700"
                                  : sub.status === "late"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-blue-100 text-blue-700"
                              }
                            >
                              {sub.status}
                            </Badge>
                          </div>

                          <div className="flex items-center justify-between gap-2 rounded bg-muted p-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="size-4 shrink-0" />
                              <span className="text-sm truncate">
                                {sub.fileName}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => previewSubmission(sub._id)}
                              >
                                <Eye className="size-4 mr-1" />
                                Preview
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  downloadSubmission(sub._id, sub.fileName)
                                }
                              >
                                <Download className="size-4 mr-1" />
                                Download
                              </Button>
                            </div>
                          </div>

                          {/* Grading */}
                          <div className="grid gap-2 sm:grid-cols-[120px_1fr_auto] sm:items-end">
                            <div>
                              <Label className="text-xs">
                                Grade / {selectedAssignment.totalMarks}
                              </Label>
                              <Input
                                type="number"
                                min={0}
                                max={selectedAssignment.totalMarks}
                                value={input.grade}
                                onChange={(e) =>
                                  setGradeInputs((prev) => ({
                                    ...prev,
                                    [sub._id]: {
                                      ...input,
                                      grade: e.target.value,
                                    },
                                  }))
                                }
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Feedback</Label>
                              <Input
                                value={input.feedback}
                                onChange={(e) =>
                                  setGradeInputs((prev) => ({
                                    ...prev,
                                    [sub._id]: {
                                      ...input,
                                      feedback: e.target.value,
                                    },
                                  }))
                                }
                                placeholder="Optional feedback"
                              />
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleGradeSubmission(sub._id)}
                              disabled={gradingId === sub._id}
                            >
                              {gradingId === sub._id
                                ? "Saving..."
                                : sub.status === "graded"
                                  ? "Update"
                                  : "Grade"}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

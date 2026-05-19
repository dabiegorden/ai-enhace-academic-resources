"use client";

import { useState, useEffect, Suspense } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  FileText,
  Download,
  Eye,
  Sparkles,
  MessageSquare,
  BookOpen,
  Search,
  Loader2,
  X,
  GraduationCap,
  BookMarked,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";

interface LectureNote {
  _id: string;
  title: string;
  description: string;
  course: string;
  courseCode: string;
  faculty: string;
  program: string;
  yearOfStudy: number;
  filename: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  uploadedBy: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  aiSummary?: string;
  downloads: number;
  views: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface EnrollmentInfo {
  faculty: string;
  program: string;
  yearOfStudy: number;
}

function StudentsViewLectureNotes() {
  const [notes, setNotes] = useState<LectureNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [courseCodeFilter, setCourseCodeFilter] = useState("");
  const [enrollment, setEnrollment] = useState<EnrollmentInfo | null>(null);
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null);

  const [selectedNote, setSelectedNote] = useState<LectureNote | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [explainDialogOpen, setExplainDialogOpen] = useState(false);

  const [aiSummary, setAiSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [concept, setConcept] = useState("");
  const [explanation, setExplanation] = useState("");

  // Group notes by course code for organised display
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(
    new Set(),
  );

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.get("search") || "";
    setSearchQuery(query);
  }, [searchParams]);

  useEffect(() => {
    fetchNotes();
  }, [courseCodeFilter]);

  // Cleanup preview URL when dialog closes
  useEffect(() => {
    if (!previewDialogOpen && previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [previewDialogOpen, previewUrl]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      setEnrollmentError(null);

      const params = new URLSearchParams();
      if (courseCodeFilter) params.append("courseCode", courseCodeFilter);

      // Always use /my-notes — the backend strictly filters by the student's
      // enrolled faculty, program, and year of study
      const response = await fetch(
        `${apiUrl}/notes/my-notes?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        // 400 means the student's profile is missing enrollment info
        if (response.status === 400) {
          setEnrollmentError(data.message);
        } else {
          toast.error(data.message || "Failed to fetch lecture notes");
        }
        setNotes([]);
        return;
      }

      if (data.success) {
        setNotes(data.data || []);
        // Store enrollment context returned by the backend
        if (data.enrollment) {
          setEnrollment(data.enrollment);
        }
        // Auto-expand all course groups on first load
        if (data.data?.length > 0) {
          const codes = new Set<string>(
            data.data.map((n: LectureNote) => n.courseCode),
          );
          setExpandedCourses(codes);
        }
      } else {
        toast.error(data.message || "Failed to fetch lecture notes");
      }
    } catch (error) {
      toast.error("Failed to fetch lecture notes");
      console.error("[notes] Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => fetchNotes();

  const handleClearFilters = () => {
    setCourseCodeFilter("");
    setSearchQuery("");
  };

  // ─── Preview ────────────────────────────────────────────────────────────────
  const handlePreview = async (note: LectureNote) => {
    setSelectedNote(note);
    setPreviewDialogOpen(true);
    setPreviewLoading(true);
    setPreviewUrl(null);
    try {
      const response = await fetch(`${apiUrl}/notes/${note._id}/preview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to load preview");
      const blob = await response.blob();
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (error) {
      console.error("[notes] Preview error:", error);
      toast.error("Failed to load preview");
    } finally {
      setPreviewLoading(false);
    }
  };

  // ─── Download ───────────────────────────────────────────────────────────────
  const handleDownload = async (noteId: string, originalName: string) => {
    try {
      const response = await fetch(`${apiUrl}/notes/${noteId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        const link = document.createElement("a");
        link.href = data.data.fileUrl;
        link.download = data.data.filename || originalName;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Download started");
        fetchNotes();
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast.error("Failed to download file");
      console.error("[notes] Download error:", error);
    }
  };

  // ─── AI: Summarise ───────────────────────────────────────────────────────────
  const handleSummarize = async (note: LectureNote) => {
    setSelectedNote(note);
    setAiDialogOpen(true);
    if (note.aiSummary) {
      setAiSummary(note.aiSummary);
      return;
    }
    try {
      setAiLoading(true);
      setAiSummary("");
      const response = await fetch(`${apiUrl}/ai/summarize-note/${note._id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      if (data.success) {
        setAiSummary(data.data.summary);
        toast.success("Summary generated successfully");
        fetchNotes();
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast.error("Failed to generate summary");
    } finally {
      setAiLoading(false);
    }
  };

  // ─── AI: Ask question ────────────────────────────────────────────────────────
  const handleAskQuestion = async () => {
    if (!question.trim()) {
      toast.error("Please enter a question");
      return;
    }
    try {
      setAiLoading(true);
      setAnswer("");
      const response = await fetch(`${apiUrl}/ai/answer-question`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question, lectureNoteId: selectedNote?._id }),
      });
      const data = await response.json();
      if (data.success) {
        setAnswer(data.data.answer);
        toast.success("Question answered");
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast.error("Failed to get answer");
    } finally {
      setAiLoading(false);
    }
  };

  // ─── AI: Explain concept ─────────────────────────────────────────────────────
  const handleExplainConcept = async () => {
    if (!concept.trim()) {
      toast.error("Please enter a concept");
      return;
    }
    try {
      setAiLoading(true);
      setExplanation("");
      const response = await fetch(`${apiUrl}/ai/explain-concept`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ concept, level: "Undergraduate" }),
      });
      const data = await response.json();
      if (data.success) {
        setExplanation(data.data.explanation);
        toast.success("Concept explained");
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast.error("Failed to explain concept");
    } finally {
      setAiLoading(false);
    }
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const toggleCourse = (code: string) => {
    setExpandedCourses((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  };

  // Client-side keyword search applied on top of the already-filtered notes
  const filteredNotes = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.course.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.description || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase()),
  );

  // Group filtered notes by courseCode for organised display
  const notesByCourse = filteredNotes.reduce<Record<string, LectureNote[]>>(
    (acc, note) => {
      const key = note.courseCode;
      if (!acc[key]) acc[key] = [];
      acc[key].push(note);
      return acc;
    },
    {},
  );

  const uniqueCourseCodes = Object.keys(notesByCourse).sort();

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <div className="space-y-6 p-6 max-w-7xl mx-auto">
        {/* ── Page header ── */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Lecture Notes</h1>
          <p className="text-muted-foreground">
            Study materials for your enrolled courses
          </p>
        </div>

        {/* ── Enrollment context banner ── */}
        {enrollment && (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800">
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-wrap items-center gap-3">
                <GraduationCap className="size-5 text-green-700 dark:text-green-400 shrink-0" />
                <span className="text-sm font-semibold text-green-900 dark:text-green-300">
                  Showing notes for your enrollment:
                </span>
                <Badge
                  variant="outline"
                  className="border-green-400 text-green-800 dark:text-green-300"
                >
                  {enrollment.faculty}
                </Badge>
                <Badge
                  variant="outline"
                  className="border-green-400 text-green-800 dark:text-green-300"
                >
                  {enrollment.program}
                </Badge>
                <Badge
                  variant="outline"
                  className="border-green-400 text-green-800 dark:text-green-300"
                >
                  Year {enrollment.yearOfStudy}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Enrollment error banner ── */}
        {enrollmentError && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="size-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                    Enrollment information missing
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-400 mt-0.5">
                    {enrollmentError}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Search & course-code filter ── */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search notes by title, course, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-10"
            />
          </div>
          <div className="relative sm:w-56">
            <BookMarked className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Filter by course code..."
              value={courseCodeFilter}
              onChange={(e) => setCourseCodeFilter(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchNotes()}
              className="pl-10"
            />
          </div>
          {(searchQuery || courseCodeFilter) && (
            <Button variant="ghost" onClick={handleClearFilters} size="icon">
              <X className="size-4" />
            </Button>
          )}
          <Button onClick={handleSearch}>Search</Button>
        </div>

        {/* ── AI info strip ── */}
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="size-5 text-blue-600" />
              <span className="font-semibold text-blue-900 dark:text-blue-300 text-sm">
                AI-Powered Study Tools
              </span>
            </div>
            <p className="text-sm text-blue-800 dark:text-blue-400">
              Summarise notes, ask questions about lecture content, and get
              concepts explained in simple terms!
            </p>
          </CardContent>
        </Card>

        {/* ── Main content ── */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : enrollmentError ? null : filteredNotes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-14">
              <FileText className="size-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center font-medium">
                {searchQuery || courseCodeFilter
                  ? "No notes match your search."
                  : "No lecture notes have been uploaded for your courses yet."}
              </p>
              {(searchQuery || courseCodeFilter) && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={handleClearFilters}
                >
                  Clear filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {filteredNotes.length} note
              {filteredNotes.length !== 1 ? "s" : ""} across{" "}
              {uniqueCourseCodes.length} course
              {uniqueCourseCodes.length !== 1 ? "s" : ""}
            </p>

            {/* ── Grouped by course code ── */}
            <div className="space-y-4">
              {uniqueCourseCodes.map((code) => {
                const courseNotes = notesByCourse[code];
                const isExpanded = expandedCourses.has(code);
                const courseName = courseNotes[0]?.course ?? code;

                return (
                  <div
                    key={code}
                    className="border rounded-xl overflow-hidden bg-card"
                  >
                    {/* Course group header */}
                    <button
                      onClick={() => toggleCourse(code)}
                      className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <BookMarked className="size-5 text-primary shrink-0" />
                        <div>
                          <p className="font-semibold text-foreground">
                            {courseName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {code} &middot; {courseNotes.length} note
                            {courseNotes.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="size-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="size-4 text-muted-foreground" />
                      )}
                    </button>

                    {/* Note cards */}
                    {isExpanded && (
                      <div className="p-4 pt-0 grid gap-4 md:grid-cols-2 lg:grid-cols-3 border-t">
                        {courseNotes.map((note) => (
                          <NoteCard
                            key={note._id}
                            note={note}
                            onPreview={handlePreview}
                            onDownload={handleDownload}
                            onSummarise={handleSummarize}
                            onView={(n) => {
                              setSelectedNote(n);
                              setViewDialogOpen(true);
                            }}
                            formatFileSize={formatFileSize}
                            formatDate={formatDate}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ════════════════════════ DIALOGS ════════════════════════ */}

        {/* Preview */}
        <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
          <DialogContent className="max-w-5xl h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="size-5" />
                {selectedNote?.title}
              </DialogTitle>
              <DialogDescription>
                {selectedNote?.course} ({selectedNote?.courseCode}) &mdash;{" "}
                {selectedNote?.originalName}
              </DialogDescription>
            </DialogHeader>
            {selectedNote && (
              <div className="flex-1 h-full min-h-0">
                {previewLoading ? (
                  <div className="flex items-center justify-center h-[calc(90vh-120px)]">
                    <Loader2 className="size-8 animate-spin text-muted-foreground" />
                  </div>
                ) : selectedNote.fileType === "pdf" && previewUrl ? (
                  <iframe
                    src={previewUrl}
                    className="w-full h-[calc(90vh-120px)] rounded-lg border"
                    title={selectedNote.title}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-[calc(90vh-120px)] bg-muted rounded-lg">
                    <FileText className="size-16 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      {selectedNote.fileType === "pdf"
                        ? "Loading preview..."
                        : `Preview not available for ${selectedNote.fileType.toUpperCase()} files`}
                    </p>
                    <Button
                      onClick={() =>
                        handleDownload(
                          selectedNote._id,
                          selectedNote.originalName,
                        )
                      }
                    >
                      <Download className="size-4 mr-2" />
                      Download to View
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* View details */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedNote?.title}</DialogTitle>
              <DialogDescription>
                {selectedNote?.course} ({selectedNote?.courseCode})
              </DialogDescription>
            </DialogHeader>
            {selectedNote && (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold">Description</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedNote.description || "No description provided"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-semibold">Faculty</Label>
                    <p className="text-sm mt-1">{selectedNote.faculty}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Program</Label>
                    <p className="text-sm mt-1">{selectedNote.program}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">
                      Year of Study
                    </Label>
                    <p className="text-sm mt-1">
                      Year {selectedNote.yearOfStudy}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">File Type</Label>
                    <p className="text-sm mt-1">
                      {selectedNote.fileType.toUpperCase()}
                    </p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Uploaded By</Label>
                  <p className="text-sm mt-1">
                    {selectedNote.uploadedBy?.firstName || "Unknown"}{" "}
                    {selectedNote.uploadedBy?.lastName || ""} (
                    {selectedNote.uploadedBy?.role || "N/A"})
                  </p>
                </div>
                {selectedNote.tags && selectedNote.tags.length > 0 && (
                  <div>
                    <Label className="text-sm font-semibold">Tags</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedNote.tags.map((tag, i) => (
                        <Badge key={i} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-4">
                  <Button onClick={() => handlePreview(selectedNote)}>
                    <Eye className="size-4 mr-2" />
                    Preview File
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      handleDownload(
                        selectedNote._id,
                        selectedNote.originalName,
                      )
                    }
                  >
                    <Download className="size-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setViewDialogOpen(false);
                      handleSummarize(selectedNote);
                    }}
                  >
                    <Sparkles className="size-4 mr-2" />
                    AI Summary
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setQuestionDialogOpen(true);
                      setQuestion("");
                      setAnswer("");
                    }}
                  >
                    <MessageSquare className="size-4 mr-2" />
                    Ask Question
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setExplainDialogOpen(true);
                      setConcept("");
                      setExplanation("");
                    }}
                  >
                    <BookOpen className="size-4 mr-2" />
                    Explain Concept
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* AI Summary */}
        <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="size-5 text-blue-600" />
                AI-Generated Summary
              </DialogTitle>
              <DialogDescription>{selectedNote?.title}</DialogDescription>
            </DialogHeader>
            {aiLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="size-8 animate-spin text-blue-600 mb-4" />
                <p className="text-sm text-muted-foreground">
                  Generating summary with AI...
                </p>
              </div>
            ) : aiSummary ? (
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="whitespace-pre-wrap text-blue-900 dark:text-blue-200 text-sm">
                  {aiSummary}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No summary available yet.
              </p>
            )}
          </DialogContent>
        </Dialog>

        {/* Ask Question */}
        <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="size-5 text-blue-600" />
                Ask a Question
              </DialogTitle>
              <DialogDescription>
                Get AI-powered answers about {selectedNote?.title}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Your Question</Label>
                <Textarea
                  placeholder="Ask anything about this lecture note..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows={3}
                />
              </div>
              <Button
                onClick={handleAskQuestion}
                disabled={aiLoading || !question.trim()}
                className="w-full"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Getting Answer...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4 mr-2" />
                    Get AI Answer
                  </>
                )}
              </Button>
              {answer && (
                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <Label className="text-green-900 dark:text-green-300 font-semibold">
                    Answer:
                  </Label>
                  <p className="whitespace-pre-wrap text-green-900 dark:text-green-200 text-sm mt-2">
                    {answer}
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Explain Concept */}
        <Dialog open={explainDialogOpen} onOpenChange={setExplainDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="size-5 text-blue-600" />
                Explain a Concept
              </DialogTitle>
              <DialogDescription>
                Get simple explanations of complex concepts
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Concept to Explain</Label>
                <Input
                  placeholder="Enter a concept you want explained..."
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                />
              </div>
              <Button
                onClick={handleExplainConcept}
                disabled={aiLoading || !concept.trim()}
                className="w-full"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Explaining...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4 mr-2" />
                    Get Explanation
                  </>
                )}
              </Button>
              {explanation && (
                <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                  <Label className="text-purple-900 dark:text-purple-300 font-semibold">
                    Explanation:
                  </Label>
                  <p className="whitespace-pre-wrap text-purple-900 dark:text-purple-200 text-sm mt-2">
                    {explanation}
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// ─── Extracted NoteCard component ─────────────────────────────────────────────
interface NoteCardProps {
  note: LectureNote;
  onPreview: (note: LectureNote) => void;
  onDownload: (id: string, name: string) => void;
  onSummarise: (note: LectureNote) => void;
  onView: (note: LectureNote) => void;
  formatFileSize: (b: number) => string;
  formatDate: (d: string) => string;
}

function NoteCard({
  note,
  onPreview,
  onDownload,
  onSummarise,
  onView,
  formatFileSize,
  formatDate,
}: NoteCardProps) {
  return (
    <Card className="flex flex-col hover:shadow-md transition-shadow mt-4">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-muted-foreground" />
            <Badge variant="secondary" className="text-xs">
              {note.fileType.toUpperCase()}
            </Badge>
          </div>
          {note.aiSummary && (
            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 text-xs">
              <Sparkles className="size-3 mr-1" />
              AI
            </Badge>
          )}
        </div>
        <CardTitle className="line-clamp-2 text-base mt-2">
          {note.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        {note.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {note.description}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {note.uploadedBy?.firstName || "Unknown"}{" "}
            {note.uploadedBy?.lastName || ""}
          </span>
          <span>{formatFileSize(note.fileSize)}</span>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Eye className="size-3" /> {note.views}
            </span>
            <span className="flex items-center gap-1">
              <Download className="size-3" /> {note.downloads}
            </span>
          </div>
          <span>{formatDate(note.createdAt)}</span>
        </div>

        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {note.tags.map((tag, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="pt-2 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => onView(note)}>
            <Eye className="size-3 mr-1" />
            Details
          </Button>
          <Button size="sm" variant="outline" onClick={() => onPreview(note)}>
            <FileText className="size-3 mr-1" />
            Preview
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDownload(note._id, note.originalName)}
          >
            <Download className="size-3 mr-1" />
            Download
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-blue-600 border-blue-300 hover:bg-blue-50 bg-transparent dark:text-blue-400 dark:border-blue-700 dark:hover:bg-blue-950/30"
            onClick={() => onSummarise(note)}
          >
            <Sparkles className="size-3 mr-1" />
            AI
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function StudentDocsPage() {
  return (
    <Suspense>
      <StudentsViewLectureNotes />
    </Suspense>
  );
}

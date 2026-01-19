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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Download,
  Eye,
  Sparkles,
  MessageSquare,
  BookOpen,
  Search,
  Loader2,
  Filter,
  X,
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

function StudentsViewLectureNotes() {
  const [notes, setNotes] = useState<LectureNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNote, setSelectedNote] = useState<LectureNote | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [explainDialogOpen, setExplainDialogOpen] = useState(false);

  // Filter states
  const [facultyFilter, setFacultyFilter] = useState("");
  const [programFilter, setProgramFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");

  const [aiSummary, setAiSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const [concept, setConcept] = useState("");
  const [explanation, setExplanation] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
  const baseUrl = apiUrl.replace("/api", "");
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.get("search") || "";
    setSearchQuery(query);
  }, [searchParams]);

  useEffect(() => {
    fetchNotes();
  }, [facultyFilter, programFilter, yearFilter]);

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

      // Build query params - use getAllLectureNotes endpoint instead of my-notes
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (facultyFilter) params.append("faculty", facultyFilter);
      if (programFilter) params.append("program", programFilter);
      if (yearFilter) params.append("yearOfStudy", yearFilter);

      const response = await fetch(`${apiUrl}/notes?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      console.log("[v0] API Response:", data);

      if (data.success) {
        setNotes(data.data || []);
      } else {
        console.log("[v0] API Error:", data.message);
        toast.error(data.message || "Failed to fetch lecture notes");
      }
    } catch (error) {
      toast.error("Failed to fetch lecture notes");
      console.error("[v0] Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchNotes();
  };

  const handleClearFilters = () => {
    setFacultyFilter("");
    setProgramFilter("");
    setYearFilter("");
    setSearchQuery("");
  };

  const handleViewNote = (note: LectureNote) => {
    setSelectedNote(note);
    setViewDialogOpen(true);
  };

  const handlePreview = async (note: LectureNote) => {
    setSelectedNote(note);
    setPreviewDialogOpen(true);
    setPreviewLoading(true);
    setPreviewUrl(null);

    try {
      // Fetch the file as a blob with authorization header
      const response = await fetch(`${apiUrl}/notes/${note._id}/preview`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load preview");
      }

      // Create a blob URL for the iframe
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (error) {
      console.error("[v0] Preview error:", error);
      toast.error("Failed to load preview");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownload = async (noteId: string, originalName: string) => {
    try {
      // Call the download endpoint to increment count and get file URL
      const response = await fetch(`${apiUrl}/notes/${noteId}/download`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      console.log("[v0] Download response:", data);

      if (data.success) {
        // Use the fileUrl from the API response
        const downloadUrl = data.data.fileUrl;
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = data.data.filename || originalName;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success("Download started");
        fetchNotes(); // Refresh to update download count
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast.error("Failed to download file");
      console.error("[v0] Download error:", error);
    }
  };

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
        fetchNotes(); // Refresh to get updated note with summary
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast.error("Failed to generate summary");
      console.error("[v0] Summary error:", error);
    } finally {
      setAiLoading(false);
    }
  };

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
        body: JSON.stringify({
          question,
          lectureNoteId: selectedNote?._id,
        }),
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
      console.error("[v0] Question error:", error);
    } finally {
      setAiLoading(false);
    }
  };

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
        body: JSON.stringify({
          concept,
          level: "Undergraduate",
        }),
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
      console.error("[v0] Explain error:", error);
    } finally {
      setAiLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Get unique values for filters
  const faculties = [...new Set(notes.map((note) => note.faculty))];
  const programs = [...new Set(notes.map((note) => note.program))];
  const years = [...new Set(notes.map((note) => note.yearOfStudy))].sort();

  const filteredNotes = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.course.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.courseCode.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="space-y-6 p-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Lecture Notes</h1>
          <p className="text-muted-foreground">
            Access and study lecture materials for your courses
          </p>
        </div>

        {/* Search Bar */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, course, or course code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-10"
            />
          </div>
          <Button onClick={handleSearch}>Search</Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="size-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-50">
                <Label className="text-sm mb-1.5 block">Faculty</Label>
                <Select value={facultyFilter} onValueChange={setFacultyFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Faculties" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Faculties</SelectItem>
                    {faculties.map((faculty) => (
                      <SelectItem key={faculty} value={faculty}>
                        {faculty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-50">
                <Label className="text-sm mb-1.5 block">Program</Label>
                <Select value={programFilter} onValueChange={setProgramFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Programs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Programs</SelectItem>
                    {programs.map((program) => (
                      <SelectItem key={program} value={program}>
                        {program}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-37.5">
                <Label className="text-sm mb-1.5 block">Year of Study</Label>
                <Select value={yearFilter} onValueChange={setYearFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {years.map((year) => (
                      <SelectItem key={year} value={String(year)}>
                        Year {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(facultyFilter ||
                programFilter ||
                yearFilter ||
                searchQuery) && (
                <div className="flex items-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                  >
                    <X className="size-4 mr-1" />
                    Clear
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* AI Features Info */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="size-5 text-blue-600" />
              <h3 className="font-semibold text-blue-900">
                AI-Powered Study Tools
              </h3>
            </div>
            <p className="text-sm text-blue-800">
              Use AI to summarize notes, ask questions about lecture content,
              and get concepts explained in simple terms!
            </p>
          </CardContent>
        </Card>

        {/* Notes Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredNotes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="size-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                No lecture notes found. Try adjusting your search or filters.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Showing {filteredNotes.length} lecture note
              {filteredNotes.length !== 1 ? "s" : ""}
            </p>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredNotes.map((note) => (
                <Card
                  key={note._id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4" />
                        <Badge variant="secondary">
                          {note.fileType.toUpperCase()}
                        </Badge>
                      </div>
                      {note.aiSummary && (
                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">
                          <Sparkles className="size-3 mr-1" />
                          AI
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="line-clamp-2">{note.title}</CardTitle>
                    <CardDescription>
                      <span className="font-medium">{note.course}</span> (
                      {note.courseCode})
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {note.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {note.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-xs">
                        {note.faculty}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {note.program}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Year {note.yearOfStudy}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        By {note.uploadedBy?.firstName || "Unknown"}{" "}
                        {note.uploadedBy?.lastName || ""}
                      </span>
                      <span>{formatFileSize(note.fileSize)}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Eye className="size-3" /> {note.views}
                        </span>
                        <span className="flex items-center gap-1">
                          <Download className="size-3" /> {note.downloads}
                        </span>
                      </div>
                      <span>{formatDate(note.createdAt)}</span>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePreview(note)}
                      >
                        <Eye className="size-4 mr-1" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleDownload(note._id, note.originalName)
                        }
                      >
                        <Download className="size-4 mr-1" />
                        Download
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-blue-600 border-blue-300 hover:bg-blue-50 bg-transparent"
                        onClick={() => handleSummarize(note)}
                      >
                        <Sparkles className="size-4 mr-1" />
                        AI Summary
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Preview Dialog */}
        <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
          <DialogContent className="max-w-5xl h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="size-5" />
                {selectedNote?.title}
              </DialogTitle>
              <DialogDescription>
                {selectedNote?.course} ({selectedNote?.courseCode}) -{" "}
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
                    <div className="flex gap-2">
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
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* View Note Details Dialog */}
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
                      {selectedNote.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary">
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
                    Download File
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

        {/* AI Summary Dialog */}
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
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap text-blue-900">
                      {aiSummary}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No summary available yet. Click "Generate Summary" to create
                one.
              </p>
            )}
          </DialogContent>
        </Dialog>

        {/* Ask Question Dialog */}
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
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                  <Label className="text-green-900 font-semibold">
                    Answer:
                  </Label>
                  <div className="prose prose-sm max-w-none mt-2">
                    <p className="whitespace-pre-wrap text-green-900">
                      {answer}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Explain Concept Dialog */}
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
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-4">
                  <Label className="text-purple-900 font-semibold">
                    Explanation:
                  </Label>
                  <div className="prose prose-sm max-w-none mt-2">
                    <p className="whitespace-pre-wrap text-purple-900">
                      {explanation}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default function StudentDocsPage() {
  return (
    <Suspense>
      <StudentsViewLectureNotes />
    </Suspense>
  );
}

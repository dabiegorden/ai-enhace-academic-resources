"use client";

import { useState, useEffect, Suspense, useRef } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Brain,
  Lightbulb,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Trophy,
  Target,
  ListChecks,
  BookOpenCheck,
  Compass,
  ArrowRight,
  Timer,
} from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuizQuestion {
  question: string;
  type: "multiple-choice" | "true-false" | "short-answer";
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  points: number;
}

interface AiQuiz {
  questions: QuizQuestion[];
  generatedAt: string;
  difficulty: string;
}

interface AiRecommendations {
  content: string;
  relatedTopics: string[];
  studyTips: string[];
  prerequisites: string[];
  furtherReading: string[];
  generatedAt: string;
}

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
  aiQuiz?: AiQuiz;
  aiRecommendations?: AiRecommendations;
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

// ─── Quiz State ───────────────────────────────────────────────────────────────

interface QuizState {
  currentIndex: number;
  answers: Record<number, string>;
  submitted: boolean;
  score: number;
  totalPoints: number;
  earnedPoints: number;
  startTime: number;
  endTime?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Strips leftover Markdown syntax (#, **, _, backticks, links, etc.) from
 * AI-generated text so older cached summaries also render as clean plain text.
 */
const stripMarkdown = (text: string) =>
  text
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```/g, ""))
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/^[ \t]*[-*+]\s+/gm, "• ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

// ─── Main Component ───────────────────────────────────────────────────────────

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

  // AI dialogs
  const [aiSummaryDialogOpen, setAiSummaryDialogOpen] = useState(false);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [explainDialogOpen, setExplainDialogOpen] = useState(false);
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [recommendationsDialogOpen, setRecommendationsDialogOpen] =
    useState(false);

  // AI data
  const [aiSummary, setAiSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [concept, setConcept] = useState("");
  const [explanation, setExplanation] = useState("");

  // Quiz
  const [quizData, setQuizData] = useState<AiQuiz | null>(null);
  const [quizState, setQuizState] = useState<QuizState | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);

  // Recommendations
  const [recommendations, setRecommendations] =
    useState<AiRecommendations | null>(null);
  const [recLoading, setRecLoading] = useState(false);

  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(
    new Set(),
  );

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
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

  useEffect(() => {
    if (!previewDialogOpen && previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [previewDialogOpen]);

  // ─── Fetch notes ─────────────────────────────────────────────────────────────

  const fetchNotes = async () => {
    try {
      setLoading(true);
      setEnrollmentError(null);
      const params = new URLSearchParams();
      if (courseCodeFilter) params.append("courseCode", courseCodeFilter);

      const response = await fetch(
        `${apiUrl}/notes/my-notes?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 400) setEnrollmentError(data.message);
        else toast.error(data.message || "Failed to fetch lecture notes");
        setNotes([]);
        return;
      }

      if (data.success) {
        setNotes(data.data || []);
        if (data.enrollment) setEnrollment(data.enrollment);
        if (data.data?.length > 0) {
          const codes = new Set<string>(
            data.data.map((n: LectureNote) => n.courseCode),
          );
          setExpandedCourses(codes);
        }
      }
    } catch {
      toast.error("Failed to fetch lecture notes");
    } finally {
      setLoading(false);
    }
  };

  // ─── Preview ──────────────────────────────────────────────────────────────────

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
    } catch {
      toast.error("Failed to load preview");
    } finally {
      setPreviewLoading(false);
    }
  };

  // ─── Download ─────────────────────────────────────────────────────────────────

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
      } else throw new Error(data.message);
    } catch {
      toast.error("Failed to download file");
    }
  };

  // ─── AI: Summarise ────────────────────────────────────────────────────────────

  const handleSummarize = async (note: LectureNote) => {
    setSelectedNote(note);
    setAiSummaryDialogOpen(true);
    if (note.aiSummary) {
      setAiSummary(stripMarkdown(note.aiSummary));
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
        setAiSummary(stripMarkdown(data.data.summary));
        toast.success("Summary generated");
        fetchNotes();
      } else throw new Error(data.message);
    } catch {
      toast.error("Failed to generate summary");
    } finally {
      setAiLoading(false);
    }
  };

  // ─── AI: Ask question ─────────────────────────────────────────────────────────

  const handleAskQuestion = async () => {
    if (!question.trim()) return toast.error("Please enter a question");
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
      } else throw new Error(data.message);
    } catch {
      toast.error("Failed to get answer");
    } finally {
      setAiLoading(false);
    }
  };

  // ─── AI: Explain concept ──────────────────────────────────────────────────────

  const handleExplainConcept = async () => {
    if (!concept.trim()) return toast.error("Please enter a concept");
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
      if (data.success) setExplanation(data.data.explanation);
      else throw new Error(data.message);
    } catch {
      toast.error("Failed to explain concept");
    } finally {
      setAiLoading(false);
    }
  };

  // ─── AI: Generate Quiz ────────────────────────────────────────────────────────

  const handleGenerateQuiz = async (note: LectureNote, force = false) => {
    setSelectedNote(note);
    setQuizDialogOpen(true);
    setQuizState(null);

    // Use cached quiz if available and not forcing regeneration
    if (!force && note.aiQuiz?.questions?.length) {
      setQuizData(note.aiQuiz);
      return;
    }

    try {
      setQuizLoading(true);
      setQuizData(null);
      const response = await fetch(`${apiUrl}/ai/generate-quiz/${note._id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          numberOfQuestions: 10,
          difficulty: "mixed",
          questionTypes: ["multiple-choice", "true-false", "short-answer"],
          force,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setQuizData(data.data.quiz);
        toast.success(
          `Quiz ready — ${data.data.quiz.questions.length} questions`,
        );
        fetchNotes();
      } else throw new Error(data.message);
    } catch {
      toast.error("Failed to generate quiz");
    } finally {
      setQuizLoading(false);
    }
  };

  const startQuiz = () => {
    if (!quizData) return;
    const totalPoints = quizData.questions.reduce(
      (s, q) => s + (q.points || 1),
      0,
    );
    setQuizState({
      currentIndex: 0,
      answers: {},
      submitted: false,
      score: 0,
      totalPoints,
      earnedPoints: 0,
      startTime: Date.now(),
    });
  };

  const answerQuestion = (answer: string) => {
    if (!quizState || quizState.submitted) return;
    setQuizState((prev) => ({
      ...prev!,
      answers: { ...prev!.answers, [prev!.currentIndex]: answer },
    }));
  };

  const nextQuestion = () => {
    if (!quizState || !quizData) return;
    if (quizState.currentIndex < quizData.questions.length - 1) {
      setQuizState((prev) => ({
        ...prev!,
        currentIndex: prev!.currentIndex + 1,
      }));
    }
  };

  const prevQuestion = () => {
    if (!quizState) return;
    if (quizState.currentIndex > 0) {
      setQuizState((prev) => ({
        ...prev!,
        currentIndex: prev!.currentIndex - 1,
      }));
    }
  };

  const submitQuiz = () => {
    if (!quizState || !quizData) return;
    let earnedPoints = 0;
    let correctCount = 0;
    quizData.questions.forEach((q, i) => {
      const userAnswer = quizState.answers[i] || "";
      const isCorrect =
        q.type === "short-answer"
          ? userAnswer.trim().length > 0
          : userAnswer.trim().toLowerCase() ===
            q.correctAnswer.trim().toLowerCase();
      if (isCorrect) {
        earnedPoints += q.points || 1;
        correctCount++;
      }
    });
    const score = Math.round((correctCount / quizData.questions.length) * 100);
    setQuizState((prev) => ({
      ...prev!,
      submitted: true,
      score,
      earnedPoints,
      endTime: Date.now(),
    }));
  };

  // ─── AI: Recommendations ──────────────────────────────────────────────────────

  const handleGetRecommendations = async (note: LectureNote, force = false) => {
    setSelectedNote(note);
    setRecommendationsDialogOpen(true);

    if (!force && note.aiRecommendations?.content) {
      setRecommendations(note.aiRecommendations);
      return;
    }

    try {
      setRecLoading(true);
      setRecommendations(null);
      const response = await fetch(
        `${apiUrl}/ai/note-recommendations/${note._id}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ force }),
        },
      );
      const data = await response.json();
      if (data.success) {
        setRecommendations(data.data.recommendations);
        toast.success("Recommendations ready");
        fetchNotes();
      } else throw new Error(data.message);
    } catch {
      toast.error("Failed to generate recommendations");
    } finally {
      setRecLoading(false);
    }
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "—";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
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

  const filteredNotes = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.course.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.description || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase()),
  );

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
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Lecture Notes</h1>
          <p className="text-muted-foreground">
            Study materials for your enrolled courses
          </p>
        </div>

        {/* Enrollment banner */}
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

        {/* Enrollment error */}
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

        {/* Search bar */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search notes by title, course, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchNotes()}
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
            <Button
              variant="ghost"
              onClick={() => {
                setCourseCodeFilter("");
                setSearchQuery("");
              }}
              size="icon"
            >
              <X className="size-4" />
            </Button>
          )}
          <Button onClick={fetchNotes}>Search</Button>
        </div>

        {/* AI tools banner */}
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="size-5 text-blue-600" />
              <span className="font-semibold text-blue-900 dark:text-blue-300 text-sm">
                AI-Powered Study Tools
              </span>
            </div>
            <p className="text-sm text-blue-800 dark:text-blue-400">
              Summarise notes, take AI-generated quizzes, get study
              recommendations, ask questions, and have concepts explained!
            </p>
          </CardContent>
        </Card>

        {/* Content */}
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
                  onClick={() => {
                    setCourseCodeFilter("");
                    setSearchQuery("");
                  }}
                >
                  Clear filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {filteredNotes.length} note{filteredNotes.length !== 1 ? "s" : ""}{" "}
              across {uniqueCourseCodes.length} course
              {uniqueCourseCodes.length !== 1 ? "s" : ""}
            </p>
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
                            onQuiz={handleGenerateQuiz}
                            onRecommendations={handleGetRecommendations}
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

        {/* ══════════════════════ DIALOGS ══════════════════════════ */}

        {/* Preview dialog */}
        <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
          <DialogContent className="max-w-5xl h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="size-5" />
                {selectedNote?.title}
              </DialogTitle>
              <DialogDescription>
                {selectedNote?.course} ({selectedNote?.courseCode}) —{" "}
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
                ) : previewUrl &&
                  ["jpg", "jpeg", "png", "webp", "gif"].includes(
                    selectedNote.fileType,
                  ) ? (
                  <div className="flex items-center justify-center h-[calc(90vh-120px)] bg-muted rounded-lg overflow-auto">
                    <img
                      src={previewUrl}
                      alt={selectedNote.title}
                      className="max-w-full max-h-full object-contain rounded"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[calc(90vh-120px)] bg-muted rounded-lg">
                    <FileText className="size-16 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      Preview not available
                    </p>
                    <Button
                      onClick={() =>
                        handleDownload(
                          selectedNote._id,
                          selectedNote.originalName,
                        )
                      }
                    >
                      <Download className="size-4 mr-2" /> Download to View
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* View details dialog */}
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
                {selectedNote.tags?.length > 0 && (
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

                {/* AI status badges */}
                <div className="flex flex-wrap gap-2">
                  {selectedNote.aiSummary && (
                    <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      <Sparkles className="size-3 mr-1" />
                      Summary ready
                    </Badge>
                  )}
                  {selectedNote.aiQuiz?.questions?.length && (
                    <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                      <Brain className="size-3 mr-1" />
                      Quiz ready ({selectedNote.aiQuiz.questions.length}q)
                    </Badge>
                  )}
                  {selectedNote.aiRecommendations?.content && (
                    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                      <Lightbulb className="size-3 mr-1" />
                      Recommendations ready
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button size="sm" onClick={() => handlePreview(selectedNote)}>
                    <Eye className="size-4 mr-2" />
                    Preview
                  </Button>
                  <Button
                    size="sm"
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
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setViewDialogOpen(false);
                      handleSummarize(selectedNote);
                    }}
                  >
                    <Sparkles className="size-4 mr-2" />
                    Summary
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setViewDialogOpen(false);
                      handleGenerateQuiz(selectedNote);
                    }}
                  >
                    <Brain className="size-4 mr-2" />
                    Quiz
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setViewDialogOpen(false);
                      handleGetRecommendations(selectedNote);
                    }}
                  >
                    <Lightbulb className="size-4 mr-2" />
                    Recommendations
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setQuestionDialogOpen(true);
                      setQuestion("");
                      setAnswer("");
                    }}
                  >
                    <MessageSquare className="size-4 mr-2" />
                    Ask Q
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setExplainDialogOpen(true);
                      setConcept("");
                      setExplanation("");
                    }}
                  >
                    <BookOpen className="size-4 mr-2" />
                    Explain
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* AI Summary dialog */}
        <Dialog
          open={aiSummaryDialogOpen}
          onOpenChange={setAiSummaryDialogOpen}
        >
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

        {/* Ask Question dialog */}
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

        {/* Explain Concept dialog */}
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

        {/* ─── Quiz Dialog ─────────────────────────────────────────────────────── */}
        <Dialog
          open={quizDialogOpen}
          onOpenChange={(open) => {
            setQuizDialogOpen(open);
            if (!open) {
              setQuizState(null);
              setQuizData(null);
            }
          }}
        >
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Brain className="size-5 text-purple-600" />
                AI Quiz
              </DialogTitle>
              <DialogDescription>
                {selectedNote?.title} — {selectedNote?.courseCode}
              </DialogDescription>
            </DialogHeader>

            {quizLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="relative mb-6">
                  <Brain className="size-16 text-purple-200 dark:text-purple-900" />
                  <Loader2 className="size-8 animate-spin text-purple-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="font-semibold text-foreground mb-1">
                  Generating your quiz...
                </p>
                <p className="text-sm text-muted-foreground">
                  AI is crafting questions from the lecture note
                </p>
              </div>
            ) : !quizData ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Brain className="size-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No quiz data available.</p>
              </div>
            ) : !quizState ? (
              /* Quiz intro screen */
              <QuizIntroScreen
                quiz={quizData}
                noteTitle={selectedNote?.title || ""}
                onStart={startQuiz}
                onRegenerate={() =>
                  selectedNote && handleGenerateQuiz(selectedNote, true)
                }
              />
            ) : quizState.submitted ? (
              /* Results screen */
              <QuizResultsScreen
                quiz={quizData}
                quizState={quizState}
                onRetry={startQuiz}
                onClose={() => setQuizDialogOpen(false)}
              />
            ) : (
              /* Active quiz */
              <ActiveQuizScreen
                quiz={quizData}
                quizState={quizState}
                onAnswer={answerQuestion}
                onNext={nextQuestion}
                onPrev={prevQuestion}
                onSubmit={submitQuiz}
                onJump={(i) =>
                  setQuizState((prev) =>
                    prev ? { ...prev, currentIndex: i } : prev,
                  )
                }
              />
            )}
          </DialogContent>
        </Dialog>

        {/* ─── Recommendations Dialog ───────────────────────────────────────────── */}
        <Dialog
          open={recommendationsDialogOpen}
          onOpenChange={setRecommendationsDialogOpen}
        >
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lightbulb className="size-5 text-amber-500" />
                Study Recommendations
              </DialogTitle>
              <DialogDescription>
                {selectedNote?.title} — {selectedNote?.courseCode}
              </DialogDescription>
            </DialogHeader>

            {recLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="relative mb-6">
                  <Lightbulb className="size-16 text-amber-100 dark:text-amber-900" />
                  <Loader2 className="size-8 animate-spin text-amber-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="font-semibold text-foreground mb-1">
                  Generating recommendations...
                </p>
                <p className="text-sm text-muted-foreground">
                  AI is analysing the lecture material
                </p>
              </div>
            ) : !recommendations ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Lightbulb className="size-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No recommendations available.
                </p>
              </div>
            ) : (
              <RecommendationsView
                recommendations={recommendations}
                onRegenerate={() =>
                  selectedNote && handleGetRecommendations(selectedNote, true)
                }
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// ─── Quiz Intro Screen ────────────────────────────────────────────────────────

function QuizIntroScreen({
  quiz,
  noteTitle,
  onStart,
  onRegenerate,
}: {
  quiz: AiQuiz;
  noteTitle: string;
  onStart: () => void;
  onRegenerate: () => void;
}) {
  const totalPoints = quiz.questions.reduce((s, q) => s + (q.points || 1), 0);
  const diffCounts = quiz.questions.reduce<Record<string, number>>((acc, q) => {
    acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
    return acc;
  }, {});
  const typeCounts = quiz.questions.reduce<Record<string, number>>((acc, q) => {
    acc[q.type] = (acc[q.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6 py-2">
      <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-xl p-5">
        <h3 className="font-semibold text-purple-900 dark:text-purple-200 mb-1">
          Quiz: {noteTitle}
        </h3>
        <p className="text-sm text-purple-700 dark:text-purple-400">
          Generated on{" "}
          {new Date(quiz.generatedAt).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-muted rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-foreground">
            {quiz.questions.length}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Questions</p>
        </div>
        <div className="bg-muted rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{totalPoints}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Points</p>
        </div>
        <div className="bg-muted rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-foreground capitalize">
            {quiz.difficulty}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Difficulty</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            By Difficulty
          </p>
          <div className="space-y-1">
            {Object.entries(diffCounts).map(([diff, count]) => (
              <div
                key={diff}
                className="flex items-center justify-between text-sm"
              >
                <span className="capitalize">{diff}</span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            By Type
          </p>
          <div className="space-y-1">
            {Object.entries(typeCounts).map(([type, count]) => (
              <div
                key={type}
                className="flex items-center justify-between text-sm"
              >
                <span className="capitalize">{type.replace("-", " ")}</span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button className="flex-1" onClick={onStart}>
          <Target className="size-4 mr-2" /> Start Quiz
        </Button>
        <Button variant="outline" onClick={onRegenerate}>
          <RefreshCw className="size-4 mr-2" /> Regenerate
        </Button>
      </div>
    </div>
  );
}

// ─── Active Quiz Screen ───────────────────────────────────────────────────────

function ActiveQuizScreen({
  quiz,
  quizState,
  onAnswer,
  onNext,
  onPrev,
  onSubmit,
  onJump,
}: {
  quiz: AiQuiz;
  quizState: QuizState;
  onAnswer: (a: string) => void;
  onNext: () => void;
  onPrev: () => void;
  onSubmit: () => void;
  onJump: (i: number) => void;
}) {
  const current = quiz.questions[quizState.currentIndex];
  const isLast = quizState.currentIndex === quiz.questions.length - 1;
  const answered = quizState.answers[quizState.currentIndex];
  const answeredCount = Object.keys(quizState.answers).length;
  const progress = (answeredCount / quiz.questions.length) * 100;

  const diffColor: Record<string, string> = {
    easy: "text-green-600 bg-green-100 dark:bg-green-900/40 dark:text-green-400",
    medium:
      "text-amber-600 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-400",
    hard: "text-red-600 bg-red-100 dark:bg-red-900/40 dark:text-red-400",
  };

  return (
    <div className="space-y-5">
      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            Question {quizState.currentIndex + 1} of {quiz.questions.length}
          </span>
          <span>{answeredCount} answered</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question navigator */}
      <div className="flex flex-wrap gap-1.5">
        {quiz.questions.map((_, i) => (
          <button
            key={i}
            onClick={() => onJump(i)}
            className={`size-7 rounded text-xs font-medium transition-colors ${
              i === quizState.currentIndex
                ? "bg-primary text-primary-foreground"
                : quizState.answers[i]
                  ? "bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Question card */}
      <div className="border rounded-xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <p className="font-semibold text-foreground leading-snug flex-1">
            {current.question}
          </p>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge className={`text-xs ${diffColor[current.difficulty]}`}>
              {current.difficulty}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {current.points}pt{current.points !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Options */}
        {current.type === "multiple-choice" && (
          <div className="space-y-2">
            {current.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => onAnswer(opt)}
                className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all ${
                  answered === opt
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                }`}
              >
                <span className="font-medium mr-2">
                  {String.fromCharCode(65 + i)}.
                </span>
                {opt}
              </button>
            ))}
          </div>
        )}

        {current.type === "true-false" && (
          <div className="flex gap-3">
            {["True", "False"].map((opt) => (
              <button
                key={opt}
                onClick={() => onAnswer(opt)}
                className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-all ${
                  answered === opt
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                }`}
              >
                {opt === "True" ? "✓ True" : "✗ False"}
              </button>
            ))}
          </div>
        )}

        {current.type === "short-answer" && (
          <div>
            <Textarea
              placeholder="Type your answer here..."
              value={answered || ""}
              onChange={(e) => onAnswer(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Write a concise answer in your own words.
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center gap-3">
        <Button
          variant="outline"
          onClick={onPrev}
          disabled={quizState.currentIndex === 0}
        >
          ← Previous
        </Button>
        <div className="flex gap-2">
          {isLast ? (
            <Button
              onClick={onSubmit}
              disabled={answeredCount === 0}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <ListChecks className="size-4 mr-2" /> Submit Quiz
            </Button>
          ) : (
            <Button onClick={onNext} disabled={!answered}>
              Next →
            </Button>
          )}
        </div>
      </div>

      {isLast && answeredCount < quiz.questions.length && (
        <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
          {quiz.questions.length - answeredCount} question
          {quiz.questions.length - answeredCount !== 1 ? "s" : ""} unanswered.
          You can still submit or go back to answer them.
        </p>
      )}
    </div>
  );
}

// ─── Quiz Results Screen ──────────────────────────────────────────────────────

function QuizResultsScreen({
  quiz,
  quizState,
  onRetry,
  onClose,
}: {
  quiz: AiQuiz;
  quizState: QuizState;
  onRetry: () => void;
  onClose: () => void;
}) {
  const [showExplanations, setShowExplanations] = useState(false);
  const timeTaken = quizState.endTime
    ? Math.round((quizState.endTime - quizState.startTime) / 1000)
    : 0;
  const mins = Math.floor(timeTaken / 60);
  const secs = timeTaken % 60;

  const grade =
    quizState.score >= 80
      ? "Excellent"
      : quizState.score >= 60
        ? "Good"
        : quizState.score >= 40
          ? "Fair"
          : "Needs Work";
  const gradeColor =
    quizState.score >= 80
      ? "text-green-600"
      : quizState.score >= 60
        ? "text-blue-600"
        : quizState.score >= 40
          ? "text-amber-600"
          : "text-red-600";

  return (
    <div className="space-y-6">
      {/* Score card */}
      <div className="text-center py-6 bg-gradient-to-b from-purple-50 to-white dark:from-purple-950/40 dark:to-background rounded-xl border border-purple-200 dark:border-purple-800">
        <Trophy className={`size-12 mx-auto mb-3 ${gradeColor}`} />
        <p className={`text-5xl font-bold mb-1 ${gradeColor}`}>
          {quizState.score}%
        </p>
        <p className={`text-lg font-semibold mb-1 ${gradeColor}`}>{grade}</p>
        <p className="text-sm text-muted-foreground">
          {quizState.earnedPoints}/{quizState.totalPoints} points &middot;{" "}
          {mins > 0 ? `${mins}m ` : ""}
          {secs}s
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Correct",
            value: quiz.questions.filter((q, i) => {
              const ua = quizState.answers[i] || "";
              return q.type === "short-answer"
                ? ua.trim().length > 0
                : ua.trim().toLowerCase() ===
                    q.correctAnswer.trim().toLowerCase();
            }).length,
            color: "text-green-600",
          },
          {
            label: "Wrong",
            value: quiz.questions.filter((q, i) => {
              const ua = quizState.answers[i] || "";
              return (
                q.type !== "short-answer" &&
                ua &&
                ua.trim().toLowerCase() !== q.correctAnswer.trim().toLowerCase()
              );
            }).length,
            color: "text-red-600",
          },
          {
            label: "Skipped",
            value: quiz.questions.filter((_, i) => !quizState.answers[i])
              .length,
            color: "text-amber-600",
          },
        ].map((s) => (
          <div key={s.label} className="bg-muted rounded-lg p-3 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Review toggle */}
      <Button
        variant="outline"
        onClick={() => setShowExplanations((v) => !v)}
        className="w-full"
      >
        <BookOpenCheck className="size-4 mr-2" />
        {showExplanations ? "Hide" : "Review"} Answers & Explanations
      </Button>

      {showExplanations && (
        <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
          {quiz.questions.map((q, i) => {
            const userAnswer = quizState.answers[i] || "";
            const isCorrect =
              q.type === "short-answer"
                ? userAnswer.trim().length > 0
                : userAnswer.trim().toLowerCase() ===
                  q.correctAnswer.trim().toLowerCase();
            return (
              <div
                key={i}
                className={`rounded-lg border p-4 text-sm space-y-2 ${isCorrect ? "border-green-200 bg-green-50 dark:bg-green-950/20" : "border-red-200 bg-red-50 dark:bg-red-950/20"}`}
              >
                <div className="flex items-start gap-2">
                  {isCorrect ? (
                    <CheckCircle2 className="size-4 text-green-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="size-4 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <p className="font-medium text-foreground">
                    {i + 1}. {q.question}
                  </p>
                </div>
                {!isCorrect && userAnswer && q.type !== "short-answer" && (
                  <p className="text-red-700 dark:text-red-400 pl-6">
                    Your answer: {userAnswer}
                  </p>
                )}
                {q.type !== "short-answer" && (
                  <p className="text-green-700 dark:text-green-400 pl-6">
                    Correct: {q.correctAnswer}
                  </p>
                )}
                {q.explanation && (
                  <p className="text-muted-foreground pl-6 italic">
                    {q.explanation}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-3">
        <Button onClick={onRetry} variant="outline" className="flex-1">
          <RefreshCw className="size-4 mr-2" /> Try Again
        </Button>
        <Button onClick={onClose} className="flex-1">
          Done
        </Button>
      </div>
    </div>
  );
}

// ─── Recommendations View ─────────────────────────────────────────────────────

function RecommendationsView({
  recommendations,
  onRegenerate,
}: {
  recommendations: AiRecommendations;
  onRegenerate: () => void;
}) {
  const sections = [
    {
      icon: <Target className="size-4 text-amber-600" />,
      title: "Prerequisites",
      items: recommendations.prerequisites,
      color:
        "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800",
      badge:
        "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    },
    {
      icon: <Compass className="size-4 text-blue-600" />,
      title: "Related Topics",
      items: recommendations.relatedTopics,
      color:
        "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800",
      badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    },
    {
      icon: <Lightbulb className="size-4 text-green-600" />,
      title: "Study Tips",
      items: recommendations.studyTips,
      color:
        "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800",
      badge: null,
      asList: true,
    },
    {
      icon: <BookOpen className="size-4 text-purple-600" />,
      title: "Further Reading",
      items: recommendations.furtherReading,
      color:
        "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800",
      badge: null,
      asList: true,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Overview */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="size-4 text-amber-600" />
          <span className="font-semibold text-amber-900 dark:text-amber-300 text-sm">
            Study Overview
          </span>
        </div>
        <p className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
          {recommendations.content}
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">
          Generated{" "}
          {new Date(recommendations.generatedAt).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>

      {sections.map((section) =>
        section.items?.length > 0 ? (
          <div
            key={section.title}
            className={`border rounded-xl p-4 ${section.color}`}
          >
            <div className="flex items-center gap-2 mb-3">
              {section.icon}
              <span className="font-semibold text-sm text-foreground">
                {section.title}
              </span>
              <Badge variant="secondary" className="text-xs ml-auto">
                {section.items.length}
              </Badge>
            </div>
            {section.asList ? (
              <ul className="space-y-2">
                {section.items.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-foreground"
                  >
                    <ArrowRight className="size-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-wrap gap-2">
                {section.items.map((item, i) => (
                  <Badge key={i} className={`text-xs ${section.badge}`}>
                    {item}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ) : null,
      )}

      <Button variant="outline" onClick={onRegenerate} className="w-full">
        <RefreshCw className="size-4 mr-2" /> Regenerate Recommendations
      </Button>
    </div>
  );
}

// ─── NoteCard Component ───────────────────────────────────────────────────────

interface NoteCardProps {
  note: LectureNote;
  onPreview: (note: LectureNote) => void;
  onDownload: (id: string, name: string) => void;
  onSummarise: (note: LectureNote) => void;
  onView: (note: LectureNote) => void;
  onQuiz: (note: LectureNote) => void;
  onRecommendations: (note: LectureNote) => void;
  formatFileSize: (b: number) => string;
  formatDate: (d: string) => string;
}

function NoteCard({
  note,
  onPreview,
  onDownload,
  onSummarise,
  onView,
  onQuiz,
  onRecommendations,
  formatFileSize,
  formatDate,
}: NoteCardProps) {
  const hasQuiz = !!note.aiQuiz?.questions?.length;
  const hasRec = !!note.aiRecommendations?.content;
  const hasSummary = !!note.aiSummary;

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
          <div className="flex gap-1">
            {hasSummary && (
              <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 text-xs px-1.5">
                <Sparkles className="size-2.5" />
              </Badge>
            )}
            {hasQuiz && (
              <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 text-xs px-1.5">
                <Brain className="size-2.5" />
              </Badge>
            )}
            {hasRec && (
              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 text-xs px-1.5">
                <Lightbulb className="size-2.5" />
              </Badge>
            )}
          </div>
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
              <Eye className="size-3" />
              {note.views}
            </span>
            <span className="flex items-center gap-1">
              <Download className="size-3" />
              {note.downloads}
            </span>
          </div>
          <span>{formatDate(note.createdAt)}</span>
        </div>
        {note.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {note.tags.map((tag, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
        <div className="pt-2 grid grid-cols-2 gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onView(note)}
            className="col-span-1"
          >
            <Eye className="size-3 mr-1" /> Details
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPreview(note)}
            className="col-span-1"
          >
            <FileText className="size-3 mr-1" /> Preview
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDownload(note._id, note.originalName)}
            className="col-span-1"
          >
            <Download className="size-3 mr-1" /> Download
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-blue-600 border-blue-300 hover:bg-blue-50 bg-transparent dark:text-blue-400 dark:border-blue-700 dark:hover:bg-blue-950/30"
            onClick={() => onSummarise(note)}
          >
            <Sparkles className="size-3 mr-1" /> Summary
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-purple-600 border-purple-300 hover:bg-purple-50 bg-transparent dark:text-purple-400 dark:border-purple-700 dark:hover:bg-purple-950/30"
            onClick={() => onQuiz(note)}
          >
            <Brain className="size-3 mr-1" /> {hasQuiz ? "Take Quiz" : "Quiz"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-amber-600 border-amber-300 hover:bg-amber-50 bg-transparent dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-950/30"
            onClick={() => onRecommendations(note)}
          >
            <Lightbulb className="size-3 mr-1" /> Tips
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page export ──────────────────────────────────────────────────────────────

export default function StudentDocsPage() {
  return (
    <Suspense>
      <StudentsViewLectureNotes />
    </Suspense>
  );
}

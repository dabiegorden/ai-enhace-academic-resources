"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  CheckCircle,
  AlertCircle,
  Award,
  Timer,
  Loader2,
  Clock,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

// Types matching backend schema
interface Question {
  questionNumber: number;
  questionType: "mcq" | "theory";
  questionText: string;
  options?: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  points: number;
  correctAnswer?: string;
}

interface Exam {
  _id: string;
  title: string;
  durationInMinutes: number;
  startedAt: string;
  endedAt: string;
  questions: Question[];
  totalPoints: number;
  status: "draft" | "active" | "ended";
}

interface ExamAnswer {
  questionNumber: number;
  answer: string;
}

interface ExamSubmission {
  _id: string;
  examId: string;
  examTitle: string;
  studentId: string;
  answers: Array<{
    questionNumber: number;
    answer: string;
    isCorrect: boolean | null;
    pointsAwarded: number;
  }>;
  totalScore: number;
  submittedAt: string;
  autoGraded: boolean;
  exam?: {
    _id: string;
    title: string;
    totalPoints: number;
    questions: Question[];
  };
}

export default function StudentsExamPage() {
  const [activeTab, setActiveTab] = useState<"exams" | "completed" | "results">(
    "exams",
  );
  const [exams, setExams] = useState<Exam[]>([]);
  const [completedExams, setCompletedExams] = useState<Exam[]>([]);
  const [submissions, setSubmissions] = useState<ExamSubmission[]>([]);
  const [submittedExamIds, setSubmittedExamIds] = useState<Set<string>>(
    new Set(),
  );
  const [loading, setLoading] = useState(true);

  // Exam states
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [examAnswers, setExamAnswers] = useState<{ [key: number]: string }>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [examStarted, setExamStarted] = useState(false);
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [examResult, setExamResult] = useState<{
    totalScore: number;
    answers: Array<{
      questionNumber: number;
      answer: string;
      isCorrect: boolean | null;
      pointsAwarded: number;
    }>;
  } | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // Fetch exams
  const fetchExams = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/exams`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        const allExams: Exam[] = data.data || [];
        setExams(allExams.filter((exam) => exam.status === "active"));
        setCompletedExams(allExams.filter((exam) => exam.status === "ended"));
      } else {
        toast.error(data.message || "Failed to fetch exams");
      }
    } catch (error) {
      toast.error("Failed to fetch exams");
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, [token, apiUrl]);

  // Fetch submissions for the current student via the dedicated backend endpoint
  const fetchSubmissions = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        const response = await fetch(`${apiUrl}/exams/my-submissions`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();
        if (data.success) {
          const mySubmissions: ExamSubmission[] = data.data || [];
          setSubmissions(mySubmissions);
          setSubmittedExamIds(
            new Set(mySubmissions.map((sub) => sub.examId)),
          );
        } else {
          toast.error(data.message || "Failed to fetch submissions");
        }
      } catch (error) {
        toast.error("Failed to fetch submissions");
        console.error("Fetch error:", error);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [token, apiUrl],
  );

  useEffect(() => {
    if (activeTab === "exams" || activeTab === "completed") {
      fetchExams();
      // Load submitted exam IDs quietly so we can disable retakes
      fetchSubmissions(true);
    } else if (activeTab === "results") {
      fetchSubmissions();
    }
  }, [activeTab, fetchExams, fetchSubmissions]);

  // Timer for active exam
  useEffect(() => {
    if (!activeExam || !examStarted || examSubmitted) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          handleAutoSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeExam, examStarted, examSubmitted]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleStartExam = async (exam: Exam) => {
    if (submittedExamIds.has(exam._id)) {
      toast.error("You have already submitted this exam");
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/exams/${exam._id}/student`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setActiveExam(data.data);
        setExamAnswers({});

        const now = new Date().getTime();
        const endTime = new Date(data.data.endedAt).getTime();
        const remainingSeconds = Math.floor((endTime - now) / 1000);

        setTimeRemaining(remainingSeconds > 0 ? remainingSeconds : 0);
        setExamStarted(true);
        setExamSubmitted(false);
        setExamResult(null);
      } else {
        toast.error(data.message || "Failed to start exam");
      }
    } catch (error) {
      toast.error("Error starting exam");
      console.error("Start exam error:", error);
    }
  };

  const handleMCQAnswer = (questionNumber: number, answer: string) => {
    setExamAnswers((prev) => ({
      ...prev,
      [questionNumber]: answer,
    }));
  };

  const handleTheoryAnswer = (questionNumber: number, answer: string) => {
    setExamAnswers((prev) => ({
      ...prev,
      [questionNumber]: answer,
    }));
  };

  const handleAutoSubmitExam = async () => {
    if (examSubmitted || !activeExam) return;
    await handleSubmitExam();
  };

  const handleSubmitExam = async () => {
    if (!activeExam) return;

    try {
      setSubmitting(true);

      const formattedAnswers: ExamAnswer[] = Object.entries(examAnswers).map(
        ([questionNumber, answer]) => ({
          questionNumber: parseInt(questionNumber),
          answer: answer,
        }),
      );

      const response = await fetch(`${apiUrl}/exams/${activeExam._id}/submit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          answers: formattedAnswers,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Exam submitted successfully!");
        setExamSubmitted(true);
        setExamResult(data.data);
        setSubmittedExamIds((prev) => new Set(prev).add(activeExam._id));

        setTimeout(() => {
          setActiveExam(null);
          setExamStarted(false);
          setExamSubmitted(false);
          fetchExams();
        }, 5000);
      } else {
        toast.error(data.message || "Failed to submit exam");
      }
    } catch (error) {
      toast.error("Error submitting exam");
      console.error("Submit error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  // Exam view
  if (activeExam && examStarted) {
    const hasTheoryQuestions = activeExam.questions.some(
      (q) => q.questionType === "theory",
    );

    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* Exam Header */}
          <Card className="sticky top-6 z-10">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-2xl">{activeExam.title}</CardTitle>
                  <CardDescription>
                    {activeExam.questions.length} Questions ·{" "}
                    {activeExam.totalPoints} Points
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div
                    className={`text-3xl font-bold ${
                      timeRemaining !== null && timeRemaining < 300
                        ? "text-red-600"
                        : "text-blue-600"
                    }`}
                  >
                    {timeRemaining !== null
                      ? formatTime(timeRemaining)
                      : "00:00:00"}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Time Remaining
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Questions */}
          <div className="space-y-4">
            {activeExam.questions.map((question) => (
              <Card key={question.questionNumber}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3 mb-4">
                    <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-semibold shrink-0 text-sm">
                      {question.questionNumber}
                    </span>
                    <div className="flex-1">
                      <p className="text-foreground font-medium mb-1">
                        {question.questionText}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        {question.questionType === "mcq"
                          ? "Multiple Choice"
                          : "Theory"}{" "}
                        - {question.points}{" "}
                        {question.points === 1 ? "point" : "points"}
                      </Badge>
                    </div>
                  </div>

                  {question.questionType === "mcq" && question.options && (
                    <div className="ml-11 space-y-2">
                      {Object.entries(question.options).map(([key, value]) => (
                        <label
                          key={key}
                          className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            examAnswers[question.questionNumber] === key
                              ? "border-blue-600 bg-blue-50"
                              : "border-border hover:border-blue-300 bg-background"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`question-${question.questionNumber}`}
                            checked={
                              examAnswers[question.questionNumber] === key
                            }
                            onChange={() =>
                              handleMCQAnswer(question.questionNumber, key)
                            }
                            className="mr-3"
                            disabled={examSubmitted}
                          />
                          <span className="text-foreground">
                            <strong>{key}.</strong> {value}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}

                  {question.questionType === "theory" && (
                    <div className="ml-11">
                      <Textarea
                        className="min-h-32"
                        placeholder="Write your answer here..."
                        disabled={examSubmitted}
                        value={examAnswers[question.questionNumber] || ""}
                        onChange={(e) =>
                          handleTheoryAnswer(
                            question.questionNumber,
                            e.target.value,
                          )
                        }
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Theory questions will be graded manually by your
                        instructor
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Submit Section */}
          {!examSubmitted ? (
            <Card>
              <CardContent className="pt-6">
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    Answered: {Object.keys(examAnswers).length} /{" "}
                    {activeExam.questions.length}
                  </p>
                </div>
                <Button
                  onClick={handleSubmitExam}
                  disabled={submitting}
                  className="w-full"
                  size="lg"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="size-4 mr-2" />
                      Submit Exam
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : examResult ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center mb-4">
                  <CheckCircle className="size-16 text-green-600 mx-auto mb-2" />
                  <h3 className="text-xl font-bold text-foreground">
                    Exam Submitted Successfully!
                  </h3>
                  <p className="text-3xl font-bold text-blue-600 mt-4">
                    Score: {examResult.totalScore} / {activeExam.totalPoints}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {hasTheoryQuestions &&
                      "Note: Theory questions require manual grading. Your final score may change."}
                  </p>
                </div>

                <div className="border-t pt-4 mt-4">
                  <h4 className="font-semibold mb-3 text-foreground">
                    Answer Summary:
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {examResult.answers.map((ans) => {
                      const question = activeExam.questions.find(
                        (q) => q.questionNumber === ans.questionNumber,
                      );
                      return (
                        <div
                          key={ans.questionNumber}
                          className={`flex items-center justify-between p-2 rounded ${
                            ans.isCorrect === true
                              ? "bg-green-50 text-green-800"
                              : ans.isCorrect === false
                                ? "bg-red-50 text-red-800"
                                : "bg-gray-50 text-gray-800"
                          }`}
                        >
                          <span className="text-sm">
                            Question {ans.questionNumber}
                            {ans.isCorrect === true && " ✓"}
                            {ans.isCorrect === false && " ✗"}
                            {ans.isCorrect === null && " (pending)"}
                          </span>
                          <span className="text-sm font-semibold">
                            {ans.pointsAwarded} / {question?.points || 0} points
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    );
  }

  // Main view
  return (
    <div className="min-h-screen bg-background">
      <div className="space-y-6 p-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Exams</h1>
          <p className="text-muted-foreground">
            View and submit your exams and check your results
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4">
          <Button
            onClick={() => setActiveTab("exams")}
            variant={activeTab === "exams" ? "default" : "outline"}
            className="flex items-center gap-2"
          >
            <Award className="size-4" />
            Active Exams
          </Button>
          <Button
            onClick={() => setActiveTab("completed")}
            variant={activeTab === "completed" ? "default" : "outline"}
            className="flex items-center gap-2"
          >
            <Clock className="size-4" />
            Completed Exams
          </Button>
          <Button
            onClick={() => setActiveTab("results")}
            variant={activeTab === "results" ? "default" : "outline"}
            className="flex items-center gap-2"
          >
            <CheckCircle className="size-4" />
            My Results
          </Button>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : activeTab === "exams" ? (
          /* Exams List */
          exams.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Award className="size-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  No active exams found
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Showing {exams.length} exam{exams.length !== 1 ? "s" : ""}
              </p>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {exams.map((exam) => {
                  const now = new Date();
                  const startTime = new Date(exam.startedAt);
                  const endTime = new Date(exam.endedAt);
                  const alreadySubmitted = submittedExamIds.has(exam._id);
                  const canStart =
                    !alreadySubmitted && now >= startTime && now <= endTime;
                  const hasEnded = now > endTime;
                  const notStarted = now < startTime;

                  return (
                    <Card
                      key={exam._id}
                      className="hover:shadow-lg transition-shadow"
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Award className="size-4" />
                            <Badge variant="secondary">Exam</Badge>
                          </div>
                          {exam.status && (
                            <Badge
                              variant={
                                exam.status === "active"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {exam.status}
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="line-clamp-2">
                          {exam.title}
                        </CardTitle>
                        <CardDescription>
                          {exam.questions.length} Questions · {exam.totalPoints}{" "}
                          Points
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            {exam.durationInMinutes} mins
                          </span>
                          <span className="flex items-center gap-1">
                            <Award className="size-3" />
                            {exam.totalPoints} points
                          </span>
                          <span className="flex items-center gap-1 col-span-2">
                            <FileText className="size-3" />
                            {exam.questions.length} Questions
                          </span>
                        </div>

                        <div className="bg-muted rounded-lg p-3 text-xs space-y-1">
                          <p className="text-muted-foreground">
                            <strong>Start:</strong> {formatDate(exam.startedAt)}
                          </p>
                          <p className="text-muted-foreground">
                            <strong>End:</strong> {formatDate(exam.endedAt)}
                          </p>
                        </div>

                        {alreadySubmitted && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                            <CheckCircle className="size-4 text-blue-600 shrink-0 mt-0.5" />
                            <span className="text-xs text-blue-800">
                              You have already submitted this exam. Check My
                              Results for your score.
                            </span>
                          </div>
                        )}

                        {notStarted && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                            <AlertCircle className="size-4 text-yellow-600 shrink-0 mt-0.5" />
                            <span className="text-xs text-yellow-800">
                              Exam has not started yet
                            </span>
                          </div>
                        )}

                        {hasEnded && (
                          <div className="bg-muted border rounded-lg p-3">
                            <span className="text-xs text-muted-foreground">
                              Exam has ended
                            </span>
                          </div>
                        )}

                        {alreadySubmitted ? (
                          <Button
                            disabled
                            className="w-full"
                            variant="outline"
                            size="sm"
                          >
                            <CheckCircle className="size-4 mr-2" />
                            Already Submitted
                          </Button>
                        ) : (
                          canStart && (
                            <Button
                              onClick={() => handleStartExam(exam)}
                              className="w-full bg-green-600 hover:bg-green-700"
                              size="sm"
                            >
                              <Timer className="size-4 mr-2" />
                              Start Exam
                            </Button>
                          )
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )
        ) : activeTab === "completed" ? (
          /* Completed Exams List */
          completedExams.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="size-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  No completed exams found
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Showing {completedExams.length} exam
                {completedExams.length !== 1 ? "s" : ""}
              </p>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {completedExams.map((exam) => (
                  <Card
                    key={exam._id}
                    className="hover:shadow-lg transition-shadow"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Award className="size-4" />
                          <Badge variant="secondary">Exam</Badge>
                        </div>
                        <Badge variant="destructive">Ended</Badge>
                      </div>
                      <CardTitle className="line-clamp-2">
                        {exam.title}
                      </CardTitle>
                      <CardDescription>
                        {exam.questions.length} Questions · {exam.totalPoints}{" "}
                        Points
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="bg-muted rounded-lg p-3 text-xs space-y-1">
                        <p className="text-muted-foreground">
                          <strong>Start:</strong> {formatDate(exam.startedAt)}
                        </p>
                        <p className="text-muted-foreground">
                          <strong>End:</strong> {formatDate(exam.endedAt)}
                        </p>
                      </div>
                      <Button
                        onClick={() => setActiveTab("results")}
                        variant="outline"
                        className="w-full"
                        size="sm"
                      >
                        <CheckCircle className="size-4 mr-2" />
                        View My Results
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )
        ) : /* Results List */
        submissions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="size-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                No exam results yet
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Showing {submissions.length} result
              {submissions.length !== 1 ? "s" : ""}
            </p>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {submissions.map((submission) => {
                const percentage = submission.exam
                  ? Math.round(
                      (submission.totalScore / submission.exam.totalPoints) *
                        100,
                    )
                  : 0;
                const hasTheoryQuestions = submission.answers.some(
                  (ans) => ans.isCorrect === null,
                );

                return (
                  <Card
                    key={submission._id}
                    className="hover:shadow-lg transition-shadow"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Award className="size-4" />
                          <Badge variant="secondary">Result</Badge>
                        </div>
                        <Badge
                          className={
                            percentage >= 70
                              ? "bg-green-100 text-green-700"
                              : percentage >= 50
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                          }
                        >
                          {percentage}%
                        </Badge>
                      </div>
                      <CardTitle className="line-clamp-2">
                        {submission.examTitle || submission.exam?.title}
                      </CardTitle>
                      <CardDescription>
                        Submitted: {formatDate(submission.submittedAt)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-blue-800 font-semibold">
                            Your Score
                          </span>
                          {submission.autoGraded && (
                            <Badge variant="outline" className="text-xs">
                              Auto-Graded
                            </Badge>
                          )}
                        </div>
                        <p className="text-3xl font-bold text-blue-900">
                          {submission.totalScore} /{" "}
                          {submission.exam?.totalPoints || 0}
                        </p>
                        {hasTheoryQuestions && (
                          <p className="text-xs text-blue-700 mt-2">
                            Some questions are pending manual grading
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-foreground">
                          Answer Breakdown:
                        </p>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {submission.answers.map((ans) => {
                            const question = submission.exam?.questions.find(
                              (q) => q.questionNumber === ans.questionNumber,
                            );
                            return (
                              <div
                                key={ans.questionNumber}
                                className={`flex items-center justify-between p-2 rounded text-xs ${
                                  ans.isCorrect === true
                                    ? "bg-green-50 text-green-800"
                                    : ans.isCorrect === false
                                      ? "bg-red-50 text-red-800"
                                      : "bg-gray-50 text-gray-800"
                                }`}
                              >
                                <span>
                                  Q{ans.questionNumber}
                                  {ans.isCorrect === true && " ✓"}
                                  {ans.isCorrect === false && " ✗"}
                                  {ans.isCorrect === null && " (pending)"}
                                </span>
                                <span className="font-semibold">
                                  {ans.pointsAwarded} / {question?.points || 0}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        <p>
                          <strong>Total Questions:</strong>{" "}
                          {submission.answers.length}
                        </p>
                        <p>
                          <strong>Correct Answers:</strong>{" "}
                          {
                            submission.answers.filter(
                              (a) => a.isCorrect === true,
                            ).length
                          }
                        </p>
                        <p>
                          <strong>Pending Grading:</strong>{" "}
                          {
                            submission.answers.filter(
                              (a) => a.isCorrect === null,
                            ).length
                          }
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

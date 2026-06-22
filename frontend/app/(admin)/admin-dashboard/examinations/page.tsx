"use client";

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
  Clock,
  Play,
  StopCircle,
  Trash2,
  FileText,
  CheckCircle2,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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
  correctAnswer?: string;
  points: number;
}

interface Exam {
  _id: string;
  title: string;
  durationInMinutes: number;
  questions: Question[];
  status: "draft" | "active" | "ended";
  startedAt?: string;
  endedAt?: string;
  totalPoints: number;
  createdBy: {
    firstName: string;
    lastName: string;
    email: string;
  };
  submissions: any[];
  createdAt: string;
}

export default function AdminExaminationsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [viewQuestionsDialogOpen, setViewQuestionsDialogOpen] = useState(false);
  const [viewSubmissionsDialogOpen, setViewSubmissionsDialogOpen] =
    useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [examWithSubmissions, setExamWithSubmissions] = useState<any>(null);

  // Form states
  const [examTitle, setExamTitle] = useState("");
  const [durationInMinutes, setDurationInMinutes] = useState("");

  // Question form states
  const [questionType, setQuestionType] = useState<"mcq" | "theory">("mcq");
  const [questionText, setQuestionText] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [points, setPoints] = useState("1");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/exams`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setExams(data.data);
      }
    } catch (error) {
      console.error("Error fetching exams:", error);
      toast.error("Failed to fetch exams");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExam = async () => {
    if (!examTitle || !durationInMinutes) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      setActionLoading(true);

      const response = await fetch(`${apiUrl}/exams`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: examTitle,
          durationInMinutes: Number.parseInt(durationInMinutes),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create exam");
      }

      toast.success("Exam created successfully");
      setAddDialogOpen(false);
      setExamTitle("");
      setDurationInMinutes("");
      fetchExams();
    } catch (error) {
      console.error("Error creating exam:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create exam",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddQuestion = async () => {
    if (!selectedExam) return;

    if (!questionText || !points) {
      toast.error("Please fill all required fields");
      return;
    }

    if (questionType === "mcq") {
      if (!optionA || !optionB || !optionC || !optionD || !correctAnswer) {
        toast.error("Please fill all MCQ options and select correct answer");
        return;
      }
    }

    try {
      setActionLoading(true);

      const payload: any = {
        questionType,
        questionText,
        points: Number.parseInt(points),
      };

      if (questionType === "mcq") {
        payload.options = {
          A: optionA,
          B: optionB,
          C: optionC,
          D: optionD,
        };
        payload.correctAnswer = correctAnswer;
      }

      const response = await fetch(
        `${apiUrl}/exams/${selectedExam._id}/questions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to add question");
      }

      toast.success("Question added successfully");
      resetQuestionForm();
      fetchExams();

      // Update the selected exam
      const updatedExamResponse = await fetch(
        `${apiUrl}/exams/${selectedExam._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const updatedExamData = await updatedExamResponse.json();
      if (updatedExamData.success) {
        setSelectedExam(updatedExamData.data);
      }
    } catch (error) {
      console.error("Error adding question:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to add question",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const resetQuestionForm = () => {
    setQuestionText("");
    setOptionA("");
    setOptionB("");
    setOptionC("");
    setOptionD("");
    setCorrectAnswer("");
    setPoints("1");
    setQuestionType("mcq");
  };

  const handleRemoveQuestion = async (questionNumber: number) => {
    if (!selectedExam) return;

    try {
      setActionLoading(true);

      const response = await fetch(
        `${apiUrl}/exams/${selectedExam._id}/questions/${questionNumber}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to remove question");
      }

      toast.success("Question removed successfully");
      fetchExams();

      // Update the selected exam
      const updatedExamResponse = await fetch(
        `${apiUrl}/exams/${selectedExam._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const updatedExamData = await updatedExamResponse.json();
      if (updatedExamData.success) {
        setSelectedExam(updatedExamData.data);
      }
    } catch (error) {
      console.error("Error removing question:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to remove question",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartExam = async (examId: string) => {
    try {
      setActionLoading(true);

      const response = await fetch(`${apiUrl}/exams/${examId}/start`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to start exam");
      }

      toast.success("Exam started successfully");
      fetchExams();
    } catch (error) {
      console.error("Error starting exam:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to start exam",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndExam = async (examId: string) => {
    try {
      setActionLoading(true);

      const response = await fetch(`${apiUrl}/exams/${examId}/end`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to end exam");
      }

      toast.success("Exam ended successfully");
      fetchExams();
    } catch (error) {
      console.error("Error ending exam:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to end exam",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteExam = async (examId: string) => {
    if (!confirm("Are you sure you want to delete this exam?")) return;

    try {
      setActionLoading(true);

      const response = await fetch(`${apiUrl}/exams/${examId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete exam");
      }

      toast.success("Exam deleted successfully");
      fetchExams();
    } catch (error) {
      console.error("Error deleting exam:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete exam",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const openQuestionDialog = (exam: Exam) => {
    setSelectedExam(exam);
    setQuestionDialogOpen(true);
  };

  const openViewQuestionsDialog = (exam: Exam) => {
    setSelectedExam(exam);
    setViewQuestionsDialogOpen(true);
  };

  const openViewSubmissionsDialog = async (exam: Exam) => {
    try {
      setActionLoading(true);
      const response = await fetch(`${apiUrl}/exams/${exam._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setExamWithSubmissions(data.data);
        setViewSubmissionsDialogOpen(true);
      } else {
        toast.error("Failed to fetch submissions");
      }
    } catch (error) {
      console.error("Error fetching submissions:", error);
      toast.error("Failed to fetch submissions");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "active":
        return <Badge className="bg-green-500">Active</Badge>;
      case "ended":
        return <Badge variant="destructive">Ended</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading exams...</div>
      </div>
    );
  }

  return (
    <div className="container py-8 mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Examinations</h1>
          <p className="text-muted-foreground">
            Create and manage your examinations
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 size-4" />
          Create Exam
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {exams.map((exam) => (
          <Card key={exam?._id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{exam.title}</CardTitle>
                  <CardDescription>
                    {exam?.createdBy?.firstName} {exam?.createdBy?.lastName}
                  </CardDescription>
                </div>
                {getStatusBadge(exam?.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {exam?.status === "active" && exam?.startedAt && (
                  <div className="flex items-center gap-2 text-sm p-3 rounded-lg border-2 border-green-500 bg-green-50">
                    <Clock className="size-5 text-green-600" />
                    <span className="text-green-700 font-semibold">
                      Live — each student gets {exam?.durationInMinutes} minutes
                      from when they start. End the exam manually when done.
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="size-4 text-muted-foreground" />
                  <span>{exam.durationInMinutes} minutes</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="size-4 text-muted-foreground" />
                  <span>
                    {exam.questions.length} question
                    {exam.questions.length !== 1 ? "s" : ""} ({exam.totalPoints}{" "}
                    points)
                  </span>
                </div>
                {exam.submissions && exam.submissions.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="size-4 text-muted-foreground" />
                    <span>{exam.submissions.length} submission(s)</span>
                  </div>
                )}

                <div className="pt-3 space-y-2">
                  {exam.status === "draft" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full bg-transparent"
                        onClick={() => openQuestionDialog(exam)}
                      >
                        <Plus className="mr-2 size-4" />
                        Add Questions
                      </Button>
                      {exam.questions.length > 0 && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full bg-transparent"
                            onClick={() => openViewQuestionsDialog(exam)}
                          >
                            <Eye className="mr-2 size-4" />
                            View Questions ({exam.questions.length})
                          </Button>
                          <Button
                            size="sm"
                            className="w-full bg-green-600 hover:bg-green-700"
                            onClick={() => handleStartExam(exam._id)}
                            disabled={actionLoading}
                          >
                            <Play className="mr-2 size-4" />
                            Start Exam
                          </Button>
                        </>
                      )}
                    </>
                  )}
                  {exam.status === "active" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full bg-transparent"
                        onClick={() => openViewQuestionsDialog(exam)}
                      >
                        <Eye className="mr-2 size-4" />
                        View Questions
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={() => handleEndExam(exam._id)}
                        disabled={actionLoading}
                      >
                        <StopCircle className="mr-2 size-4" />
                        End Exam
                      </Button>
                    </>
                  )}
                  {exam.status === "ended" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full bg-transparent"
                        onClick={() => openViewQuestionsDialog(exam)}
                      >
                        <Eye className="mr-2 size-4" />
                        View Questions
                      </Button>
                      {exam.submissions && exam.submissions.length > 0 && (
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => openViewSubmissionsDialog(exam)}
                          disabled={actionLoading}
                        >
                          <CheckCircle2 className="mr-2 size-4" />
                          View Submissions ({exam.submissions.length})
                        </Button>
                      )}
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-red-600 hover:text-red-700 bg-transparent"
                    onClick={() => handleDeleteExam(exam._id)}
                    disabled={actionLoading}
                  >
                    <Trash2 className="mr-2 size-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Exam Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Exam</DialogTitle>
            <DialogDescription>
              Enter the exam title and duration to get started
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Exam Title</Label>
              <Input
                id="title"
                placeholder="e.g., Midterm Examination"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="duration">Duration (in minutes)</Label>
              <Input
                id="duration"
                type="number"
                placeholder="e.g., 60"
                value={durationInMinutes}
                onChange={(e) => setDurationInMinutes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateExam} disabled={actionLoading}>
              {actionLoading ? "Creating..." : "Create Exam"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Question Dialog */}
      <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Question to {selectedExam?.title}</DialogTitle>
            <DialogDescription>
              Add theory or MCQ questions to this exam
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Question Type</Label>
              <Select
                value={questionType}
                onValueChange={(value: "mcq" | "theory") =>
                  setQuestionType(value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select question type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mcq">Multiple Choice (MCQ)</SelectItem>
                  <SelectItem value="theory">Theory</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="questionText">Question</Label>
              <Textarea
                id="questionText"
                placeholder="Enter your question here..."
                rows={4}
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
              />
            </div>

            {questionType === "mcq" && (
              <>
                <div className="space-y-3">
                  <Label>Options</Label>
                  <div className="space-y-2">
                    <Input
                      placeholder="Option A"
                      value={optionA}
                      onChange={(e) => setOptionA(e.target.value)}
                    />
                    <Input
                      placeholder="Option B"
                      value={optionB}
                      onChange={(e) => setOptionB(e.target.value)}
                    />
                    <Input
                      placeholder="Option C"
                      value={optionC}
                      onChange={(e) => setOptionC(e.target.value)}
                    />
                    <Input
                      placeholder="Option D"
                      value={optionD}
                      onChange={(e) => setOptionD(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label>Correct Answer</Label>
                  <RadioGroup
                    value={correctAnswer}
                    onValueChange={setCorrectAnswer}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="A" id="answer-a" />
                      <Label htmlFor="answer-a" className="font-normal">
                        A
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="B" id="answer-b" />
                      <Label htmlFor="answer-b" className="font-normal">
                        B
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="C" id="answer-c" />
                      <Label htmlFor="answer-c" className="font-normal">
                        C
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="D" id="answer-d" />
                      <Label htmlFor="answer-d" className="font-normal">
                        D
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </>
            )}

            <div>
              <Label htmlFor="points">Points</Label>
              <Input
                id="points"
                type="number"
                placeholder="1"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setQuestionDialogOpen(false);
                resetQuestionForm();
              }}
              disabled={actionLoading}
            >
              Close
            </Button>
            <Button onClick={handleAddQuestion} disabled={actionLoading}>
              {actionLoading ? "Adding..." : "Add Question"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Questions Dialog */}
      <Dialog
        open={viewQuestionsDialogOpen}
        onOpenChange={setViewQuestionsDialogOpen}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedExam?.title} - Questions</DialogTitle>
            <DialogDescription>
              {selectedExam?.questions.length} question(s) | Total:{" "}
              {selectedExam?.totalPoints} points
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedExam?.questions.map((question, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        Q{question.questionNumber}
                      </Badge>
                      <Badge
                        variant={
                          question.questionType === "mcq"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {question.questionType === "mcq" ? "MCQ" : "Theory"}
                      </Badge>
                      <Badge variant="outline">{question.points} pts</Badge>
                    </div>
                    {selectedExam?.status === "draft" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleRemoveQuestion(question.questionNumber)
                        }
                      >
                        <Trash2 className="size-4 text-red-600" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="mb-3 font-medium">{question.questionText}</p>
                  {question.questionType === "mcq" && question.options && (
                    <div className="space-y-2">
                      {Object.entries(question.options).map(([key, value]) => (
                        <div
                          key={key}
                          className={`flex items-center gap-2 rounded-md border p-2 ${
                            question.correctAnswer === key
                              ? "border-green-500"
                              : ""
                          }`}
                        >
                          <span className="font-semibold">{key}.</span>
                          <span>{value}</span>
                          {question.correctAnswer === key && (
                            <CheckCircle2 className="ml-auto size-4 text-green-600" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {selectedExam?.questions.length === 0 && (
              <p className="text-center text-muted-foreground">
                No questions added yet
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setViewQuestionsDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Submissions Dialog */}
      <Dialog
        open={viewSubmissionsDialogOpen}
        onOpenChange={setViewSubmissionsDialogOpen}
      >
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {examWithSubmissions?.title} - Student Submissions
            </DialogTitle>
            <DialogDescription>
              {examWithSubmissions?.submissions?.length || 0} submission(s)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {examWithSubmissions?.submissions &&
            examWithSubmissions.submissions.length > 0 ? (
              examWithSubmissions.submissions.map(
                (submission: any, idx: number) => {
                  const percentage = examWithSubmissions.totalPoints
                    ? Math.round(
                        (submission.totalScore /
                          examWithSubmissions.totalPoints) *
                          100,
                      )
                    : 0;
                  const hasTheoryQuestions = submission.answers.some(
                    (ans: any) => ans.isCorrect === null,
                  );

                  return (
                    <Card key={idx}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">
                              {submission.studentId &&
                              typeof submission.studentId === "object"
                                ? `${submission.studentId.firstName} ${submission.studentId.lastName}`
                                : "Unknown Student"}
                            </CardTitle>
                            <CardDescription>
                              {submission.studentId &&
                                typeof submission.studentId === "object" && (
                                  <>
                                    {submission.studentId.studentId && (
                                      <span className="font-medium">
                                        ID: {submission.studentId.studentId}
                                      </span>
                                    )}
                                    {submission.studentId.email && (
                                      <span>
                                        {submission.studentId.studentId
                                          ? " · "
                                          : ""}
                                        {submission.studentId.email}
                                      </span>
                                    )}
                                    <br />
                                  </>
                                )}
                              Submitted:{" "}
                              {new Date(
                                submission.submittedAt,
                              ).toLocaleString()}
                            </CardDescription>
                          </div>
                          <div className="text-right">
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
                            <p className="text-2xl font-bold text-blue-600 mt-2">
                              {submission.totalScore} /{" "}
                              {examWithSubmissions.totalPoints}
                            </p>
                            {submission.autoGraded && (
                              <Badge variant="outline" className="mt-2">
                                Auto-Graded
                              </Badge>
                            )}
                            {hasTheoryQuestions && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Pending manual grading
                              </p>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <p className="font-semibold text-sm">
                            Answer Details:
                          </p>
                          {submission.answers.map((ans: any) => {
                            const question = examWithSubmissions.questions.find(
                              (q: any) =>
                                q.questionNumber === ans.questionNumber,
                            );
                            return (
                              <div
                                key={ans.questionNumber}
                                className={`rounded-lg border p-3 ${
                                  ans.isCorrect === true
                                    ? "border-green-400 bg-green-100"
                                    : ans.isCorrect === false
                                      ? "border-red-400 bg-red-100"
                                      : "border-gray-300 bg-gray-100"
                                }`}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline">
                                      Q{ans.questionNumber}
                                    </Badge>
                                    <Badge variant="secondary">
                                      {question?.questionType === "mcq"
                                        ? "MCQ"
                                        : "Theory"}
                                    </Badge>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-semibold text-sm text-gray-900">
                                      {ans.pointsAwarded} /{" "}
                                      {question?.points || 0} pts
                                    </span>
                                    {ans.isCorrect === true && (
                                      <CheckCircle2 className="inline ml-2 size-4 text-green-700" />
                                    )}
                                    {ans.isCorrect === false && (
                                      <span className="inline ml-2 text-red-700 font-bold">
                                        ✗
                                      </span>
                                    )}
                                    {ans.isCorrect === null && (
                                      <span className="inline ml-2 text-gray-600">
                                        (pending)
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <p className="text-sm mb-2 text-gray-900">
                                  <strong>Question:</strong>{" "}
                                  {question?.questionText}
                                </p>
                                <p className="text-sm text-gray-900">
                                  <strong>Student Answer:</strong>{" "}
                                  {question?.questionType === "mcq" ? (
                                    <span className="text-gray-900">
                                      {ans.answer}
                                      {question.options &&
                                        question.options[ans.answer] && (
                                          <span className="text-gray-800">
                                            {" "}
                                            - {question.options[ans.answer]}
                                          </span>
                                        )}
                                    </span>
                                  ) : (
                                    <span className="block mt-1 p-2 bg-white rounded border border-gray-300 text-gray-900">
                                      {ans.answer}
                                    </span>
                                  )}
                                </p>
                                {question?.questionType === "mcq" &&
                                  question.correctAnswer && (
                                    <p className="text-sm mt-2 text-green-800 font-medium">
                                      <strong>Correct Answer:</strong>{" "}
                                      {question.correctAnswer}
                                      {question.options &&
                                        question.options[
                                          question.correctAnswer
                                        ] && (
                                          <span>
                                            {" "}
                                            -{" "}
                                            {
                                              question.options[
                                                question.correctAnswer
                                              ]
                                            }
                                          </span>
                                        )}
                                    </p>
                                  )}
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                },
              )
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No submissions yet
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setViewSubmissionsDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

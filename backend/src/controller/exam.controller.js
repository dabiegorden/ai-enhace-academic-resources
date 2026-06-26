import Exam from "../models/exam.model.js";
import { broadcastToRoles } from "../controller/notification.controller.js";

// Create a new exam (draft)
export const createExam = async (req, res) => {
  try {
    const { title, durationInMinutes, course, level, examDate, examTime } =
      req.body;

    if (!title || !durationInMinutes) {
      return res.status(400).json({
        success: false,
        message: "Title and duration are required",
      });
    }

    // Scope the exam to a faculty so other faculties' students can't see it.
    // Lecturers default to their own faculty; admins may pass one explicitly
    // (or leave it null to make the exam visible to all faculties).
    let faculty = req.body.faculty || null;
    if (req.user.role === "lecturer") {
      faculty = req.user.faculty || null;
    }

    const exam = await Exam.create({
      title,
      durationInMinutes: Number.parseInt(durationInMinutes),
      createdBy: req.user.id,
      faculty,
      // Scope to a course and level so only the right students see it.
      course: course || null,
      level: level || null,
      examDate: examDate || null,
      examTime: examTime || null,
      questions: [],
      status: "draft",
    });

    await exam.populate("createdBy", "firstName lastName email");

    res.status(201).json({
      success: true,
      message: "Exam created successfully",
      data: exam,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all exams (role-scoped)
//   • admin    → every exam
//   • lecturer → only the exams they created (cannot see other lecturers')
//   • student  → only active/ended exams for their own faculty (or General)
export const getAllExams = async (req, res) => {
  try {
    const query = {};

    if (req.user.role === "lecturer") {
      query.createdBy = req.user.id;
    } else if (req.user.role === "student") {
      query.status = { $in: ["active", "ended"] };
      // Derive the student's academic level (100/200/300/400) from their year.
      const studentLevel = req.user.yearOfStudy
        ? String(req.user.yearOfStudy * 100)
        : null;
      // Faculty-scoped: own faculty OR a school-wide exam (null / "General"),
      // AND level-scoped: matching level OR a level-agnostic exam (null).
      query.$and = [
        {
          $or: [
            { faculty: req.user.faculty },
            { faculty: null },
            { faculty: "General" },
          ],
        },
        {
          $or: [
            { level: studentLevel },
            { level: null },
            { level: { $exists: false } },
          ],
        },
      ];
    }

    let examsQuery = Exam.find(query)
      .populate("createdBy", "firstName lastName email")
      .sort({ createdAt: -1 });

    // Never leak correct answers to students
    if (req.user.role === "student") {
      examsQuery = examsQuery.select("-questions.correctAnswer");
    }

    const exams = await examsQuery;

    res.status(200).json({
      success: true,
      data: exams,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get single exam
export const getExamById = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate("createdBy", "firstName lastName email")
      // Populate submission authors so the lecturer can identify students by
      // their name and student ID on the submissions list.
      .populate(
        "submissions.studentId",
        "firstName lastName email studentId faculty program",
      );

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    // A lecturer may only view their own exam (admins can view any)
    if (
      req.user.role === "lecturer" &&
      exam.createdBy._id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this exam",
      });
    }

    res.status(200).json({
      success: true,
      data: exam,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Add question to exam
export const addQuestion = async (req, res) => {
  try {
    const { questionType, questionText, options, correctAnswer, points } =
      req.body;

    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    if (exam.status !== "draft") {
      return res.status(400).json({
        success: false,
        message: "Cannot modify exam after it has started",
      });
    }

    const questionNumber = exam.questions.length + 1;

    const newQuestion = {
      questionNumber,
      questionType,
      questionText,
      points: points || 1,
    };

    if (questionType === "mcq") {
      if (!options || !correctAnswer) {
        return res.status(400).json({
          success: false,
          message: "MCQ questions require options and correct answer",
        });
      }
      newQuestion.options = options;
      newQuestion.correctAnswer = correctAnswer;
    }

    exam.questions.push(newQuestion);
    await exam.save();

    res.status(200).json({
      success: true,
      message: "Question added successfully",
      data: exam,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Remove question from exam
export const removeQuestion = async (req, res) => {
  try {
    const { questionNumber } = req.params;

    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    if (exam.status !== "draft") {
      return res.status(400).json({
        success: false,
        message: "Cannot modify exam after it has started",
      });
    }

    exam.questions = exam.questions.filter(
      (q) => q.questionNumber !== Number.parseInt(questionNumber),
    );

    // Renumber questions
    exam.questions.forEach((q, index) => {
      q.questionNumber = index + 1;
    });

    await exam.save();

    res.status(200).json({
      success: true,
      message: "Question removed successfully",
      data: exam,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Start exam
export const startExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam)
      return res
        .status(404)
        .json({ success: false, message: "Exam not found" });
    if (exam.questions.length === 0)
      return res
        .status(400)
        .json({
          success: false,
          message: "Cannot start exam without questions",
        });
    if (exam.status === "active")
      return res
        .status(400)
        .json({ success: false, message: "Exam is already active" });

    exam.status = "active";
    exam.startedAt = new Date();
    // NOTE: We intentionally do NOT set a global endedAt here. Each student
    // gets their own durationInMinutes counted from when they personally open
    // the exam (see getExamForStudent / studentSessions). The exam stays open
    // until the lecturer ends it, so students joining later still get the full
    // allotted time instead of seeing "exam expired".
    exam.endedAt = undefined;
    await exam.save();

    // Notify all students
    const io = req.app.get("io");
    await broadcastToRoles({
      roles: ["student"],
      type: "exam",
      title: "📋 Exam Started: " + exam.title,
      message:
        "An exam has started. You have " +
        exam.durationInMinutes +
        " minutes. Join now!",
      relatedId: exam._id,
      relatedModel: "Exam",
      metadata: {
        durationInMinutes: exam.durationInMinutes,
        endedAt: exam.endedAt,
      },
      io,
    });

    res
      .status(200)
      .json({
        success: true,
        message: "Exam started successfully",
        data: exam,
      });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// End exam
export const endExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    exam.status = "ended";
    exam.endedAt = new Date();

    await exam.save();

    res.status(200).json({
      success: true,
      message: "Exam ended successfully",
      data: exam,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Submit exam (for students)
export const submitExam = async (req, res) => {
  try {
    const { answers } = req.body;

    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    if (exam.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Exam is not active",
      });
    }

    // Check if student already submitted
    const existingSubmission = exam.submissions.find(
      (sub) => sub.studentId.toString() === req.user.id,
    );

    if (existingSubmission) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted this exam",
      });
    }

    // Enforce the student's PERSONAL deadline (full duration from when they
    // opened the exam), not a shared global window. A small grace period is
    // allowed so an auto-submit fired exactly at zero still goes through.
    const session = exam.studentSessions.find(
      (s) => s.studentId.toString() === req.user.id,
    );
    if (session) {
      const graceMs = 10 * 1000;
      if (Date.now() > new Date(session.deadline).getTime() + graceMs) {
        return res.status(400).json({
          success: false,
          message: "Your exam time has expired",
        });
      }
    }

    // Auto-grade MCQ questions
    const gradedAnswers = answers.map((ans) => {
      const question = exam.questions.find(
        (q) => q.questionNumber === ans.questionNumber,
      );

      if (question.questionType === "mcq") {
        const isCorrect = ans.answer === question.correctAnswer;
        return {
          questionNumber: ans.questionNumber,
          answer: ans.answer,
          isCorrect,
          pointsAwarded: isCorrect ? question.points : 0,
        };
      }

      // Theory questions need manual grading
      return {
        questionNumber: ans.questionNumber,
        answer: ans.answer,
        isCorrect: null,
        pointsAwarded: 0,
      };
    });

    const totalScore = gradedAnswers.reduce(
      (sum, ans) => sum + (ans.pointsAwarded || 0),
      0,
    );

    exam.submissions.push({
      studentId: req.user.id,
      answers: gradedAnswers,
      totalScore,
      submittedAt: new Date(),
      autoGraded: true,
    });

    await exam.save();

    res.status(200).json({
      success: true,
      message: "Exam submitted successfully",
      data: {
        totalScore,
        answers: gradedAnswers,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get exam for student (hide correct answers)
export const getExamForStudent = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    if (exam.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Exam is not active",
      });
    }

    // Faculty eligibility — students may only sit exams for their own faculty
    // (or school-wide exams with no faculty / "General").
    if (
      exam.faculty &&
      exam.faculty !== "General" &&
      exam.faculty !== req.user.faculty
    ) {
      return res.status(403).json({
        success: false,
        message: "This exam is not available for your faculty",
      });
    }

    // Level eligibility — a level-specific exam is only for students of that
    // level (a null level means it's open to all levels).
    const studentLevel = req.user.yearOfStudy
      ? String(req.user.yearOfStudy * 100)
      : null;
    if (exam.level && exam.level !== studentLevel) {
      return res.status(403).json({
        success: false,
        message: "This exam is not available for your level",
      });
    }

    // Block re-taking after a submission
    const alreadySubmitted = exam.submissions.some(
      (sub) => sub.studentId.toString() === req.user.id,
    );
    if (alreadySubmitted) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted this exam",
      });
    }

    // Find or create this student's personal timing session. The deadline is
    // fixed the first time they open the exam, so refreshing / reopening on
    // another device does NOT reset or invalidate their remaining time.
    let session = exam.studentSessions.find(
      (s) => s.studentId.toString() === req.user.id,
    );
    if (!session) {
      const startedAt = new Date();
      const deadline = new Date(
        startedAt.getTime() + exam.durationInMinutes * 60 * 1000,
      );
      exam.studentSessions.push({ studentId: req.user.id, startedAt, deadline });
      await exam.save();
      session = { startedAt, deadline };
    } else if (new Date() > new Date(session.deadline)) {
      return res.status(400).json({
        success: false,
        message: "Your exam time has expired",
      });
    }

    // Remove correct answers from questions
    const sanitizedQuestions = exam.questions.map((q) => {
      const question = q.toObject();
      if (question.questionType === "mcq") {
        delete question.correctAnswer;
      }
      return question;
    });

    res.status(200).json({
      success: true,
      data: {
        _id: exam._id,
        title: exam.title,
        durationInMinutes: exam.durationInMinutes,
        // Per-student timing: the frontend countdown uses endedAt, so we hand
        // back THIS student's personal deadline rather than a shared one.
        startedAt: session.startedAt,
        endedAt: session.deadline,
        questions: sanitizedQuestions,
        totalPoints: exam.totalPoints,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get my exams (for students) — faculty-scoped
export const getMyExams = async (req, res) => {
  try {
    const studentLevel = req.user.yearOfStudy
      ? String(req.user.yearOfStudy * 100)
      : null;
    const exams = await Exam.find({
      status: "active",
      $and: [
        {
          $or: [
            { faculty: req.user.faculty },
            { faculty: null },
            { faculty: "General" },
          ],
        },
        {
          $or: [
            { level: studentLevel },
            { level: null },
            { level: { $exists: false } },
          ],
        },
      ],
    })
      .select("-questions.correctAnswer")
      .sort({ startedAt: -1 });

    res.status(200).json({
      success: true,
      data: exams,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get my exams submissions (for students)
export const getMyExamsSubmissions = async (req, res) => {
  try {
    // Get the logged-in student's ID from auth middleware
    const studentId = req.user.id;

    // Find all exams where this student has submitted
    const exams = await Exam.find({
      "submissions.studentId": studentId,
    }).sort({ startedAt: -1 });

    // Extract only this student's submissions with exam details
    const mySubmissions = [];

    exams.forEach((exam) => {
      // Find the submission for this specific student
      const studentSubmission = exam.submissions.find(
        (sub) => sub.studentId.toString() === studentId,
      );

      if (studentSubmission) {
        mySubmissions.push({
          _id: studentSubmission._id,
          examId: exam._id,
          examTitle: exam.title,
          studentId: studentSubmission.studentId,
          answers: studentSubmission.answers,
          totalScore: studentSubmission.totalScore,
          submittedAt: studentSubmission.submittedAt,
          autoGraded: studentSubmission.autoGraded,
          exam: {
            _id: exam._id,
            title: exam.title,
            totalPoints: exam.totalPoints,
            questions: exam.questions,
          },
        });
      }
    });

    res.status(200).json({
      success: true,
      data: mySubmissions,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get exam results
export const getExamResults = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id).populate(
      "submissions.studentId",
      "firstName lastName email studentId faculty program",
    );

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    // Lecturers can only see results for their own exams
    if (
      req.user.role === "lecturer" &&
      exam.createdBy.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view these results",
      });
    }

    res.status(200).json({
      success: true,
      data: exam.submissions,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Grade theory question
export const gradeTheoryQuestion = async (req, res) => {
  try {
    const { studentId, questionNumber, pointsAwarded } = req.body;

    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    const submission = exam.submissions.find(
      (sub) => sub.studentId.toString() === studentId,
    );

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found",
      });
    }

    const answerIndex = submission.answers.findIndex(
      (ans) => ans.questionNumber === questionNumber,
    );

    if (answerIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Answer not found",
      });
    }

    submission.answers[answerIndex].pointsAwarded = pointsAwarded;
    submission.answers[answerIndex].isCorrect = pointsAwarded > 0;

    // Recalculate total score
    submission.totalScore = submission.answers.reduce(
      (sum, ans) => sum + (ans.pointsAwarded || 0),
      0,
    );

    await exam.save();

    res.status(200).json({
      success: true,
      message: "Theory question graded successfully",
      data: submission,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Update exam
export const updateExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    if (exam.status !== "draft") {
      return res.status(400).json({
        success: false,
        message: "Cannot update exam that has started or ended",
      });
    }

    const { title, durationInMinutes, course, level, examDate, examTime } =
      req.body;

    if (title) exam.title = title;
    if (durationInMinutes) exam.durationInMinutes = durationInMinutes;
    if (course !== undefined) exam.course = course || null;
    if (level !== undefined) exam.level = level || null;
    if (examDate !== undefined) exam.examDate = examDate || null;
    if (examTime !== undefined) exam.examTime = examTime || null;

    await exam.save();

    res.status(200).json({
      success: true,
      message: "Exam updated successfully",
      data: exam,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete exam
export const deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    await exam.deleteOne();

    res.status(200).json({
      success: true,
      message: "Exam deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

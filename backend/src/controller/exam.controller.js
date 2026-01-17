import Exam from "../models/exam.model.js";

// Create a new exam (draft)
export const createExam = async (req, res) => {
  try {
    const { title, durationInMinutes } = req.body;

    if (!title || !durationInMinutes) {
      return res.status(400).json({
        success: false,
        message: "Title and duration are required",
      });
    }

    const exam = await Exam.create({
      title,
      durationInMinutes: Number.parseInt(durationInMinutes),
      createdBy: req.user.id,
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

// Get all exams
export const getAllExams = async (req, res) => {
  try {
    const exams = await Exam.find()
      .populate("createdBy", "firstName lastName email")
      .sort({ createdAt: -1 });

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
    const exam = await Exam.findById(req.params.id).populate(
      "createdBy",
      "firstName lastName email",
    );

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
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

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    if (exam.questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot start exam without questions",
      });
    }

    if (exam.status === "active") {
      return res.status(400).json({
        success: false,
        message: "Exam is already active",
      });
    }

    exam.status = "active";
    exam.startedAt = new Date();
    exam.endedAt = new Date(Date.now() + exam.durationInMinutes * 60 * 1000);

    await exam.save();

    res.status(200).json({
      success: true,
      message: "Exam started successfully",
      data: exam,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
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

    // Check if time has expired
    if (new Date() > exam.endedAt) {
      return res.status(400).json({
        success: false,
        message: "Exam time has expired",
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
        startedAt: exam.startedAt,
        endedAt: exam.endedAt,
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

// Get my exams (for students)
export const getMyExams = async (req, res) => {
  try {
    const exams = await Exam.find({ status: "active" })
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

// Get exam results
export const getExamResults = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id).populate(
      "submissions.studentId",
      "firstName lastName email",
    );

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
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

    const { title, durationInMinutes } = req.body;

    if (title) exam.title = title;
    if (durationInMinutes) exam.durationInMinutes = durationInMinutes;

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

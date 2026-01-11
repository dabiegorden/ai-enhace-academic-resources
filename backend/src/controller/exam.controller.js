import Exam from "../models/exam.model.js";

// @desc    Create exam
// @route   POST /api/exams
// @access  Private (Lecturer/Admin)
export const createExam = async (req, res) => {
  try {
    const {
      title,
      description,
      course,
      courseCode,
      faculty,
      program,
      yearOfStudy,
      duration,
      startDate,
      endDate,
      passingScore,
      lectureNoteIds,
    } = req.body;

    if (
      !title ||
      !course ||
      !courseCode ||
      !faculty ||
      !program ||
      !yearOfStudy ||
      !duration ||
      !startDate ||
      !endDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    const exam = await Exam.create({
      title,
      description,
      course,
      courseCode,
      faculty,
      program,
      yearOfStudy: Number.parseInt(yearOfStudy),
      lecturer: req.user.id,
      duration: Number.parseInt(duration),
      startDate,
      endDate,
      passingScore: passingScore || 50,
      lectureNotes: lectureNoteIds || [],
      questions: [],
      totalPoints: 0,
    });

    await exam.populate("lecturer", "firstName lastName email");

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

// @desc    Add questions to exam
// @route   POST /api/exams/:id/questions
// @access  Private (Lecturer/Admin)
export const addQuestions = async (req, res) => {
  try {
    const { questions } = req.body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid questions array",
      });
    }

    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    // Check authorization
    if (exam.lecturer.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to modify this exam",
      });
    }

    // Add questions and calculate total points
    exam.questions.push(...questions);
    exam.totalPoints = exam.questions.reduce((sum, q) => sum + q.points, 0);

    await exam.save();

    res.status(200).json({
      success: true,
      message: "Questions added successfully",
      data: exam,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all exams
// @route   GET /api/exams
// @access  Private
export const getAllExams = async (req, res) => {
  try {
    const {
      faculty,
      program,
      yearOfStudy,
      course,
      status,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};

    if (faculty) query.faculty = faculty;
    if (program) query.program = program;
    if (yearOfStudy) query.yearOfStudy = Number.parseInt(yearOfStudy);
    if (course) query.course = { $regex: course, $options: "i" };

    // Filter by status
    const now = new Date();
    if (status === "upcoming") {
      query.startDate = { $gt: now };
      query.isActive = true;
    } else if (status === "ongoing") {
      query.startDate = { $lte: now };
      query.endDate = { $gte: now };
      query.isActive = true;
    } else if (status === "completed") {
      query.endDate = { $lt: now };
    }

    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit);

    const exams = await Exam.find(query)
      .populate("lecturer", "firstName lastName email")
      .select("-questions")
      .sort({ startDate: -1 })
      .skip(skip)
      .limit(Number.parseInt(limit));

    const total = await Exam.countDocuments(query);

    res.status(200).json({
      success: true,
      count: exams.length,
      total,
      page: Number.parseInt(page),
      pages: Math.ceil(total / Number.parseInt(limit)),
      data: exams,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get my exams (for students)
// @route   GET /api/exams/my-exams
// @access  Private (Student)
export const getMyExams = async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({
        success: false,
        message: "This endpoint is only for students",
      });
    }

    const { status, page = 1, limit = 20 } = req.query;

    const query = {
      faculty: req.user.faculty,
      program: req.user.program,
      yearOfStudy: req.user.yearOfStudy,
      isActive: true,
    };

    const now = new Date();
    if (status === "upcoming") {
      query.startDate = { $gt: now };
    } else if (status === "available") {
      query.startDate = { $lte: now };
      query.endDate = { $gte: now };
    }

    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit);

    const exams = await Exam.find(query)
      .populate("lecturer", "firstName lastName email")
      .select("-questions.correctAnswer")
      .sort({ startDate: 1 })
      .skip(skip)
      .limit(Number.parseInt(limit));

    // Check if student has taken each exam
    const examsWithStatus = exams.map((exam) => {
      const result = exam.results.find(
        (r) => r.student.toString() === req.user.id
      );
      return {
        ...exam.toObject(),
        myResult: result || null,
        hasTaken: !!result,
      };
    });

    const total = await Exam.countDocuments(query);

    res.status(200).json({
      success: true,
      count: examsWithStatus.length,
      total,
      page: Number.parseInt(page),
      pages: Math.ceil(total / Number.parseInt(limit)),
      data: examsWithStatus,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get exam by ID
// @route   GET /api/exams/:id
// @access  Private
export const getExamById = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate("lecturer", "firstName lastName email")
      .populate("lectureNotes", "title course");

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    // If student, hide correct answers
    if (req.user.role === "student") {
      const examObj = exam.toObject();
      examObj.questions = examObj.questions.map((q) => ({
        _id: q._id,
        question: q.question,
        type: q.type,
        options: q.options,
        points: q.points,
      }));
      return res.status(200).json({
        success: true,
        data: examObj,
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

// @desc    Take exam (submit answers)
// @route   POST /api/exams/:id/take
// @access  Private (Student)
export const takeExam = async (req, res) => {
  try {
    const { answers, timeTaken } = req.body;

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        message: "Please provide answers",
      });
    }

    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    // Check if exam is available
    const now = new Date();
    if (now < new Date(exam.startDate) || now > new Date(exam.endDate)) {
      return res.status(400).json({
        success: false,
        message: "Exam is not available at this time",
      });
    }

    // Check if already taken
    const existingResult = exam.results.find(
      (r) => r.student.toString() === req.user.id
    );
    if (existingResult) {
      return res.status(400).json({
        success: false,
        message: "You have already taken this exam",
      });
    }

    // Grade the exam
    let score = 0;
    const gradedAnswers = answers.map((answer) => {
      const question = exam.questions.id(answer.questionId);
      if (
        question &&
        answer.answer.toLowerCase().trim() ===
          question.correctAnswer.toLowerCase().trim()
      ) {
        score += question.points;
      }
      return answer;
    });

    const percentage = (score / exam.totalPoints) * 100;

    // Save result
    exam.results.push({
      student: req.user.id,
      answers: gradedAnswers,
      score,
      totalPoints: exam.totalPoints,
      percentage: percentage.toFixed(2),
      timeTaken: timeTaken || exam.duration,
    });

    await exam.save();

    res.status(201).json({
      success: true,
      message: "Exam submitted successfully",
      data: {
        score,
        totalPoints: exam.totalPoints,
        percentage: percentage.toFixed(2),
        passed: percentage >= exam.passingScore,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get exam results
// @route   GET /api/exams/:id/results
// @access  Private (Lecturer/Admin)
export const getExamResults = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id).populate(
      "results.student",
      "firstName lastName email studentId"
    );

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    // Check authorization
    if (exam.lecturer.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view exam results",
      });
    }

    res.status(200).json({
      success: true,
      data: exam.results,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update exam
// @route   PUT /api/exams/:id
// @access  Private (Lecturer/Admin)
export const updateExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    // Check authorization
    if (exam.lecturer.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this exam",
      });
    }

    const {
      title,
      description,
      duration,
      startDate,
      endDate,
      passingScore,
      isActive,
    } = req.body;

    if (title) exam.title = title;
    if (description) exam.description = description;
    if (duration) exam.duration = duration;
    if (startDate) exam.startDate = startDate;
    if (endDate) exam.endDate = endDate;
    if (passingScore) exam.passingScore = passingScore;
    if (isActive !== undefined) exam.isActive = isActive;

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

// @desc    Delete exam
// @route   DELETE /api/exams/:id
// @access  Private (Lecturer/Admin)
export const deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    // Check authorization
    if (exam.lecturer.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this exam",
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

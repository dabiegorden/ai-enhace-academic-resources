import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  questionNumber: {
    type: Number,
    required: true,
  },
  questionType: {
    type: String,
    enum: ["mcq", "theory"],
    required: true,
  },
  questionText: {
    type: String,
    required: true,
  },
  // For MCQ questions only
  options: {
    A: String,
    B: String,
    C: String,
    D: String,
  },
  correctAnswer: {
    type: String,
    enum: ["A", "B", "C", "D", ""],
    default: "",
  },
  points: {
    type: Number,
    default: 1,
  },
});

// Per-student exam session. Each student gets the full durationInMinutes
// counted from the moment THEY personally open the exam — independent of when
// the lecturer started it or when other students join. This prevents the
// "exam already expired" problem when students log in on different machines /
// at different times within the exam's open window.
const studentSessionSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    // Personal deadline = startedAt + durationInMinutes
    deadline: {
      type: Date,
      required: true,
    },
  },
  { _id: false },
);

const submissionSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  answers: [
    {
      questionNumber: Number,
      answer: String,
      isCorrect: Boolean,
      pointsAwarded: Number,
    },
  ],
  totalScore: {
    type: Number,
    default: 0,
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
  autoGraded: {
    type: Boolean,
    default: false,
  },
});

const examSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Faculty the exam belongs to. Set from the creating lecturer's faculty so
    // students from other faculties cannot see it. A null / "General" value
    // means the exam is visible to every faculty (e.g. admin-wide exams).
    faculty: {
      type: String,
      default: null,
    },
    // Program the exam targets (e.g. "Computer Science"). A null / "General"
    // value means the exam is open to every program within the faculty.
    program: {
      type: String,
      default: null,
    },
    // Course/subject the exam is for. Scopes the exam to students taking it.
    course: {
      type: String,
      default: null,
    },
    // Academic level the exam targets: "100"–"400". A null value means the
    // exam is open to every level within the faculty.
    level: {
      type: String,
      enum: ["100", "200", "300", "400", null],
      default: null,
    },
    // Scheduled date and time of the examination (when it takes place).
    examDate: {
      type: Date,
      default: null,
    },
    examTime: {
      type: String,
      default: null,
    },
    questions: [questionSchema],
    durationInMinutes: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "active", "ended"],
      default: "draft",
    },
    startedAt: {
      type: Date,
    },
    endedAt: {
      type: Date,
    },
    totalPoints: {
      type: Number,
      default: 0,
    },
    submissions: [submissionSchema],
    // Active per-student timing sessions (see studentSessionSchema above)
    studentSessions: [studentSessionSchema],
  },
  {
    timestamps: true,
  },
);

// Calculate total points before saving
examSchema.pre("save", async function () {
  if (this.questions && this.questions.length > 0) {
    this.totalPoints = this.questions.reduce(
      (sum, q) => sum + (q.points || 0),
      0,
    );
  } else {
    this.totalPoints = 0;
  }
});

const Exam = mongoose.models.Exam || mongoose.model("Exam", examSchema);

export default Exam;

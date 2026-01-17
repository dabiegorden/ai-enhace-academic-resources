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
  }
});

const Exam = mongoose.models.Exam || mongoose.model("Exam", examSchema);

export default Exam;

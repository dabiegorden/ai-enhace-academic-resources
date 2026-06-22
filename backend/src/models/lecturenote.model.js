import mongoose from "mongoose";

// ─── Quiz question sub-schema ─────────────────────────────────────────────────
const quizQuestionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    type: {
      type: String,
      enum: ["multiple-choice", "true-false", "short-answer"],
      required: true,
    },
    // Only present for multiple-choice questions
    options: [{ type: String }],
    correctAnswer: { type: String, required: true },
    explanation: { type: String },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    points: { type: Number, default: 1 },
  },
  { _id: false },
);

// ─── Main schema ──────────────────────────────────────────────────────────────
const lectureNoteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    course: {
      type: String,
      required: [true, "Course is required"],
    },
    courseCode: {
      type: String,
      required: [true, "Course code is required"],
    },
    faculty: {
      type: String,
      required: [true, "Faculty is required"],
    },
    program: {
      type: String,
      required: [true, "Program is required"],
    },
    yearOfStudy: {
      type: Number,
      required: [true, "Year of study is required"],
    },
    // Semester the note belongs to: "1" or "2". Defaults to "1" for legacy
    // notes created before this field existed.
    semester: {
      type: String,
      enum: ["1", "2"],
      default: "1",
    },

    // ── File fields — PDF and images only ──────────────────────────────────
    // Files are stored on Cloudinary (persistent across deploys/machines).
    // `fileUrl` is the public delivery URL and `cloudinaryId` the public_id
    // used for deletion. `filename` is kept for backwards-compatibility with
    // any legacy notes that were stored on the local disk.
    fileUrl: {
      type: String,
    },
    cloudinaryId: {
      type: String,
    },
    filename: {
      type: String,
    },
    originalName: {
      type: String,
      required: [true, "Original filename is required"],
    },
    /**
     * fileType is now restricted to PDF and image extensions only.
     * The upload middleware enforces the same constraint so these two
     * sources of truth stay in sync.
     */
    fileType: {
      type: String,
      enum: ["pdf", "jpg", "jpeg", "png", "webp", "gif"],
      required: true,
    },
    fileSize: {
      type: Number,
    },

    // ── Ownership ─────────────────────────────────────────────────────────
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ── AI-generated fields ────────────────────────────────────────────────
    /** Plain-text or markdown summary produced by the AI pipeline */
    aiSummary: {
      type: String,
    },

    /**
     * Auto-generated quiz questions derived from the note content.
     * Stored so repeated requests return the cached set without
     * re-calling the AI model.
     */
    aiQuiz: {
      questions: [quizQuestionSchema],
      generatedAt: { type: Date },
      difficulty: {
        type: String,
        enum: ["easy", "medium", "hard", "mixed"],
        default: "mixed",
      },
    },

    /**
     * AI-generated recommendations for this note — related topics, further
     * reading suggestions, study tips, and prerequisite concepts.
     */
    aiRecommendations: {
      content: { type: String }, // Markdown / plain-text advice block
      relatedTopics: [{ type: String }],
      studyTips: [{ type: String }],
      prerequisites: [{ type: String }],
      furtherReading: [{ type: String }],
      generatedAt: { type: Date },
    },

    // ── Engagement stats ───────────────────────────────────────────────────
    downloads: { type: Number, default: 0 },
    views: { type: Number, default: 0 },

    tags: [{ type: String }],
  },
  { timestamps: true },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
lectureNoteSchema.index({ course: 1, faculty: 1, program: 1, yearOfStudy: 1 });
lectureNoteSchema.index({ title: "text", description: "text" });

const LectureNote =
  mongoose.models.LectureNote ||
  mongoose.model("LectureNote", lectureNoteSchema);

export default LectureNote;

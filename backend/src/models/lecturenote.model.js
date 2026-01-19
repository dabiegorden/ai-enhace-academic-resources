import mongoose from "mongoose";

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
    // Updated to match timetable document structure
    filename: {
      type: String,
      required: [true, "Filename is required"],
    },
    originalName: {
      type: String,
      required: [true, "Original filename is required"],
    },
    fileType: {
      type: String,
      enum: ["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx"],
      required: true,
    },
    fileSize: {
      type: Number,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    aiSummary: {
      type: String,
    },
    downloads: {
      type: Number,
      default: 0,
    },
    views: {
      type: Number,
      default: 0,
    },
    tags: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  },
);

// Index for efficient searching
lectureNoteSchema.index({ course: 1, faculty: 1, program: 1, yearOfStudy: 1 });
lectureNoteSchema.index({ title: "text", description: "text" });

const LectureNote =
  mongoose.models.LectureNote ||
  mongoose.model("LectureNote", lectureNoteSchema);

export default LectureNote;

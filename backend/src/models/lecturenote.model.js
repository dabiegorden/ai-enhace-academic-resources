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
    fileUrl: {
      type: String,
      required: [true, "File URL is required"],
    },
    fileType: {
      type: String,
      enum: ["pdf", "doc", "docx", "ppt", "pptx"],
      required: true,
    },
    fileSize: {
      type: Number,
    },
    cloudinaryId: {
      type: String,
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
  }
);

// Index for efficient searching
lectureNoteSchema.index({ course: 1, faculty: 1, program: 1, yearOfStudy: 1 });
lectureNoteSchema.index({ title: "text", description: "text" });

const LectureNote = mongoose.model("LectureNote", lectureNoteSchema);

export default LectureNote;

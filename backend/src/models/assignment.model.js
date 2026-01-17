import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  fileUrl: {
    type: String,
    required: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  filePath: {
    type: String,
    required: true,
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
  grade: {
    type: Number,
    min: 0,
    max: 100,
  },
  feedback: {
    type: String,
  },
  status: {
    type: String,
    enum: ["submitted", "graded", "late"],
    default: "submitted",
  },
});

const assignmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
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
    lecturer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    dueDate: {
      type: Date,
      required: [true, "Due date is required"],
    },
    totalMarks: {
      type: Number,
      required: [true, "Total marks is required"],
      default: 100,
    },
    attachments: [
      {
        url: String,
        filePath: String,
        fileName: String,
        fileType: String,
        fileSize: Number,
      },
    ],
    submissions: [submissionSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

const Assignment =
  mongoose.models.Assignment || mongoose.model("Assignment", assignmentSchema);

export default Assignment;

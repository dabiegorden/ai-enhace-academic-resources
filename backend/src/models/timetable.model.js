import mongoose from "mongoose";

const courseSessionSchema = new mongoose.Schema(
  {
    courseCode: {
      type: String,
      required: false,
    },
    courseName: String,
    lecturer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    location: String,
    room: String,
    lecturer_initials: String,
  },
  { _id: false }
); // Added _id: false to prevent sub-document IDs

const timeSlotSchema = new mongoose.Schema({
  slotNumber: {
    type: Number,
    required: true,
  },
  startTime: {
    type: String,
    required: true,
  },
  endTime: {
    type: String,
    required: true,
  },
  monday: courseSessionSchema,
  tuesday: courseSessionSchema,
  wednesday: courseSessionSchema,
  thursday: courseSessionSchema,
  friday: courseSessionSchema,
});

const timetableDocumentSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
  },
  originalName: {
    type: String,
    required: true,
  },
  fileType: {
    type: String,
    enum: ["pdf", "excel"],
    required: true,
  },
  fileSize: Number,
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

const timetableSchema = new mongoose.Schema(
  {
    programCode: {
      type: String,
      required: [true, "Program code is required"],
    },
    programName: {
      type: String,
      required: true,
    },
    yearOfStudy: {
      type: Number,
      required: [true, "Year of study is required"],
    },
    level: {
      type: String,
      enum: ["100", "200", "300", "400"],
      required: true,
    },
    faculty: {
      type: String,
      required: [true, "Faculty is required"],
    },
    semester: {
      type: String,
      enum: ["1", "2"],
      required: [true, "Semester is required"],
    },
    academicYear: {
      type: String,
      required: [true, "Academic year is required"],
    },
    specialization: String,
    timeSlots: [timeSlotSchema],
    breakTime: {
      startTime: {
        type: String,
        default: "11:00",
      },
      endTime: {
        type: String,
        default: "12:00",
      },
      name: {
        type: String,
        default: "MASS BREAK",
      },
    },
    timetableDocument: timetableDocumentSchema,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

timetableSchema.index({ programCode: 1, academicYear: 1, semester: 1 });
timetableSchema.index({ yearOfStudy: 1, faculty: 1, academicYear: 1 });

export default mongoose.models.Timetable ||
  mongoose.model("Timetable", timetableSchema);

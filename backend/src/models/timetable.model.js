import mongoose from "mongoose";

const courseSessionSchema = new mongoose.Schema({
  courseCode: {
    type: String,
    required: true,
  },
  courseName: String,
  lecturer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  location: String, // e.g., "DAGF2B", "SMDGF2B"
  room: String,
  lecturer_initials: String, // e.g., "DAG", "SMD"
});

// Time slot schema for each day-time intersection
const timeSlotSchema = new mongoose.Schema({
  slotNumber: {
    type: Number,
    required: true, // 1-10 for 7am-6pm
  },
  startTime: {
    type: String,
    required: true, // Format: "07:00"
  },
  endTime: {
    type: String,
    required: true, // Format: "08:00"
  },
  monday: courseSessionSchema,
  tuesday: courseSessionSchema,
  wednesday: courseSessionSchema,
  thursday: courseSessionSchema,
  friday: courseSessionSchema,
});

const timetableSchema = new mongoose.Schema(
  {
    programCode: {
      type: String,
      required: [true, "Program code is required"], // e.g., "SBIT101", "DIP100", "EBA300"
    },
    programName: {
      type: String,
      required: true, // e.g., "Software Business IT", "Banking and Finance"
    },
    yearOfStudy: {
      type: Number,
      required: [true, "Year of study is required"], // 1, 2, 3, 4
    },
    level: {
      type: String,
      enum: ["100", "200", "300", "400"], // For easier filtering
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
      required: [true, "Academic year is required"], // Format: "2025/2026"
    },
    specialization: String, // For differentiated programs e.g., "Accounting", "HRM"
    timeSlots: [timeSlotSchema],
    breakTime: {
      // MASS BREAK
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

// Index for efficient queries
timetableSchema.index({ programCode: 1, academicYear: 1, semester: 1 });
timetableSchema.index({ yearOfStudy: 1, faculty: 1, academicYear: 1 });

export default mongoose.model("Timetable", timetableSchema);

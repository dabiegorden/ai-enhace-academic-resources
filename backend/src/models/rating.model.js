import mongoose from "mongoose";

const ratingSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["course", "lecturer"],
      required: true,
    },
    course: {
      type: String,
      required: function () {
        return this.type === "course";
      },
    },
    courseCode: {
      type: String,
      required: function () {
        return this.type === "course";
      },
    },
    lecturer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function () {
        return this.type === "lecturer";
      },
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
    },
    aspects: {
      contentQuality: { type: Number, min: 1, max: 5 },
      teachingMethod: { type: Number, min: 1, max: 5 },
      availability: { type: Number, min: 1, max: 5 },
      fairness: { type: Number, min: 1, max: 5 },
    },
    isAnonymous: {
      type: Boolean,
      default: true,
    },
    academicYear: {
      type: String,
      required: true,
    },
    semester: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure one rating per student per course/lecturer per semester
ratingSchema.index(
  { student: 1, type: 1, course: 1, semester: 1 },
  { unique: true, sparse: true }
);
ratingSchema.index(
  { student: 1, type: 1, lecturer: 1, semester: 1 },
  { unique: true, sparse: true }
);

export default mongoose.models.Rating || mongoose.model("Rating", ratingSchema);

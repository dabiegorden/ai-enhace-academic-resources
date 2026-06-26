import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    content: {
      type: String,
      required: [true, "Content is required"],
    },
    type: {
      type: String,
      enum: ["general", "faculty", "academic", "event", "urgent"],
      required: true,
    },
    faculty: {
      type: String,
      required: function () {
        return this.type === "faculty";
      },
    },
    // Target year/level of study. 0 means "All years" (visible to every level).
    targetYear: {
      type: Number,
      default: 0,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    attachments: [
      {
        url: String,
        cloudinaryId: String,
        // Store original filename and mime type so the frontend
        // can display a meaningful label and icon for each attachment
        originalName: String,
        mimeType: String,
      },
    ],
    isPinned: {
      type: Boolean,
      default: false,
    },
    expiryDate: {
      type: Date,
    },
    views: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.models.Announcement ||
  mongoose.model("Announcement", announcementSchema);

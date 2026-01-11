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
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    attachments: [
      {
        url: String,
        cloudinaryId: String,
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
  }
);

const Announcement = mongoose.model("Announcement", announcementSchema);

export default Announcement;

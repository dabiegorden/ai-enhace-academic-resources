import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "lecture-reminder",
        "exam-reminder",
        "assignment",
        "announcement",
        "chat",
        "voting",
        "general",
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    relatedModel: {
      type: String,
      enum: [
        "Timetable",
        "Exam",
        "Assignment",
        "Announcement",
        "ChatRoom",
        "Voting",
      ],
    },
    scheduledFor: {
      type: Date, // For scheduled notifications like reminders
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    isSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
notificationSchema.index({ user: 1, isRead: 1 });
notificationSchema.index({ scheduledFor: 1, isSent: 1 });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;

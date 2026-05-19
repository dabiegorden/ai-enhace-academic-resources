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
        "exam",
        "assignment",
        "announcement",
        "chat",
        "voting",
        "general",
        // file/upload types
        "upload",
        "room_upload",
        // content types
        "note",
        "timetable",
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
        "Note",
      ],
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    scheduledFor: {
      type: Date,
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
  },
);

notificationSchema.index({ user: 1, isRead: 1 });
notificationSchema.index({ scheduledFor: 1, isSent: 1 });

export default mongoose.models.Notification ||
  mongoose.model("Notification", notificationSchema);

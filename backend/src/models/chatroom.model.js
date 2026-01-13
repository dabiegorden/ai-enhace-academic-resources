import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const chatRoomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Chat room name is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ["course", "faculty", "program", "general"],
      required: true,
    },
    course: {
      type: String,
      required: function () {
        return this.type === "course";
      },
    },
    faculty: {
      type: String,
      required: function () {
        return this.type === "faculty" || this.type === "program";
      },
    },
    program: {
      type: String,
      required: function () {
        return this.type === "program";
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    messages: [messageSchema],
    aiSummary: {
      type: String,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Update last activity on new message
chatRoomSchema.pre("save", function (next) {
  if (this.isModified("messages")) {
    this.lastActivity = Date.now();
  }
  next();
});

export default mongoose.models.ChatRoom ||
  mongoose.model("ChatRoom", chatRoomSchema);

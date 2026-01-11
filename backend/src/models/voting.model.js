import mongoose from "mongoose";

const candidateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  studentId: {
    type: String,
    required: true,
  },
  position: {
    type: String,
    required: true,
  },
  manifesto: {
    type: String,
  },
  imageUrl: {
    type: String,
  },
  votes: {
    type: Number,
    default: 0,
  },
});

const voteRecordSchema = new mongoose.Schema({
  voter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  votedAt: {
    type: Date,
    default: Date.now,
  },
});

const votingSchema = new mongoose.Schema(
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
    type: {
      type: String,
      enum: ["src", "faculty"],
      required: true,
    },
    faculty: {
      type: String,
      required: function () {
        return this.type === "faculty";
      },
    },
    positions: [
      {
        type: String,
        required: true,
      },
    ],
    candidates: [candidateSchema],
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },
    eligibleVoters: {
      faculty: String,
      yearOfStudy: [Number],
      programs: [String],
    },
    voteRecords: [voteRecordSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
    resultsPublished: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure one vote per user per voting
votingSchema.index(
  { "voteRecords.voter": 1, _id: 1 },
  { unique: true, sparse: true }
);

const Voting = mongoose.model("Voting", votingSchema);

export default Voting;

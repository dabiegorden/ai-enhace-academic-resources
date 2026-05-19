import mongoose from "mongoose";

// ---------------------------------------------------------------------------
// Candidate sub-document
// ---------------------------------------------------------------------------
const candidateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  studentId: { type: String, required: true },
  position: { type: String, required: true },
  manifesto: { type: String },
  manifestoFileUrl: { type: String, default: null },
  imageUrl: { type: String },
  votes: { type: Number, default: 0 },
});

// ---------------------------------------------------------------------------
// Vote record – tracks who voted for what, on which position.
//
// For candidate-style voting  → candidateId is set, yesNo is null.
// For yes/no-style voting     → yesNo is "yes" | "no", candidateId is null.
//
// The compound (voter + position) pair must be unique per voting event.
// We enforce this in the castVote controller rather than at schema level so
// that we can return a helpful error message.
// ---------------------------------------------------------------------------
const voteRecordSchema = new mongoose.Schema({
  voter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  // Null when votingMode === "yesno"
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  position: { type: String, required: true },
  // "yes" | "no" | null  (null when votingMode === "candidate")
  yesNo: {
    type: String,
    enum: ["yes", "no", null],
    default: null,
  },
  votedAt: { type: Date, default: Date.now },
});

// ---------------------------------------------------------------------------
// Yes/No tally per position  (only used when votingMode === "yesno")
// ---------------------------------------------------------------------------
const yesNoTallySchema = new mongoose.Schema({
  position: { type: String, required: true },
  yes: { type: Number, default: 0 },
  no: { type: Number, default: 0 },
});

// ---------------------------------------------------------------------------
// Main voting schema
// ---------------------------------------------------------------------------
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

    // "src" → open to all students  |  "faculty" → restricted to one faculty
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

    // ---------------------------------------------------------------------------
    // votingMode determines the ballot style:
    //   "candidate" → voters pick one candidate per position (original behaviour)
    //   "yesno"     → voters vote Yes or No for each position
    // ---------------------------------------------------------------------------
    votingMode: {
      type: String,
      enum: ["candidate", "yesno"],
      default: "candidate",
    },

    positions: [{ type: String, required: true }],

    // Only populated when votingMode === "candidate"
    candidates: [candidateSchema],

    // Only populated when votingMode === "yesno"
    yesNoTallies: [yesNoTallySchema],

    startDate: { type: Date, required: [true, "Start date is required"] },
    endDate: { type: Date, required: [true, "End date is required"] },

    eligibleVoters: {
      faculty: String,
      yearOfStudy: [Number],
      programs: [String],
    },

    // Full audit trail – one record per (voter, position) pair
    voteRecords: [voteRecordSchema],

    isActive: { type: Boolean, default: true },
    resultsPublished: { type: Boolean, default: false },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

// Index to speed up "has this voter already voted on this position?" queries
votingSchema.index({ "voteRecords.voter": 1, "voteRecords.position": 1 });

export default mongoose.models.Voting || mongoose.model("Voting", votingSchema);

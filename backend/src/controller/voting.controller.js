import Voting from "../models/voting.model.js";
import User from "../models/user.model.js";
import cloudinary from "../config/cloudinary.js";
import { broadcastToRoles } from "../controller/notification.controller.js";

// ---------------------------------------------------------------------------
// Helper – upload any file (image or document) to Cloudinary
// ---------------------------------------------------------------------------
const uploadFileToCloudinary = async (file, filename, folder) => {
  return new Promise((resolve, reject) => {
    if (!file || !file.buffer) {
      reject(new Error("No file buffer provided"));
      return;
    }

    const isImage = file.mimetype.startsWith("image/");
    const resourceType = isImage ? "image" : "raw";

    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        folder,
        public_id: filename,
        overwrite: true,
      },
      (error, result) => {
        if (error) {
          console.log("[voting] Cloudinary upload error:", error);
          reject(error);
        } else {
          console.log("[voting] Cloudinary upload success:", result.secure_url);
          resolve(result);
        }
      },
    );

    stream.end(file.buffer);
  });
};

// ---------------------------------------------------------------------------
// Helper – check whether a user is eligible to see/vote in a voting event.
//
//   • type === "src"     → visible to ALL authenticated users
//   • type === "faculty" → visible ONLY to students whose faculty matches.
//                          Admins/lecturers can always see every event.
// ---------------------------------------------------------------------------
const isEligible = (user, voting) => {
  if (voting.type === "src") return true;
  if (user.role === "admin" || user.role === "lecturer") return true;
  if (!user.faculty || !voting.faculty) return false;
  return (
    user.faculty.trim().toLowerCase() === voting.faculty.trim().toLowerCase()
  );
};

// ---------------------------------------------------------------------------
// Helper – derive the set of positions a voter has already voted on
// ---------------------------------------------------------------------------
const votedPositions = (voting, userId) => {
  const uid = userId.toString();
  return new Set(
    voting.voteRecords
      .filter((r) => r.voter.toString() === uid)
      .map((r) => r.position),
  );
};

// ---------------------------------------------------------------------------
// @desc   Create voting event
// @route  POST /api/voting
// @access Private (Admin)
// ---------------------------------------------------------------------------
export const createVoting = async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      faculty,
      votingMode, // NEW: "candidate" | "yesno"
      positions,
      candidates,
      startDate,
      endDate,
      eligibleVoters,
    } = req.body;

    // ── Basic validation ────────────────────────────────────────────────────
    if (
      !title ||
      !description ||
      !type ||
      !positions ||
      !startDate ||
      !endDate
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Please provide all required fields",
        });
    }

    if (type === "faculty" && !faculty) {
      return res.status(400).json({
        success: false,
        message: "Faculty is required for faculty-type voting",
      });
    }

    const mode = votingMode === "yesno" ? "yesno" : "candidate";
    const parsedPositions = JSON.parse(positions);

    // ── Candidate-mode: parse + upload files ────────────────────────────────
    let candidatesData = [];
    if (mode === "candidate") {
      let parsedCandidates = [];
      if (candidates) {
        try {
          parsedCandidates = JSON.parse(candidates);
        } catch {
          return res
            .status(400)
            .json({
              success: false,
              message: "Invalid candidates JSON format",
            });
        }
      }

      const fileMap = {};
      if (req.files && Array.isArray(req.files)) {
        req.files.forEach((file) => {
          fileMap[file.fieldname] = file;
        });
      }

      candidatesData = await Promise.all(
        parsedCandidates.map(async (candidate, index) => {
          const candidateObj = {
            name: candidate.name,
            studentId: candidate.studentId,
            position: candidate.position,
            manifesto: candidate.manifesto || "",
            imageUrl: null,
            manifestoFileUrl: null,
            votes: 0,
          };

          const imageFile = fileMap[`candidate_${index}`];
          if (imageFile) {
            try {
              const filename = `${type}-${faculty || "src"}-${candidate.studentId}-${Date.now()}`;
              const result = await uploadFileToCloudinary(
                imageFile,
                filename,
                "voting/candidates",
              );
              candidateObj.imageUrl = result.secure_url;
            } catch (err) {
              console.error(
                "[voting] Image upload error:",
                candidate.name,
                err,
              );
            }
          }

          const manifestoFile = fileMap[`manifesto_${index}`];
          if (manifestoFile) {
            try {
              const filename = `manifesto-${type}-${faculty || "src"}-${candidate.studentId}-${Date.now()}`;
              const result = await uploadFileToCloudinary(
                manifestoFile,
                filename,
                "voting/manifestos",
              );
              candidateObj.manifestoFileUrl = result.secure_url;
            } catch (err) {
              console.error(
                "[voting] Manifesto upload error:",
                candidate.name,
                err,
              );
            }
          }

          return candidateObj;
        }),
      );
    }

    // ── Yes/No mode: pre-create tally rows for every position ───────────────
    const yesNoTallies =
      mode === "yesno"
        ? parsedPositions.map((p) => ({ position: p, yes: 0, no: 0 }))
        : [];

    // ── Persist ─────────────────────────────────────────────────────────────
    const voting = new Voting({
      title,
      description,
      type,
      faculty: type === "faculty" ? faculty : null,
      votingMode: mode,
      positions: parsedPositions,
      candidates: candidatesData,
      yesNoTallies,
      startDate,
      endDate,
      eligibleVoters: eligibleVoters || [],
      createdBy: req.user.id,
    });

    await voting.save();
    await voting.populate("createdBy", "firstName lastName email");

    // ── Push notification to eligible students ──────────────────────────────
    const io = req.app.get("io");
    const start = new Date(startDate).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
    const end = new Date(endDate).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });

    let notifyMetadata = {
      votingType: voting.type,
      faculty: voting.faculty,
      startDate,
      endDate,
    };

    if (voting.type === "faculty" && voting.faculty) {
      const eligibleStudents = await User.find({
        role: "student",
        faculty: { $regex: new RegExp(`^${voting.faculty.trim()}$`, "i") },
      }).select("_id");
      notifyMetadata.targetUserIds = eligibleStudents.map((u) =>
        u._id.toString(),
      );
    }

    await broadcastToRoles({
      roles: ["student"],
      type: "voting",
      title: "🗳️ New Voting: " + voting.title,
      message: `A new voting event has started. Cast your vote between ${start} and ${end}.`,
      relatedId: voting._id,
      relatedModel: "Voting",
      metadata: notifyMetadata,
      io,
    });

    res
      .status(201)
      .json({
        success: true,
        message: "Voting created successfully",
        data: voting,
      });
  } catch (error) {
    console.error("[voting] Create voting error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc   Update voting event
// @route  PUT /api/voting/:id
// @access Private (Admin)
// ---------------------------------------------------------------------------
export const updateVoting = async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      faculty,
      votingMode,
      positions,
      candidates,
      startDate,
      endDate,
      eligibleVoters,
    } = req.body;

    const voting = await Voting.findById(req.params.id);
    if (!voting)
      return res
        .status(404)
        .json({ success: false, message: "Voting not found" });

    if (title) voting.title = title;
    if (description) voting.description = description;
    if (type) voting.type = type;
    if (faculty) voting.faculty = faculty;
    if (startDate) voting.startDate = startDate;
    if (endDate) voting.endDate = endDate;
    if (eligibleVoters) voting.eligibleVoters = eligibleVoters;

    if (positions) {
      const parsedPositions = JSON.parse(positions);
      voting.positions = parsedPositions;

      // Keep yesNoTallies in sync when positions change
      if (votingMode === "yesno" || voting.votingMode === "yesno") {
        voting.yesNoTallies = parsedPositions.map((p) => {
          const existing = voting.yesNoTallies.find((t) => t.position === p);
          return existing || { position: p, yes: 0, no: 0 };
        });
      }
    }

    if (votingMode) {
      voting.votingMode = votingMode === "yesno" ? "yesno" : "candidate";

      // If switching to yesno, ensure tallies exist for every position
      if (voting.votingMode === "yesno") {
        voting.yesNoTallies = voting.positions.map((p) => {
          const existing = voting.yesNoTallies.find((t) => t.position === p);
          return existing || { position: p, yes: 0, no: 0 };
        });
      }
    }

    // ── Update candidates (candidate mode only) ─────────────────────────────
    if (candidates && voting.votingMode === "candidate") {
      const parsedCandidates = JSON.parse(candidates);

      const fileMap = {};
      if (req.files && Array.isArray(req.files)) {
        req.files.forEach((file) => {
          fileMap[file.fieldname] = file;
        });
      }

      const updatedCandidates = await Promise.all(
        parsedCandidates.map(async (candidate, index) => {
          const imageFile = fileMap[`candidate_${index}`];
          const manifestoFile = fileMap[`manifesto_${index}`];

          if (candidate._id) {
            const existing = voting.candidates.id(candidate._id);
            if (existing) {
              existing.name = candidate.name || existing.name;
              existing.studentId = candidate.studentId || existing.studentId;
              existing.position = candidate.position || existing.position;
              existing.manifesto = candidate.manifesto || existing.manifesto;

              if (imageFile) {
                try {
                  const filename = `${voting.type}-${voting.faculty || "src"}-${candidate.studentId}-${Date.now()}`;
                  const result = await uploadFileToCloudinary(
                    imageFile,
                    filename,
                    "voting/candidates",
                  );
                  existing.imageUrl = result.secure_url;
                } catch (err) {
                  console.error("[voting] Image upload error:", err);
                }
              }

              if (manifestoFile) {
                try {
                  const filename = `manifesto-${voting.type}-${voting.faculty || "src"}-${candidate.studentId}-${Date.now()}`;
                  const result = await uploadFileToCloudinary(
                    manifestoFile,
                    filename,
                    "voting/manifestos",
                  );
                  existing.manifestoFileUrl = result.secure_url;
                } catch (err) {
                  console.error("[voting] Manifesto upload error:", err);
                }
              }

              return existing;
            }
          }

          // New candidate
          const newCandidate = {
            name: candidate.name,
            studentId: candidate.studentId,
            position: candidate.position,
            manifesto: candidate.manifesto || "",
            imageUrl: candidate.imageUrl || null,
            manifestoFileUrl: candidate.manifestoFileUrl || null,
            votes: 0,
          };

          if (imageFile) {
            try {
              const filename = `${voting.type}-${voting.faculty || "src"}-${candidate.studentId}-${Date.now()}`;
              const result = await uploadFileToCloudinary(
                imageFile,
                filename,
                "voting/candidates",
              );
              newCandidate.imageUrl = result.secure_url;
            } catch (err) {
              console.error("[voting] Image upload error:", err);
            }
          }

          if (manifestoFile) {
            try {
              const filename = `manifesto-${voting.type}-${voting.faculty || "src"}-${candidate.studentId}-${Date.now()}`;
              const result = await uploadFileToCloudinary(
                manifestoFile,
                filename,
                "voting/manifestos",
              );
              newCandidate.manifestoFileUrl = result.secure_url;
            } catch (err) {
              console.error("[voting] Manifesto upload error:", err);
            }
          }

          return newCandidate;
        }),
      );

      voting.candidates = updatedCandidates;
    }

    await voting.save();
    await voting.populate("createdBy", "firstName lastName email");

    res
      .status(200)
      .json({
        success: true,
        message: "Voting updated successfully",
        data: voting,
      });
  } catch (error) {
    console.error("[voting] Update voting error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc   Delete voting event
// @route  DELETE /api/voting/:id
// @access Private (Admin)
// ---------------------------------------------------------------------------
export const deleteVoting = async (req, res) => {
  try {
    const voting = await Voting.findById(req.params.id);
    if (!voting)
      return res
        .status(404)
        .json({ success: false, message: "Voting not found" });

    if (voting.candidates && voting.candidates.length > 0) {
      await Promise.all(
        voting.candidates.map(async (candidate) => {
          if (candidate.imageUrl) {
            try {
              const urlParts = candidate.imageUrl.split("/");
              const fileWithExt = urlParts[urlParts.length - 1];
              const publicId = fileWithExt.split(".")[0];
              await cloudinary.uploader.destroy(
                `voting/candidates/${publicId}`,
              );
            } catch (err) {
              console.error("Error deleting image from Cloudinary:", err);
            }
          }
          if (candidate.manifestoFileUrl) {
            try {
              const urlParts = candidate.manifestoFileUrl.split("/");
              const fileWithExt = urlParts[urlParts.length - 1];
              const publicId = fileWithExt.split(".")[0];
              await cloudinary.uploader.destroy(
                `voting/manifestos/${publicId}`,
                { resource_type: "raw" },
              );
            } catch (err) {
              console.error("Error deleting manifesto from Cloudinary:", err);
            }
          }
        }),
      );
    }

    await Voting.findByIdAndDelete(req.params.id);
    res
      .status(200)
      .json({ success: true, message: "Voting event deleted successfully" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc   Get all voting events (faculty-restricted)
// @route  GET /api/voting
// @access Private
// ---------------------------------------------------------------------------
export const getAllVoting = async (req, res) => {
  try {
    const { type, faculty, status, page = 1, limit = 20 } = req.query;

    const currentUser = await User.findById(req.user.id).select("role faculty");
    if (!currentUser)
      return res
        .status(401)
        .json({ success: false, message: "User not found" });

    const query = {};
    if (type) query.type = type;
    if (faculty) query.faculty = faculty;

    const now = new Date();
    if (status === "active") {
      query.startDate = { $lte: now };
      query.endDate = { $gte: now };
      query.isActive = true;
    } else if (status === "upcoming") {
      query.startDate = { $gt: now };
      query.isActive = true;
    } else if (status === "completed") {
      query.endDate = { $lt: now };
    }

    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit);

    const allEvents = await Voting.find(query)
      .populate("createdBy", "firstName lastName email")
      .sort({ startDate: -1 })
      .skip(skip)
      .limit(Number.parseInt(limit));

    // Faculty restriction filter
    const visibleEvents = allEvents.filter((v) => isEligible(currentUser, v));

    const uid = req.user.id;

    const votingEventsWithStatus = visibleEvents.map((voting) => {
      const votingObj = voting.toObject();

      // Which positions this user has already voted on
      const donePositions = votedPositions(voting, uid);

      // Has the user voted on ALL positions?
      const hasVotedAll =
        voting.positions.length > 0 &&
        voting.positions.every((p) => donePositions.has(p));

      // hasVoted = true only when every position has been voted on
      votingObj.hasVoted = hasVotedAll;

      // Per-position status so frontend can show partial completion
      votingObj.votedPositions = Array.from(donePositions);

      // Hide individual vote counts while voting is active and results not published
      if (voting.isActive && !voting.resultsPublished) {
        votingObj.candidates = votingObj.candidates.map((c) => ({
          ...c,
          votes: undefined,
        }));
        votingObj.yesNoTallies = votingObj.yesNoTallies.map((t) => ({
          position: t.position,
          yes: undefined,
          no: undefined,
        }));
      }

      return votingObj;
    });

    const totalInDb = await Voting.countDocuments(query);

    res.status(200).json({
      success: true,
      count: votingEventsWithStatus.length,
      total: totalInDb,
      page: Number.parseInt(page),
      pages: Math.ceil(totalInDb / Number.parseInt(limit)),
      data: votingEventsWithStatus,
    });
  } catch (error) {
    console.error("[voting] Get all voting error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc   Get voting event by ID (faculty-restricted)
// @route  GET /api/voting/:id
// @access Private
// ---------------------------------------------------------------------------
export const getVotingById = async (req, res) => {
  try {
    const voting = await Voting.findById(req.params.id).populate(
      "createdBy",
      "firstName lastName email",
    );
    if (!voting)
      return res
        .status(404)
        .json({ success: false, message: "Voting not found" });

    const currentUser = await User.findById(req.user.id).select("role faculty");
    if (!currentUser)
      return res
        .status(401)
        .json({ success: false, message: "User not found" });

    if (!isEligible(currentUser, voting)) {
      return res.status(403).json({
        success: false,
        message: `You are not eligible to view this voting event. It is restricted to members of the ${voting.faculty} faculty.`,
      });
    }

    const donePositions = votedPositions(voting, req.user.id);
    const hasVotedAll =
      voting.positions.length > 0 &&
      voting.positions.every((p) => donePositions.has(p));

    const votingData = voting.toObject();
    votingData.hasVoted = hasVotedAll;
    votingData.votedPositions = Array.from(donePositions);

    if (voting.isActive && !voting.resultsPublished) {
      votingData.candidates = votingData.candidates.map((c) => ({
        ...c,
        votes: undefined,
      }));
      votingData.yesNoTallies = votingData.yesNoTallies.map((t) => ({
        position: t.position,
        yes: undefined,
        no: undefined,
      }));
    }

    res.status(200).json({ success: true, data: votingData });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc   Cast vote  (candidate OR yes/no, per position)
// @route  POST /api/voting/:id/vote
// @access Private
//
// IMPORTANT – Supervisor corrections implemented here:
//
//   1. Voting stays active for its full time range.
//      One vote per position is tracked independently; voting for one
//      position does NOT close the event or prevent voting on others.
//
//   2. Yes/No mode: body should contain { position, yesNo: "yes"|"no" }
//      Candidate mode: body should contain { candidateId }
//
//   3. A voter may cast votes across ALL positions.  Only after every
//      position has been voted on is the voter considered "done".
//      The event itself never closes early.
// ---------------------------------------------------------------------------
export const castVote = async (req, res) => {
  try {
    const { candidateId, position, yesNo } = req.body;

    const voting = await Voting.findById(req.params.id);
    if (!voting)
      return res
        .status(404)
        .json({ success: false, message: "Voting not found" });

    // ── Time / active check ─────────────────────────────────────────────────
    // FIX 1: Voting stays open for the FULL time range. We do NOT close early.
    const now = new Date();
    if (now < new Date(voting.startDate) || now > new Date(voting.endDate)) {
      return res
        .status(400)
        .json({ success: false, message: "Voting is not currently open" });
    }
    if (!voting.isActive) {
      return res
        .status(400)
        .json({ success: false, message: "Voting has been disabled by admin" });
    }

    // ── Eligibility ─────────────────────────────────────────────────────────
    const currentUser = await User.findById(req.user.id).select("role faculty");
    if (!currentUser)
      return res
        .status(401)
        .json({ success: false, message: "User not found" });

    if (!isEligible(currentUser, voting)) {
      return res.status(403).json({
        success: false,
        message: `This election is restricted to ${voting.faculty} faculty members. You are not eligible to vote.`,
      });
    }

    // ── Route to the correct voting mode ────────────────────────────────────
    if (voting.votingMode === "yesno") {
      // ── YES / NO branch ──────────────────────────────────────────────────
      // FIX 2 & 3: Yes/No per position; many positions allowed.

      if (!position || !["yes", "no"].includes(yesNo)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide position and yesNo ("yes" or "no")',
        });
      }

      if (!voting.positions.includes(position)) {
        return res
          .status(400)
          .json({
            success: false,
            message: `Position "${position}" does not exist in this event`,
          });
      }

      // Has this voter already voted on this specific position?
      const alreadyVoted = voting.voteRecords.some(
        (r) => r.voter.toString() === req.user.id && r.position === position,
      );
      if (alreadyVoted) {
        return res.status(400).json({
          success: false,
          message: `You have already cast your Yes/No vote for "${position}"`,
        });
      }

      // Update tally
      const tally = voting.yesNoTallies.find((t) => t.position === position);
      if (!tally) {
        return res
          .status(400)
          .json({
            success: false,
            message: `Tally for position "${position}" not found`,
          });
      }
      if (yesNo === "yes") tally.yes += 1;
      else tally.no += 1;

      // Record the vote
      voting.voteRecords.push({
        voter: req.user.id,
        candidateId: null,
        position,
        yesNo,
        votedAt: new Date(),
      });

      await voting.save();

      const donePositions = votedPositions(voting, req.user.id);
      const remaining = voting.positions.filter((p) => !donePositions.has(p));

      return res.status(200).json({
        success: true,
        message: `Vote recorded for "${position}"`,
        remainingPositions: remaining,
        allDone: remaining.length === 0,
      });
    } else {
      // ── CANDIDATE branch ─────────────────────────────────────────────────
      // FIX 3: One vote per POSITION (not one vote total).

      if (!candidateId) {
        return res
          .status(400)
          .json({ success: false, message: "Please provide candidateId" });
      }

      const candidate = voting.candidates.id(candidateId);
      if (!candidate)
        return res
          .status(404)
          .json({ success: false, message: "Candidate not found" });

      // Has this voter already voted for THIS position?
      const alreadyVotedForPosition = voting.voteRecords.some(
        (r) =>
          r.voter.toString() === req.user.id &&
          r.position === candidate.position,
      );
      if (alreadyVotedForPosition) {
        return res.status(400).json({
          success: false,
          message: `You have already voted for the position "${candidate.position}"`,
        });
      }

      candidate.votes += 1;

      voting.voteRecords.push({
        voter: req.user.id,
        candidateId,
        position: candidate.position,
        yesNo: null,
        votedAt: new Date(),
      });

      await voting.save();

      const donePositions = votedPositions(voting, req.user.id);
      const remaining = voting.positions.filter((p) => !donePositions.has(p));

      return res.status(200).json({
        success: true,
        message: `Vote cast for ${candidate.name} (${candidate.position})`,
        remainingPositions: remaining,
        allDone: remaining.length === 0,
      });
    }
  } catch (error) {
    console.error("[voting] Cast vote error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// ---------------------------------------------------------------------------
// @desc   Publish results of a voting event
// @route  PUT /api/voting/:id/publish-results
// @access Private (Admin)
// ---------------------------------------------------------------------------
export const publishResults = async (req, res) => {
  try {
    const voting = await Voting.findById(req.params.id);
    if (!voting)
      return res
        .status(404)
        .json({ success: false, message: "Voting not found" });

    voting.resultsPublished = true;
    await voting.save();

    res
      .status(200)
      .json({
        success: true,
        message: "Results published successfully",
        data: voting,
      });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

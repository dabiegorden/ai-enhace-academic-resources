import Voting from "../models/voting.model.js";
import cloudinary from "../config/cloudinary.js";
import { broadcastToRoles } from "../controller/notification.controller.js";

// Upload any file (image or document) to Cloudinary
const uploadFileToCloudinary = async (file, filename, folder) => {
  return new Promise((resolve, reject) => {
    if (!file || !file.buffer) {
      reject(new Error("No file buffer provided"));
      return;
    }

    // Determine resource type: PDFs/docs use "raw", images use "image"
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

// @desc    Create voting event
// @route   POST /api/voting
// @access  Private (Admin)
export const createVoting = async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      faculty,
      positions,
      candidates,
      startDate,
      endDate,
      eligibleVoters,
    } = req.body;

    if (
      !title ||
      !description ||
      !type ||
      !positions ||
      !startDate ||
      !endDate
    ) {
      return res.status(400).json({
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

    let parsedCandidates = [];
    if (candidates) {
      try {
        parsedCandidates = JSON.parse(candidates);
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          message: "Invalid candidates JSON format",
        });
      }
    }

    // Build file map keyed by fieldname
    const fileMap = {};
    if (req.files && Array.isArray(req.files)) {
      req.files.forEach((file) => {
        fileMap[file.fieldname] = file;
      });
    }

    const candidatesData = await Promise.all(
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

        // Upload profile image if provided
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
            console.error("[voting] Image upload error:", candidate.name, err);
          }
        }

        // Upload manifesto file if provided (PDF / image)
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

    const voting = new Voting({
      title,
      description,
      type,
      faculty: type === "faculty" ? faculty : null,
      positions: JSON.parse(positions),
      candidates: candidatesData,
      startDate,
      endDate,
      eligibleVoters: eligibleVoters || [],
      createdBy: req.user.id,
    });

    await voting.save();
    await voting.populate("createdBy", "firstName lastName email");

    // Push notification to students
    const io = req.app.get("io");
    const start = new Date(startDate).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
    const end = new Date(endDate).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });

    await broadcastToRoles({
      roles: ["student"],
      type: "voting",
      title: "🗳️ New Voting: " + voting.title,
      message:
        "A new voting event has started. Cast your vote between " +
        start +
        " and " +
        end +
        ".",
      relatedId: voting._id,
      relatedModel: "Voting",
      metadata: {
        votingType: voting.type,
        faculty: voting.faculty,
        startDate,
        endDate,
      },
      io,
    });

    res.status(201).json({
      success: true,
      message: "Voting created successfully",
      data: voting,
    });
  } catch (error) {
    console.error("[voting] Create voting error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update voting event
// @route   PUT /api/voting/:id
// @access  Private (Admin)
export const updateVoting = async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      faculty,
      positions,
      candidates,
      startDate,
      endDate,
      eligibleVoters,
    } = req.body;

    const voting = await Voting.findById(req.params.id);
    if (!voting) {
      return res
        .status(404)
        .json({ success: false, message: "Voting not found" });
    }

    if (title) voting.title = title;
    if (description) voting.description = description;
    if (type) voting.type = type;
    if (faculty) voting.faculty = faculty;
    if (positions) voting.positions = JSON.parse(positions);
    if (startDate) voting.startDate = startDate;
    if (endDate) voting.endDate = endDate;
    if (eligibleVoters) voting.eligibleVoters = eligibleVoters;

    if (candidates) {
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

    res.status(200).json({
      success: true,
      message: "Voting updated successfully",
      data: voting,
    });
  } catch (error) {
    console.error("[voting] Update voting error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete voting event
// @route   DELETE /api/voting/:id
// @access  Private (Admin)
export const deleteVoting = async (req, res) => {
  try {
    const voting = await Voting.findById(req.params.id);
    if (!voting) {
      return res
        .status(404)
        .json({ success: false, message: "Voting not found" });
    }

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
                {
                  resource_type: "raw",
                },
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

// @desc    Get all voting events
// @route   GET /api/voting
// @access  Private
export const getAllVoting = async (req, res) => {
  try {
    const { type, faculty, status, page = 1, limit = 20 } = req.query;

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

    const votingEvents = await Voting.find(query)
      .populate("createdBy", "firstName lastName email")
      .sort({ startDate: -1 })
      .skip(skip)
      .limit(Number.parseInt(limit));

    const total = await Voting.countDocuments(query);

    const votingEventsWithStatus = votingEvents.map((voting) => {
      const votingObj = voting.toObject();
      const hasVoted = voting.voteRecords.some(
        (record) => record.voter.toString() === req.user.id,
      );

      if (voting.isActive && !voting.resultsPublished) {
        votingObj.candidates = votingObj.candidates.map((c) => ({
          ...c,
          votes: undefined,
        }));
      }

      return { ...votingObj, hasVoted };
    });

    res.status(200).json({
      success: true,
      count: votingEventsWithStatus.length,
      total,
      page: Number.parseInt(page),
      pages: Math.ceil(total / Number.parseInt(limit)),
      data: votingEventsWithStatus,
    });
  } catch (error) {
    console.error("[voting] Get all voting error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get voting event by ID
// @route   GET /api/voting/:id
// @access  Private
export const getVotingById = async (req, res) => {
  try {
    const voting = await Voting.findById(req.params.id).populate(
      "createdBy",
      "firstName lastName email",
    );

    if (!voting) {
      return res
        .status(404)
        .json({ success: false, message: "Voting not found" });
    }

    const hasVoted = voting.voteRecords.some(
      (record) => record.voter.toString() === req.user.id,
    );

    const votingData = voting.toObject();
    if (voting.isActive && !voting.resultsPublished) {
      votingData.candidates = votingData.candidates.map((c) => ({
        ...c,
        votes: undefined,
      }));
    }

    res.status(200).json({
      success: true,
      data: { ...votingData, hasVoted },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Cast vote for a candidate
// @route   POST /api/voting/:id/vote
// @access  Private
export const castVote = async (req, res) => {
  try {
    const { candidateId } = req.body;

    if (!candidateId) {
      return res
        .status(400)
        .json({ success: false, message: "Please provide candidate ID" });
    }

    const voting = await Voting.findById(req.params.id);
    if (!voting) {
      return res
        .status(404)
        .json({ success: false, message: "Voting not found" });
    }

    const candidate = voting.candidates.id(candidateId);
    if (!candidate) {
      return res
        .status(404)
        .json({ success: false, message: "Candidate not found" });
    }

    const hasVotedForPosition = voting.voteRecords.some(
      (record) =>
        record.voter.toString() === req.user.id &&
        record.position === candidate.position,
    );

    if (hasVotedForPosition) {
      return res.status(400).json({
        success: false,
        message: `You have already voted for ${candidate.position}`,
      });
    }

    const now = new Date();
    if (now < new Date(voting.startDate) || now > new Date(voting.endDate)) {
      return res
        .status(400)
        .json({ success: false, message: "Voting is not active" });
    }

    if (!voting.isActive) {
      return res
        .status(400)
        .json({ success: false, message: "Voting has been disabled" });
    }

    candidate.votes += 1;
    voting.voteRecords.push({
      voter: req.user.id,
      candidateId,
      position: candidate.position,
      votedAt: new Date(),
    });

    await voting.save();

    res.status(200).json({ success: true, message: "Vote cast successfully" });
  } catch (error) {
    console.error("[voting] Cast vote error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Publish results of a voting event
// @route   PUT /api/voting/:id/publish-results
// @access  Private (Admin)
export const publishResults = async (req, res) => {
  try {
    const voting = await Voting.findById(req.params.id);
    if (!voting) {
      return res
        .status(404)
        .json({ success: false, message: "Voting not found" });
    }

    voting.resultsPublished = true;
    await voting.save();

    res.status(200).json({
      success: true,
      message: "Results published successfully",
      data: voting,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

import Voting from "../models/voting.model.js";
import cloudinary from "../config/cloudinary.js";

const uploadImageToCloudinary = async (file, filename) => {
  return new Promise((resolve, reject) => {
    if (!file || !file.buffer) {
      reject(new Error("No file buffer provided"));
      return;
    }

    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "auto",
        folder: "voting/candidates",
        public_id: filename,
        overwrite: true,
      },
      (error, result) => {
        if (error) {
          console.log("[v0] Cloudinary upload error:", error);
          reject(error);
        } else {
          console.log("[v0] Cloudinary upload success:", result.secure_url);
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

    // Validate required fields
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

    // Create a map of files by their fieldname
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
          votes: 0,
        };

        // Check if file exists for this candidate using the fieldname pattern
        const fieldName = `candidate_${index}`;
        const file = fileMap[fieldName];

        if (file) {
          try {
            const filename = `${type}-${faculty || "src"}-${
              candidate.studentId
            }-${Date.now()}`;
            const uploadResult = await uploadImageToCloudinary(file, filename);
            candidateObj.imageUrl = uploadResult.secure_url;
            console.log(
              "[v0] Image uploaded for candidate:",
              candidate.name,
              uploadResult.secure_url,
            );
          } catch (uploadError) {
            console.error(
              "[v0] Image upload error for candidate:",
              candidate.name,
              uploadError,
            );
            // Continue without image if upload fails
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

    res.status(201).json({
      success: true,
      message: "Voting created successfully",
      data: voting,
    });
  } catch (error) {
    console.error("[v0] Create voting error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
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
      return res.status(404).json({
        success: false,
        message: "Voting not found",
      });
    }

    // Update basic fields
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

      // Create a map of files by their fieldname
      const fileMap = {};
      if (req.files && Array.isArray(req.files)) {
        req.files.forEach((file) => {
          fileMap[file.fieldname] = file;
        });
      }

      const updatedCandidates = await Promise.all(
        parsedCandidates.map(async (candidate, index) => {
          // Check if file exists for this candidate
          const fieldName = `candidate_${index}`;
          const file = fileMap[fieldName];

          if (candidate._id) {
            // Update existing candidate
            const existingCandidate = voting.candidates.id(candidate._id);
            if (existingCandidate) {
              existingCandidate.name = candidate.name || existingCandidate.name;
              existingCandidate.studentId =
                candidate.studentId || existingCandidate.studentId;
              existingCandidate.position =
                candidate.position || existingCandidate.position;
              existingCandidate.manifesto =
                candidate.manifesto || existingCandidate.manifesto;

              // Upload new image if provided
              if (file) {
                try {
                  const filename = `${voting.type}-${voting.faculty || "src"}-${
                    candidate.studentId
                  }-${Date.now()}`;
                  const uploadResult = await uploadImageToCloudinary(
                    file,
                    filename,
                  );
                  existingCandidate.imageUrl = uploadResult.secure_url;
                  console.log(
                    "[v0] Image updated for candidate:",
                    candidate.name,
                    uploadResult.secure_url,
                  );
                } catch (uploadError) {
                  console.error("[v0] Image upload error:", uploadError);
                }
              }

              return existingCandidate;
            }
          }

          // Create new candidate
          const newCandidateObj = {
            name: candidate.name,
            studentId: candidate.studentId,
            position: candidate.position,
            manifesto: candidate.manifesto || "",
            imageUrl: candidate.imageUrl || null, // Keep existing URL if no new file
            votes: 0,
          };

          if (file) {
            try {
              const filename = `${voting.type}-${voting.faculty || "src"}-${
                candidate.studentId
              }-${Date.now()}`;
              const uploadResult = await uploadImageToCloudinary(
                file,
                filename,
              );
              newCandidateObj.imageUrl = uploadResult.secure_url;
              console.log(
                "[v0] New image uploaded for candidate:",
                candidate.name,
                uploadResult.secure_url,
              );
            } catch (uploadError) {
              console.error("[v0] Image upload error:", uploadError);
            }
          }

          return newCandidateObj;
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
    console.error("[v0] Update voting error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteVoting = async (req, res) => {
  try {
    const voting = await Voting.findById(req.params.id);

    if (!voting) {
      return res.status(404).json({
        success: false,
        message: "Voting not found",
      });
    }

    // Delete images from Cloudinary
    if (voting.candidates && voting.candidates.length > 0) {
      await Promise.all(
        voting.candidates.map(async (candidate) => {
          if (candidate.imageUrl) {
            try {
              // Extract public_id from Cloudinary URL
              const urlParts = candidate.imageUrl.split("/");
              const fileWithExtension = urlParts[urlParts.length - 1];
              const publicId = fileWithExtension.split(".")[0];
              await cloudinary.uploader.destroy(
                `voting/candidates/${publicId}`,
              );
              console.log("[v0] Deleted image from Cloudinary:", publicId);
            } catch (error) {
              console.error("Error deleting image from Cloudinary:", error);
              // Continue deleting even if image deletion fails
            }
          }
        }),
      );
    }

    await Voting.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Voting event deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all voting events
// @route   GET /api/voting
// @access  Public
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

    res.status(200).json({
      success: true,
      count: votingEvents.length,
      total,
      page: Number.parseInt(page),
      pages: Math.ceil(total / Number.parseInt(limit)),
      data: votingEvents,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get voting event by ID
// @route   GET /api/voting/:id
// @access  Public
export const getVotingById = async (req, res) => {
  try {
    const voting = await Voting.findById(req.params.id).populate(
      "createdBy",
      "firstName lastName email",
    );

    if (!voting) {
      return res.status(404).json({
        success: false,
        message: "Voting not found",
      });
    }

    // Check if user has voted
    const hasVoted = voting.voteRecords.some(
      (record) => record.voter.toString() === req.user.id,
    );

    // Don't show vote counts if voting is still active and results not published
    const votingData = voting.toObject();
    if (voting.isActive && !voting.resultsPublished) {
      votingData.candidates = votingData.candidates.map((c) => ({
        ...c,
        votes: undefined,
      }));
    }

    res.status(200).json({
      success: true,
      data: {
        ...votingData,
        hasVoted,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Cast vote for a candidate
// @route   POST /api/voting/:id/vote
// @access  Private (Authenticated User)
export const castVote = async (req, res) => {
  try {
    const { candidateId } = req.body;

    if (!candidateId) {
      return res.status(400).json({
        success: false,
        message: "Please provide candidate ID",
      });
    }

    const voting = await Voting.findById(req.params.id);

    if (!voting) {
      return res.status(404).json({
        success: false,
        message: "Voting not found",
      });
    }

    if (
      voting.voteRecords.some(
        (record) => record.voter.toString() === req.user.id,
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "User has already voted",
      });
    }

    // Check if voting is active
    const now = new Date();
    if (now < new Date(voting.startDate) || now > new Date(voting.endDate)) {
      return res.status(400).json({
        success: false,
        message: "Voting is not active",
      });
    }

    // Find candidate and increment votes
    const candidate = voting.candidates.id(candidateId);

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: "Candidate not found",
      });
    }

    candidate.votes += 1;

    // Record vote
    voting.voteRecords.push({
      voter: req.user.id,
      candidateId: candidateId,
      position: candidate.position,
      votedAt: new Date(),
    });

    await voting.save();

    res.status(200).json({
      success: true,
      message: "Vote cast successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Publish results of a voting event
// @route   PUT /api/voting/:id/publish
// @access  Private (Admin)
export const publishResults = async (req, res) => {
  try {
    const voting = await Voting.findById(req.params.id);

    if (!voting) {
      return res.status(404).json({
        success: false,
        message: "Voting not found",
      });
    }

    voting.resultsPublished = true;
    await voting.save();

    res.status(200).json({
      success: true,
      message: "Results published successfully",
      data: voting,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

import Voting from "../models/voting.model.js";

// @desc    Create voting
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

    const voting = await Voting.create({
      title,
      description,
      type,
      faculty,
      positions,
      candidates: candidates || [],
      startDate,
      endDate,
      eligibleVoters,
      createdBy: req.user.id,
    });

    await voting.populate("createdBy", "firstName lastName email");

    res.status(201).json({
      success: true,
      message: "Voting created successfully",
      data: voting,
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

// @desc    Get voting by ID
// @route   GET /api/voting/:id
// @access  Private
export const getVotingById = async (req, res) => {
  try {
    const voting = await Voting.findById(req.params.id).populate(
      "createdBy",
      "firstName lastName email"
    );

    if (!voting) {
      return res.status(404).json({
        success: false,
        message: "Voting not found",
      });
    }

    // Check if user has voted
    const hasVoted = voting.voteRecords.some(
      (record) => record.voter.toString() === req.user.id
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

// @desc    Cast vote
// @route   POST /api/voting/:id/vote
// @access  Private (Student)
export const castVote = async (req, res) => {
  try {
    const { candidateId } = req.body;

    if (!candidateId) {
      return res.status(400).json({
        success: false,
        message: "Please provide candidate ID",
      });
    }

    // In castVote controller:
    const voting = await Voting.findById(req.params.id);
    if (
      voting.voteRecords.some(
        (record) => record.voter.toString() === req.user.id
      )
    ) {
      throw new Error("User has already voted");
    }

    // Check if voting is active
    const now = new Date();
    if (now < new Date(voting.startDate) || now > new Date(voting.endDate)) {
      return res.status(400).json({
        success: false,
        message: "Voting is not active",
      });
    }

    // Check if user has already voted
    const hasVoted = voting.voteRecords.some(
      (record) => record.voter.toString() === req.user.id
    );

    if (hasVoted) {
      return res.status(400).json({
        success: false,
        message: "You have already voted",
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

// @desc    Publish results
// @route   PUT /api/voting/:id/publish-results
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

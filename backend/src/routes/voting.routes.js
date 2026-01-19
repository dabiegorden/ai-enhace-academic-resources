import express from "express";
import {
  createVoting,
  getAllVoting,
  getVotingById,
  castVote,
  publishResults,
  updateVoting,
  deleteVoting,
} from "../controller/voting.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";
import upload from "../middleware/upload.middleware.js";

const router = express.Router();

// IMPORTANT: Specific routes MUST come before parameterized routes
// Otherwise /:id will match everything including "/vote"

// List all voting events
router.get("/", protect, getAllVoting);

// Create new voting
router.post("/", protect, authorize("admin"), upload.any(), createVoting);

// Cast vote - MUST be before /:id route
router.post("/:id/vote", protect, castVote);

// Publish results - MUST be before /:id route
router.put("/:id/publish-results", protect, authorize("admin"), publishResults);

// Update voting
router.put("/:id", protect, authorize("admin"), upload.any(), updateVoting);

// Delete voting
router.delete("/:id", protect, authorize("admin"), deleteVoting);

// Get single voting - MUST be last among /:id routes
router.get("/:id", protect, getVotingById);

export default router;

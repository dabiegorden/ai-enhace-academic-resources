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

router.get("/:id", protect, getVotingById);
router.get("/", protect, getAllVoting);

// Use .any() to accept dynamic field names like candidate_0, candidate_1, etc.
router.post("/", protect, authorize("admin"), upload.any(), createVoting);

router.put("/:id", protect, authorize("admin"), upload.any(), updateVoting);

router.post("/:id/vote", protect, castVote);
router.put("/:id/publish-results", protect, authorize("admin"), publishResults);
router.delete("/:id", protect, authorize("admin"), deleteVoting);

export default router;

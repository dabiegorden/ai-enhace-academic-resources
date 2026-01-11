import express from "express";
import {
  createVoting,
  getAllVoting,
  getVotingById,
  castVote,
  publishResults,
} from "../controller/voting.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/:id", protect, getVotingById);
router.get("/", protect, getAllVoting);
router.post("/", protect, authorize("admin"), createVoting);
router.post("/:id/vote", protect, castVote);
router.put("/:id/publish-results", protect, authorize("admin"), publishResults);

export default router;

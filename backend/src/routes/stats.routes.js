import express from "express";
import {
  getAdminStats,
  getLecturerStats,
  getStudentStats,
} from "../controller/stats.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// Admin stats
router.get("/admin", protect, getAdminStats);

// Lecturer stats
router.get("/lecturer/:userId", protect, getLecturerStats);

// Student stats
router.get("/student/:userId", protect, getStudentStats);

export default router;

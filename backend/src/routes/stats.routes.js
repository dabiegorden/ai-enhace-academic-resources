import express from "express";
import {
  getAdminStats,
  getLecturerStats,
  getStudentStats,
} from "../controller/stats.controller.js";
import { authorize, protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// Admin stats
router.get("/admin", protect, authorize("admin"), getAdminStats);

// Lecturer stats
router.get(
  "/lecturer/:userId",
  protect,
  authorize("lecturer"),
  getLecturerStats
);

// Student stats
router.get("/student/:userId", protect, authorize("student"), getStudentStats);

export default router;

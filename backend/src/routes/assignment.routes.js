import express from "express";
import {
  createAssignment,
  getAllAssignments,
  getMyAssignments,
  getAssignmentById,
  submitAssignment,
  gradeSubmission,
  updateAssignment,
  deleteAssignment,
  getAssignmentStats,
} from "../controller/assignment.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";
import upload from "../middleware/upload.middleware.js";

const router = express.Router();

// Student routes
router.get("/my-assignments", protect, getMyAssignments);
router.post("/:id/submit", protect, upload.single("file"), submitAssignment);

// General routes
router.get("/:id", protect, getAssignmentById);
router.get("/", protect, getAllAssignments);

// Lecturer/Admin routes
router.post(
  "/",
  protect,
  authorize("lecturer", "admin"),
  upload.array("files", 5),
  createAssignment
);
router.put("/:id", protect, authorize("lecturer", "admin"), updateAssignment);
router.delete(
  "/:id",
  protect,
  authorize("lecturer", "admin"),
  deleteAssignment
);
router.put(
  "/:id/submissions/:submissionId/grade",
  protect,
  authorize("lecturer", "admin"),
  gradeSubmission
);
router.get(
  "/:id/stats",
  protect,
  authorize("lecturer", "admin"),
  getAssignmentStats
);

export default router;

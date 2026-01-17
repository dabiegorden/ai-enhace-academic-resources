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
import {
  uploadAssignments,
  uploadSubmissions,
} from "../middleware/upload.middleware.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// Student routes
router.get("/my-assignments", protect, getMyAssignments);
router.post(
  "/:id/submit",
  protect,
  uploadSubmissions.single("file"),
  submitAssignment,
);

// General routes
router.get("/:id", protect, getAssignmentById);
router.get("/", protect, getAllAssignments);

// Lecturer/Admin routes - File upload is optional
router.post(
  "/",
  protect,
  uploadAssignments.array("files", 5),
  createAssignment,
);
router.put("/:id", protect, updateAssignment);
router.delete("/:id", protect, deleteAssignment);
router.put("/:id/submissions/:submissionId/grade", protect, gradeSubmission);
router.get("/:id/stats", protect, getAssignmentStats);

export default router;

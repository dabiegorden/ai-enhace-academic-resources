import express from "express";
import {
  createExam,
  addQuestions,
  getAllExams,
  getMyExams,
  getExamById,
  takeExam,
  getExamResults,
  updateExam,
  deleteExam,
} from "../controller/exam.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

// Student routes
router.get("/my-exams", protect, getMyExams);
router.post("/:id/take", protect, takeExam);

// General routes
router.get("/:id", protect, getExamById);
router.get("/", protect, getAllExams);

// Lecturer/Admin routes
router.post("/", protect, authorize("lecturer", "admin"), createExam);
router.post(
  "/:id/questions",
  protect,
  authorize("lecturer", "admin"),
  addQuestions
);
router.get(
  "/:id/results",
  protect,
  authorize("lecturer", "admin"),
  getExamResults
);
router.put("/:id", protect, authorize("lecturer", "admin"), updateExam);
router.delete("/:id", protect, authorize("lecturer", "admin"), deleteExam);

export default router;

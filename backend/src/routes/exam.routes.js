import express from "express";
import {
  createExam,
  getAllExams,
  getExamById,
  addQuestion,
  removeQuestion,
  startExam,
  endExam,
  submitExam,
  getExamForStudent,
  getMyExams,
  getExamResults,
  gradeTheoryQuestion,
  updateExam,
  deleteExam,
} from "../controller/exam.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// Admin routes
router.post("/", protect, createExam);
router.get("/", protect, getAllExams);
router.get("/:id", protect, getExamById);
router.post("/:id/questions", protect, addQuestion);
router.delete("/:id/questions/:questionNumber", protect, removeQuestion);
router.post("/:id/start", protect, startExam);
router.post("/:id/end", protect, endExam);
router.get("/:id/results", protect, getExamResults);
router.post("/:id/grade", protect, gradeTheoryQuestion);
router.put("/:id", protect, updateExam);
router.delete("/:id", protect, deleteExam);

// Student routes
router.get("/:id/student", protect, getExamForStudent);
router.get("/my-exams", protect, getMyExams);
router.post("/:id/submit", protect, submitExam);

export default router;

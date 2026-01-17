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
import { authorize, protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// Admin routes
router.post("/", protect, authorize("lecturer", "admin"), createExam);
router.get("/", protect, getAllExams);
router.get("/:id", protect, authorize("lecturer", "admin"), getExamById);
router.post(
  "/:id/questions",
  protect,
  authorize("lecturer", "admin"),
  addQuestion,
);
router.delete(
  "/:id/questions/:questionNumber",
  protect,
  authorize("lecturer", "admin"),
  removeQuestion,
);
router.post("/:id/start", protect, authorize("lecturer", "admin"), startExam);
router.post("/:id/end", protect, authorize("lecturer", "admin"), endExam);
router.get(
  "/:id/results",
  protect,
  authorize("lecturer", "admin"),
  getExamResults,
);
router.post(
  "/:id/grade",
  protect,
  authorize("lecturer", "admin"),
  gradeTheoryQuestion,
);
router.put("/:id", protect, authorize("lecturer", "admin"), updateExam);
router.delete("/:id", protect, authorize("lecturer", "admin"), deleteExam);

// Student routes
router.get("/:id/student", protect, getExamForStudent);
router.get("/my-exams", protect, getMyExams);
router.post("/:id/submit", protect, submitExam);

export default router;

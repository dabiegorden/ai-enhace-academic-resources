import express from "express";
import {
  summarizeLectureNote,
  answerStudentQuestion,
  summarizeChatDiscussion,
  generateExamQuestions,
  getStudySuggestions,
  explainConcept,
} from "../controller/ai.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

// All AI routes require authentication
router.post("/summarize-note/:id", protect, summarizeLectureNote);
router.post("/answer-question", protect, answerStudentQuestion);
router.post("/summarize-chat/:roomId", protect, summarizeChatDiscussion);
router.post(
  "/generate-exam",
  protect,
  authorize("lecturer", "admin"),
  generateExamQuestions
);
router.post("/study-suggestions", protect, getStudySuggestions);
router.post("/explain-concept", protect, explainConcept);

export default router;

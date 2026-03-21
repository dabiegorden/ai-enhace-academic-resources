import express from "express";
import {
  summarizeLectureNote,
  answerStudentQuestion,
  summarizeChatDiscussion,
  analyseChatRoom,
  generateExamQuestions,
  getStudySuggestions,
  explainConcept,
} from "../controller/ai.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes require authentication
router.post("/summarize-note/:id", protect, summarizeLectureNote);
router.post("/answer-question", protect, answerStudentQuestion);
router.post("/summarize-chat/:roomId", protect, summarizeChatDiscussion);

// Streaming SSE analysis endpoint — GET so the browser EventSource can hit it
router.get("/chat-analysis/:roomId", protect, analyseChatRoom);

router.post(
  "/generate-exam",
  protect,
  authorize("lecturer", "admin"),
  generateExamQuestions,
);
router.post(
  "/study-suggestions",
  protect,
  authorize("student"),
  getStudySuggestions,
);
router.post("/explain-concept", protect, explainConcept);

export default router;

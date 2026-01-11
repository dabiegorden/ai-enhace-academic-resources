import express from "express";
import {
  uploadLectureNote,
  getAllLectureNotes,
  getLectureNoteById,
  updateLectureNote,
  deleteLectureNote,
  downloadLectureNote,
  getMyLectureNotes,
  getMyUploadedNotes,
  getLectureNoteStats,
} from "../controller/notes.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";
import upload from "../middleware/upload.middleware.js";

const router = express.Router();

// Public routes (protected by auth)
router.get("/my-notes", protect, getMyLectureNotes);
router.get(
  "/uploaded-by-me",
  protect,
  authorize("lecturer", "admin"),
  getMyUploadedNotes
);
router.get("/stats", protect, authorize("admin"), getLectureNoteStats);
router.get("/:id/download", protect, downloadLectureNote);
router.get("/:id", protect, getLectureNoteById);
router.get("/", protect, getAllLectureNotes);

// Lecturer/Admin routes
router.post(
  "/",
  protect,
  authorize("lecturer", "admin"),
  upload.single("file"),
  uploadLectureNote
);
router.put("/:id", protect, authorize("lecturer", "admin"), updateLectureNote);
router.delete(
  "/:id",
  protect,
  authorize("lecturer", "admin"),
  deleteLectureNote
);

export default router;

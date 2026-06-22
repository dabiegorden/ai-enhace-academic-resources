import express from "express";
import {
  uploadLectureNote,
  getAllLectureNotes,
  getLectureNoteById,
  updateLectureNote,
  deleteLectureNote,
  downloadLectureNote,
  previewLectureNote,
  getMyLectureNotes,
  getMyUploadedNotes,
  getLectureNoteStats,
} from "../controller/notes.controller.js";
import { authorize, protect } from "../middleware/auth.middleware.js";
// Memory storage (PDF/image filter, 50MB) so the uploaded buffer can be
// streamed straight to Cloudinary.
import { uploadLectureNoteMemory } from "../middleware/upload.middleware.js";

const router = express.Router();

// Public routes (protected by auth)
router.get("/my-notes", protect, getMyLectureNotes);
router.get("/uploaded-by-me", protect, getMyUploadedNotes);
router.get("/stats", protect, getLectureNoteStats);

// Download and preview routes (like timetable)
router.get("/:id/download", protect, downloadLectureNote);
router.get("/:id/preview", protect, previewLectureNote);

router.get("/:id", protect, getLectureNoteById);
router.get("/", protect, getAllLectureNotes);

// Lecturer/Admin routes
router.post(
  "/",
  protect,
  authorize("lecturer", "admin"),
  uploadLectureNoteMemory.single("file"),
  uploadLectureNote,
);
router.put("/:id", protect, authorize("lecturer", "admin"), updateLectureNote);
router.delete(
  "/:id",
  protect,
  authorize("lecturer", "admin"),
  deleteLectureNote,
);

export default router;

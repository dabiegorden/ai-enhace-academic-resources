import express from "express";
import {
  createTimetable,
  getAllTimetables,
  getMyTimetable,
  getTimetableById,
  updateTimetable,
  addCourseToSlot,
  deleteTimetable,
  uploadTimetableDocument,
  downloadTimetableDocument,
  deleteTimetableDocument,
} from "../controller/timetable.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";
import uploadDocuments from "../config/multer-documents.js";

const router = express.Router();

// Student routes
router.get("/my-timetable", protect, getMyTimetable);

// Public/Admin routes
router.get("/", protect, getAllTimetables);
router.get("/:id", protect, getTimetableById);

// Admin only routes
router.post("/", protect, authorize("admin"), createTimetable);
router.put("/:id", protect, authorize("admin"), updateTimetable);
router.post("/:id/courses", protect, authorize("admin"), addCourseToSlot);
router.delete("/:id", protect, authorize("admin"), deleteTimetable);

router.post(
  "/:id/upload-document",
  protect,
  authorize("admin"),
  uploadDocuments.single("timetableDocument"),
  uploadTimetableDocument
);
router.get("/:id/download-document", protect, downloadTimetableDocument);
router.delete(
  "/:id/delete-document",
  protect,
  authorize("admin"),
  deleteTimetableDocument
);

export default router;

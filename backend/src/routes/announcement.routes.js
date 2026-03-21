import express from "express";
import {
  createAnnouncement,
  getAllAnnouncements,
  getAnnouncementById,
  updateAnnouncement,
  deleteAnnouncement,
} from "../controller/announcement.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";
import upload from "../middleware/upload.middleware.js";

const router = express.Router();

// GET / must come before GET /:id — otherwise Express swallows the list call
router.get("/", protect, getAllAnnouncements);
router.get("/:id", protect, getAnnouncementById);

// POST accepts up to 5 attachments via the "files" field (images or PDFs)
router.post(
  "/",
  protect,
  authorize("lecturer", "admin"),
  upload.array("files", 5),
  createAnnouncement,
);

router.put("/:id", protect, authorize("lecturer", "admin"), updateAnnouncement);
router.delete(
  "/:id",
  protect,
  authorize("lecturer", "admin"),
  deleteAnnouncement,
);

export default router;

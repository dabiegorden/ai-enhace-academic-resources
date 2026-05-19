import express from "express";
import {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from "../controller/notification.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", protect, getMyNotifications);

// IMPORTANT: this specific route must come BEFORE /:id routes
// otherwise express will try to match "unread-count" as an :id param
router.get("/unread-count", protect, getUnreadCount);

router.put("/mark-all-read", protect, markAllAsRead);
router.put("/:id/read", protect, markAsRead);
router.delete("/:id", protect, deleteNotification);

export default router;

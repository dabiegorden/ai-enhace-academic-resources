import express from "express";
import {
  createChatRoom,
  getAllChatRooms,
  getMyChatRooms,
  getChatRoomById,
  joinChatRoom,
  leaveChatRoom,
  sendMessage,
  updateChatRoom,
  deleteChatRoom,
  getChatRoomStats,
} from "../controller/chat.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

// General routes
router.get("/my-rooms", protect, getMyChatRooms);
router.get("/rooms", protect, getAllChatRooms);
router.get("/rooms/:id", protect, getChatRoomById);
router.post("/rooms", protect, createChatRoom);
router.post("/rooms/:id/join", protect, joinChatRoom);
router.post("/rooms/:id/leave", protect, leaveChatRoom);
router.post("/rooms/:id/messages", protect, sendMessage);
router.put("/rooms/:id", protect, updateChatRoom);
router.delete("/rooms/:id", protect, deleteChatRoom);

// Admin routes
router.get("/stats", protect, authorize("admin"), getChatRoomStats);

export default router;

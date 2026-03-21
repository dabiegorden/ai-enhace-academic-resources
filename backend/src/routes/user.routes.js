import express from "express";
import {
  getAllUsers,
  getUserById,
  updateProfile,
  changePassword,
  updateUser,
  uploadProfileImage,
  deleteUser,
  toggleUserStatus,
  getStudentsByProgram,
  getLecturers,
} from "../controller/user.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";
import upload from "../middleware/upload.middleware.js";

const router = express.Router();

// ── Own-profile routes (any authenticated user) ───────────────────────────────
router.put("/profile", protect, updateProfile);
router.put("/profile/password", protect, changePassword);
router.post(
  "/profile-image",
  protect,
  upload.single("image"),
  uploadProfileImage,
);

// ── Listing helpers ───────────────────────────────────────────────────────────
router.get("/students/by-program", protect, getStudentsByProgram);
router.get("/lecturers", protect, getLecturers);

// ── Admin / Lecturer routes ───────────────────────────────────────────────────
router.get("/", protect, authorize("lecturer", "admin"), getAllUsers);
router.get("/:id", protect, getUserById);
router.put("/:id", protect, authorize("admin"), updateUser);
router.delete("/:id", protect, authorize("admin"), deleteUser);
router.put("/:id/toggle-status", protect, authorize("admin"), toggleUserStatus);

export default router;

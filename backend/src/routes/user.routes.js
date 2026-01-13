import express from "express";
import {
  getAllUsers,
  getUserById,
  updateProfile,
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

// Public/Student routes
router.get("/students/by-program", protect, authorize, getStudentsByProgram);
router.get("/lecturers", protect, authorize, getLecturers);
router.get("/:id", protect, authorize, getUserById);
router.put("/profile", protect, authorize, updateProfile);
router.put("/:id", protect, authorize, updateUser);
router.post(
  "/profile-image",
  protect,
  upload.single("image"),
  uploadProfileImage
);

// Admin only routes
router.get("/", protect, authorize("admin"), getAllUsers);
router.delete("/:id", protect, authorize("admin"), deleteUser);
router.put("/:id/toggle-status", protect, authorize("admin"), toggleUserStatus);

export default router;

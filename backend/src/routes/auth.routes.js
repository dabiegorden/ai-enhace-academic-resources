import express from "express";
import {
  register,
  login,
  getMe,
  updatePassword,
  forgotPassword,
} from "../controller/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);
router.put("/update-password", protect, updatePassword);
router.post("/forgot-password", forgotPassword);

export default router;

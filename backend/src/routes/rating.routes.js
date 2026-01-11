import express from "express";
import {
  createRating,
  getRatings,
  getAverageRatings,
} from "../controller/rating.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", protect, createRating);
router.get("/average", protect, getAverageRatings);
router.get("/", protect, getRatings);

export default router;

import express from "express";
import {
  getAllReviews,
  getReviewById,
  updateReviewStatus,
} from "../controllers/reviewController.js";

const router = express.Router();

router.get("/", getAllReviews);
router.get("/:id", getReviewById);
router.patch("/:id", updateReviewStatus);

export default router;
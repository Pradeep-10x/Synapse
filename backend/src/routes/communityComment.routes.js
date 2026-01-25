import express from "express";
import {
  addCommunityComment,
  getCommunityComments,
  deleteCommunityComment
} from "../controllers/communityComment.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/:postId", verifyJWT, addCommunityComment);
router.get("/:postId", verifyJWT, getCommunityComments);
router.delete("/:commentId", verifyJWT, deleteCommunityComment);

export default router;

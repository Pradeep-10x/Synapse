import express from "express";
import {
  createCommunityPost,
  getCommunityFeed,
  likeCommunityPost,
  deleteCommunityPost,
  getJoinedCommunitiesFeed,
  getPublicCommunityPosts
} from "../controllers/communityPost.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = express.Router();

router.get("/feed/joined", verifyJWT, getJoinedCommunitiesFeed);
router.get("/public/:communityId", getPublicCommunityPosts); // Public posts (no auth required for viewing)
router.post(
  "/:communityId",
  verifyJWT,
  upload.single("media"),
  createCommunityPost
);

router.get("/:communityId", verifyJWT, getCommunityFeed);
router.post("/like/:postId", verifyJWT, likeCommunityPost);
router.delete("/:postId", verifyJWT, deleteCommunityPost);

export default router;

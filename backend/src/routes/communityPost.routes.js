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

/**
 * @swagger
 * tags:
 *   name: CommunityPosts
 *   description: Community post management
 */

/**
 * @swagger
 * /community-post/feed/joined:
 *   get:
 *     summary: Get feed of posts from all joined communities
 *     tags: [CommunityPosts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A mixed feed of community posts
 *       401:
 *         description: Unauthorized
 */
router.get("/feed/joined", verifyJWT, getJoinedCommunitiesFeed);
/**
 * @swagger
 * /community-post/public/{communityId}:
 *   get:
 *     summary: Get public posts for a community
 *     tags: [CommunityPosts]
 *     parameters:
 *       - in: path
 *         name: communityId
 *         required: true
 *         schema:
 *           type: string
 *         description: The community ID
 *     responses:
 *       200:
 *         description: A list of public community posts
 *       404:
 *         description: Community not found
 */
router.get("/public/:communityId", getPublicCommunityPosts); // Public posts (no auth required for viewing)
/**
 * @swagger
 * /community-post/{communityId}:
 *   post:
 *     summary: Create a post in a community
 *     tags: [CommunityPosts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: communityId
 *         required: true
 *         schema:
 *           type: string
 *         description: The community ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *               media:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Post created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Not a member)
 */
router.post(
  "/:communityId",
  verifyJWT,
  upload.single("media"),
  createCommunityPost
);

/**
 * @swagger
 * /community-post/{communityId}:
 *   get:
 *     summary: Get feed for a specific community
 *     tags: [CommunityPosts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: communityId
 *         required: true
 *         schema:
 *           type: string
 *         description: The community ID
 *     responses:
 *       200:
 *         description: A list of community posts
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get("/:communityId", verifyJWT, getCommunityFeed);

/**
 * @swagger
 * /community-post/like/{postId}:
 *   post:
 *     summary: Like or unlike a community post
 *     tags: [CommunityPosts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: The post ID
 *     responses:
 *       200:
 *         description: Post liked/unliked successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Post not found
 */
router.post("/like/:postId", verifyJWT, likeCommunityPost);

/**
 * @swagger
 * /community-post/{postId}:
 *   delete:
 *     summary: Delete a community post
 *     tags: [CommunityPosts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: The post ID
 *     responses:
 *       200:
 *         description: Post deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Not the post author or admin)
 *       404:
 *         description: Post not found
 */
router.delete("/:postId", verifyJWT, deleteCommunityPost);

export default router;

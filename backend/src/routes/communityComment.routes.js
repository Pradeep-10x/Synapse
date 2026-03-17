import express from "express";
import {
  addCommunityComment,
  getCommunityComments,
  deleteCommunityComment
} from "../controllers/communityComment.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: CommunityComments
 *   description: Community post comments management
 */

/**
 * @swagger
 * /api/v1/community-comments/{postId}:
 *   post:
 *     summary: Add a comment to a community post
 *     tags: [CommunityComments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: The community post ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 description: The comment text
 *     responses:
 *       201:
 *         description: Comment added successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Not a member of the community)
 *       404:
 *         description: Post not found
 */
router.post("/:postId", verifyJWT, addCommunityComment);
/**
 * @swagger
 * /api/v1/community-comments/{postId}:
 *   get:
 *     summary: Get comments for a community post
 *     tags: [CommunityComments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: The community post ID
 *     responses:
 *       200:
 *         description: A list of comments
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Not a member of the community)
 *       404:
 *         description: Post not found
 */
router.get("/:postId", verifyJWT, getCommunityComments);
/**
 * @swagger
 * /api/v1/community-comments/{commentId}:
 *   delete:
 *     summary: Delete a community comment
 *     tags: [CommunityComments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: The comment ID
 *     responses:
 *       200:
 *         description: Comment deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Not the comment author or admin)
 *       404:
 *         description: Comment not found
 */
router.delete("/:commentId", verifyJWT, deleteCommunityComment);

export default router;

import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createPostComment ,getPostComment,deleteComment ,createReelComment,getReelComment} from "../controllers/comment.controller.js";



const router = express.Router();


/**
 * @swagger
 * tags:
 *   name: Comments
 *   description: Comment management for posts and reels
 */

/**
 * @swagger
 * /api/v1/comment/post/{postId}:
 *   post:
 *     summary: Create a comment on a post
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: The post ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: The comment text
 *     responses:
 *       201:
 *         description: Comment created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.route("/post/:postId").post(verifyJWT, createPostComment);
/**
 * @swagger
 * /api/v1/comment/post/{postId}:
 *   get:
 *     summary: Get comments for a post
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: The post ID
 *     responses:
 *       200:
 *         description: A list of comments for the post
 *       404:
 *         description: Post not found
 */
router.route("/post/:postId").get(getPostComment);

/**
 * @swagger
 * /api/v1/comment/reel/{reelId}:
 *   post:
 *     summary: Create a comment on a reel
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reelId
 *         required: true
 *         schema:
 *           type: string
 *         description: The reel ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: The comment text
 *     responses:
 *       201:
 *         description: Comment created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.route("/reel/:reelId").post(verifyJWT, createReelComment);

/**
 * @swagger
 * /api/v1/comment/reel/{reelId}:
 *   get:
 *     summary: Get comments for a reel
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: reelId
 *         required: true
 *         schema:
 *           type: string
 *         description: The reel ID
 *     responses:
 *       200:
 *         description: A list of comments for the reel
 *       404:
 *         description: Reel not found
 */
router.route("/reel/:reelId").get(getReelComment);

/**
 * @swagger
 * /api/v1/comment/{commentId}:
 *   delete:
 *     summary: Delete a comment
 *     tags: [Comments]
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
 *         description: Forbidden (Not the comment author)
 *       404:
 *         description: Comment not found
 */
router.route("/:commentId").delete(verifyJWT, deleteComment);
export default router;
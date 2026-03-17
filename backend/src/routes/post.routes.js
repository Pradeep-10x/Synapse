import express from "express";
import { createPost ,getUserPosts,getSinglePost,deletePost,updateCaption,searchPosts} from "../controllers/post.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";


const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Posts
 *   description: Post management and retrieval
 */

/**
 * @swagger
 * /api/v1/post/search:
 *   get:
 *     summary: Search posts
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Search query
 *     responses:
 *       200:
 *         description: A list of posts matching the search query
 *       401:
 *         description: Unauthorized
 */
router.route("/search").get(verifyJWT, searchPosts);
/**
 * @swagger
 * /api/v1/post/create:
 *   post:
 *     summary: Create a new post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - media
 *             properties:
 *               media:
 *                 type: string
 *                 format: binary
 *               caption:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               visibility:
 *                 type: string
 *                 enum: [public, followers]
 *     responses:
 *       201:
 *         description: Post created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.route("/create").post(verifyJWT, upload.single("media"), createPost);
/**
 * @swagger
 * /api/v1/post/user/{userId}:
 *   get:
 *     summary: Get all posts from a specific user
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID
 *     responses:
 *       200:
 *         description: A list of posts from the user
 *       404:
 *         description: User not found
 */
router.route("/user/:userId").get(getUserPosts);

/**
 * @swagger
 * /api/v1/post/{postId}:
 *   get:
 *     summary: Get a single post by ID
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: The post ID
 *     responses:
 *       200:
 *         description: The requested post
 *       404:
 *         description: Post not found
 */
router.route("/:postId").get(getSinglePost);

/**
 * @swagger
 * /api/v1/post/{postId}:
 *   delete:
 *     summary: Delete a post
 *     tags: [Posts]
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
 *         description: Forbidden
 *       404:
 *         description: Post not found
 */
router.route("/:postId").delete(verifyJWT, deletePost);

/**
 * @swagger
 * /api/v1/post/{postId}/caption:
 *   patch:
 *     summary: Update a post's caption
 *     tags: [Posts]
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
 *               - caption
 *             properties:
 *               caption:
 *                 type: string
 *     responses:
 *       200:
 *         description: Caption updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Post not found
 */
router.route("/:postId/caption").patch(verifyJWT, updateCaption);

export default router;

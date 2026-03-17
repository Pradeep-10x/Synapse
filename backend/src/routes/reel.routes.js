import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { createReel, getReels, getReelFeed, deleteReel } from "../controllers/reel.controller.js";


const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Reels
 *   description: Reel management and retrieval
 */

/**
 * @swagger
 * /api/v1/reel/feed:
 *   get:
 *     summary: Get reel feed
 *     tags: [Reels]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of reels for the feed
 *       401:
 *         description: Unauthorized
 */
router.route("/feed").get(verifyJWT, getReelFeed);
/**
 * @swagger
 * /api/v1/reel/create:
 *   post:
 *     summary: Create a new reel
 *     tags: [Reels]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - video
 *             properties:
 *               video:
 *                 type: string
 *                 format: binary
 *               caption:
 *                 type: string
 *     responses:
 *       201:
 *         description: Reel created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.route("/create").post(verifyJWT, upload.single("video"), createReel);
/**
 * @swagger
 * /api/v1/reel/{userId}:
 *   get:
 *     summary: Get all reels from a specific user
 *     tags: [Reels]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID
 *     responses:
 *       200:
 *         description: A list of reels from the user
 *       404:
 *         description: User not found
 */
router.route("/:userId").get(getReels);

/**
 * @swagger
 * /api/v1/reel/delete/{reelId}:
 *   delete:
 *     summary: Delete a reel
 *     tags: [Reels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reelId
 *         required: true
 *         schema:
 *           type: string
 *         description: The reel ID
 *     responses:
 *       200:
 *         description: Reel deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Not the reel author)
 *       404:
 *         description: Reel not found
 */
router.route("/delete/:reelId").delete(verifyJWT, deleteReel);

export default router;

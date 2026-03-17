import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getHomeFeed } from "../controllers/feed.controller.js";


const router = express.Router();


/**
 * @swagger
 * tags:
 *   name: Feed
 *   description: User feed generation
 */

/**
 * @swagger
 * /api/v1/feed:
 *   get:
 *     summary: Get home feed for authenticated user
 *     tags: [Feed]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A mixed feed of posts and reels
 *       401:
 *         description: Unauthorized
 */
router.route("/").get(verifyJWT,getHomeFeed);

export default router;

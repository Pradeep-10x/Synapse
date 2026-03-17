import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  sendCommunityMessage,
  getCommunityMessages
} from "../controllers/communityChat.controller.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: CommunityChat
 *   description: Real-time community messaging
 */

/**
 * @swagger
 * /api/v1/community-chat/{communityId}:
 *   post:
 *     summary: Send a message in a community chat
 *     tags: [CommunityChat]
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
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: The message text
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Not a member of the community)
 *       404:
 *         description: Community not found
 */
router.post("/:communityId", verifyJWT, sendCommunityMessage);
/**
 * @swagger
 * /api/v1/community-chat/{communityId}:
 *   get:
 *     summary: Get messages for a community chat
 *     tags: [CommunityChat]
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
 *         description: A list of messages
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Not a member of the community)
 *       404:
 *         description: Community not found
 */
router.get("/:communityId", verifyJWT, getCommunityMessages);

export default router;


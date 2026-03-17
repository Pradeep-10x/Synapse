import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  sendMessage,
  getConversations,
  getMessages
} from "../controllers/message.controller.js";


const router = express.Router();
/**
 * @swagger
 * tags:
 *   name: Messages
 *   description: Private messaging
 */

/**
 * @swagger
 * /api/v1/message/send:
 *   post:
 *     summary: Send a direct message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - receiverId
 *               - content
 *             properties:
 *               receiverId:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.route("/send").post(verifyJWT, sendMessage);
/**
 * @swagger
 * /api/v1/message/conversations:
 *   get:
 *     summary: Get user's conversations
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of conversations
 *       401:
 *         description: Unauthorized
 */
router.route("/conversations").get(verifyJWT, getConversations);
/**
 * @swagger
 * /api/v1/message/conversation/{conversationId}/messages:
 *   get:
 *     summary: Get messages for a specific conversation
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: The conversation ID
 *     responses:
 *       200:
 *         description: A list of messages
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Conversation not found
 */
router.route("/conversation/:conversationId/messages").get(verifyJWT, getMessages);

export default router;

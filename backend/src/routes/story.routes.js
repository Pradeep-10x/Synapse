import express from "express";
import { createStory, getStories, deleteStory, getStoryFeed } from "../controllers/story.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";


const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Stories
 *   description: User stories management
 */

/**
 * @swagger
 * /story/create:
 *   post:
 *     summary: Create a new story
 *     tags: [Stories]
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
 *     responses:
 *       201:
 *         description: Story created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.route("/create").post(verifyJWT, upload.single("media"), createStory);
/**
 * @swagger
 * /story/feed:
 *   get:
 *     summary: Get stories feed from followed users
 *     tags: [Stories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of active stories
 *       401:
 *         description: Unauthorized
 */
router.route("/feed").get(verifyJWT, getStoryFeed);
/**
 * @swagger
 * /story/user/{userId}:
 *   get:
 *     summary: Get stories of a specific user
 *     tags: [Stories]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID
 *     responses:
 *       200:
 *         description: A list of the user's stories
 *       404:
 *         description: User not found
 */
router.route("/user/:userId").get(getStories);

// View story route
/**
 * @swagger
 * /story/{storyId}:
 *   delete:
 *     summary: Delete a story
 *     tags: [Stories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storyId
 *         required: true
 *         schema:
 *           type: string
 *         description: The story ID
 *     responses:
 *       200:
 *         description: Story deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Not the story author)
 *       404:
 *         description: Story not found
 */
router.route("/:storyId").delete(verifyJWT, deleteStory);

export default router;

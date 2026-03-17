import {Router} from 'express';
import { likeUnlikePost,getPostLikes,likeUnlikeReel,getReelLikes, likeUnlikeStory,getStoryLikes} from '../controllers/like.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';


const router = Router();

/**
 * @swagger
 * tags:
 *   name: Likes
 *   description: Like management for posts, reels, and stories
 */

/**
 * @swagger
 * /like/post/{postId}:
 *   post:
 *     summary: Like or unlike a post
 *     tags: [Likes]
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
router.route('/post/:postId').post(verifyJWT, likeUnlikePost);
/**
 * @swagger
 * /like/post/{postId}:
 *   get:
 *     summary: Get likes for a post
 *     tags: [Likes]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: The post ID
 *     responses:
 *       200:
 *         description: A list of users who liked the post
 *       404:
 *         description: Post not found
 */
router.route('/post/:postId').get(getPostLikes);

/**
 * @swagger
 * /like/reel/{reelId}:
 *   post:
 *     summary: Like or unlike a reel
 *     tags: [Likes]
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
 *         description: Reel liked/unliked successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Reel not found
 */
router.route('/reel/:reelId').post(verifyJWT, likeUnlikeReel);

/**
 * @swagger
 * /like/reel/{reelId}:
 *   get:
 *     summary: Get likes for a reel
 *     tags: [Likes]
 *     parameters:
 *       - in: path
 *         name: reelId
 *         required: true
 *         schema:
 *           type: string
 *         description: The reel ID
 *     responses:
 *       200:
 *         description: A list of users who liked the reel
 *       404:
 *         description: Reel not found
 */
router.route('/reel/:reelId').get(getReelLikes);

/**
 * @swagger
 * /like/story/{storyId}:
 *   post:
 *     summary: Like or unlike a story
 *     tags: [Likes]
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
 *         description: Story liked/unliked successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Story not found
 */
router.route("/story/:storyId").post(verifyJWT, likeUnlikeStory);
/**
 * @swagger
 * /like/story/{storyId}:
 *   get:
 *     summary: Get likes for a story
 *     tags: [Likes]
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
 *         description: A list of users who liked the story
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Story not found
 */
router.route("/story/:storyId").get(verifyJWT, getStoryLikes);
export default router;
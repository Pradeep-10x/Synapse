import express from "express";
import {
  createCommunity,
  joinCommunity,
  leaveCommunity,
  getCommunity,
  approveJoinRequest,
  makeAdmin,
  removeAdmin,
  getAllCommunities,
  getJoinedCommunities,
  getCreatedCommunities,
  searchCommunities,
  updateCommunity,
  removeUser,
  deleteCommunity,
  getUserJoinedCommunities
} from "../controllers/community.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Communities
 *   description: Community management and participation
 */

/**
 * @swagger
 * /api/v1/community:
 *   get:
 *     summary: Get all communities
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of communities
 *       401:
 *         description: Unauthorized
 */
router.get("/", verifyJWT, getAllCommunities);
/**
 * @swagger
 * /api/v1/community/joined:
 *   get:
 *     summary: Get communities joined by the current user
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of joined communities
 *       401:
 *         description: Unauthorized
 */
router.get("/joined", verifyJWT, getJoinedCommunities);
/**
 * @swagger
 * /api/v1/community/user/{userId}/joined:
 *   get:
 *     summary: Get communities joined by a specific user
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID
 *     responses:
 *       200:
 *         description: A list of joined communities
 *       401:
 *         description: Unauthorized
 */
router.get("/user/:userId/joined", verifyJWT, getUserJoinedCommunities);

/**
 * @swagger
 * /api/v1/community/created:
 *   get:
 *     summary: Get communities created by the current user
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of created communities
 *       401:
 *         description: Unauthorized
 */
router.get("/created", verifyJWT, getCreatedCommunities);

/**
 * @swagger
 * /api/v1/community/search:
 *   get:
 *     summary: Search communities
 *     tags: [Communities]
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
 *         description: A list of communities matching the search
 *       401:
 *         description: Unauthorized
 */
router.get("/search", verifyJWT, searchCommunities);
/**
 * @swagger
 * /api/v1/community:
 *   post:
 *     summary: Create a new community
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               isPrivate:
 *                 type: boolean
 *               rules:
 *                 type: array
 *                 items:
 *                   type: string
 *               avatar:
 *                 type: string
 *                 format: binary
 *               coverImage:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Community created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post("/", verifyJWT, upload.fields([{ name: "avatar", maxCount: 1 }, { name: "coverImage", maxCount: 1 }]), createCommunity);
/**
 * @swagger
 * /api/v1/community/{id}/join:
 *   post:
 *     summary: Join a community
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The community ID
 *     responses:
 *       200:
 *         description: Successfully joined or access requested
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Community not found
 */
router.post("/:id/join", verifyJWT, joinCommunity);

/**
 * @swagger
 * /api/v1/community/{id}/leave:
 *   post:
 *     summary: Leave a community
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The community ID
 *     responses:
 *       200:
 *         description: Successfully left community
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Community not found
 */
router.post("/:id/leave", verifyJWT, leaveCommunity);
router.post("/:id/approve", verifyJWT, approveJoinRequest);
router.post("/:id/make-admin", verifyJWT, makeAdmin);
router.post("/:id/remove-admin", verifyJWT, removeAdmin);
router.post("/:id/remove-user", verifyJWT, removeUser);

/**
 * @swagger
 * /api/v1/community/{id}:
 *   delete:
 *     summary: Delete a community
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The community ID
 *     responses:
 *       200:
 *         description: Community deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Not the creator)
 *       404:
 *         description: Community not found
 */
router.delete("/:id", verifyJWT, deleteCommunity);

/**
 * @swagger
 * /api/v1/community/{id}:
 *   get:
 *     summary: Get community details
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The community ID
 *     responses:
 *       200:
 *         description: Community details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Community not found
 */
router.get("/:id", verifyJWT, getCommunity);
router.patch("/:id", verifyJWT, upload.fields([{ name: "avatar", maxCount: 1 }, { name: "coverImage", maxCount: 1 }]), updateCommunity);

export default router;

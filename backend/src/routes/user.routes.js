import { Router } from 'express';
import { upload } from '../middlewares/multer.middleware.js';
import { registerUser, loginUser, logoutUser, deleteUser, refreshaccessToken, changePassword, GetCurrentUser, updateUserDetails, UpdateAvatar, getUserProfile, searchUsers, updatePrivacy, getPrivacy, getRecentlyActiveUsers } from '../controllers/user.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { followUnfollowUser, getFollowers, getFollowing } from '../controllers/follow.controller.js';
import limiter from '../middlewares/rateLimiter.js';


const router = Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication endpoints
 */

/**
 * @swagger
 * /api/v1/user/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *               - fullName
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               fullName:
 *                 type: string
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input or user already exists
 */
router.route("/register").post(limiter,
    upload.fields([
        {
            name: "avatar",
            maxCount: 1,
        }
    ]), registerUser);

/**
 * @swagger
 * /api/v1/user/login:
 *   post:
 *     summary: Login a user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: Username or email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       401:
 *         description: Invalid credentials
 */
router.route("/login").post(limiter, loginUser);
/**
 * @swagger
 * /api/v1/user/logout:
 *   post:
 *     summary: Logout a user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: Unauthorized
 */
router.route("/logout").post(verifyJWT, logoutUser);

/**
 * @swagger
 * /api/v1/user/delete:
 *   post:
 *     summary: Delete user account
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *       401:
 *         description: Unauthorized
 */
router.route("/delete").post(verifyJWT, deleteUser);
/**
 * @swagger
 * /api/v1/user/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Access token refreshed successfully
 *       401:
 *         description: Invalid refresh token
 */
router.route("/refresh-token").post(refreshaccessToken);

/**
 * @swagger
 * /api/v1/user/change-password:
 *   post:
 *     summary: Change user password
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *               - newPassword
 *             properties:
 *               oldPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Invalid input or incorrect old password
 *       401:
 *         description: Unauthorized
 */
router.route("/change-password").post(verifyJWT, changePassword);
/**
 * @swagger
 * tags:
 *   name: User Details
 *   description: User profile and settings
 */

/**
 * @swagger
 * /api/v1/user/me:
 *   get:
 *     summary: Get current logged-in user details
 *     tags: [User Details]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 */
router.route("/me").get(verifyJWT, GetCurrentUser);

/**
 * @swagger
 * /api/v1/user/update-details:
 *   put:
 *     summary: Update user profile details
 *     tags: [User Details]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               bio:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.route("/update-details").put(verifyJWT, updateUserDetails);

/**
 * @swagger
 * /api/v1/user/update-avatar:
 *   patch:
 *     summary: Update user avatar
 *     tags: [User Details]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - avatar
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Avatar updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.route("/update-avatar").patch(verifyJWT, upload.single("avatar"), UpdateAvatar);
/**
 * @swagger
 * tags:
 *   name: User Interactions
 *   description: Following and user discovery
 */

/**
 * @swagger
 * /api/v1/user/{userId}/follow:
 *   post:
 *     summary: Follow or unfollow a user
 *     tags: [User Interactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID to follow/unfollow
 *     responses:
 *       200:
 *         description: Follow/unfollow successful
 *       400:
 *         description: Cannot follow yourself
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.route("/:userId/follow").post(verifyJWT, followUnfollowUser);

/**
 * @swagger
 * /api/v1/user/{userId}/followers:
 *   get:
 *     summary: Get followers of a user
 *     tags: [User Interactions]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID
 *     responses:
 *       200:
 *         description: A list of followers
 *       404:
 *         description: User not found
 */
router.route("/:userId/followers").get(getFollowers);

/**
 * @swagger
 * /api/v1/user/{userId}/following:
 *   get:
 *     summary: Get users a user is following
 *     tags: [User Interactions]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID
 *     responses:
 *       200:
 *         description: A list of following users
 *       404:
 *         description: User not found
 */
router.route("/:userId/following").get(getFollowing);
/**
 * @swagger
 * /api/v1/user/search:
 *   get:
 *     summary: Search for users
 *     tags: [User Interactions]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Search keyword
 *     responses:
 *       200:
 *         description: A list of matching users
 */
router.route("/search").get(searchUsers);

/**
 * @swagger
 * /api/v1/user/u/{username}:
 *   get:
 *     summary: Get user profile by username
 *     tags: [User Details]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: The username
 *     responses:
 *       200:
 *         description: User profile
 *       404:
 *         description: User not found
 */
router.route("/u/:username").get(verifyJWT, getUserProfile);

/**
 * @swagger
 * /api/v1/user/privacy:
 *   get:
 *     summary: Get user privacy settings
 *     tags: [User Details]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Privacy settings retrieved
 *       401:
 *         description: Unauthorized
 */
router.route("/privacy").get(verifyJWT, getPrivacy);

/**
 * @swagger
 * /api/v1/user/privacy:
 *   patch:
 *     summary: Update user privacy settings
 *     tags: [User Details]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               privateAccount:
 *                 type: boolean
 *               messagePolicy:
 *                 type: string
 *                 enum: [everyone, followers]
 *               allowMentions:
 *                 type: boolean
 *               allowTagging:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Privacy settings updated
 *       401:
 *         description: Unauthorized
 */
router.route("/privacy").patch(verifyJWT, updatePrivacy);

/**
 * @swagger
 * /api/v1/user/recently-active:
 *   get:
 *     summary: Get recently active users
 *     tags: [User Interactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of recently active users
 *       401:
 *         description: Unauthorized
 */
router.route("/recently-active").get(verifyJWT, getRecentlyActiveUsers);
export default router

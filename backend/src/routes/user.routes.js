import { Router } from 'express';
import { upload } from '../middlewares/multer.middleware.js';
import { registerUser, loginUser, logoutUser, deleteUser, refreshaccessToken, changePassword, GetCurrentUser, updateUserDetails, UpdateAvatar, getUserProfile, searchUsers, updatePrivacy, getPrivacy, getRecentlyActiveUsers } from '../controllers/user.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { followUnfollowUser, getFollowers, getFollowing } from '../controllers/follow.controller.js';
import limiter from '../middlewares/rateLimiter.js';


const router = Router();

router.route("/register").post(limiter,
    upload.fields([
        {
            name: "avatar",
            maxCount: 1,
        }
    ]), registerUser);

router.route("/login").post(limiter, loginUser);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/delete").post(verifyJWT, deleteUser);
router.route("/refresh-token").post(refreshaccessToken);
router.route("/change-password").post(verifyJWT, changePassword);
router.route("/me").get(verifyJWT, GetCurrentUser);
router.route("/update-details").put(verifyJWT, updateUserDetails);
router.route("/update-avatar").patch(verifyJWT, upload.single("avatar"), UpdateAvatar);
router.route("/:userId/follow").post(verifyJWT, followUnfollowUser);
router.route("/:userId/followers").get(getFollowers);
router.route("/:userId/following").get(getFollowing);
router.route("/search").get(searchUsers);
router.route("/u/:username").get(verifyJWT, getUserProfile);
router.route("/privacy").get(verifyJWT, getPrivacy);
router.route("/privacy").patch(verifyJWT, updatePrivacy);
router.route("/recently-active").get(verifyJWT, getRecentlyActiveUsers);
export default router

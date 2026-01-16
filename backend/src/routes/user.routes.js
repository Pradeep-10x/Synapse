import {Router} from 'express';
import {upload} from '../middlewares/multer.middleware.js';
import {registerUser,loginUser,logoutUser,deleteUser,refreshaccessToken,changePassword,GetCurrentUser,updateUserDetails,UpdateAvatar} from '../controllers/user.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { followUnfollowUser,getFollowers,getFollowing } from '../controllers/follow.controller.js';
import limiter from '../middlewares/rateLimiter.js';
import { registerUserSchema, loginUserSchema, validate } from '../middlewares/ZodValidator.js';


const router = Router();

router.route("/register").post(
    limiter,
    upload.fields([
        {
            name : "avatar",
            maxCount : 1,
        }
    ]),
    validate(registerUserSchema),
    registerUser
);

router.route("/login").post(limiter, validate(loginUserSchema), loginUser);
router.route("/logout").post(verifyJWT,logoutUser);
router.route("/delete").post(verifyJWT,deleteUser);
router.route("/refresh-token").post(refreshaccessToken);
router.route("/change-password").post(verifyJWT,changePassword);
router.route("/me").get(verifyJWT,GetCurrentUser);
router.route("/update-details").put(verifyJWT,updateUserDetails);
router.route("/update-avatar").patch(verifyJWT,upload.single("avatar"),UpdateAvatar);
router.route("/:userId/follow").post(verifyJWT, followUnfollowUser);
router.route("/:userId/followers").get(getFollowers);
router.route("/:userId/following").get(getFollowing);
export default router

import express from "express";
import { createPost ,getUserPosts,getSinglePost,deletePost,updateCaption,searchPosts} from "../controllers/post.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";


const router = express.Router();

router.route("/search").get(searchPosts);
router.route("/create").post(verifyJWT, upload.single("media"), createPost);
router.route("/user/:userId").get(getUserPosts);
router.route("/:postId").get(getSinglePost);
router.route("/:postId").delete(verifyJWT, deletePost);
router.route("/:postId/caption").patch(verifyJWT, updateCaption);

export default router;

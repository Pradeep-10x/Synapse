import mongoose from "mongoose";

/**
 * @swagger
 * components:
 *   schemas:
 *     Reel:
 *       type: object
 *       required:
 *         - user
 *         - videoUrl
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the reel
 *         user:
 *           type: string
 *           description: ID of the user who created the reel
 *         videoUrl:
 *           type: string
 *           description: URL of the reel video
 *         caption:
 *           type: string
 *           description: Reel caption
 *         likesCount:
 *           type: number
 *           description: Total number of likes
 *         commentsCount:
 *           type: number
 *           description: Total number of comments
 *         viewsCount:
 *           type: number
 *           description: Total number of views
 *         isDeleted:
 *           type: boolean
 *           description: Soft delete flag
 */
const reelSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true
    },
    videoUrl: {
      type: String,
      required: true
    },
    caption: String,
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    viewsCount: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const Reel = mongoose.model("Reel", reelSchema);

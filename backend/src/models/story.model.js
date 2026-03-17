import mongoose from "mongoose";

/**
 * @swagger
 * components:
 *   schemas:
 *     Story:
 *       type: object
 *       required:
 *         - user
 *         - mediaUrl
 *         - mediaType
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the story
 *         user:
 *           type: string
 *           description: ID of the user who created the story
 *         mediaUrl:
 *           type: string
 *           description: URL of the story media
 *         mediaType:
 *           type: string
 *           enum: [image, video]
 *           description: Type of media
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation time
 *         isDeleted:
 *           type: boolean
 *           description: Soft delete flag
 */
const storySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    mediaUrl: {
      type: String,
      required: true
    },

    mediaType: {
      type: String,
      enum: ["image", "video"],
      required: true
    },

    createdAt: {
      type: Date,
      default: Date.now,
      expires: 60 * 60 * 24 // 24 hours (TTL)
    },

    isDeleted: {
      type: Boolean,
      default: false
    }
  }
);

export const Story = mongoose.model("Story", storySchema);
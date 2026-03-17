import mongoose from "mongoose";

/**
 * @swagger
 * components:
 *   schemas:
 *     CommunityPost:
 *       type: object
 *       required:
 *         - community
 *         - author
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the community post
 *         community:
 *           type: string
 *           description: ID of the community
 *         author:
 *           type: string
 *           description: ID of the user who authored the post
 *         text:
 *           type: string
 *           description: Post text content
 *         mediaUrl:
 *           type: string
 *           description: URL of the post media
 *         likes:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of user IDs who liked the post
 *         commentsCount:
 *           type: number
 *           description: Total number of comments
 */
const communityPostSchema = new mongoose.Schema(
  {
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      required: true
    },

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    text: {
      type: String
    },

    mediaUrl: {
      type: String
    },

    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    commentsCount: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

export const CommunityPost = mongoose.model(
  "CommunityPost",
  communityPostSchema
);

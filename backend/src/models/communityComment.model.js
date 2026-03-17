import mongoose from "mongoose";

/**
 * @swagger
 * components:
 *   schemas:
 *     CommunityComment:
 *       type: object
 *       required:
 *         - post
 *         - author
 *         - text
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the community comment
 *         post:
 *           type: string
 *           description: ID of the parent community post
 *         author:
 *           type: string
 *           description: ID of the user who authored the comment
 *         text:
 *           type: string
 *           description: Comment text content
 */
const communityCommentSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CommunityPost",
      required: true
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    text: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

export const CommunityComment = mongoose.model(
  "CommunityComment",
  communityCommentSchema
);

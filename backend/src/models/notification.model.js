import mongoose from "mongoose";
const { Schema } = mongoose;


/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       required:
 *         - user
 *         - type
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the notification
 *         user:
 *           type: string
 *           description: ID of the user receiving the notification
 *         fromUser:
 *           type: string
 *           description: ID of the user who triggered the notification
 *         type:
 *           type: string
 *           enum: [like, comment, follow, message, post, reel, story, community_like, community_comment, community_post, community_create]
 *           description: Type of notification
 *         post:
 *           type: string
 *           description: ID of the related post (if applicable)
 *         reel:
 *           type: string
 *           description: ID of the related reel (if applicable)
 *         story:
 *           type: string
 *           description: ID of the related story (if applicable)
 *         communityPost:
 *           type: string
 *           description: ID of the related community post (if applicable)
 *         community:
 *           type: string
 *           description: ID of the related community (if applicable)
 *         message:
 *           type: string
 *           description: Custom notification message
 *         isRead:
 *           type: boolean
 *           description: Whether the notification has been read
 */
const notificationSchema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    type: {
      type: String,
      enum: ["like", "comment", "follow", "message", "post", "reel", "story", "community_like", "community_comment", "community_post", "community_create"],
      required: true
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      default: null
    },
    reel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reel",
      default: null
    },
    story: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Story",
      default: null
    },
    communityPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CommunityPost",
      default: null
    },
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      default: null
    },
    message: {
      type: String,
      default: null
    },
    isRead: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

export const Notification = mongoose.model(
  "Notification",
  notificationSchema
);

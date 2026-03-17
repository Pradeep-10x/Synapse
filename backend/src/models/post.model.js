import mongoose from 'mongoose';
const { Schema } = mongoose;


/**
 * @swagger
 * components:
 *   schemas:
 *     Post:
 *       type: object
 *       required:
 *         - user
 *         - mediaUrl
 *         - mediaType
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the post
 *         user:
 *           type: string
 *           description: ID of the user who created the post
 *         caption:
 *           type: string
 *           description: Post caption
 *         mediaUrl:
 *           type: string
 *           description: URL of the post media
 *         mediaType:
 *           type: string
 *           enum: [image, video]
 *           description: Type of media
 *         likesCount:
 *           type: number
 *           description: Total number of likes
 *         commentsCount:
 *           type: number
 *           description: Total number of comments
 *         viewsCount:
 *           type: number
 *           description: Total number of views
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of tags
 *         visibility:
 *           type: string
 *           enum: [public, followers]
 *           description: Post visibility
 */
const postSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },

  caption: {
    type: String,
    trim: true,
    maxlength: 2200
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

  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],

  likesCount: {
    type: Number,
    default: 0
  },

  commentsCount: {
    type: Number,
    default: 0
  },

  viewsCount: {
    type: Number,
    default: 0
  },

  tags: [{
    type: String,
    lowercase: true,
    trim: true
  }],

  visibility: {
    type: String,
    enum: ["public", "followers"],
    default: "public"
  },

  isDeleted: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

export const Post = mongoose.model("Post", postSchema);

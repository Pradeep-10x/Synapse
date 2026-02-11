import mongoose from "mongoose";
const { Schema } = mongoose;


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

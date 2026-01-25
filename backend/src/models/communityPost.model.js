import mongoose from "mongoose";

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

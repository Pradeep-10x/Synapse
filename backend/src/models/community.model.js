import mongoose from "mongoose";

const communitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },

    description: {
      type: String,
      trim: true
    },

    coverImage: {
      type: String
    },

    avatar: {
      type: String
    },

    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    admins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    joinRequests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],


    isPrivate: {
      type: Boolean,
      default: false
    },

    membersCount: {
      type: Number,
      default: 0
    },
    rules: [
      {
        type: String,
        trim: true
      }
    ]
  },
  { timestamps: true }
);

export const Community = mongoose.model("Community", communitySchema);

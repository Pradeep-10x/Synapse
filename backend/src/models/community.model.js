import mongoose from "mongoose";

/**
 * @swagger
 * components:
 *   schemas:
 *     Community:
 *       type: object
 *       required:
 *         - name
 *         - creator
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the community
 *         name:
 *           type: string
 *           description: Unique name of the community
 *         description:
 *           type: string
 *           description: Community description
 *         coverImage:
 *           type: string
 *           description: URL of the cover image
 *         avatar:
 *           type: string
 *           description: URL of the community avatar
 *         creator:
 *           type: string
 *           description: ID of the user who created the community
 *         admins:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of admin user IDs
 *         members:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of member user IDs
 *         isPrivate:
 *           type: boolean
 *           description: Whether the community is private
 *         membersCount:
 *           type: number
 *           description: Total number of members
 *         rules:
 *           type: array
 *           items:
 *             type: string
 *           description: Community rules
 */
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

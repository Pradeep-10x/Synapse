import mongoose from "mongoose";

/**
 * @swagger
 * components:
 *   schemas:
 *     CommunityChat:
 *       type: object
 *       required:
 *         - community
 *         - sender
 *         - content
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the chat message
 *         community:
 *           type: string
 *           description: ID of the community
 *         sender:
 *           type: string
 *           description: ID of the user who sent the message
 *         content:
 *           type: string
 *           description: Message content
 *         isRead:
 *           type: boolean
 *           description: Whether the message is read
 */
const communityChatSchema = new mongoose.Schema(
  {
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      required: true,
      index: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    content: {
      type: String,
      required: true
    },
    isRead: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

// Index for efficient querying
communityChatSchema.index({ community: 1, createdAt: -1 });

export const CommunityChat = mongoose.model("CommunityChat", communityChatSchema);


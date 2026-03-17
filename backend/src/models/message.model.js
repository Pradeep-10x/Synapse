import mongoose from "mongoose";

/**
 * @swagger
 * components:
 *   schemas:
 *     Message:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the message
 *         conversation:
 *           type: string
 *           description: ID of the conversation
 *         sender:
 *           type: string
 *           description: ID of the sender
 *         receiver:
 *           type: string
 *           description: ID of the receiver
 *         content:
 *           type: string
 *           description: Message content
 *         isRead:
 *           type: boolean
 *           description: Whether the message has been read
 */
const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      index: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    content: String,
    isRead: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

export const Message = mongoose.model("Message", messageSchema);

import mongoose from "mongoose";

/**
 * @swagger
 * components:
 *   schemas:
 *     Conversation:
 *       type: object
 *       required:
 *         - participants
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the conversation
 *         participants:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of user IDs participating in the conversation
 *         lastMessage:
 *           type: string
 *           description: The last message sent in the conversation
 */
const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
      }
    ],
    lastMessage: String
  },
  { timestamps: true }
);

export const Conversation = mongoose.model(
  "Conversation",
  conversationSchema
);

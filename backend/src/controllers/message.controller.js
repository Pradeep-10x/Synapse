import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { Conversation } from "../models/conversation.model.js";
import { Message } from "../models/message.model.js";
import { emitToUser } from '../utils/socketEmitters.js';
import { User } from "../models/user.model.js";
import { Follow } from "../models/follow.model.js";
import mongoose from 'mongoose';

const MAX_MESSAGE_LENGTH = 2000;

 const sendMessage = asyncHandler(async (req, res) => {
  const { receiverId } = req.body;
  const content = typeof req.body.content === "string" ? req.body.content.trim() : "";

  if (!receiverId || !content) {
    throw new ApiError(400, "Receiver ID and content are required");
  }

  if (content.length > MAX_MESSAGE_LENGTH) {
    throw new ApiError(400, `Message must be at most ${MAX_MESSAGE_LENGTH} characters`);
  }

  if (!mongoose.Types.ObjectId.isValid(receiverId)) {
    throw new ApiError(400, "Invalid receiver ID");
  }

  if (receiverId.toString() === req.user._id.toString()) {
    throw new ApiError(400, "Cannot send message to yourself");
  }

  const receiver = await User.findById(receiverId);
  if (!receiver) {
    throw new ApiError(404, "Receiver not found");
  }

  // Enforce the receiver's message policy. When set to "followers", only users
  // the receiver follows back may start/continue a conversation.
  if (receiver.privacy?.messagePolicy === "followers") {
    const receiverFollowsSender = await Follow.exists({
      follower: receiver._id,
      following: req.user._id,
    });
    if (!receiverFollowsSender) {
      throw new ApiError(403, "This user only accepts messages from people they follow");
    }
  }

  let conversation = await Conversation.findOne({
    participants: { $all: [req.user._id, receiverId] }
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [req.user._id, receiverId]
    });
  }

  const message = await Message.create({
    conversation: conversation._id,
    sender: req.user._id,
    receiver: receiverId,
    content
  });
  
  // Populate sender before emitting
  const populatedMessage = await Message.findById(message._id).populate('sender', 'username avatar fullName');
  
  emitToUser(req, receiverId, "message:new", populatedMessage);
  conversation.lastMessage = content;
  await conversation.save();

  res.status(201).json(new ApiResponse(201, populatedMessage || message));
});

const getConversations = asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({
    participants: req.user._id
  }).populate("participants", "username avatar");

  res.status(200).json(new ApiResponse(200, conversations));
});

const getMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new ApiError(400, "Invalid conversation ID");
  }

  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: req.user._id
  });

  if (!conversation) {
    throw new ApiError(403, "You are not authorized to view this conversation");
  }

  const messages = await Message.find({
    conversation: conversationId
  })
  .populate('sender', 'username avatar fullName')
  .sort({ createdAt: 1 });

  res.status(200).json(new ApiResponse(200, messages));
});

export { sendMessage, getConversations, getMessages };
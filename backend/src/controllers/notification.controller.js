import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { User } from '../models/user.model.js';
import { Notification } from "../models/notification.model.js";

const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({
    user: req.user._id,
    fromUser: { $ne: req.user._id } // Filter out self-notifications
  })
    .populate("fromUser", "username avatar")
    .sort({ createdAt: -1 })
    .limit(50);

  res.status(200).json(new ApiResponse(200, notifications));
});

const markRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { user: req.user._id, isRead: false },
    { $set: { isRead: true } }
  );

  res.status(200).json(new ApiResponse(200, null, "Marked as read"));
});

const deleteNotifications = asyncHandler(async (req, res) => {
  await Notification.deleteMany({ user: req.user._id });

  res.status(200).json(new ApiResponse(200, null, "Notifications deleted"));
});

export { getNotifications, markRead, deleteNotifications };
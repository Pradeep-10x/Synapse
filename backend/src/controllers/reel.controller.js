import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { Follow } from "../models/follow.model.js";
import {User} from '../models/user.model.js';
import { Notification } from "../models/notification.model.js";
import { emitToUser } from '../utils/socketEmitters.js';
import {uploadonCloudinary} from '../utils/cloudinary.js';
import {v2 as cloudinary} from 'cloudinary';
import { Reel } from '../models/reel.model.js';


const createReel = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "Reel video file is required");
  }

  const {caption} = req.body;

  const upload = await uploadonCloudinary(req.file.path, "video");

  if (!upload?.url) {
    throw new ApiError(500, "Video upload failed");
  }

  const reel = await Reel.create({
    user: req.user._id,
    videoUrl: upload.url,
    caption,
  });

   const followerIds = await Follow.find({ following: req.user._id })
        .distinct("follower");
    
    if (followerIds.length > 0) {
      const notifications = followerIds.map((followerId) => ({
        user: followerId,
        fromUser: req.user._id,
        type: "reel",
        reel: reel._id,
      }));
    
      const createdNotifications = await Notification.insertMany(notifications);
    
      // Populate fromUser for all notifications for realtime emission
      const populatedNotifications = await Notification.find({
        _id: { $in: createdNotifications.map(n => n._id) }
      }).populate('fromUser', 'username avatar');

      const notificationMap = new Map(populatedNotifications.map(n => [n.user.toString(), n]));
      
      followerIds.forEach((followerId) => {
        const notification = notificationMap.get(followerId.toString());
        if (notification) {
          emitToUser(req, followerId, "notification:new", notification);
        }
      });
    }
   return res.status(201).json(new ApiResponse(201, reel, "Reel created successfully"));
})

const getReels = asyncHandler(async (req, res) => {
    const {userId} = req.params;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const reels = await Reel.find({  user: userId, isDeleted: false })
      .populate("user", "username avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCount = await Reel.countDocuments({ user: userId, isDeleted: false });
    const totalPages = Math.ceil(totalCount / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    res.status(200).json(new ApiResponse(200, {
      reels,
      page,
      totalPages,
      hasNext,
      hasPrev
    }));
});

const getReelFeed = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Get reels from users the current user follows, plus their own reels
  const followingIds = await Follow.find({ follower: userId })
    .distinct("following");

  const userIds = [...followingIds, userId];

  const reels = await Reel.find({
    user: { $in: userIds },
    isDeleted: false
  })
    .populate("user", "username avatar isVerified")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalCount = await Reel.countDocuments({
    user: { $in: userIds },
    isDeleted: false
  });

  const totalPages = Math.ceil(totalCount / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return res.status(200).json(new ApiResponse(200, {
    reels,
    page,
    totalPages,
    hasNext,
    hasPrev
  }));
});

const deleteReel = asyncHandler(async (req, res) => {
    const { reelId } = req.params;
    const reel = await Reel.findOne({ _id: reelId, isDeleted: false });

    if (!reel) {
      throw new ApiError(404, "Reel not found");
    }

    if (reel.user.toString() !== req.user._id.toString()) {
      throw new ApiError(403, "Unauthorized to delete this reel");
    }

    reel.isDeleted = true;
    await reel.save();
    const publicId = reel.videoUrl.split('/').pop().split('.')[0];
    await cloudinary.uploader.destroy(publicId, { resource_type: "video" });

    res.status(200).json(new ApiResponse(200, null, "Reel deleted successfully"));
});

export {
  createReel,
  getReels,
  getReelFeed,
  deleteReel,
};
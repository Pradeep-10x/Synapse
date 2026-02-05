import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { Follow } from "../models/follow.model.js";
import { User } from '../models/user.model.js';
import { Notification } from "../models/notification.model.js";
import { emitToUser } from '../utils/socketEmitters.js';
import { uploadonCloudinary } from '../utils/cloudinary.js';
import { v2 as cloudinary } from 'cloudinary';
import { Story } from '../models/story.model.js';

const createStory = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "Story media file is required");
  }

  let mediaType;
  if (req.file.mimetype.startsWith("image")) {
    mediaType = "image";
  } else if (req.file.mimetype.startsWith("video")) {
    mediaType = "video";
  } else {
    throw new ApiError(400, "Invalid media type");
  }

  const upload = await uploadonCloudinary(req.file.path, mediaType === "image" ? "image" : "video");

  if (!upload?.url) {
    throw new ApiError(500, "Media upload failed");
  }

  const story = await Story.create({
    user: req.user._id,
    mediaUrl: upload.url,
    mediaType,
  });

  const followerIds = await Follow.find({ following: req.user._id })
    .distinct("follower");

  if (followerIds.length > 0) {
    const notifications = followerIds.map((followerId) => ({
      user: followerId,
      fromUser: req.user._id,
      type: "story",
      story: story._id,
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
  return res.status(201).json(new ApiResponse(201, story, "Story created successfully"));
})

const getStories = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const stories = await Story.find({
    user: userId,
    $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }]
  })
    .populate("user", "username avatar")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalCount = await Story.countDocuments({
    user: userId,
    $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }]
  });
  const totalPages = Math.ceil(totalCount / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  res.status(200).json(new ApiResponse(200, {
    stories,
    page,
    totalPages,
    hasNext,
    hasPrev
  }));
});

const deleteStory = asyncHandler(async (req, res) => {
  const { storyId } = req.params;
  const story = await Story.findOne({
    _id: storyId,
    $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }]
  });

  if (!story) {
    throw new ApiError(404, "Story not found");
  }

  if (story.user.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this story");
  }

  story.isDeleted = true;
  await story.save();

  res.status(200).json(new ApiResponse(200, null, "Story deleted successfully"));
});

const getStoryFeed = asyncHandler(async (req, res) => {
  // 1. Get users that the current user follows
  const following = await Follow.find({ follower: req.user._id }).select("following");
  const followingIds = following.map(f => f.following);

  // 2. Find valid stories from these users
  // We group by user to make it easier for the frontend to render "circles" per user
  const stories = await Story.aggregate([
    {
      $match: {
        user: { $in: followingIds },
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }]
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "user"
      }
    },
    {
      $unwind: "$user"
    },
    {
      $group: {
        _id: "$user._id",
        user: { $first: "$user" },
        stories: { $push: "$$ROOT" },
        latestStoryDate: { $max: "$createdAt" }
      }
    },
    {
      $sort: { latestStoryDate: -1 }
    },
    {
      $project: {
        _id: 1,
        username: "$user.username",
        avatar: "$user.avatar",
        stories: 1
      }
    }
  ]);

  return res.status(200).json(new ApiResponse(200, stories, "Story feed fetched successfully"));
});

export {
  createStory,
  getStories,
  getStoryFeed,
  deleteStory
};
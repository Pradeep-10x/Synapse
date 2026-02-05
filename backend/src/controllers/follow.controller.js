import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { Follow } from "../models/follow.model.js";
import { User } from "../models/user.model.js";
import { emitToUser } from '../utils/socketEmitters.js';
import {Notification} from '../models/notification.model.js'; 

const followUnfollowUser = asyncHandler(async (req, res) => {
  const targetUserId = req.params.userId;
  const currentUserId = req.user._id;

  if (targetUserId.toString() === currentUserId.toString()) {
    throw new ApiError(400, "You cannot follow yourself");
  }

  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    throw new ApiError(404, "User not found");
  }

  const existingFollow = await Follow.findOne({
    follower: currentUserId,
    following: targetUserId
  });
  if (existingFollow) {
    await existingFollow.deleteOne();

    await User.findByIdAndUpdate(currentUserId, {
      $inc: { followingCount: -1 }
    });

    await User.findByIdAndUpdate(targetUserId, {
      $inc: { followersCount: -1 }
    });

    return res.status(200).json(
      new ApiResponse(200, { following: false }, "User unfollowed")
    );
  }

  await Follow.create({
    follower: currentUserId,
    following: targetUserId
  });

  await User.findByIdAndUpdate(currentUserId, {
    $inc: { followingCount: +1 }
  });

  await User.findByIdAndUpdate(targetUserId, {
    $inc: { followersCount: +1 }
  });

  const notification = await Notification.create({
    user: targetUserId,
    fromUser: currentUserId,
    type: 'follow',
  });

  // Populate fromUser for realtime notification
  const populatedNotification = await Notification.findById(notification._id)
    .populate('fromUser', 'username avatar');
  emitToUser(req, targetUserId, "notification:new", populatedNotification);


  return res.status(200).json(
    new ApiResponse(200, { following: true }, "User followed")
  );
});


const getFollowers = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const followers = await Follow.find({ following: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("follower", "username avatar");

    const totalCount = await Follow.countDocuments({ following: userId });
    const totalPages = Math.ceil(totalCount / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

      return res.status(200).json(
        new ApiResponse(200, {
          followers,
          page,
          totalPages,
          hasNext,
          hasPrev
        })
      );
});

const getFollowing = asyncHandler(async(req,res) => {
    const { userId } = req.params;

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const following = await Follow.find({ follower: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("following", "username avatar");

    const totalCount = await Follow.countDocuments({ follower: userId });
    const totalPages = Math.ceil(totalCount / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

      return res.status(200).json(
        new ApiResponse(200, {
          following,
          page,
          totalPages,
          hasNext,
          hasPrev
        })
      );
});








export { followUnfollowUser ,getFollowers,getFollowing };
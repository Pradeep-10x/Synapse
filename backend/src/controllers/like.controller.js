import { Like } from '../models/like.model.js';
import { Post } from '../models/post.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { User } from '../models/user.model.js';
import { emitToUser } from '../utils/socketEmitters.js';
import { Notification } from '../models/notification.model.js';
import { Reel } from '../models/reel.model.js';
import { Story } from '../models/story.model.js';
import mongoose from 'mongoose';

const likeUnlikePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const userId = req.user._id;

  const post = await Post.findOne({ _id: postId, isDeleted: false });
  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  const existingLike = await Like.findOne({ post: postId, user: userId });
  if (existingLike) {
    await existingLike.deleteOne();

    await Post.findByIdAndUpdate(postId, { $inc: { likesCount: -1 } });

    return res.status(200).json(
      new ApiResponse(200, { liked: false }, "Post unliked")
    );
  }

  await Like.create({
    post: postId,
    user: userId,
  });

  await Post.findByIdAndUpdate(postId, { $inc: { likesCount: +1 } });

  if (post.user.toString() !== userId.toString()) {
    const notification = await Notification.create({
      user: post.user,
      fromUser: userId,
      type: 'like',
      post: postId,
    });

    emitToUser(req, post.user, "notification:new", notification);
  }


  return res.status(200).json(
    new ApiResponse(200, { liked: true }, "Post liked")
  );
});

const likeUnlikeReel = asyncHandler(async (req, res) => {
  const { reelId } = req.params;
  const userId = req.user._id;

  const reel = await Reel.findOne({ _id: reelId, isDeleted: false });
  if (!reel) {
    throw new ApiError(404, "Reel not found");
  }

  const existingLike = await Like.findOne({ reel: reelId, user: userId });

  if (existingLike) {
    await existingLike.deleteOne();

    await Reel.findByIdAndUpdate(reelId, { $inc: { likesCount: -1 } });

    return res.status(200).json(
      new ApiResponse(200, { liked: false }, "Reel unliked")
    );
  }


  await Like.create({
    reel: reelId,
    user: userId,
  });

  await Reel.findByIdAndUpdate(reelId, { $inc: { likesCount: +1 } });

  if (reel.user.toString() !== userId.toString()) {
    const notification = await Notification.create({
      user: reel.user,
      fromUser: userId,
      type: 'like',
      reel: reelId,
    });

    emitToUser(req, reel.user, "notification:new", notification);
  }

  return res.status(200).json(
    new ApiResponse(200, { liked: true }, "Reel liked")
  );
});


const getPostLikes = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(postId)) {
    throw new ApiError(400, "Invalid post id");
  }


  const postExists = await Post.exists({ _id: postId, isDeleted: false });
  if (!postExists) {
    throw new ApiError(404, "Post not found");
  }


  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const likes = await Like.find({
    post: postId,
  }).populate("user", "username avatar")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalCount = await Like.countDocuments({ post: postId });
  const totalPages = Math.ceil(totalCount / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return res.status(200).json(
    new ApiResponse(200, {
      likes,
      page,
      totalPages,
      hasNext,
      hasPrev
    })
  );
})

const getReelLikes = asyncHandler(async (req, res) => {
  const { reelId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(reelId)) {
    throw new ApiError(400, "Invalid reel id");
  }


  const reelExists = await Reel.exists({ _id: reelId, isDeleted: false });
  if (!reelExists) {
    throw new ApiError(404, "Reel not found");
  }


  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const likes = await Like.find({
    reel: reelId,
  }).populate("user", "username avatar")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalCount = await Like.countDocuments({ reel: reelId });
  const totalPages = Math.ceil(totalCount / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return res.status(200).json(
    new ApiResponse(200, {
      likes,
      page,
      totalPages,
      hasNext,
      hasPrev
    })
  );
})

const likeUnlikeStory = asyncHandler(async (req, res) => {
  const { storyId } = req.params;
  const userId = req.user._id;

  const story = await Story.findOne({ _id: storyId, isDeleted: false });
  if (!story) {
    throw new ApiError(404, "Story not found");
  }

  const existingLike = await Like.findOne({ story: storyId, user: userId });
  if (existingLike) {
    await existingLike.deleteOne();

    await Story.findByIdAndUpdate(storyId, { $inc: { likesCount: -1 } });

    return res.status(200).json(
      new ApiResponse(200, { liked: false }, "Story unliked")
    );
  }

  await Like.create({
    story: storyId,
    user: userId,
  });

  await Story.findByIdAndUpdate(storyId, { $inc: { likesCount: +1 } });

  if (story.user.toString() !== userId.toString()) {
    const notification = await Notification.create({
      user: story.user,
      fromUser: userId,
      type: 'like',
      story: storyId,
    });

    emitToUser(req, story.user, "notification:new", notification);
  }

  return res.status(200).json(
    new ApiResponse(200, { liked: true }, "Story liked")
  );
});

const getStoryLikes = asyncHandler(async (req, res) => {
  const { storyId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(storyId)) {
    throw new ApiError(400, "Invalid story id");
  }

  const story = await Story.findOne({ _id: storyId, isDeleted: false });
  if (!story) {
    throw new ApiError(404, "Story not found");
  }

  if (story.user.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to view likes of this story");
  }
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const likes = await Like.find({
    story: storyId,
  }).populate("user", "username avatar")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalCount = await Like.countDocuments({ story: storyId });
  const totalPages = Math.ceil(totalCount / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return res.status(200).json(
    new ApiResponse(200, {
      likes,
      page,
      totalPages,
      hasNext,
      hasPrev
    })
  );
})





export { likeUnlikePost, getPostLikes, getReelLikes, likeUnlikeReel, likeUnlikeStory, getStoryLikes };

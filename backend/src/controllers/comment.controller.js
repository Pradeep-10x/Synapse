import { Comment } from '../models/comment.model.js';
import { Post } from '../models/post.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { User } from '../models/user.model.js';
import { Notification } from '../models/notification.model.js';
import { emitToUser } from '../utils/socketEmitters.js';
import mongoose from 'mongoose';
import { Reel } from '../models/reel.model.js';
import { Follow } from '../models/follow.model.js';


const createPostComment = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { content } = req.body;
  const { postId } = req.params;
  if (!content || content.trim() === '') {
    throw new ApiError(400, "Comment content is required");
  }

  const post = await Post.findOne({ _id: postId, isDeleted: false });
  if (!post) {
    throw new ApiError(404, "Post not found");
  }
  const comment = await Comment.create({
    post: postId,
    user: userId,
    content,
  });

  // Populate user info for the response
  const populatedComment = await Comment.findById(comment._id).populate("user", "username avatar");

  await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });

  if (post.user.toString() !== userId.toString()) {
    const notification = await Notification.create({
      user: post.user,
      fromUser: userId,
      type: 'comment',
      post: postId,
    });

    emitToUser(req, post.user, "notification:new", notification);
  }

  res.status(201).json(new ApiResponse(201, populatedComment));
});

const createReelComment = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { content } = req.body;
  const { reelId } = req.params;
  if (!content || content.trim() === '') {
    throw new ApiError(400, "Comment content is required");
  }

  const reel = await Reel.findOne({ _id: reelId, isDeleted: false });
  if (!reel) {
    throw new ApiError(404, "Reel not found");
  }
  const comment = await Comment.create({
    reel: reelId,
    user: userId,
    content,
  });

  await Reel.findByIdAndUpdate(reelId, { $inc: { commentsCount: 1 } });

  if (reel.user.toString() !== userId.toString()) {
    const notification = await Notification.create({
      user: reel.user,
      fromUser: userId,
      type: 'comment',
      reel: reelId,
    });

    emitToUser(req, reel.user, "notification:new", notification);
  }

  res.status(201).json(new ApiResponse(201, comment));
});
const getPostComment = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(postId)) {
    throw new ApiError(400, "Invalid post id");
  }


  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const comments = await Comment.find({
    post: postId,
    isDeleted: false,
  }).populate("user", "username avatar")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalCount = await Comment.countDocuments({
    post: postId,
    isDeleted: false,
  });

  const totalPages = Math.ceil(totalCount / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return res.status(200).json(
    new ApiResponse(200, {
      comments,
      page,
      totalPages,
      hasNext,
      hasPrev
    })
  );
})

const getReelComment = asyncHandler(async (req, res) => {
  const { reelId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(reelId)) {
    throw new ApiError(400, "Invalid reel id");
  }


  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const comments = await Comment.find({
    reel: reelId,
    isDeleted: false,
  }).populate("user", "username avatar")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalCount = await Comment.countDocuments({
    reel: reelId,
    isDeleted: false,
  });

  const totalPages = Math.ceil(totalCount / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return res.status(200).json(
    new ApiResponse(200, {
      comments,
      page,
      totalPages,
      hasNext,
      hasPrev
    })
  );
})

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user._id;

  const comment = await Comment.findById(commentId);
  if (!comment || comment.isDeleted)
    throw new ApiError(404, "Comment not found");

  // Check if user is comment author
  const isCommentAuthor = comment.user.toString() === userId.toString();

  // Check if user is post/reel owner (admin)
  let isPostOwner = false;
  if (comment.post) {
    const post = await Post.findById(comment.post);
    if (post && post.user.toString() === userId.toString()) {
      isPostOwner = true;
    }
  } else if (comment.reel) {
    const reel = await Reel.findById(comment.reel);
    if (reel && reel.user.toString() === userId.toString()) {
      isPostOwner = true;
    }
  }

  // Allow deletion if user is comment author or post/reel owner
  if (!isCommentAuthor && !isPostOwner) {
    throw new ApiError(403, "Unauthorized to delete this comment");
  }

  comment.isDeleted = true;
  await comment.save();

  const postExists = await Post.exists({ _id: comment.post, isDeleted: false });
  if (postExists) {
    await Post.findByIdAndUpdate(comment.post, {
      $inc: { commentsCount: -1 }
    });
  }
  else {
    await Reel.findByIdAndUpdate(comment.reel, {
      $inc: { commentsCount: -1 }
    });
  }
  res.status(200).json(new ApiResponse(200, null, "Comment deleted"));
});



export { createPostComment, getPostComment, deleteComment, createReelComment, getReelComment }; 
import { CommunityPost } from "../models/communityPost.model.js";
import { CommunityComment } from "../models/communityComment.model.js";
import { Community } from "../models/community.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { emitCommunityEvent } from "../utils/socketEmitters.js";

export const addCommunityComment = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const { postId } = req.params;

  if (!content || !content.trim()) {
    throw new ApiError(400, "Comment content is required");
  }

  const post = await CommunityPost.findById(postId);
  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  const comment = await CommunityComment.create({
    post: post._id,
    author: req.user._id,
    text: content.trim()
  });

  const populatedComment = await CommunityComment.findById(comment._id)
    .populate("author", "username avatar");

  // Update comment count
  post.commentsCount = (post.commentsCount || 0) + 1;
  await post.save();

  // Increment community events counter
  emitCommunityEvent(req, post.community.toString());

  return res.status(201).json(new ApiResponse(201, {
    _id: populatedComment._id,
    user: {
      _id: populatedComment.author._id,
      username: populatedComment.author.username,
      avatar: populatedComment.author.avatar
    },
    content: populatedComment.text,
    createdAt: populatedComment.createdAt
  }, "Comment added successfully"));
});

export const getCommunityComments = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  const comments = await CommunityComment.find({
    post: postId
  })
    .populate("author", "username avatar")
    .sort({ createdAt: 1 });

  const transformedComments = comments.map(comment => ({
    _id: comment._id,
    user: {
      _id: comment.author._id,
      username: comment.author.username,
      avatar: comment.author.avatar
    },
    content: comment.text,
    createdAt: comment.createdAt
  }));

  return res.status(200).json(new ApiResponse(200, transformedComments));
});

export const deleteCommunityComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  const comment = await CommunityComment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  const post = await CommunityPost.findById(comment.post);
  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  const community = await Community.findById(post.community);
  if (!community) {
    throw new ApiError(404, "Community not found");
  }

  const isAuthor = comment.author.toString() === req.user._id.toString();
  const isPostAuthor = post.author.toString() === req.user._id.toString();
  const isAdmin = community.admins.some(a => a.toString() === req.user._id.toString());

  if (!isAuthor && !isPostAuthor && !isAdmin) {
    throw new ApiError(403, "Not authorized to delete this comment");
  }

  await comment.deleteOne();

  // Update comment count
  post.commentsCount = Math.max(0, (post.commentsCount || 1) - 1);
  await post.save();

  return res.status(200).json(new ApiResponse(200, null, "Comment deleted successfully"));
});

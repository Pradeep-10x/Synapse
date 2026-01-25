import { Community } from "../models/community.model.js";
import { CommunityPost } from "../models/communityPost.model.js";
import { uploadonCloudinary } from "../utils/cloudinary.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const createCommunityPost = asyncHandler(async (req, res) => {
  const { text, caption } = req.body;
  const postText = text || caption;
  const { communityId } = req.params;

  const community = await Community.findById(communityId);

  if (!community) {
    throw new ApiError(404, "Community not found");
  }

  if (!community.members.some(m => m.toString() === req.user._id.toString())) {
    throw new ApiError(403, "Not a community member");
  }

  let mediaUrl = "";

  if (req.file) {
    const upload = await uploadonCloudinary(req.file.path);
    mediaUrl = upload?.secure_url || "";
  }

  const post = await CommunityPost.create({
    community: communityId,
    author: req.user._id,
    text: postText,
    mediaUrl
  });

  const populatedPost = await CommunityPost.findById(post._id)
    .populate("author", "username avatar isVerified")
    .populate("community", "name coverImage");

  const transformedPost = {
    _id: populatedPost._id,
    user: {
      _id: populatedPost.author._id,
      username: populatedPost.author.username,
      avatar: populatedPost.author.avatar,
      isVerified: populatedPost.author.isVerified
    },
    caption: populatedPost.text,
    mediaUrl: populatedPost.mediaUrl,
    mediaType: populatedPost.mediaUrl ? (populatedPost.mediaUrl.match(/\.(mp4|webm|mov)$/i) ? 'video' : 'image') : 'image',
    likesCount: populatedPost.likes.length,
    commentsCount: 0,
    createdAt: populatedPost.createdAt,
    isLiked: false, // Just created, unlikely to be liked yet
    community: {
      _id: populatedPost.community._id,
      name: populatedPost.community.name,
      coverImage: populatedPost.community.coverImage
    }
  };

  return res.status(201).json(new ApiResponse(201, transformedPost, "Post created successfully"));
});

export const getCommunityFeed = asyncHandler(async (req, res) => {
  const { communityId } = req.params;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const posts = await CommunityPost.find({
    community: communityId
  })
    .populate("author", "username avatar isVerified")
    .populate("community", "name coverImage")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalCount = await CommunityPost.countDocuments({
    community: communityId
  });

  const totalPages = Math.ceil(totalCount / limit);

  // Transform posts to match PostCard format
  const transformedPosts = posts.map(post => ({
    _id: post._id,
    user: {
      _id: post.author._id,
      username: post.author.username,
      avatar: post.author.avatar,
      isVerified: post.author.isVerified
    },
    caption: post.text,
    mediaUrl: post.mediaUrl,
    mediaType: post.mediaUrl ? (post.mediaUrl.match(/\.(mp4|webm|mov)$/i) ? 'video' : 'image') : 'image',
    likesCount: post.likes.length,
    commentsCount: post.commentsCount || 0,
    createdAt: post.createdAt,
    isLiked: post.likes.some(id => id.toString() === req.user._id.toString()),
    community: {
      _id: post.community._id,
      name: post.community.name,
      coverImage: post.community.coverImage
    }
  }));

  return res.status(200).json(new ApiResponse(200, {
    posts: transformedPosts,
    page,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  }));
});

export const likeCommunityPost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const post = await CommunityPost.findById(postId);

  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  const userId = req.user._id.toString();
  const isLiked = post.likes.some(id => id.toString() === userId);

  if (isLiked) {
    post.likes = post.likes.filter(id => id.toString() !== userId);
  } else {
    post.likes.push(req.user._id);
  }

  await post.save();
  return res.status(200).json(new ApiResponse(200, {
    likesCount: post.likes.length,
    isLiked: !isLiked
  }));
});

export const deleteCommunityPost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const post = await CommunityPost.findById(postId);

  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  const community = await Community.findById(post.community);

  if (!community) {
    throw new ApiError(404, "Community not found");
  }

  const isAuthor = post.author.toString() === req.user._id.toString();
  const isAdmin = community.admins.some(a => a.toString() === req.user._id.toString());
  const isCreator = community.creator.toString() === req.user._id.toString();

  if (!isAuthor && !isAdmin && !isCreator) {
    throw new ApiError(403, "Not authorized to delete this post");
  }

  await post.deleteOne();
  return res.status(200).json(new ApiResponse(200, null, "Post deleted successfully"));
});

// Get combined feed from all joined communities
export const getJoinedCommunitiesFeed = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Find all communities the user is a member of
  const joinedCommunities = await Community.find({
    members: req.user._id
  }).select('_id');

  const communityIds = joinedCommunities.map(c => c._id);

  if (communityIds.length === 0) {
    return res.status(200).json(new ApiResponse(200, {
      posts: [],
      page,
      totalPages: 0,
      hasNext: false,
      hasPrev: false
    }));
  }

  // Get posts from all joined communities
  const posts = await CommunityPost.find({
    community: { $in: communityIds }
  })
    .populate("author", "username avatar isVerified")
    .populate("community", "name coverImage")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalCount = await CommunityPost.countDocuments({
    community: { $in: communityIds }
  });

  const totalPages = Math.ceil(totalCount / limit);

  // Transform posts to match PostCard format
  const transformedPosts = posts.map(post => ({
    _id: post._id,
    user: {
      _id: post.author._id,
      username: post.author.username,
      avatar: post.author.avatar,
      isVerified: post.author.isVerified
    },
    caption: post.text,
    mediaUrl: post.mediaUrl,
    mediaType: post.mediaUrl ? (post.mediaUrl.match(/\.(mp4|webm|mov)$/i) ? 'video' : 'image') : 'image',
    likesCount: post.likes.length,
    commentsCount: post.commentsCount || 0, // Will be populated if comments are added
    createdAt: post.createdAt,
    isLiked: post.likes.some(id => id.toString() === req.user._id.toString()),
    community: {
      _id: post.community._id,
      name: post.community.name,
      coverImage: post.community.coverImage
    }
  }));

  return res.status(200).json(new ApiResponse(200, {
    posts: transformedPosts,
    page,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  }));
});

// Get public community posts (for viewing without joining)
export const getPublicCommunityPosts = asyncHandler(async (req, res) => {
  const { communityId } = req.params;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const community = await Community.findById(communityId);
  if (!community) {
    throw new ApiError(404, "Community not found");
  }

  // Only allow viewing public communities
  if (community.isPrivate) {
    throw new ApiError(403, "This is a private community");
  }

  const posts = await CommunityPost.find({
    community: communityId
  })
    .populate("author", "username avatar isVerified")
    .populate("community", "name coverImage")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalCount = await CommunityPost.countDocuments({
    community: communityId
  });

  const totalPages = Math.ceil(totalCount / limit);

  // Transform posts to match PostCard format
  const transformedPosts = posts.map(post => ({
    _id: post._id,
    user: {
      _id: post.author._id,
      username: post.author.username,
      avatar: post.author.avatar,
      isVerified: post.author.isVerified
    },
    caption: post.text,
    mediaUrl: post.mediaUrl,
    mediaType: post.mediaUrl ? (post.mediaUrl.match(/\.(mp4|webm|mov)$/i) ? 'video' : 'image') : 'image',
    likesCount: post.likes.length,
    commentsCount: post.commentsCount || 0,
    createdAt: post.createdAt,
    isLiked: req.user ? post.likes.some(id => id.toString() === req.user._id.toString()) : false,
    community: {
      _id: post.community._id,
      name: post.community.name,
      coverImage: post.community.coverImage
    }
  }));

  return res.status(200).json(new ApiResponse(200, {
    posts: transformedPosts,
    page,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  }));
});

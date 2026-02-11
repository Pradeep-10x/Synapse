import { Community } from "../models/community.model.js";
import { CommunityPost } from "../models/communityPost.model.js";
import { Notification } from "../models/notification.model.js";
import { uploadonCloudinary } from "../utils/cloudinary.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { emitToCommunity, emitCommunityEvent, emitToUser } from "../utils/socketEmitters.js";

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

  // Emit real-time event to all community members
  await emitToCommunity(req, communityId, "community:post:new", {
    post: transformedPost,
    activity: {
      type: 'new_post',
      user: {
        username: populatedPost.author.username,
        avatar: populatedPost.author.avatar
      },
      community: {
        name: populatedPost.community.name,
        id: communityId
      },
      message: 'shared a new post',
      createdAt: new Date().toISOString()
    }
  });

  // Increment community events counter
  emitCommunityEvent(req, communityId);

  // Create notifications for community members (not self)
  try {
    const memberIds = community.members
      .map(m => m.toString())
      .filter(id => id !== req.user._id.toString());
    
    for (const memberId of memberIds) {
      const notification = await Notification.create({
        user: memberId,
        fromUser: req.user._id,
        type: 'community_post',
        communityPost: post._id,
        community: communityId,
        message: `posted in ${populatedPost.community.name}`
      });
      const populatedNotif = await Notification.findById(notification._id)
        .populate('fromUser', 'username avatar');
      emitToUser(req, memberId, "notification:new", populatedNotif);
    }
  } catch (err) {
    console.error("Error creating community post notifications:", err);
  }

  return res.status(201).json(new ApiResponse(201, transformedPost, "Post created successfully"));
});

export const getCommunityFeed = asyncHandler(async (req, res) => {
  const { communityId } = req.params;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Check if community exists and get membership info
  const community = await Community.findById(communityId);
  if (!community) {
    throw new ApiError(404, "Community not found");
  }

  // Check if user is member, admin, or creator
  const isMember = community.members.some(m => m.toString() === req.user._id.toString());
  const isAdmin = community.admins.some(a => a.toString() === req.user._id.toString());
  const isCreator = community.creator.toString() === req.user._id.toString();

  // Allow access if user is member, admin, or creator
  if (!isMember && !isAdmin && !isCreator) {
    throw new ApiError(403, "You must be a member to view this community's posts");
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
  const post = await CommunityPost.findById(postId).populate('author', 'username avatar');

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

  // Emit real-time event to all community members
  const community = await Community.findById(post.community);
  if (community) {
    await emitToCommunity(req, post.community.toString(), "community:post:liked", {
      postId: post._id,
      likesCount: post.likes.length,
      isLiked: !isLiked,
      activity: {
        type: 'like',
        user: {
          username: req.user.username,
          avatar: req.user.avatar
        },
        community: {
          name: community.name,
          id: post.community.toString()
        },
        message: !isLiked ? 'liked a post' : 'unliked a post',
        createdAt: new Date().toISOString()
      }
    });
  }

  // Create persistent notification for the post author on like (not self, not unlike)
  if (!isLiked && post.author._id.toString() !== req.user._id.toString()) {
    try {
      const notification = await Notification.create({
        user: post.author._id,
        fromUser: req.user._id,
        type: 'community_like',
        communityPost: post._id,
        community: post.community,
        message: `liked your post in ${community?.name || 'a community'}`
      });
      const populatedNotif = await Notification.findById(notification._id)
        .populate('fromUser', 'username avatar');
      emitToUser(req, post.author._id, "notification:new", populatedNotif);
    } catch (err) {
      console.error("Error creating community like notification:", err);
    }
  }

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

  // Permanently delete the post
  await CommunityPost.findByIdAndDelete(postId);
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

import { Post } from "../models/post.model.js";
import {User} from '../models/user.model.js';
import { Notification } from "../models/notification.model.js";
import { emitToUser } from '../utils/socketEmitters.js';
import { Follow } from "../models/follow.model.js";
import {uploadonCloudinary} from '../utils/cloudinary.js';
import {v2 as cloudinary} from 'cloudinary';
import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import dotenv from 'dotenv';
dotenv.config();


 const createPost = asyncHandler(async (req, res) => {
   const { caption } = req.body;

    if (!req.file) {
      throw new ApiError(400, "Media file is required");
    }

    let mediaType;
    if (req.file.mimetype.startsWith("image")) {
      mediaType = "image";
    } else if (req.file.mimetype.startsWith("video")) {
      mediaType = "video";
    } else {
      throw new ApiError(400, "Invalid media type");
    }

    const uploadedMedia = await uploadonCloudinary(
      req.file.path,
      mediaType === "image" ? "image" : "video"
    );

    if (!uploadedMedia?.url) {
      throw new ApiError(500, "Media upload failed");
    }

    const post = await Post.create({
      user: req.user._id,
      caption,
      mediaUrl: uploadedMedia.url,
      mediaType
    });

      const followerIds = await Follow.find({ following: req.user._id })
        .distinct("follower");
    
    if (followerIds.length > 0) {
      const notifications = followerIds.map((followerId) => ({
        user: followerId,
        fromUser: req.user._id,
        type: "post",
        post: post._id,
      }));
    
      const createdNotifications = await Notification.insertMany(notifications);
    
      followerIds.forEach((followerId, index) => {
        emitToUser(req, followerId, "notification:new", createdNotifications[index]);
      });
    }
    
    return res.status(201).json(new ApiResponse(201,post,"Post created successfully"));
 });
 
 const getUserPosts = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const posts = await Post.find({
    user: userId,
    isDeleted: false
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("user", "username avatar");

  const totalCount = await Post.countDocuments({
    user: userId,
    isDeleted: false
  });

  const totalPages = Math.ceil(totalCount / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return res.status(200).json(
    new ApiResponse(200, {
      posts,
      page,
      totalPages,
      hasNext,
      hasPrev
    })
  );
});

const getSinglePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  const post = await Post.findOne({
    _id: postId,
    isDeleted: false
  }).populate("user", "username avatar");

  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  return res.status(200).json(
    new ApiResponse(200, post)
  );
});

const deletePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  const post = await Post.findById(postId);

  if (!post || post.isDeleted) {
    throw new ApiError(404, "Post not found");
  }

  if (post.user.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not allowed to delete this post");
  }

  const publicId = post.mediaUrl
    .split("/")
    .pop()
    .split(".")[0];

  await cloudinary.uploader.destroy(publicId, {
    resource_type: post.mediaType === "video" ? "video" : "image"
  });

  post.isDeleted = true;
  await post.save();

  return res.status(200).json(
    new ApiResponse(200, null, "Post deleted successfully")
  );
});

const updateCaption = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { caption } = req.body;

  const post = await Post.findById(postId);

  if (!post || post.isDeleted) {
    throw new ApiError(404, "Post not found");
  }

  if (post.user.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not allowed to edit this post");
  }

  post.caption = caption || '';
  await post.save();

  return res.status(200).json(
    new ApiResponse(200, post, "Caption updated successfully")
  );
});

const searchPosts = asyncHandler(async (req, res) => {
  const { query } = req.query;

  if (!query || query.trim().length < 2) {
    throw new ApiError(400, "Search query must be at least 2 characters");
  }

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const posts = await Post.find({
    caption: { $regex: query.trim(), $options: 'i' },
    isDeleted: false
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("user", "username avatar isVerified");

  const totalCount = await Post.countDocuments({
    caption: { $regex: query.trim(), $options: 'i' },
    isDeleted: false
  });

  const totalPages = Math.ceil(totalCount / limit);

  return res.status(200).json(
    new ApiResponse(200, {
      posts,
      page,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    })
  );
});




 export { createPost, getUserPosts , getSinglePost, deletePost, updateCaption, searchPosts}; 
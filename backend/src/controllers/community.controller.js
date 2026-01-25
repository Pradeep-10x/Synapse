import { Community } from "../models/community.model.js";
import { uploadonCloudinary } from "../utils/cloudinary.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const createCommunity = asyncHandler(async (req, res) => {
  const { name, description, isPublic, rules } = req.body;

  if (!name || !name.trim()) {
    throw new ApiError(400, "Community name is required");
  }

  const exists = await Community.findOne({ name: name.trim() });
  if (exists) {
    throw new ApiError(400, "Community already exists");
  }

  let coverImageUrl = "";
  let avatarUrl = "";

  if (req.files) {
    if (req.files.coverImage?.[0]) {
      const coverUpload = await uploadonCloudinary(req.files.coverImage[0].path);
      coverImageUrl = coverUpload?.secure_url || "";
    }
    if (req.files.avatar?.[0]) {
      const avatarUpload = await uploadonCloudinary(req.files.avatar[0].path);
      avatarUrl = avatarUpload?.secure_url || "";
    }
  }

  // Convert isPublic to isPrivate (frontend sends isPublic, backend stores isPrivate)
  const isPrivate = isPublic === false || isPublic === "false";

  const community = await Community.create({
    name: name.trim(),
    description: description?.trim() || "",
    coverImage: coverImageUrl,
    avatar: avatarUrl,
    creator: req.user._id,
    admins: [req.user._id],
    members: [req.user._id],
    membersCount: 1,
    isPrivate,
    rules: rules ? (typeof rules === "string" ? rules.split('\n').filter(r => r.trim() !== "") : rules) : []
  });

  const populatedCommunity = await Community.findById(community._id)
    .populate("creator", "username avatar")
    .populate("admins", "username avatar");

  return res.status(201).json(new ApiResponse(201, populatedCommunity, "Community created successfully"));
});

export const joinCommunity = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const community = await Community.findById(id);

  if (!community) {
    throw new ApiError(404, "Community not found");
  }

  if (community.members.some(m => m.toString() === req.user._id.toString())) {
    throw new ApiError(400, "Already joined");
  }

  if (community.isPrivate) {
    if (!community.joinRequests.some(r => r.toString() === req.user._id.toString())) {
      community.joinRequests.push(req.user._id);
      await community.save();
    }
    return res.status(200).json(new ApiResponse(200, null, "Join request sent"));
  }

  community.members.push(req.user._id);
  community.membersCount += 1;
  await community.save();

  return res.status(200).json(new ApiResponse(200, community, "Joined community"));
});

export const approveJoinRequest = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const { id } = req.params;

  if (!userId) {
    throw new ApiError(400, "User ID is required");
  }

  const community = await Community.findById(id);
  if (!community) {
    throw new ApiError(404, "Community not found");
  }

  if (!community.admins.some(a => a.toString() === req.user._id.toString())) {
    throw new ApiError(403, "Not authorized - admin access required");
  }

  community.joinRequests = community.joinRequests.filter(
    id => id.toString() !== userId
  );

  if (!community.members.some(m => m.toString() === userId)) {
    community.members.push(userId);
    community.membersCount += 1;
  }

  await community.save();
  return res.status(200).json(new ApiResponse(200, null, "User added to community"));
});

export const makeAdmin = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const { id } = req.params;

  if (!userId) {
    throw new ApiError(400, "User ID is required");
  }

  const community = await Community.findById(id);
  if (!community) {
    throw new ApiError(404, "Community not found");
  }

  if (community.creator.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Only creator can assign admins");
  }

  if (!community.admins.some(a => a.toString() === userId)) {
    community.admins.push(userId);
    await community.save();
  }

  return res.status(200).json(new ApiResponse(200, null, "User promoted to admin"));
});

export const leaveCommunity = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const community = await Community.findById(id);

  if (!community) {
    throw new ApiError(404, "Community not found");
  }

  const wasMember = community.members.some(m => m.toString() === req.user._id.toString());

  if (!wasMember) {
    throw new ApiError(400, "You are not a member of this community");
  }

  community.members = community.members.filter(
    (id) => id.toString() !== req.user._id.toString()
  );

  // Remove from admins if admin
  community.admins = community.admins.filter(
    (id) => id.toString() !== req.user._id.toString()
  );

  community.membersCount = Math.max(0, community.membersCount - 1);
  await community.save();

  return res.status(200).json(new ApiResponse(200, null, "Left community"));
});

export const getCommunity = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const community = await Community.findById(id)
    .populate("creator", "username avatar")
    .populate("admins", "username avatar")
    .populate("members", "username avatar");

  if (!community) {
    throw new ApiError(404, "Community not found");
  }

  // Convert isPrivate to isPublic for frontend
  const communityData = community.toObject();
  communityData.isPublic = !communityData.isPrivate;
  delete communityData.isPrivate;

  return res.status(200).json(new ApiResponse(200, communityData));
});

// Get all communities (for discover page)
export const getAllCommunities = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const communities = await Community.find({})
    .populate("creator", "username avatar")
    .sort({ membersCount: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalCount = await Community.countDocuments({});
  const totalPages = Math.ceil(totalCount / limit);

  // Convert isPrivate to isPublic for frontend
  const communitiesData = communities.map(comm => {
    const data = comm.toObject();
    data.isPublic = !data.isPrivate;
    delete data.isPrivate;
    return data;
  });

  return res.status(200).json(new ApiResponse(200, {
    communities: communitiesData,
    page,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  }));
});

// Get user's joined communities
export const getJoinedCommunities = asyncHandler(async (req, res) => {
  const communities = await Community.find({
    members: req.user._id
  })
    .populate("creator", "username avatar")
    .sort({ updatedAt: -1 });

  // Convert isPrivate to isPublic for frontend
  const communitiesData = communities.map(comm => {
    const data = comm.toObject();
    data.isPublic = !data.isPrivate;
    delete data.isPrivate;
    return data;
  });

  return res.status(200).json(new ApiResponse(200, communitiesData));
});

// Get user's created communities
export const getCreatedCommunities = asyncHandler(async (req, res) => {
  const communities = await Community.find({
    creator: req.user._id
  })
    .populate("creator", "username avatar")
    .populate("admins", "username avatar")
    .sort({ createdAt: -1 });

  // Convert isPrivate to isPublic for frontend
  const communitiesData = communities.map(comm => {
    const data = comm.toObject();
    data.isPublic = !data.isPrivate;
    delete data.isPrivate;
    return data;
  });

  return res.status(200).json(new ApiResponse(200, communitiesData));
});

// Search communities by name
export const searchCommunities = asyncHandler(async (req, res) => {
  const { query } = req.query;

  if (!query || query.trim().length < 2) {
    throw new ApiError(400, "Search query must be at least 2 characters");
  }

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const communities = await Community.find({
    name: { $regex: query.trim(), $options: 'i' }
  })
    .populate("creator", "username avatar")
    .sort({ membersCount: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalCount = await Community.countDocuments({
    name: { $regex: query.trim(), $options: 'i' }
  });

  const totalPages = Math.ceil(totalCount / limit);

  // Convert isPrivate to isPublic for frontend
  const communitiesData = communities.map(comm => {
    const data = comm.toObject();
    data.isPublic = !data.isPrivate;
    delete data.isPrivate;
    return data;
  });

  return res.status(200).json(new ApiResponse(200, {
    communities: communitiesData,
    page,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  }));
});
// Update community details (name, description, cover photo, privacy)
export const updateCommunity = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, isPublic, rules } = req.body;

  const community = await Community.findById(id);

  if (!community) {
    throw new ApiError(404, "Community not found");
  }

  // Only admins or creator can update
  const isAdmin = community.admins.some(a => a.toString() === req.user._id.toString()) ||
    community.creator.toString() === req.user._id.toString();

  if (!isAdmin) {
    throw new ApiError(403, "Only admins can update community details");
  }

  if (name && name.trim()) {
    // Check if name is taken by another community
    const exists = await Community.findOne({
      name: name.trim(),
      _id: { $ne: community._id }
    });
    if (exists) {
      throw new ApiError(400, "Community name already exists");
    }
    community.name = name.trim();
  }

  if (description !== undefined) {
    community.description = description.trim();
  }

  if (isPublic !== undefined) {
    community.isPrivate = isPublic === false || isPublic === "false";
  }

  if (rules !== undefined) {
    community.rules = Array.isArray(rules) ? rules : (typeof rules === "string" ? rules.split('\n').filter(r => r.trim() !== "") : []);
  }

  if (req.files) {
    if (req.files.coverImage?.[0]) {
      const coverUpload = await uploadonCloudinary(req.files.coverImage[0].path);
      if (coverUpload?.secure_url) {
        community.coverImage = coverUpload.secure_url;
      }
    }
    if (req.files.avatar?.[0]) {
      const avatarUpload = await uploadonCloudinary(req.files.avatar[0].path);
      if (avatarUpload?.secure_url) {
        community.avatar = avatarUpload.secure_url;
      }
    }
  }

  await community.save();

  const updatedCommunity = await Community.findById(id)
    .populate("creator", "username avatar")
    .populate("admins", "username avatar")
    .populate("members", "username avatar");

  // Convert for frontend
  const communityData = updatedCommunity.toObject();
  communityData.isPublic = !communityData.isPrivate;
  delete communityData.isPrivate;

  return res.status(200).json(new ApiResponse(200, communityData, "Community updated successfully"));
});

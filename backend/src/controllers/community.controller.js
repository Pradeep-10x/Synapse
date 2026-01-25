import { Community } from "../models/community.model.js";
import { uploadonCloudinary } from "../utils/cloudinary.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const createCommunity = asyncHandler(async (req, res) => {
  const { name, description, isPublic } = req.body;

  if (!name || !name.trim()) {
    throw new ApiError(400, "Community name is required");
  }

  const exists = await Community.findOne({ name: name.trim() });
  if (exists) {
    throw new ApiError(400, "Community already exists");
  }

  let coverImageUrl = "";

  if (req.file) {
    const upload = await uploadonCloudinary(req.file.path);
    coverImageUrl = upload?.secure_url || "";
  }

  // Convert isPublic to isPrivate (frontend sends isPublic, backend stores isPrivate)
  const isPrivate = isPublic === false || isPublic === "false";

  const community = await Community.create({
    name: name.trim(),
    description: description?.trim() || "",
    coverImage: coverImageUrl,
    creator: req.user._id,
    admins: [req.user._id],
    members: [req.user._id],
    membersCount: 1,
    isPrivate
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

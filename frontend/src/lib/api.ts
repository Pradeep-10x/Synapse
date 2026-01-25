/**
 * API Service Layer - All Backend API Endpoints
 * Auto-generated from backend routes
 */

import { api } from './axios';

// ============== USER API ==============
export const userAPI = {
  // Auth
  register: (data: FormData) => api.post('/user/register', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  login: (credentials: { username?: string; email?: string; password: string }) =>
    api.post('/user/login', credentials),
  logout: () => api.post('/user/logout'),
  refreshToken: () => api.post('/user/refresh-token'),

  // Profile
  getCurrentUser: () => api.get('/user/me'),
  getUserProfile: (username: string) => api.get(`/user/u/${username}`),
  updateDetails: (data: { fullName?: string; bio?: string; username?: string }) =>
    api.put('/user/update-details', data),
  updateAvatar: (formData: FormData) => api.patch('/user/update-avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  changePassword: (data: { oldPassword: string; newPassword: string }) =>
    api.post('/user/change-password', data),
  deleteAccount: () => api.post('/user/delete'),
  searchUsers: (query: string) => api.get('/user/search', { params: { query } }),

  // Follow
  followUnfollow: (userId: string) => api.post(`/user/${userId}/follow`),
  getFollowers: (userId: string) => api.get(`/user/${userId}/followers`),
  getFollowing: (userId: string) => api.get(`/user/${userId}/following`),

  // Privacy
  getPrivacy: () => api.get('/user/privacy'),
  updatePrivacy: (data: { privateAccount?: boolean; messagePolicy?: 'everyone' | 'followers'; allowMentions?: boolean; allowTagging?: boolean }) =>
    api.patch('/user/privacy', data),
};

// ============== POST API ==============
export const postAPI = {
  create: (formData: FormData) => api.post('/post/create', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getUserPosts: (userId: string) => api.get(`/post/user/${userId}`),
  getSinglePost: (postId: string) => api.get(`/post/${postId}`),
  deletePost: (postId: string) => api.delete(`/post/${postId}`),
  updateCaption: (postId: string, caption: string) => api.patch(`/post/${postId}/caption`, { caption }),
  searchPosts: (query: string) => api.get('/post/search', { params: { query } }),
};

// ============== FEED API ==============
export const feedAPI = {
  getHomeFeed: (page = 1, limit = 10) => api.get('/feed', { params: { page, limit } }),
};

// ============== COMMENT API ==============
export const commentAPI = {
  // Post comments
  createPostComment: (postId: string, content: string) =>
    api.post(`/comment/post/${postId}`, { content }),
  getPostComments: (postId: string) => api.get(`/comment/post/${postId}`),

  // Reel comments
  createReelComment: (reelId: string, content: string) =>
    api.post(`/comment/reel/${reelId}`, { content }),
  getReelComments: (reelId: string) => api.get(`/comment/reel/${reelId}`),

  // Delete comment
  deleteComment: (commentId: string) => api.delete(`/comment/${commentId}`),
};

// ============== LIKE API ==============
export const likeAPI = {
  // Post likes
  likeUnlikePost: (postId: string) => api.post(`/like/post/${postId}`),
  getPostLikes: (postId: string) => api.get(`/like/post/${postId}`),

  // Reel likes
  likeUnlikeReel: (reelId: string) => api.post(`/like/reel/${reelId}`),
  getReelLikes: (reelId: string) => api.get(`/like/reel/${reelId}`),

  // Story likes
  likeUnlikeStory: (storyId: string) => api.post(`/like/story/${storyId}`),
  getStoryLikes: (storyId: string) => api.get(`/like/story/${storyId}`),
};

// ============== NOTIFICATION API ==============
export const notificationAPI = {
  getNotifications: () => api.get('/notification'),
  markAsRead: () => api.put('/notification/read'),
  deleteNotifications: () => api.delete('/notification/delete'),
};

// ============== MESSAGE API ==============
export const messageAPI = {
  sendMessage: (data: { receiverId: string; content: string }) =>
    api.post('/message/send', data),
  getConversations: () => api.get('/message/conversations'),
  getMessages: (conversationId: string) =>
    api.get(`/message/conversation/${conversationId}/messages`),
};

// ============== REEL API ==============
export const reelAPI = {
  create: (formData: FormData) => api.post('/reel/create', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getFeed: (page = 1, limit = 10) => api.get('/reel/feed', { params: { page, limit } }),
  getUserReels: (userId: string) => api.get(`/reel/${userId}`),
  deleteReel: (reelId: string) => api.delete(`/reel/delete/${reelId}`),
};

// ============== STORY API ==============
export const storyAPI = {
  create: (formData: FormData) => api.post('/story/create', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getStoryFeed: () => api.get('/story/feed'),
  getUserStories: (userId: string) => api.get(`/story/user/${userId}`),
  deleteStory: (storyId: string) => api.delete(`/story/${storyId}`),
};

// ============== COMMUNITY API ==============
export const communityAPI = {
  getAll: () => api.get('/community'),
  getJoined: () => api.get('/community/joined'),
  getCreated: () => api.get('/community/created'),
  search: (query: string) => api.get('/community/search', { params: { query } }),
  create: (formData: FormData) => api.post('/community', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getCommunity: (communityId: string) => api.get(`/community/${communityId}`),
  joinCommunity: (communityId: string) => api.post(`/community/${communityId}/join`),
  leaveCommunity: (communityId: string) => api.post(`/community/${communityId}/leave`),
  approveJoinRequest: (communityId: string, userId: string) =>
    api.post(`/community/${communityId}/approve`, { userId }),
  makeAdmin: (communityId: string, userId: string) =>
    api.post(`/community/${communityId}/make-admin`, { userId }),
  removeUser: (communityId: string, userId: string) =>
    api.post(`/community/${communityId}/remove-user`, { userId }),
  update: (communityId: string, formData: FormData) =>
    api.patch(`/community/${communityId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
};

// ============== COMMUNITY POST API ==============
export const communityPostAPI = {
  create: (communityId: string, formData: FormData) =>
    api.post(`/community-post/${communityId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  getFeed: (communityId: string, page = 1, limit = 10) =>
    api.get(`/community-post/${communityId}`, { params: { page, limit } }),
  getJoinedFeed: (page = 1, limit = 10) => api.get('/community-post/feed/joined', { params: { page, limit } }),
  getPublicPosts: (communityId: string, page = 1, limit = 10) =>
    api.get(`/community-post/public/${communityId}`, { params: { page, limit } }),
  like: (postId: string) => api.post(`/community-post/like/${postId}`),
  delete: (postId: string) => api.delete(`/community-post/${postId}`),
};

// ============== COMMUNITY COMMENT API ==============
export const communityCommentAPI = {
  addComment: (postId: string, content: string) =>
    api.post(`/community-comments/${postId}`, { content }),
  getComments: (postId: string) => api.get(`/community-comments/${postId}`),
  deleteComment: (commentId: string) => api.delete(`/community-comments/${commentId}`),
};

export default {
  user: userAPI,
  post: postAPI,
  feed: feedAPI,
  comment: commentAPI,
  like: likeAPI,
  notification: notificationAPI,
  message: messageAPI,
  reel: reelAPI,
  story: storyAPI,
  community: communityAPI,
  communityPost: communityPostAPI,
  communityComment: communityCommentAPI,
};

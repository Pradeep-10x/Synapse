/**
 * Shared API types. The backend wraps every response in this envelope
 * (see ApiResponse on the server), so typing it once removes a large number
 * of `any`s across the app.
 */
export interface ApiEnvelope<T> {
  statusCode: number;
  data: T;
  message: string;
  success: boolean;
}

export interface Paginated<T> {
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  // The item array is keyed differently per endpoint (posts, likes, comments…),
  // so consumers extend this with the specific field.
  [key: string]: unknown | T[];
}

export type VerificationBadge = 'Gold' | 'Silver' | null;

export interface User {
  _id: string;
  username: string;
  email: string;
  fullName: string;
  bio?: string;
  avatar?: string;
  followersCount: number;
  followingCount: number;
  isVerified: boolean;
  VerificationBadge?: VerificationBadge;
  isFollowing?: boolean;
  canViewPosts?: boolean;
  lastActive?: string;
}

export interface UserPreview {
  _id: string;
  username: string;
  avatar?: string;
  fullName?: string;
  isVerified?: boolean;
}

export interface Post {
  _id: string;
  user: UserPreview;
  caption?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  likesCount: number;
  commentsCount: number;
  viewsCount?: number;
  isLiked?: boolean;
  createdAt: string;
  community?: {
    _id: string;
    name: string;
    coverImage?: string;
  };
}

export interface Comment {
  _id: string;
  user: UserPreview;
  content: string;
  createdAt: string;
}

export interface FeedResponse {
  posts: Post[];
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface Community {
  _id: string;
  name: string;
  description?: string;
  coverImage?: string;
  avatar?: string;
  creator: UserPreview;
  admins?: UserPreview[];
  members?: UserPreview[];
  membersCount: number;
  isPublic: boolean;
  rules?: string[];
  userRole?: 'owner' | 'admin' | 'member';
}

export interface RecentlyActiveUser {
  _id: string;
  username: string;
  avatar?: string;
  lastActive?: string;
}

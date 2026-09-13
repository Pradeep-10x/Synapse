/**
 * Cascade-cleanup helpers. Centralizes the "delete everything related to X"
 * logic so account/content deletion doesn't leave orphaned documents or
 * dangling Cloudinary assets.
 */
import { Post } from "../models/post.model.js";
import { Reel } from "../models/reel.model.js";
import { Story } from "../models/story.model.js";
import { Comment } from "../models/comment.model.js";
import { Like } from "../models/like.model.js";
import { Follow } from "../models/follow.model.js";
import { Notification } from "../models/notification.model.js";
import { Message } from "../models/message.model.js";
import { Conversation } from "../models/conversation.model.js";
import { Community } from "../models/community.model.js";
import { CommunityPost } from "../models/communityPost.model.js";
import { CommunityComment } from "../models/communityComment.model.js";
import { deleteFromCloudinary } from "./cloudinary.js";
import { logger } from "./logger.js";

// Remove all data owned by / referencing a user when their account is deleted.
export const deleteUserCascade = async (userId) => {
  try {
    const [posts, reels] = await Promise.all([
      Post.find({ user: userId }).select("mediaUrl mediaType"),
      Reel.find({ user: userId }).select("videoUrl"),
    ]);

    // Best-effort media cleanup (don't block the deletion on Cloudinary).
    await Promise.allSettled([
      ...posts.map((p) => deleteFromCloudinary(p.mediaUrl, p.mediaType === "video" ? "video" : "image")),
      ...reels.map((r) => deleteFromCloudinary(r.videoUrl, "video")),
    ]);

    await Promise.all([
      Post.deleteMany({ user: userId }),
      Reel.deleteMany({ user: userId }),
      Story.deleteMany({ user: userId }),
      Comment.deleteMany({ user: userId }),
      Like.deleteMany({ user: userId }),
      Follow.deleteMany({ $or: [{ follower: userId }, { following: userId }] }),
      Notification.deleteMany({ $or: [{ user: userId }, { fromUser: userId }] }),
      Message.deleteMany({ $or: [{ sender: userId }, { receiver: userId }] }),
      Conversation.deleteMany({ participants: userId }),
      CommunityPost.deleteMany({ author: userId }),
      CommunityComment.deleteMany({ author: userId }),
      // Remove the user from any community membership/admin/request lists.
      Community.updateMany(
        {},
        {
          $pull: {
            members: userId,
            admins: userId,
            joinRequests: userId,
          },
        }
      ),
    ]);
  } catch (err) {
    logger.error("deleteUserCascade error:", err);
    throw err;
  }
};

// Remove a community post's comments and media.
export const deleteCommunityPostCascade = async (post) => {
  try {
    await Promise.allSettled([deleteFromCloudinary(post.mediaUrl)]);
    await CommunityComment.deleteMany({ post: post._id });
  } catch (err) {
    logger.error("deleteCommunityPostCascade error:", err);
  }
};

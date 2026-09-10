import { logger } from "./logger.js";

export const emitToUser = (req, userId, event, payload) => {
  const io = req.app.get("io");
  const onlineUsers = req.app.get("onlineUsers");

  const userData = onlineUsers.get(userId.toString());
  if (userData?.socketId) {
    io.to(userData.socketId).emit(event, payload);
  }
};

// Emit a community event and increment the daily events counter.
export const emitCommunityEvent = (req, communityId) => {
  const io = req.app.get("io");
  const communityEventsToday = req.app.get("communityEventsToday");

  if (io && communityEventsToday) {
    const today = new Date().toDateString();
    const lastEventDate = req.app.get("lastEventDate") || today;

    if (today !== lastEventDate) {
      communityEventsToday.clear();
      req.app.set("lastEventDate", today);
    }

    const current = communityEventsToday.get(communityId) || 0;
    communityEventsToday.set(communityId, current + 1);

    io.emit("community:eventsCount", { communityId, eventsCount: current + 1 });
  }
};

// Emit an event to all followers of a user.
// Followers are stored in the Follow collection (not on the User document),
// so we resolve them there.
export const emitToFollowers = async (req, userId, event, payload) => {
  try {
    const io = req.app.get("io");
    const onlineUsers = req.app.get("onlineUsers");
    const { Follow } = await import("../models/follow.model.js");

    const followerIds = await Follow.find({ following: userId }).distinct("follower");
    if (!followerIds.length) return;

    followerIds.forEach((followerId) => {
      const userData = onlineUsers.get(followerId.toString());
      if (userData?.socketId) {
        io.to(userData.socketId).emit(event, payload);
      }
    });
  } catch (error) {
    logger.error("Error in emitToFollowers:", error);
  }
};

// Emit an event to a community room.
export const emitToCommunity = async (req, communityId, event, payload) => {
  try {
    const io = req.app.get("io");
    if (io) {
      io.to(`community:${communityId}`).emit(event, payload);
    }
  } catch (error) {
    logger.error("Error in emitToCommunity:", error);
  }
};

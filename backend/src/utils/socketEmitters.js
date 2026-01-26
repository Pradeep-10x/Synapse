export const emitToUser = (req, userId, event, payload) => {
  const io = req.app.get("io");
  const onlineUsers = req.app.get("onlineUsers");

  const socketId = onlineUsers.get(userId.toString());
  if (socketId) {
    io.to(socketId).emit(event, payload);
  }
};

// Emit to all followers of a user
export const emitToFollowers = async (req, userId, event, payload) => {
  try {
    const io = req.app.get("io");
    const onlineUsers = req.app.get("onlineUsers");
    const { User } = await import("../models/user.model.js");

    const user = await User.findById(userId).select("followers");
    if (!user || !user.followers || user.followers.length === 0) {
      return;
    }

    let emittedCount = 0;
    user.followers.forEach(followerId => {
      const socketId = onlineUsers.get(followerId.toString());
      if (socketId) {
        io.to(socketId).emit(event, payload);
        emittedCount++;
      }
    });

    console.log(`Emitted ${event} to ${emittedCount} online followers of user ${userId}`);
  } catch (error) {
    console.error('Error in emitToFollowers:', error);
  }
};

// Emit to all members of a community
export const emitToCommunity = async (req, communityId, event, payload) => {
  try {
    const io = req.app.get("io");
    const onlineUsers = req.app.get("onlineUsers");
    const { Community } = await import("../models/community.model.js");

    // Get community members
    const community = await Community.findById(communityId).select("members admins creator");
    if (!community) {
      console.warn(`Community ${communityId} not found for emitToCommunity`);
      return;
    }

    // Combine members, admins, and creator
    const allMembers = new Set();
    if (community.members && Array.isArray(community.members)) {
      community.members.forEach(m => allMembers.add(m.toString()));
    }
    if (community.admins && Array.isArray(community.admins)) {
      community.admins.forEach(a => allMembers.add(a.toString()));
    }
    if (community.creator) {
      allMembers.add(community.creator.toString());
    }

    // Emit to all online members
    let emittedCount = 0;
    allMembers.forEach(userId => {
      const socketId = onlineUsers.get(userId);
      if (socketId) {
        io.to(socketId).emit(event, payload);
        emittedCount++;
      }
    });
    
    console.log(`Emitted ${event} to ${emittedCount} online members of community ${communityId}`);
  } catch (error) {
    console.error('Error in emitToCommunity:', error);
  }
};

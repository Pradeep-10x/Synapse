export const emitToUser = (req, userId, event, payload) => {
  const io = req.app.get("io");
  const onlineUsers = req.app.get("onlineUsers");

  const userData = onlineUsers.get(userId.toString());
  if (userData?.socketId) {
    io.to(userData.socketId).emit(event, payload);
    console.log(`Emitted ${event} to user ${userId} (socket: ${userData.socketId})`);
  }
};

// Emit a community event and increment events counter
export const emitCommunityEvent = (req, communityId) => {
  const io = req.app.get("io");
  const communityEventsToday = req.app.get("communityEventsToday");
  
  if (io && communityEventsToday) {
    // Check for day reset
    const today = new Date().toDateString();
    const lastEventDate = req.app.get("lastEventDate") || today;
    
    if (today !== lastEventDate) {
      communityEventsToday.clear();
      req.app.set("lastEventDate", today);
    }
    
    const current = communityEventsToday.get(communityId) || 0;
    communityEventsToday.set(communityId, current + 1);
    
    io.emit("community:eventsCount", { communityId, eventsCount: current + 1 });
    console.log(`Community ${communityId} event count: ${current + 1}`);
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
      const userData = onlineUsers.get(followerId.toString());
      if (userData?.socketId) {
        io.to(userData.socketId).emit(event, payload);
        emittedCount++;
      }
    });

    console.log(`Emitted ${event} to ${emittedCount} online followers of user ${userId}`);
  } catch (error) {
    console.error('Error in emitToFollowers:', error);
  }
};

// Emit to community room
export const emitToCommunity = async (req, communityId, event, payload) => {
  try {
    const io = req.app.get("io");
    if (io) {
      console.log(`Broadcasting event ${event} to room community:${communityId}`);
      io.to(`community:${communityId}`).emit(event, payload);
      console.log(`Emitted ${event} to community room community:${communityId} with payload keys:`, Object.keys(payload));
    }
  } catch (error) {
    console.error('Error in emitToCommunity:', error);
  }
};

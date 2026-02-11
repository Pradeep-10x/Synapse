import { Server } from "socket.io";
import registerCallEvents from "./call.socket.js";
import { User } from "../models/user.model.js";
import { Community } from "../models/community.model.js";

const initSocket = (server) => {
  console.log("Initializing Socket.IO server...");
  const io = new Server(server, {
    cors: {
      origin: "*",
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  const onlineUsers = new Map();
  // Track active users per community: Map<communityId, Set<userId>>
  const communityActiveUsers = new Map();
  // Track events today per community: Map<communityId, number>
  const communityEventsToday = new Map();
  // Track the date for resetting events count
  let lastEventDate = new Date().toDateString();

  // Helper to get/reset events count
  const getEventsCount = (communityId) => {
    const today = new Date().toDateString();
    if (today !== lastEventDate) {
      // New day, reset all counts
      communityEventsToday.clear();
      lastEventDate = today;
    }
    return communityEventsToday.get(communityId) || 0;
  };

  const incrementEventsCount = (communityId) => {
    const today = new Date().toDateString();
    if (today !== lastEventDate) {
      communityEventsToday.clear();
      lastEventDate = today;
    }
    const current = communityEventsToday.get(communityId) || 0;
    communityEventsToday.set(communityId, current + 1);
    return current + 1;
  };

  io.on("connection", async (socket) => {
    console.log("DEBUG: Socket connection attempt", socket.id);
    console.log("DEBUG: Handshake query:", socket.handshake.query);
    // Note: I will only replace the top imports and the disconnect handler part to avoid replacing the whole file if possible, 
    // but replace_file_content works with contiguous blocks.
    // Since I need to add an import at the top AND change the bottom, I might need two calls or one big one.
    // The previous view_file shows the file is small enough (86 lines). I'll replace the whole file to be safe and clean.

    console.log("New socket connection:", socket.id);

    // Register user from handshake query if available
    const userId = socket.handshake.query.userId;
    const username = socket.handshake.query.username;
    const avatar = socket.handshake.query.avatar;

    if (userId) {
      // Store user details along with socket ID
      onlineUsers.set(userId, { socketId: socket.id, username, avatar });
      console.log(`User ${userId} registered with socket ${socket.id}`);

      // Join user to all their community rooms
      try {
        console.log(`Attempting to join community rooms for user: ${userId}`);
        const communities = await Community.find({ members: userId }).select('_id');
        console.log(`Found ${communities.length} communities for user ${userId}`);
        communities.forEach(community => {
          socket.join(`community:${community._id}`);
          console.log(`Socket ${socket.id} joined room community:${community._id}`);
        });
      } catch (error) {
        console.error("Error joining community rooms:", error);
      }

      // Notify others that user is online
      socket.broadcast.emit("user:status", { userId, status: "online", username, avatar });

      // Send list of current online users to the new connection
      const onlineUsersList = Array.from(onlineUsers.entries()).map(([uid, data]) => ({
        userId: uid,
        username: data.username,
        avatar: data.avatar
      }));
      socket.emit("online:users", onlineUsersList);
    }

    socket.on("user:online", async (data) => {
      console.log("DEBUG: user:online event received", data);
      // Handle legacy just-ID or new object
      const uid = typeof data === 'string' ? data : data.userId;
      const uName = typeof data === 'string' ? username : data.username;
      const uAvatar = typeof data === 'string' ? avatar : data.avatar;

      onlineUsers.set(uid, { socketId: socket.id, username: uName, avatar: uAvatar });
      console.log(`User ${uid} explicitly registered socket ${socket.id}`);

      // Join user to all their community rooms
      try {
        const communities = await Community.find({ members: uid }).select('_id');
        communities.forEach(community => {
          socket.join(`community:${community._id}`);
          console.log(`Socket ${socket.id} joined room community:${community._id}`);
        });
      } catch (error) {
        console.error("Error joining community rooms in user:online:", error);
      }

      // Re-broadcast with details if updated
      socket.broadcast.emit("user:status", { userId: uid, status: "online", username: uName, avatar: uAvatar });
    });

    // Handle typing indicators
    socket.on("typing", (data) => {
      const { conversationId, isTyping, receiverId } = data;
      if (receiverId) {
        const receiverData = onlineUsers.get(receiverId);
        if (receiverData?.socketId) {
          io.to(receiverData.socketId).emit("typing", { conversationId, isTyping });
        }
      }
    });

    // Handle community room join (for tracking active users)
    socket.on("community:join", (data) => {
      console.log("DEBUG: community:join event received", data);
      const { communityId } = data;
      const uid = socket.handshake.query.userId;
      
      if (communityId && uid) {
        socket.join(`community:${communityId}`);
        
        // Track active user in this community
        if (!communityActiveUsers.has(communityId)) {
          communityActiveUsers.set(communityId, new Set());
        }
        communityActiveUsers.get(communityId).add(uid);
        
        // Broadcast updated count to all users viewing communities
        const activeCount = communityActiveUsers.get(communityId).size;
        io.emit("community:activeCount", { communityId, activeCount });
        
        console.log(`User ${uid} joined community room ${communityId}, active: ${activeCount}`);
      }
    });

    // Handle community room leave
    socket.on("community:leave", (data) => {
      const { communityId } = data;
      const uid = socket.handshake.query.userId;
      
      if (communityId && uid) {
        socket.leave(`community:${communityId}`);
        
        // Remove user from tracking
        if (communityActiveUsers.has(communityId)) {
          communityActiveUsers.get(communityId).delete(uid);
          const activeCount = communityActiveUsers.get(communityId).size;
          io.emit("community:activeCount", { communityId, activeCount });
          
          console.log(`User ${uid} left community room ${communityId}, active: ${activeCount}`);
        }
      }
    });

    // Request active counts for multiple communities
    socket.on("community:getActiveCounts", (data) => {
      const { communityIds } = data;
      if (Array.isArray(communityIds)) {
        const activeCounts = {};
        const eventsCounts = {};
        communityIds.forEach(id => {
          activeCounts[id] = communityActiveUsers.has(id) ? communityActiveUsers.get(id).size : 0;
          eventsCounts[id] = getEventsCount(id);
        });
        socket.emit("community:activeCounts", activeCounts);
        socket.emit("community:eventsCounts", eventsCounts);
      }
    });

    // Track community events (posts, comments, etc.)
    socket.on("community:newEvent", (data) => {
      const { communityId } = data;
      if (communityId) {
        const eventsCount = incrementEventsCount(communityId);
        io.emit("community:eventsCount", { communityId, eventsCount });
      }
    });

    socket.on("disconnect", async () => {
      let disconnectedUser = null;
      for (let [key, value] of onlineUsers.entries()) {
        if (value.socketId === socket.id) {
          onlineUsers.delete(key);
          disconnectedUser = key;
          break;
        }
      }
      if (disconnectedUser) {
        console.log(`User ${disconnectedUser} disconnected (socket ${socket.id})`);

        // Update lastActive timestamp
        try {
          await User.findByIdAndUpdate(disconnectedUser, { lastActive: new Date() });
        } catch (error) {
          console.error("Error updating lastActive for user:", disconnectedUser, error);
        }

        // Remove user from all community tracking and broadcast updates
        for (const [communityId, users] of communityActiveUsers.entries()) {
          if (users.has(disconnectedUser)) {
            users.delete(disconnectedUser);
            const activeCount = users.size;
            io.emit("community:activeCount", { communityId, activeCount });
          }
        }

        socket.broadcast.emit("user:status", { userId: disconnectedUser, status: "offline" });
      }
    });
  });

  registerCallEvents(io, onlineUsers);

  return { io, onlineUsers, communityActiveUsers, communityEventsToday };
};

export { initSocket };
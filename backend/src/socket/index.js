import { Server } from "socket.io";
import registerCallEvents from "./call.socket.js";
import { User } from "../models/user.model.js";

const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  const onlineUsers = new Map();

  io.on("connection", (socket) => {
    // ... (existing connection logic) ...
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

    socket.on("user:online", (data) => {
      // Handle legacy just-ID or new object
      const uid = typeof data === 'string' ? data : data.userId;
      const uName = typeof data === 'string' ? username : data.username;
      const uAvatar = typeof data === 'string' ? avatar : data.avatar;

      onlineUsers.set(uid, { socketId: socket.id, username: uName, avatar: uAvatar });
      console.log(`User ${uid} explicitly registered socket ${socket.id}`);

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

        socket.broadcast.emit("user:status", { userId: disconnectedUser, status: "offline" });
      }
    });
  });

  registerCallEvents(io, onlineUsers);

  return { io, onlineUsers };
};

export { initSocket };
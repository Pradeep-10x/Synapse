import { Server } from "socket.io";
import registerCallEvents from "./call.socket.js";

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
    console.log("New socket connection:", socket.id);

    // Register user from handshake query if available
    const userId = socket.handshake.query.userId;
    if (userId) {
      onlineUsers.set(userId, socket.id);
      console.log(`User ${userId} registered with socket ${socket.id}`);

      // Notify others that user is online
      socket.broadcast.emit("user:status", { userId, status: "online" });
    }

    socket.on("user:online", (uid) => {
      onlineUsers.set(uid, socket.id);
      console.log(`User ${uid} explicitly registered socket ${socket.id}`);
    });

    // Handle typing indicators
    socket.on("typing", (data) => {
      const { conversationId, isTyping, receiverId } = data;
      if (receiverId) {
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("typing", { conversationId, isTyping });
        }
      }
    });

    socket.on("disconnect", () => {
      let disconnectedUser = null;
      for (let [key, value] of onlineUsers.entries()) {
        if (value === socket.id) {
          onlineUsers.delete(key);
          disconnectedUser = key;
          break;
        }
      }
      if (disconnectedUser) {
        console.log(`User ${disconnectedUser} disconnected (socket ${socket.id})`);
        socket.broadcast.emit("user:status", { userId: disconnectedUser, status: "offline" });
      }
    });
  });

  registerCallEvents(io, onlineUsers);

  return { io, onlineUsers };
};

export { initSocket };
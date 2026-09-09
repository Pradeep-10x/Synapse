import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import registerCallEvents from "./call.socket.js";
import { User } from "../models/user.model.js";
import { Community } from "../models/community.model.js";
import { logger } from "../utils/logger.js";

// Parse a raw Cookie header into a plain object.
const parseCookies = (cookieHeader = "") =>
  cookieHeader.split(";").reduce((acc, part) => {
    const idx = part.indexOf("=");
    if (idx > -1) {
      const key = part.slice(0, idx).trim();
      acc[key] = decodeURIComponent(part.slice(idx + 1).trim());
    }
    return acc;
  }, {});

const initSocket = (server) => {
  const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  const onlineUsers = new Map();
  const communityActiveUsers = new Map();
  const communityEventsToday = new Map();
  let lastEventDate = new Date().toDateString();

  const getEventsCount = (communityId) => {
    const today = new Date().toDateString();
    if (today !== lastEventDate) {
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

  // Authenticate every socket handshake using the httpOnly access-token cookie
  // (or an auth token for non-browser clients). Identity is derived from the
  // verified JWT — never from client-supplied query params.
  io.use(async (socket, next) => {
    try {
      const cookies = parseCookies(socket.handshake.headers?.cookie);
      const token = cookies.accessToken || socket.handshake.auth?.token;

      if (!token) {
        return next(new Error("Unauthorized: no token"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded?._id).select("username avatar");
      if (!user) {
        return next(new Error("Unauthorized: user not found"));
      }

      socket.data.userId = user._id.toString();
      socket.data.username = user.username;
      socket.data.avatar = user.avatar;
      next();
    } catch {
      next(new Error("Unauthorized: invalid token"));
    }
  });

  io.on("connection", async (socket) => {
    const { userId, username, avatar } = socket.data;
    logger.debug(`Socket connected: ${socket.id} (user ${userId})`);

    onlineUsers.set(userId, { socketId: socket.id, username, avatar });

    // Join user to all their community rooms.
    try {
      const communities = await Community.find({ members: userId }).select("_id");
      communities.forEach((community) => socket.join(`community:${community._id}`));
    } catch (error) {
      logger.error("Error joining community rooms:", error);
    }

    // Notify others that this user is online.
    socket.broadcast.emit("user:status", { userId, status: "online", username, avatar });

    // Send current online users to the new connection.
    const onlineUsersList = Array.from(onlineUsers.entries()).map(([uid, data]) => ({
      userId: uid,
      username: data.username,
      avatar: data.avatar,
    }));
    socket.emit("online:users", onlineUsersList);

    // Typing indicators.
    socket.on("typing", (data) => {
      const { conversationId, isTyping, receiverId } = data || {};
      if (receiverId) {
        const receiverData = onlineUsers.get(receiverId);
        if (receiverData?.socketId) {
          io.to(receiverData.socketId).emit("typing", { conversationId, isTyping });
        }
      }
    });

    // Community room join (for tracking active users).
    socket.on("community:join", (data) => {
      const { communityId } = data || {};
      if (communityId) {
        socket.join(`community:${communityId}`);
        if (!communityActiveUsers.has(communityId)) {
          communityActiveUsers.set(communityId, new Set());
        }
        communityActiveUsers.get(communityId).add(userId);
        const activeCount = communityActiveUsers.get(communityId).size;
        io.emit("community:activeCount", { communityId, activeCount });
      }
    });

    // Community room leave.
    socket.on("community:leave", (data) => {
      const { communityId } = data || {};
      if (communityId && communityActiveUsers.has(communityId)) {
        socket.leave(`community:${communityId}`);
        communityActiveUsers.get(communityId).delete(userId);
        const activeCount = communityActiveUsers.get(communityId).size;
        io.emit("community:activeCount", { communityId, activeCount });
      }
    });

    // Request active counts for multiple communities.
    socket.on("community:getActiveCounts", (data) => {
      const { communityIds } = data || {};
      if (Array.isArray(communityIds)) {
        const activeCounts = {};
        const eventsCounts = {};
        communityIds.forEach((id) => {
          activeCounts[id] = communityActiveUsers.has(id) ? communityActiveUsers.get(id).size : 0;
          eventsCounts[id] = getEventsCount(id);
        });
        socket.emit("community:activeCounts", activeCounts);
        socket.emit("community:eventsCounts", eventsCounts);
      }
    });

    // Track community events (posts, comments, etc.).
    socket.on("community:newEvent", (data) => {
      const { communityId } = data || {};
      if (communityId) {
        const eventsCount = incrementEventsCount(communityId);
        io.emit("community:eventsCount", { communityId, eventsCount });
      }
    });

    socket.on("disconnect", async () => {
      // A user may have multiple tabs; only mark offline when the last socket goes.
      const current = onlineUsers.get(userId);
      if (current?.socketId === socket.id) {
        onlineUsers.delete(userId);

        try {
          await User.findByIdAndUpdate(userId, { lastActive: new Date() });
        } catch (error) {
          logger.error("Error updating lastActive for user:", userId, error);
        }

        for (const [communityId, users] of communityActiveUsers.entries()) {
          if (users.has(userId)) {
            users.delete(userId);
            io.emit("community:activeCount", { communityId, activeCount: users.size });
          }
        }

        socket.broadcast.emit("user:status", { userId, status: "offline" });
      }
    });
  });

  registerCallEvents(io, onlineUsers);

  return { io, onlineUsers, communityActiveUsers, communityEventsToday };
};

export { initSocket };

function registerCallEvents(io, onlineUsers) {
  io.on("connection", (socket) => {
    // Get userId from socket
    const userId = socket.handshake.query.userId;

    socket.on("call:start", ({ to, offer, type = 'video' }) => {
      // 'to' should be userId, not socket.id
      const targetUser = onlineUsers.get(to);
      if (targetUser?.socketId) {
        io.to(targetUser.socketId).emit("call:incoming", {
          from: userId || socket.id,
          fromSocketId: socket.id,
          offer,
          type
        });
      }
    });

    socket.on("call:answer", ({ to, answer }) => {
      const targetUser = onlineUsers.get(to);
      if (targetUser?.socketId) {
        io.to(targetUser.socketId).emit("call:answer", {
          answer,
          from: userId || socket.id
        });
      }
    });

    socket.on("call:ice", ({ to, candidate }) => {
      const targetUser = onlineUsers.get(to);
      if (targetUser?.socketId) {
        io.to(targetUser.socketId).emit("call:ice", {
          candidate,
          from: userId || socket.id
        });
      }
    });

    socket.on("call:end", ({ to }) => {
      const targetUser = onlineUsers.get(to);
      if (targetUser?.socketId) {
        io.to(targetUser.socketId).emit("call:end", {
          from: userId || socket.id
        });
      }
    });

    socket.on("call:reject", ({ to }) => {
      const targetUser = onlineUsers.get(to);
      if (targetUser?.socketId) {
        io.to(targetUser.socketId).emit("call:rejected", {
          from: userId || socket.id
        });
      }
    });

  });
}

export default registerCallEvents;
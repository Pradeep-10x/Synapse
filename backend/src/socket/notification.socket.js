const emitNotification = (req, receiverId, payload) => {
  const io = req.app.get("io");
  const onlineUsers = req.app.get("onlineUsers");

  const userData = onlineUsers.get(receiverId.toString());
  if (userData?.socketId) {
    io.to(userData.socketId).emit("notification:new", payload);
    console.log(`Emitted notification to user ${receiverId} (socket: ${userData.socketId})`);
  }
};


export { emitNotification };
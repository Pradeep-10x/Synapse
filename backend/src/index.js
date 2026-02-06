import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import http from "http";
import { initSocket } from "./socket/index.js";
import { app } from "./app.js";
import connectDB from "./db/index.js";


const PORT = process.env.PORT || 5000;


const server = http.createServer(app);
const { io, onlineUsers, communityEventsToday } = initSocket(server);
app.set("io", io);
app.set("onlineUsers", onlineUsers);
app.set("communityEventsToday", communityEventsToday);
connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server (HTTP + Socket.IO) running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Database connection failed", err);
    process.exit(1);
  });

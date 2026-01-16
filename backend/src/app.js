import express from 'express';
import dotenv from 'dotenv';
import cors from "cors"
dotenv.config();
import path from "path"
import cookieParser from "cookie-parser"
import { ApiError } from "./utils/ApiError.js"
import userRouter from "./routes/user.routes.js"
import postRouter from "./routes/post.routes.js"
import feedRouter from "./routes/feed.routes.js"
import commentRouter from"./routes/comment.routes.js"
import likeRouter from"./routes/like.routes.js"
import notificationRouter from"./routes/notification.routes.js"
import messageRouter from"./routes/message.routes.js"
import reelRouter from"./routes/reel.routes.js"
import storyRouter from"./routes/story.routes.js"

const app=express()

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true,
}))


app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(express.urlencoded({extended : true, limit: '10mb'}));
app.use(express.static(path.resolve("./public")));

app.use("/api/v1/user", userRouter);
app.use("/api/v1/post", postRouter);
app.use("/api/v1/feed", feedRouter);
app.use("/api/v1/comment", commentRouter);
app.use("/api/v1/like", likeRouter);
app.use("/api/v1/notification", notificationRouter);
app.use("/api/v1/message", messageRouter);
app.use("/api/v1/reel", reelRouter);
app.use("/api/v1/story", storyRouter);

app.use((err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
      data: null
    });
  }

  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      message: err.message || "File upload error",
      data: null
    });
  }

  console.error("Unhandled error:", err);
  return res.status(500).json({
    success: false,
    message: "Internal server error",
    data: null
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    data: null
  });
});

export {app}

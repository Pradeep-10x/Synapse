import express from 'express';
import dotenv from 'dotenv';
import cors from "cors"
dotenv.config();
import path from "path"
import { fileURLToPath } from 'url';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app=express()

// Health check endpoint for Render
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// CORS configuration
const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map(origin => origin.trim()) || [];

const corsOptions = {
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        console.log('CORS blocked origin:', origin);
        callback(null, true); // Allow all origins for now to debug
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['set-cookie'],
    preflightContinue: false,
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));


app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(express.urlencoded({extended : true, limit: '10mb'}));
app.use(express.static(path.join(__dirname, "../public")));

// Trust proxy for Render (needed for rate limiting and secure cookies)
app.set('trust proxy', 1);


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

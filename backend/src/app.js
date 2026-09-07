import express from 'express';
import dotenv from 'dotenv';
import cors from "cors"
dotenv.config();
import path from "path"
import helmet from "helmet"
import compression from "compression"
import cookieParser from "cookie-parser"
import { ApiError } from "./utils/ApiError.js"
import { logger } from "./utils/logger.js"
import { sanitizeRequest } from "./middlewares/sanitizeRequest.js"
import limiter from "./middlewares/rateLimiter.js"
import userRouter from "./routes/user.routes.js"
import postRouter from "./routes/post.routes.js"
import feedRouter from "./routes/feed.routes.js"
import commentRouter from "./routes/comment.routes.js"
import likeRouter from "./routes/like.routes.js"
import notificationRouter from "./routes/notification.routes.js"
import messageRouter from "./routes/message.routes.js"
import reelRouter from "./routes/reel.routes.js"
import storyRouter from "./routes/story.routes.js"
import communityRoutes from "./routes/community.routes.js";
import communityPostRoutes from "./routes/communityPost.routes.js";
import communityCommentRoutes from "./routes/communityComment.routes.js";
import communityChatRoutes from "./routes/communityChat.routes.js";
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger.js';


const app = express()

// Trust a single proxy hop (Render/Vercel) so req.ip and rate limiting are
// accurate without letting clients spoof X-Forwarded-For.
app.set("trust proxy", 1);

// Explicit origin allowlist for credentialed CORS. Never reflect arbitrary
// origins while credentials are enabled.
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow non-browser clients (curl, mobile, server-to-server) with no origin.
    // For disallowed browser origins we simply withhold the CORS headers
    // (callback(null, false)) so the browser blocks the response — no noisy
    // 500s, which is the standard cors pattern.
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// CSP is disabled because it breaks the self-hosted Swagger UI (inline
// scripts/styles). The API itself serves JSON, so CSP adds little here; all
// other helmet protections (HSTS, noSniff, frameguard, etc.) stay enabled.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitizeRequest);
app.use(express.static(path.resolve("./public")));

// Global rate limit as a baseline; stricter auth limits live on auth routes.
app.use("/api/v1", limiter);

// Health check endpoint for Render
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/v1/user", userRouter);
app.use("/api/v1/post", postRouter);
app.use("/api/v1/feed", feedRouter);
app.use("/api/v1/comment", commentRouter);
app.use("/api/v1/like", likeRouter);
app.use("/api/v1/notification", notificationRouter);
app.use("/api/v1/message", messageRouter);
app.use("/api/v1/reel", reelRouter);
app.use("/api/v1/story", storyRouter);
app.use("/api/v1/community", communityRoutes);
app.use("/api/v1/community-post", communityPostRoutes);
app.use("/api/v1/community-comments", communityCommentRoutes);
app.use("/api/v1/community-chat", communityChatRoutes);

// Swagger Documentation Route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use((err, req, res, _next) => {
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

  logger.error("Unhandled error:", err);
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

export { app }

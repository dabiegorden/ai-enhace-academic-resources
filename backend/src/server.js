import express from "express";
import cors from "cors";
import http from "http";
import path from "path";
import { Server as SocketIOServer } from "socket.io";

import connectDB from "./config/mongodb.js";
import { ENV } from "./config/env.js";

import { setupSocketHandlers } from "./utils/socketHandlers.js";
import { startExamScheduler } from "./utils/examScheduler.js";

// ─── Routes ────────────────────────────────────────────────────────────────

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import notesRoutes from "./routes/notes.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import assignmentRoutes from "./routes/assignment.routes.js";
import examRoutes from "./routes/exam.routes.js";
import announcementRoutes from "./routes/announcement.routes.js";
import timetableRoutes from "./routes/timetable.routes.js";
import ratingRoutes from "./routes/rating.routes.js";
import votingRoutes from "./routes/voting.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import statRoutes from "./routes/stats.routes.js";

// ─── App Setup ──────────────────────────────────────────────────────────────

const app = express();

const isVercel = process.env.VERCEL === "1";

// Connect database
connectDB();

// ─── Middlewares ────────────────────────────────────────────────────────────

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
);

app.use(
  express.json({
    limit: "50mb",
  }),
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "50mb",
  }),
);

// ─── Static Upload Folder ───────────────────────────────────────────────────

const uploadPath = isVercel
  ? "/tmp/uploads"
  : path.join(process.cwd(), "src/public/uploads");

app.use("/uploads", express.static(uploadPath));

// ─── API Routes ─────────────────────────────────────────────────────────────

app.use("/auth", authRoutes);

app.use("/users", userRoutes);

app.use("/notes", notesRoutes);

app.use("/ai", aiRoutes);

app.use("/chat", chatRoutes);

app.use("/assignments", assignmentRoutes);

app.use("/exams", examRoutes);

app.use("/announcements", announcementRoutes);

app.use("/timetables", timetableRoutes);

app.use("/ratings", ratingRoutes);

app.use("/voting", votingRoutes);

app.use("/notifications", notificationRoutes);

app.use("/stats", statRoutes);

// ─── Health Check ───────────────────────────────────────────────────────────

app.get("/health", (_, res) => {
  res.json({
    success: true,

    message: "Server running",

    environment: ENV.NODE_ENV,
  });
});

// ─── Error Handler ──────────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.statusCode || 500).json({
    success: false,

    message: err.message || "Server Error",

    errors: err.errors || null,
  });
});

// ─── Socket + Local Server ──────────────────────────────────────────────────

// Vercel does not support normal socket servers
if (!isVercel) {
  const server = http.createServer(app);

  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.FRONTEND_URL,

      credentials: true,
    },
  });

  setupSocketHandlers(io);

  app.set("io", io);

  startExamScheduler();

  server.listen(ENV.PORT, () => {
    console.log(`Server running on port ${ENV.PORT}`);
  });
}

// IMPORTANT FOR VERCEL
export default app;

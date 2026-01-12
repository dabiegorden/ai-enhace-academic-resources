import express from "express";
import cors from "cors";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { setupSocketHandlers } from "./utils/socketHandlers.js";
import connectDB from "./config/mongodb.js";
import { ENV } from "./config/env.js";

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

// Initialize express app
const app = express();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
});

// Setup socket handlers
setupSocketHandlers(io);

// Make io accessible to routes
app.set("io", io);

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/timetables", timetableRoutes);
app.use("/api/ratings", ratingRoutes);
app.use("/api/voting", votingRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/stats", statRoutes);

// Health check route
app.get("/api/health", (_, res) => {
  res.json({ status: "OK", message: "Server is running" });
});

// Error handling middleware
app.use((err, _, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Server Error",
    errors: err.errors || null,
  });
});

const PORT = ENV.PORT;

const startServer = async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`Server running in ${ENV.NODE_ENV} mode on port ${PORT}`);
  });
};

startServer();

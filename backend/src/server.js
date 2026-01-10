import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { ENV } from "./config/env.js";

const app = express();
const PORT = ENV.PORT;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(cookieParser());

if (ENV.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// health check route
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Server is healthy" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

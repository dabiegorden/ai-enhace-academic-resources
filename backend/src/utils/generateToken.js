import jwt from "jsonwebtoken";
import { ENV } from "../config/env.js";

const generateToken = (id) => {
  return jwt.sign({ id }, ENV.JWT_SECRET, {
    expiresIn: ENV.JWT_EXPIRE,
  });
};

export { generateToken };

import { GoogleGenerativeAI } from "@google/generative-ai";
import { ENV } from "./env.js";

// Initialize Google Gemini AI with API key from environment
const genAI = new GoogleGenerativeAI(ENV.GEMINI_API_KEY);

// Get AI model instance for generating content
export const getGeminiModel = (modelName = "gemini-3-flash-preview") => {
  return genAI.getGenerativeModel({ model: modelName });
};

export { genAI };

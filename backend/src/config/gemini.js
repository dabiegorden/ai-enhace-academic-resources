import { GoogleGenerativeAI } from "@google/generative-ai";
import { ENV } from "./env.js";

// Initialize Google Gemini AI with API key from environment
const genAI = new GoogleGenerativeAI(ENV.GEMINI_API_KEY);

// A valid, generally-available model. The codebase previously requested
// "gemini-3.5-flash" / "gemini-3-flash-preview", which are NOT real Gemini
// model IDs — every AI request (summaries, quizzes, and the chat-room AI
// insight that uses streaming) therefore failed. We map those legacy/invalid
// names onto a supported model so all AI features work again.
const DEFAULT_MODEL = "gemini-3.5-flash";

const MODEL_ALIASES = {
  "gemini-3.5-flash": DEFAULT_MODEL,
  "gemini-3-flash": DEFAULT_MODEL,
  "gemini-3-flash": DEFAULT_MODEL,
};

// Get AI model instance for generating content
export const getGeminiModel = (modelName = DEFAULT_MODEL) => {
  const resolved = MODEL_ALIASES[modelName] || modelName;
  return genAI.getGenerativeModel({ model: resolved });
};

export { genAI };

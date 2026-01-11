import { GoogleGenAI } from "@google/genai";

// Initialize Google Gemini AI - API key is read from GEMINI_API_KEY env variable
const ai = new GoogleGenAI({});

// Get AI models instance for generating content
export const getGeminiModel = (modelName = "gemini-2.0-flash-exp") => {
  return ai.models;
};

export { ai };

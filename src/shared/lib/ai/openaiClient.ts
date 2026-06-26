// Uses OpenRouter via environment variable AI_API_KEY
import OpenAI from "openai";

export function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.AI_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
  });
}

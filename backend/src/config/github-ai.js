import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import { createSseStream } from "@azure/core-sse";
import { ENV } from "./env.js";

// ─── GitHub Models (Azure AI Inference) ────────────────────────────────────────
// Replaces Google Gemini. Authenticates with a GitHub access token and talks to
// the GitHub Models inference endpoint. The default model is a free
// marketplace model.
const endpoint = "https://models.github.ai/inference";
const DEFAULT_MODEL = "meta/Llama-4-Scout-17B-16E-Instruct";

const client = ModelClient(endpoint, new AzureKeyCredential(ENV.GITHUB_TOKEN));

/**
 * Returns a model wrapper that mirrors the small slice of the Google Gemini
 * SDK this codebase relied on (`generateContent` and `generateContentStream`),
 * so the AI controllers keep working without rewrites.
 *
 * Any legacy Gemini model name is ignored and mapped to the GitHub model.
 */
export const getAIModel = (modelName = DEFAULT_MODEL) => {
  // Only honour explicit GitHub-style model ids ("org/Model"); otherwise use
  // the default free marketplace model.
  const model =
    typeof modelName === "string" && modelName.includes("/")
      ? modelName
      : DEFAULT_MODEL;

  const baseMessages = (prompt) => [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: prompt },
  ];

  return {
    // ── Non-streaming generation ──────────────────────────────────────────
    async generateContent(prompt) {
      const response = await client.path("/chat/completions").post({
        body: {
          messages: baseMessages(prompt),
          temperature: 1.0,
          top_p: 1.0,
          max_tokens: 2000,
          model,
        },
      });

      if (isUnexpected(response)) {
        throw response.body.error;
      }

      const text = response.body.choices?.[0]?.message?.content ?? "";
      // Match Gemini's shape: result.response.text()
      return { response: { text: () => text } };
    },

    // ── Streaming generation (used for the chat-room AI insight SSE) ───────
    async generateContentStream(prompt) {
      const response = await client
        .path("/chat/completions")
        .post({
          body: {
            messages: baseMessages(prompt),
            temperature: 1.0,
            top_p: 1.0,
            max_tokens: 2000,
            model,
            stream: true,
          },
        })
        .asNodeStream();

      const stream = response.body;
      if (!stream) {
        throw new Error("The response stream is undefined");
      }
      if (response.status !== "200") {
        throw new Error(
          `Failed to get chat completions, http operation failed with ${response.status} code`,
        );
      }

      const sseStream = createSseStream(stream);

      // Yield chunks shaped like Gemini's stream items: chunk.text()
      async function* iterate() {
        for await (const event of sseStream) {
          if (event.data === "[DONE]") return;
          let parsed;
          try {
            parsed = JSON.parse(event.data);
          } catch {
            continue;
          }
          for (const choice of parsed.choices ?? []) {
            const text = choice.delta?.content ?? "";
            if (text) {
              yield { text: () => text };
            }
          }
        }
      }

      return { stream: iterate() };
    },
  };
};

export { client };

import Anthropic from "@anthropic-ai/sdk";

export class ApiError extends Error {}

export async function generateContent(options: {
  apiKey: string;
  model: string;
  system: string;
  userMessage: string;
}): Promise<string> {
  try {
    const client = new Anthropic({ apiKey: options.apiKey, timeout: 60_000 });
    const response = await client.messages.create({
      model: options.model,
      max_tokens: 8_000,
      system: options.system,
      messages: [{ role: "user", content: options.userMessage }]
    });
    return response.content
      .filter((item): item is Anthropic.TextBlock => item.type === "text")
      .map((item) => item.text)
      .join("\n")
      .trim();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown API error";
    if (/auth|api key|401/i.test(message)) throw new ApiError("ERROR: Claude API authentication failed. Check ANTHROPIC_API_KEY and try again.");
    if (/rate|429/i.test(message)) throw new ApiError("ERROR: Claude API rate limit reached. Wait a moment and try again.");
    if (/timeout|network|fetch|connect/i.test(message)) throw new ApiError("ERROR: Claude API request failed due to a network issue. Check your connection and try again.");
    throw new ApiError("ERROR: Claude API request failed. Retry with --debug for technical details.");
  }
}

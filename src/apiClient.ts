import OpenAI from "openai";

export class ApiError extends Error {}

export async function generateContent(options: {
  apiKey: string;
  model: string;
  system: string;
  userMessage: string;
}): Promise<string> {
  try {
    const client = new OpenAI({ apiKey: options.apiKey, timeout: 60_000, maxRetries: 0 });
    const response = await client.responses.create({
      model: options.model,
      max_output_tokens: 8_000,
      input: [
        { role: "developer", content: options.system },
        { role: "user", content: options.userMessage }
      ]
    });
    return response.output_text.trim();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown API error";
    if (/auth|api key|401/i.test(message)) throw new ApiError("ERROR: OpenAI API authentication failed. Check OPENAI_API_KEY and try again.");
    if (/rate|429/i.test(message)) throw new ApiError("ERROR: OpenAI API rate limit reached. Wait a moment and try again.");
    if (/timeout|network|fetch|connect/i.test(message)) throw new ApiError("ERROR: OpenAI API request failed due to a network issue. Check your connection and try again.");
    throw new ApiError("ERROR: OpenAI API request failed. Retry with --debug for technical details.");
  }
}

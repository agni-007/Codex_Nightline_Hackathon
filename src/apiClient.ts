import OpenAI from "openai";
import tls from "node:tls";

export class ApiError extends Error {}

function configureSystemCertificates(): void {
  // Corporate/proxied Windows networks often trust a root installed in the OS
  // store but not in Node's bundled store. Retain Node's existing roots too.
  const systemCertificates = tls.getCACertificates?.("system") ?? [];
  if (systemCertificates.length) {
    tls.setDefaultCACertificates([...tls.getCACertificates("default"), ...systemCertificates]);
  }
}

export async function generateContent(options: {
  apiKey: string;
  model: string;
  system: string;
  userMessage: string;
}): Promise<string> {
  try {
    configureSystemCertificates();
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

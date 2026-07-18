export const INSUFFICIENT_INPUT_MESSAGE =
  "ERROR: insufficient input — need at least one concrete detail (what, when, or price) to generate content.";

const MAX_WORDS = 4_000;

export interface ValidationResult {
  sanitizedInput: string;
  warnings: string[];
}

export class ValidationError extends Error {}

export function stripHtmlTags(input: string): string {
  return input.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, " ").replace(/<[^>]*>/g, " ");
}

export function validateInput(input: string): ValidationResult {
  const sanitizedInput = stripHtmlTags(input).replace(/\r\n?/g, "\n").trim();
  const words = sanitizedInput.match(/\S+/g) ?? [];

  if (sanitizedInput.length < 20 || words.length < 8) {
    throw new ValidationError(INSUFFICIENT_INPUT_MESSAGE);
  }

  const warnings: string[] = [];
  if (words.length > MAX_WORDS) {
    warnings.push(`WARNING: input exceeds ${MAX_WORDS.toLocaleString()} words and was truncated.`);
  }

  return {
    sanitizedInput: words.slice(0, MAX_WORDS).join(" "),
    warnings
  };
}

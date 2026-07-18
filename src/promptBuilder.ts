import { MODULES, type ModuleId } from "./types.js";

export interface PromptInput {
  businessType: string;
  rawInput: string;
  location?: string;
  activeModules: ModuleId[];
  language?: string;
  feedback?: string;
}

const MODULE_PROMPTS: Record<ModuleId, string> = {
  flyer: `===BLOCK: FLYER===
One-pager: headline, up to 3 bullet facts, CTA, [QR CODE] placeholder.`,
  sms: `===BLOCK: SMS_BLAST===
Plain text, hard cap 320 characters, no markdown.`,
  reviews: `===BLOCK: REVIEW_REPLIES===
Three replies labeled Positive / Neutral / Negative, each under 80 words.`,
  hashtags: `===BLOCK: HASHTAGS===
15 tags under headers # Neighborhood / # Category / # Branded (5 each).`,
  headlines: `===BLOCK: HEADLINE_AB===
Two subject line variants, each with a one-line rationale.`,
  calendar: `===BLOCK: POSTING_CALENDAR===
Markdown table, 7 rows: Day / Channel / Content Block / Note.`,
  languagePack: `===BLOCK: LANGUAGE_PACK===
The three core blocks re-rendered in {{LANG}}, same facts only.`,
  feedback: `===BLOCK: FEEDBACK_NOTES===
Short adjustment note based on the supplied prior metrics only.`
};

/** The Appendix A wording is intentionally kept here as the source for every Claude request. */
export function buildSystemPrompt(input: PromptInput): string {
  const activeModules = input.activeModules.map((module) => MODULES[module].block).join(", ");
  const selectedModulePrompts = input.activeModules.map((module) => MODULE_PROMPTS[module]).join("\n---BLOCK---\n");
  const moduleSection = selectedModulePrompts
    ? `\n[ For each module listed in {{ACTIVE_MODULES}}, append the matching block below using the same ===BLOCK: NAME=== / ---BLOCK--- contract. ]\n${selectedModulePrompts}\n`
    : "";

  return `You are the core generation engine for "HyperLocal Echo," a CLI tool that
converts one raw input asset into a multi-channel marketing matrix for a
small local business.
INPUT
- Business Type: {{BUSINESS_TYPE}}
- Raw Input Asset: {{RAW_INPUT}}
- Optional Location: {{LOCATION}} (if absent, keep geography generic)
- Active Modules: {{ACTIVE_MODULES}} (comma list, may be empty)
GROUND RULES
1. Use ONLY facts present in the Raw Input Asset. Do not invent prices,
addresses, hours, awards, review counts, or quotes. If a detail is
required for formatting but absent, omit that field rather than
fabricate it.
2. Infer tone from the input but always stay professional — no cliches
like "hidden gem" or "game-changer."
3. Output ONLY the requested blocks below, in order, separated by the
exact delimiter line ---BLOCK---. No preamble, no summary, no closing
remarks.
===BLOCK: SEO_BLOG===
Markdown blog post, 200-300 words, localized to {{LOCATION}} if provided.
End with one valid <script type="application/ld+json"> block, using the
most appropriate schema type given the input. Populate only fields
supported by the input.
---BLOCK---
===BLOCK: SCRIPT_STUDIO===
Markdown table, 5-8 rows, total runtime 20-45 seconds, columns:
| Timestamp | Visual B-Roll Description | Voiceover Audio |
Directives must be shootable by a non-professional with a phone.
---BLOCK---
===BLOCK: SMART_NEWSLETTER===
Subject Line: <=55 characters
Preview Text: <=90 characters
Body: 120-180 words, using [Customer Name] placeholder
CTA: one bracketed action label, e.g. [Reserve Your Spot ->]
${moduleSection}CONSTRAINTS
- Raw markdown/text only, safely splittable by the delimiter.
- No em dashes; use commas or periods.
- If Raw Input Asset is empty or unusable, output only:
ERROR: insufficient input.`
    .replaceAll("{{BUSINESS_TYPE}}", input.businessType)
    .replaceAll("{{RAW_INPUT}}", input.rawInput)
    .replaceAll("{{LOCATION}}", input.location?.trim() || "")
    .replaceAll("{{ACTIVE_MODULES}}", activeModules)
    .replaceAll("{{LANG}}", input.language ?? "");
}

export function buildUserMessage(feedback?: string): string {
  return feedback
    ? `Generate the requested blocks. Prior metrics for FEEDBACK_NOTES: ${feedback}`
    : "Generate the requested blocks.";
}

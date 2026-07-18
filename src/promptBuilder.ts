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
Short adjustment note based on the supplied prior metrics only.`,
  eventPage: `===BLOCK: EVENT_PAGE===
Return a complete, self-contained HTML event landing page with inline CSS. Use a polished, mobile-friendly layout with a hero, event details, what is included, and CTA sections. Include only event title, timing, price, capacity, location, inclusions, and CTA details supported by the Raw Input Asset. Omit unsupported fields rather than inventing them. Use a bracketed CTA label if no destination is supplied.`
};

/** The Appendix A wording is intentionally kept here as the source for every model request. */
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
2. First silently identify the relevant offer, event, timing, price, capacity,
inclusions, location, and CTA facts in the Raw Input Asset. Use only supported
facts in the requested blocks; do not output this extraction as a separate block.
3. Infer tone from the input but always stay professional — no cliches
like "hidden gem" or "game-changer."
4. Output ONLY the requested blocks below, in order, separated by the
exact delimiter line ---BLOCK---. No preamble, no summary, no closing
remarks.
CRITICAL RESPONSE FORMAT: Begin the very first character of your response with
===BLOCK: SEO_BLOG===. Use the exact uppercase block headers shown below,
including all three equals signs. Do not wrap the response in a Markdown code
fence and do not replace headers with Markdown headings.
===BLOCK: SEO_BLOG===
Markdown blog post, 350-500 words, localized to {{LOCATION}} if provided.
Use a compelling H1, an opening that states the actual offer, 2-3 useful H2 sections,
and a concise closing CTA. Expand on the value of supplied details without adding facts.
End with one valid <script type="application/ld+json"> block, using the
most appropriate schema type given the input. Populate only fields
supported by the input.
---BLOCK---
===BLOCK: SCRIPT_STUDIO===
Markdown table, 6-8 rows, total runtime 30-45 seconds, columns:
| Timestamp | Visual B-Roll Description | Voiceover Audio |
Directives must be shootable by a non-professional with a phone. Make every row
specific, varied, and immediately usable, while keeping factual claims traceable.
---BLOCK---
===BLOCK: SMART_NEWSLETTER===
Subject Line: <=55 characters
Preview Text: <=90 characters
Body: 120-180 words, using [Customer Name] placeholder
CTA: one bracketed action label, e.g. [Reserve Your Spot ->]
Write a complete, warm 180-260 word body with a clear opening, detail-rich middle,
and focused CTA. Use only the supplied facts.
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

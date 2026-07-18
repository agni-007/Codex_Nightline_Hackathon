export const CORE_BLOCKS = ["SEO_BLOG", "SCRIPT_STUDIO", "SMART_NEWSLETTER"] as const;

export const MODULES = {
  flyer: { block: "FLYER", file: "flyer.md" },
  sms: { block: "SMS_BLAST", file: "sms-blast.txt" },
  reviews: { block: "REVIEW_REPLIES", file: "review-replies.md" },
  hashtags: { block: "HASHTAGS", file: "hashtags.txt" },
  headlines: { block: "HEADLINE_AB", file: "headline-ab.md" },
  calendar: { block: "POSTING_CALENDAR", file: "posting-calendar.md" },
  languagePack: { block: "LANGUAGE_PACK", file: "language-pack-<lang>.md" },
  feedback: { block: "FEEDBACK_NOTES", file: "feedback-notes.md" },
  eventPage: { block: "EVENT_PAGE", file: "event-page.html" }
} as const;

export type CoreBlock = (typeof CORE_BLOCKS)[number];
export type ModuleId = keyof typeof MODULES;
export type BlockName = CoreBlock | (typeof MODULES)[ModuleId]["block"];

export interface BusinessProfile {
  name?: string;
  type?: string;
  location?: string;
  tone?: string;
  defaultModules: ModuleId[];
}

export interface RunRequest {
  type: string;
  input: string;
  location?: string;
  modules: ModuleId[];
  language?: string;
  feedback?: string;
  ctaLink?: string;
  outDir: string;
  model: string;
}

export interface ParsedResponse {
  blocks: Map<BlockName, string>;
  missingModules: ModuleId[];
}

export interface FabricationFlag {
  token: string;
  block: string;
}

export interface FabricationResult {
  status: "passed" | "flagged";
  flags: FabricationFlag[];
}
